const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const app = express();
const port = process.env.PORT || 3000;
const authSecret = process.env.AUTH_SECRET || 'gearspot-dev-auth-secret';
const exposeAuthCode = process.env.AUTH_EXPOSE_CODE !== 'false';
const AUTH_CODE_TTL_MS = 10 * 60 * 1000;
const pendingLoginCodes = new Map();

let kv = null;

if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
  kv = require('@vercel/kv').kv;
} else if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  kv = require('@upstash/redis').Redis.fromEnv();
}

const STORE_KEYS = {
  bookings: 'gearspot:bookings',
  dynamicReviews: 'gearspot:dynamicReviews',
  feedbackReports: 'gearspot:feedbackReports'
};

const BOOKING_STAGE = {
  APPROVED: 'approved',
  AWAITING_HANDOFF: 'awaiting_handoff',
  IN_USE: 'in_use',
  AWAITING_RETURN: 'awaiting_return',
  RETURNED: 'returned',
  COMPLETED: 'completed',
  DISPUTED: 'disputed'
};

const ALLOWED_HANDOFF_METHODS = ['lockbox_code', 'in_person'];

app.use(cors());
app.use(express.json());

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
let dynamicReviews = [];
const feedbackReports = [];
const feedbackLogPath = path.join(__dirname, '..', 'logs', 'feedback-reports.ndjson');

function persistFeedbackReport(report) {
  try {
    fs.mkdirSync(path.dirname(feedbackLogPath), { recursive: true });
    fs.appendFileSync(feedbackLogPath, `${JSON.stringify(report)}\n`);
  } catch (error) {
    // Vercel serverless file system may be readonly; logging still happens via console.
  }
}

async function readStoreList(key, memoryFallback) {
  if (!kv) {
    return memoryFallback;
  }

  const value = await kv.get(key);
  return Array.isArray(value) ? value : [];
}

async function writeStoreList(key, items) {
  if (!kv) {
    return;
  }

  await kv.set(key, items);
}

async function readBookings() {
  return readStoreList(STORE_KEYS.bookings, bookings);
}

async function saveBookings(items) {
  bookings = items;
  await writeStoreList(STORE_KEYS.bookings, items);
}

async function readDynamicReviews() {
  return readStoreList(STORE_KEYS.dynamicReviews, dynamicReviews);
}

async function saveDynamicReviews(items) {
  dynamicReviews = items;
  await writeStoreList(STORE_KEYS.dynamicReviews, items);
}

async function readFeedbackReports() {
  return readStoreList(STORE_KEYS.feedbackReports, feedbackReports);
}

async function saveFeedbackReports(items) {
  feedbackReports.length = 0;
  feedbackReports.push(...items);
  await writeStoreList(STORE_KEYS.feedbackReports, items);
}

async function getBookingById(id) {
  const allBookings = await readBookings();
  return allBookings.find((booking) => booking.id === id);
}

function isValidTransition(from, to) {
  const transitions = {
    [BOOKING_STAGE.APPROVED]: [BOOKING_STAGE.AWAITING_HANDOFF, BOOKING_STAGE.DISPUTED],
    [BOOKING_STAGE.AWAITING_HANDOFF]: [BOOKING_STAGE.IN_USE, BOOKING_STAGE.DISPUTED],
    [BOOKING_STAGE.IN_USE]: [BOOKING_STAGE.AWAITING_RETURN, BOOKING_STAGE.DISPUTED],
    [BOOKING_STAGE.AWAITING_RETURN]: [BOOKING_STAGE.RETURNED, BOOKING_STAGE.DISPUTED],
    [BOOKING_STAGE.RETURNED]: [BOOKING_STAGE.COMPLETED, BOOKING_STAGE.DISPUTED],
    [BOOKING_STAGE.COMPLETED]: [],
    [BOOKING_STAGE.DISPUTED]: [BOOKING_STAGE.COMPLETED]
  };

  return Boolean(transitions[from]?.includes(to));
}

function transitionBookingStage(booking, nextStage) {
  const current = booking.bookingStage || BOOKING_STAGE.APPROVED;
  if (!isValidTransition(current, nextStage)) {
    return { ok: false, error: `Invalid stage transition: ${current} -> ${nextStage}` };
  }
  booking.bookingStage = nextStage;
  booking.bookingStageUpdatedAt = new Date().toISOString();
  return { ok: true };
}

function getProductById(id) {
  return products.find((product) => product.id === id);
}

function getProviderById(id) {
  return providers.find((provider) => provider.id === id);
}

async function getReviewsFor(targetType, targetId) {
  const items = [...seededReviews, ...(await readDynamicReviews())];
  return items.filter((review) => review.targetType === targetType && review.targetId === targetId);
}

function getAverageRating(items) {
  if (!items.length) return 0;
  return Number((items.reduce((sum, item) => sum + item.rating, 0) / items.length).toFixed(1));
}

function mapProducts(ids) {
  return ids.map((id) => getProductById(id)).filter(Boolean);
}

async function buildProviderResponse(provider) {
  const providerReviews = await getReviewsFor('provider', provider.id);
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

async function buildLocationResponse(location) {
  const productsList = mapProducts(location.products);
  const productReviewLists = await Promise.all(productsList.map((product) => getReviewsFor('product', product.id)));
  return {
    ...location,
    products: productsList,
    rating: getAverageRating(productReviewLists.flat()),
    productCount: productsList.length
  };
}

const seededReviews = [
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

function normalizeEmail(rawEmail) {
  return String(rawEmail || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildUserIdFromEmail(email) {
  const hash = crypto.createHash('sha256').update(email).digest('hex');
  return `user-${hash.slice(0, 12)}`;
}

function signPayload(payloadBase64) {
  return crypto.createHmac('sha256', authSecret).update(payloadBase64).digest('base64url');
}

function buildAuthToken(email) {
  const payload = {
    email,
    userId: buildUserIdFromEmail(email),
    iat: Date.now()
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = signPayload(payloadBase64);
  return `gs-auth.${payloadBase64}.${signature}`;
}

function parseAuthToken(token) {
  if (!token || !token.startsWith('gs-auth.')) {
    return null;
  }

  const tokenBody = token.replace('gs-auth.', '');
  const parts = tokenBody.split('.');
  if (parts.length !== 2) {
    return null;
  }

  const [payloadBase64, signature] = parts;
  const expectedSignature = signPayload(payloadBase64);
  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson);
    if (!payload?.email || !payload?.userId) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function cleanupExpiredCodes() {
  const now = Date.now();
  for (const [email, entry] of pendingLoginCodes.entries()) {
    if (entry.expiresAt <= now) {
      pendingLoginCodes.delete(email);
    }
  }
}

function issueLoginCode(email) {
  cleanupExpiredCodes();
  const code = String(Math.floor(100000 + Math.random() * 900000));
  pendingLoginCodes.set(email, {
    code,
    expiresAt: Date.now() + AUTH_CODE_TTL_MS,
    attempts: 0
  });
  return code;
}

app.post('/api/auth/request-code', (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const code = issueLoginCode(email);
  console.info(`[auth] Login code for ${email}: ${code}`);

  const response = {
    ok: true,
    expiresInSeconds: Math.floor(AUTH_CODE_TTL_MS / 1000)
  };

  if (exposeAuthCode) {
    response.devCode = code;
  }

  return res.json(response);
});

app.post('/api/auth/verify-code', (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const code = String(req.body?.code || '').trim();

  if (!isValidEmail(email) || code.length !== 6) {
    return res.status(400).json({ error: 'Valid email and 6-digit code required' });
  }

  cleanupExpiredCodes();
  const entry = pendingLoginCodes.get(email);
  if (!entry) {
    return res.status(400).json({ error: 'Code expired or not requested' });
  }

  if (entry.attempts >= 5) {
    pendingLoginCodes.delete(email);
    return res.status(429).json({ error: 'Too many attempts. Request a new code.' });
  }

  if (entry.code !== code) {
    entry.attempts += 1;
    return res.status(400).json({ error: 'Invalid code' });
  }

  pendingLoginCodes.delete(email);
  const token = buildAuthToken(email);
  return res.json({ token, email, userId: buildUserIdFromEmail(email) });
});

// Backward-compatible endpoint for existing tests and clients.
app.post('/api/auth/login', (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  const token = buildAuthToken(email);
  return res.json({ token, email, userId: buildUserIdFromEmail(email) });
});

function getSession(req) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.replace('Bearer ', '');
  return parseAuthToken(token);
}

app.get('/api/me', (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  return res.json({ email: session.email, userId: session.userId });
});

app.get('/api/bookings', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const allBookings = await readBookings();
  res.json(allBookings.filter((booking) => booking.email === session.email));
});

app.post('/api/bookings', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const { productId, name, paymentMethod, cardLast4 } = req.body || {};
  if (!productId || !name) return res.status(400).json({ error: 'Missing fields' });
  const product = getProductById(productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  const id = `bkg-${Date.now()}`;
  const safeLast4 = String(cardLast4 || '').slice(-4);
  const booking = {
    id,
    productId,
    product,
    name,
    email: session.email,
    renterUserId: session.userId,
    bookingStatus: 'confirmed',
    bookingStage: BOOKING_STAGE.APPROVED,
    paymentStatus: 'paid',
    refundStatus: 'not_requested',
    paymentMethod: paymentMethod || 'mock_card',
    paymentSummary: safeLast4 ? `Mock ${paymentMethod || 'card'} ending ${safeLast4}` : 'Mock card payment approved',
    handoffMethod: 'in_person',
    handoffCode: null,
    ownerHandoffConfirmedAt: null,
    renterHandoffConfirmedAt: null,
    returnRequestedAt: null,
    returnedAt: null,
    completedAt: null,
    disputedAt: null,
    createdAt: new Date().toISOString()
  };
  booking.paidAt = booking.createdAt;
  const allBookings = await readBookings();
  allBookings.push(booking);
  await saveBookings(allBookings);
  res.json(booking);
});

app.post('/api/bookings/:id/refund', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const allBookings = await readBookings();
  const booking = allBookings.find((item) => item.id === req.params.id);
  if (!booking || booking.email !== session.email) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  if (booking.paymentStatus === 'refunded') {
    return res.status(400).json({ error: 'Booking already refunded' });
  }

  const { reason } = req.body || {};
  booking.paymentStatus = 'refunded';
  booking.refundStatus = 'refunded';
  booking.bookingStatus = 'cancelled';
  booking.refundReason = reason || 'customer_request';
  booking.refundedAt = new Date().toISOString();

  await saveBookings(allBookings);

  return res.json(booking);
});

app.post('/api/bookings/:id/handoff/setup', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const allBookings = await readBookings();
  const booking = allBookings.find((item) => item.id === req.params.id);
  if (!booking || booking.email !== session.email) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  const { handoffMethod, handoffCode } = req.body || {};
  if (!ALLOWED_HANDOFF_METHODS.includes(handoffMethod)) {
    return res.status(400).json({ error: 'Invalid handoffMethod' });
  }

  const move = transitionBookingStage(booking, BOOKING_STAGE.AWAITING_HANDOFF);
  if (!move.ok && booking.bookingStage !== BOOKING_STAGE.AWAITING_HANDOFF) {
    return res.status(400).json({ error: move.error });
  }

  booking.handoffMethod = handoffMethod;
  booking.handoffCode = handoffMethod === 'lockbox_code' ? String(handoffCode || '').trim() : null;
  booking.handoffConfiguredAt = new Date().toISOString();
  await saveBookings(allBookings);

  return res.json(booking);
});

app.post('/api/bookings/:id/handoff/confirm', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const allBookings = await readBookings();
  const booking = allBookings.find((item) => item.id === req.params.id);
  if (!booking || booking.email !== session.email) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  if (booking.bookingStage !== BOOKING_STAGE.AWAITING_HANDOFF && booking.bookingStage !== BOOKING_STAGE.IN_USE) {
    return res.status(400).json({ error: 'Booking is not in handoff stage' });
  }

  const { actor } = req.body || {};
  if (!['owner', 'renter'].includes(actor)) {
    return res.status(400).json({ error: 'actor must be owner or renter' });
  }

  const now = new Date().toISOString();
  if (actor === 'owner') booking.ownerHandoffConfirmedAt = now;
  if (actor === 'renter') booking.renterHandoffConfirmedAt = now;

  if (booking.ownerHandoffConfirmedAt && booking.renterHandoffConfirmedAt && booking.bookingStage !== BOOKING_STAGE.IN_USE) {
    const move = transitionBookingStage(booking, BOOKING_STAGE.IN_USE);
    if (!move.ok) {
      return res.status(400).json({ error: move.error });
    }
    booking.handoffStartedAt = now;
  }

  await saveBookings(allBookings);
  return res.json(booking);
});

app.post('/api/bookings/:id/return/request', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const allBookings = await readBookings();
  const booking = allBookings.find((item) => item.id === req.params.id);
  if (!booking || booking.email !== session.email) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  const move = transitionBookingStage(booking, BOOKING_STAGE.AWAITING_RETURN);
  if (!move.ok) {
    return res.status(400).json({ error: move.error });
  }

  booking.returnRequestedAt = new Date().toISOString();
  await saveBookings(allBookings);
  return res.json(booking);
});

app.post('/api/bookings/:id/return/confirm', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const allBookings = await readBookings();
  const booking = allBookings.find((item) => item.id === req.params.id);
  if (!booking || booking.email !== session.email) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  const move = transitionBookingStage(booking, BOOKING_STAGE.RETURNED);
  if (!move.ok) {
    return res.status(400).json({ error: move.error });
  }

  booking.returnedAt = new Date().toISOString();
  await saveBookings(allBookings);
  return res.json(booking);
});

app.post('/api/bookings/:id/complete', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const allBookings = await readBookings();
  const booking = allBookings.find((item) => item.id === req.params.id);
  if (!booking || booking.email !== session.email) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  const move = transitionBookingStage(booking, BOOKING_STAGE.COMPLETED);
  if (!move.ok) {
    return res.status(400).json({ error: move.error });
  }

  booking.completedAt = new Date().toISOString();
  booking.bookingStatus = 'completed';
  await saveBookings(allBookings);
  return res.json(booking);
});

app.post('/api/bookings/:id/dispute', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const allBookings = await readBookings();
  const booking = allBookings.find((item) => item.id === req.params.id);
  if (!booking || booking.email !== session.email) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  if (booking.bookingStage === BOOKING_STAGE.COMPLETED) {
    return res.status(400).json({ error: 'Completed booking cannot be disputed' });
  }

  if (booking.bookingStage !== BOOKING_STAGE.DISPUTED) {
    const move = transitionBookingStage(booking, BOOKING_STAGE.DISPUTED);
    if (!move.ok) {
      return res.status(400).json({ error: move.error });
    }
  }

  booking.disputedAt = new Date().toISOString();
  booking.disputeReason = String(req.body?.reason || 'unspecified').slice(0, 300);
  await saveBookings(allBookings);
  return res.json(booking);
});

app.post('/api/feedback-reports', async (req, res) => {
  const {
    message,
    reporterEmail,
    routeName,
    currentUrl,
    userAgent,
    viewport,
    context,
    errorDetails,
    priority,
    status
  } = req.body || {};

  if (!message && !errorDetails) {
    return res.status(400).json({ error: 'Message or errorDetails is required' });
  }

  const report = {
    id: `feedback-${Date.now()}`,
    message: message || 'Automatic error report',
    reporterEmail: reporterEmail || null,
    routeName: routeName || 'unknown',
    currentUrl: currentUrl || null,
    userAgent: userAgent || null,
    viewport: viewport || null,
    context: context || 'general_feedback',
    errorDetails: errorDetails || null,
    createdAt: new Date().toISOString(),
    status: status || 'new',
    priority: priority || 'medium'
  };

  const reports = await readFeedbackReports();
  reports.unshift(report);
  await saveFeedbackReports(reports);
  persistFeedbackReport(report);
  console.error('[feedback-report]', JSON.stringify(report));

  return res.status(201).json({ id: report.id, status: report.status });
});

app.patch('/api/feedback-reports/:id', async (req, res) => {
  const reports = await readFeedbackReports();
  const report = reports.find((item) => item.id === req.params.id);
  if (!report) {
    return res.status(404).json({ error: 'Feedback report not found' });
  }

  const { status, priority } = req.body || {};
  const allowedStatuses = ['new', 'in_progress', 'resolved'];
  const allowedPriorities = ['low', 'medium', 'high'];

  if (status && !allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  if (priority && !allowedPriorities.includes(priority)) {
    return res.status(400).json({ error: 'Invalid priority' });
  }

  if (status) {
    report.status = status;
  }

  if (priority) {
    report.priority = priority;
  }

  report.updatedAt = new Date().toISOString();
  await saveFeedbackReports(reports);
  return res.json(report);
});

app.get('/api/feedback-reports', async (req, res) => {
  res.json(await readFeedbackReports());
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

app.get('/api/providers', async (req, res) => {
  res.json(await Promise.all(providers.map(buildProviderResponse)));
});

app.get('/api/providers/:id', async (req, res) => {
  const provider = getProviderById(req.params.id);
  if (!provider) return res.status(404).json({ error: 'Not found' });
  res.json(await buildProviderResponse(provider));
});

app.get('/api/reviews', async (req, res) => {
  const { targetType, targetId } = req.query;
  if (!targetType || !targetId) return res.status(400).json({ error: 'targetType and targetId are required' });
  res.json(await getReviewsFor(targetType, targetId));
});

app.get('/api/reviews/renter', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  res.json(await getReviewsFor('renter', session.email));
});

app.post('/api/reviews', async (req, res) => {
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
  const reviews = await readDynamicReviews();
  reviews.push(review);
  await saveDynamicReviews(reviews);
  res.json(review);
});

app.get('/api/locations', async (req, res) => {
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

  res.json(await Promise.all(filtered.map(buildLocationResponse)));
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Mock API server running on http://localhost:${port}`);
  });
}

module.exports = app;
