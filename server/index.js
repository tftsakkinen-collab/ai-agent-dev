const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Mock session storage for logged-in users
const sessions = {};

// Simple mock data based on seeded profiles
const providers = [
  {
    id: 'provider-1',
    name: 'Gearspot Vuokraus',
    description: 'Luotettava varusteyritys, joka tarjoaa SUP-lautoja, pyöriä ja hiihtovarusteita.'
  }
];

const products = [
  {
    id: 'ebike-1',
    type: 'electric_bike',
    name: 'Gearspot Sähköpyörä — City 1',
    short: 'Sähköavusteinen kaupunkipyörä, matka-alue ~60 km.',
    price: '15 €/tunti · 60 €/päivä',
    providerId: 'provider-1',
    searchTerms: ['sähköpyörä', 'pyörä', 'bike', 'ebike']
  },
  {
    id: 'sup-1',
    type: 'sup_board',
    name: 'Gearspot SUP — Inflatable 10\'6"',
    short: 'Helppo inflatettava SUP, mela ja pelastusliivi sisältyy.',
    price: '12 €/tunti · 40 €/päivä',
    providerId: 'provider-1',
    searchTerms: ['sup', 'lauta', 'stand up paddle', 'aina']
  },
  {
    id: 'ski-1',
    type: 'ski_gear',
    name: 'Gearspot Hiihtovarusteet',
    short: 'Täydellinen laskettelupaketti suksineen, monot mukana.',
    price: '20 €/tunti · 80 €/päivä',
    providerId: 'provider-1',
    searchTerms: ['hiihto', 'laskettelu', 'ski', 'monot']
  }
];

const locations = [
  {
    id: 'lake-1',
    name: 'Tuusulanjärvi',
    category: 'Lake',
    place: 'Tuusula',
    query: 'Tuusulanjärvi',
    products: ['sup-1', 'ebike-1']
  },
  {
    id: 'lake-2',
    name: 'Vesijärvi',
    category: 'Lake',
    place: 'Lahti',
    query: 'Vesijärvi',
    products: ['sup-1']
  },
  {
    id: 'lake-3',
    name: 'Päijänne',
    category: 'Lake',
    place: 'Asikkala',
    query: 'Päijänne',
    products: ['sup-1', 'ebike-1']
  },
  {
    id: 'ski-1',
    name: 'Levi ski resort',
    category: 'Ski resort',
    place: 'Levi',
    query: 'Levi ski resort',
    products: ['ski-1']
  },
  {
    id: 'bike-1',
    name: 'Helsinki Baana route',
    category: 'Bike route',
    place: 'Helsinki',
    query: 'Helsinki Baana',
    products: ['ebike-1']
  }
];

const categories = [
  { id: 'watersports', title: 'Vesillä', label: 'SUP ja melonta', query: 'sup' },
  { id: 'city', title: 'Kaupunki', label: 'Sähköpyörät ja retkipyörät', query: 'ebike' },
  { id: 'winter', title: 'Talvi', label: 'Hiihto ja laskettelu', query: 'ski' }
];

// Simple in-memory bookings store
let bookings = [];

function getProductById(id) {
  return products.find((product) => product.id === id);
}

function getProviderById(id) {
  return providers.find((provider) => provider.id === id);
}

function getReviewsFor(targetType, targetId) {
  return reviews.filter((review) => review.targetType === targetType && review.targetId === targetId);
}

function getAverageRating(items) {
  if (!items.length) return 0;
  return Number((items.reduce((sum, item) => sum + item.rating, 0) / items.length).toFixed(1));
}

function mapProducts(ids) {
  return ids.map((id) => getProductById(id)).filter(Boolean);
}

function buildProviderResponse(provider) {
  const providerReviews = getReviewsFor('provider', provider.id);
  return {
    ...provider,
    reviews: providerReviews,
    rating: getAverageRating(providerReviews),
    products: products.filter((product) => product.providerId === provider.id)
  };
}

function buildProductResponse(product) {
  return {
    ...product,
    provider: getProviderById(product.providerId)
  };
}

function buildLocationResponse(location) {
  const productsList = mapProducts(location.products);
  return {
    ...location,
    products: productsList,
    rating: getAverageRating(productsList.flatMap((product) => getReviewsFor('product', product.id))),
    productCount: productsList.length
  };
}

const reviews = [
  {
    id: 'review-1',
    targetType: 'product',
    targetId: 'sup-1',
    reviewer: 'Milla',
    rating: 5,
    comment: 'Erittäin hyvä SUP ja helposti varattavissa. Suosittelen!',
    createdAt: new Date().toISOString()
  },
  {
    id: 'review-2',
    targetType: 'provider',
    targetId: 'provider-1',
    reviewer: 'Antti',
    rating: 4,
    comment: 'Hyvä palvelu ja joustava nouto.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'review-3',
    targetType: 'renter',
    targetId: 'jari@example.com',
    reviewer: 'Mikko',
    rating: 4,
    comment: 'Vuokraaja hoiti varauksen hyvin ja palautti välineet ajallaan.',
    createdAt: new Date().toISOString()
  }
];

app.post('/api/auth/login', (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email required' });
  const token = `mock-token-${Date.now()}`;
  sessions[token] = { email };
  return res.json({ token, email });
});

function getSession(req) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return sessions[auth.replace('Bearer ', '')] || null;
}

app.get('/api/bookings', (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  res.json(bookings.filter((booking) => booking.email === session.email));
});

app.post('/api/bookings', (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const { productId, name, email } = req.body || {};
  if (!productId || !name || !email) return res.status(400).json({ error: 'Missing fields' });
  const product = getProductById(productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  const id = `bkg-${Date.now()}`;
  const booking = {
    id,
    productId,
    product,
    name,
    email,
    createdAt: new Date().toISOString()
  };
  bookings.push(booking);
  res.json(booking);
});

app.get('/api/categories', (req, res) => {
  res.json(categories);
});

app.get('/api/products', (req, res) => {
  res.json(products.map(buildProductResponse));
});

app.get('/api/products/:id', (req, res) => {
  const product = getProductById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(buildProductResponse(product));
});

app.get('/api/providers', (req, res) => {
  res.json(providers.map(buildProviderResponse));
});

app.get('/api/providers/:id', (req, res) => {
  const provider = getProviderById(req.params.id);
  if (!provider) return res.status(404).json({ error: 'Not found' });
  res.json(buildProviderResponse(provider));
});

app.get('/api/reviews', (req, res) => {
  const { targetType, targetId } = req.query;
  if (!targetType || !targetId) return res.status(400).json({ error: 'targetType and targetId are required' });
  res.json(reviews.filter((review) => review.targetType === targetType && review.targetId === targetId));
});

app.get('/api/reviews/renter', (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  res.json(reviews.filter((review) => review.targetType === 'renter' && review.targetId === session.email));
});

app.post('/api/reviews', (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const { targetType, targetId, rating, comment } = req.body || {};
  if (!targetType || !targetId || !rating) return res.status(400).json({ error: 'Missing fields' });
  const id = `review-${Date.now()}`;
  const review = {
    id,
    targetType,
    targetId,
    reviewer: session.email,
    rating,
    comment: comment || '',
    createdAt: new Date().toISOString()
  };
  reviews.push(review);
  res.json(review);
});

app.get('/api/locations', (req, res) => {
  const query = (req.query.q || '').trim().toLowerCase();

  const filtered = locations.filter((location) => {
    if (!query) return true;
    const matchesLocation = location.name.toLowerCase().includes(query) || location.place.toLowerCase().includes(query) || location.category.toLowerCase().includes(query);
    const productsList = mapProducts(location.products);
    const matchesProduct = productsList.some((product) => {
      const lowerName = product.name.toLowerCase();
      const lowerType = product.type.toLowerCase();
      const lowerTerms = product.searchTerms.join(' ').toLowerCase();
      return lowerName.includes(query) || lowerType.includes(query) || lowerTerms.includes(query);
    });
    return matchesLocation || matchesProduct;
  });

  res.json(filtered.map(buildLocationResponse));
});

app.listen(port, () => {
  console.log(`Mock API server running on http://localhost:${port}`);
});
