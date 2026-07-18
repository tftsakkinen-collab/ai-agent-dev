const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Simple mock data based on seeded profiles
const products = [
  {
    id: 'ebike-1',
    type: 'electric_bike',
    name: 'Gearspot Sähköpyörä — City 1',
    short: 'Sähköavusteinen kaupunkipyörä, matka-alue ~60 km.',
    price: '15 €/tunti · 60 €/päivä'
  },
  {
    id: 'sup-1',
    type: 'sup_board',
    name: 'Gearspot SUP — Inflatable 10\'6"',
    short: 'Helppo inflatettava SUP, mela ja pelastusliivi sisältyy.',
    price: '12 €/tunti · 40 €/päivä'
  }
];

// Simple in-memory bookings store
let bookings = [];

app.post('/api/auth/login', (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email required' });
  // Mock token
  return res.json({ token: 'mock-token', email });
});

app.get('/api/bookings', (req, res) => {
  const auth = req.headers['authorization'];
  if (!auth || auth !== 'Bearer mock-token') return res.status(401).json({ error: 'Unauthorized' });
  res.json(bookings);
});

app.post('/api/bookings', (req, res) => {
  const auth = req.headers['authorization'];
  if (!auth || auth !== 'Bearer mock-token') return res.status(401).json({ error: 'Unauthorized' });
  const { productId, name, email } = req.body || {};
  if (!productId || !name || !email) return res.status(400).json({ error: 'Missing fields' });
  const id = `bkg-${Date.now()}`;
  const b = { id, productId, name, email, createdAt: new Date().toISOString() };
  bookings.push(b);
  res.json(b);
});

app.get('/api/products', (req, res) => {
  res.json(products);
});

app.listen(port, () => {
  console.log(`Mock API server running on http://localhost:${port}`);
});
