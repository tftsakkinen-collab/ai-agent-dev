const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const app = express();
const port = process.env.PORT || 3000;
const authSecret = process.env.AUTH_SECRET || 'gearspot-dev-auth-secret';
const exposeAuthCode = process.env.AUTH_EXPOSE_CODE !== 'false';
const adminApiKey = process.env.ADMIN_API_KEY || '';
const AUTH_CODE_TTL_MS = 10 * 60 * 1000;
const AUTH_CODE_COOLDOWN_MS = 30 * 1000;
const AUTH_REQUEST_WINDOW_MS = 15 * 60 * 1000;
const AUTH_REQUEST_MAX_PER_WINDOW = 6;
const pendingLoginCodes = new Map();
const authRequestTracker = new Map();

let kv = null;

if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
  kv = require('@vercel/kv').kv;
} else if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  kv = require('@upstash/redis').Redis.fromEnv();
}

const STORE_KEYS = {
  bookings: 'gearspot:bookings',
  dynamicReviews: 'gearspot:dynamicReviews',
  feedbackReports: 'gearspot:feedbackReports',
  authAuditLogs: 'gearspot:authAuditLogs'
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
const ALLOWED_DEPOSIT_STATUS = ['not_required', 'held', 'released', 'claimed'];
const ALLOWED_REVIEW_ACTORS = ['owner', 'renter'];
const REVIEW_REVEAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  const incomingRequestId = String(req.headers['x-request-id'] || '').trim();
  const requestId = /^[A-Za-z0-9._-]{6,120}$/.test(incomingRequestId) ? incomingRequestId : `req_${crypto.randomUUID()}`;
  const startedAt = Date.now();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  const originalJson = res.json.bind(res);
  res.json = (payload) => {
    if (res.statusCode >= 400 && payload && typeof payload === 'object' && !Array.isArray(payload) && !Object.prototype.hasOwnProperty.call(payload, 'requestId')) {
      return originalJson({ ...payload, requestId });
    }
    return originalJson(payload);
  };

  res.on('finish', () => {
    if (!req.originalUrl.startsWith('/api/')) {
      return;
    }

    const durationMs = Date.now() - startedAt;
    const logLine = `[api] ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms requestId=${requestId}`;
    if (res.statusCode >= 500) {
      console.error(logLine);
      return;
    }
    console.info(logLine);
  });

  next();
});

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
const authAuditLogs = [];
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
  if (Array.isArray(value) && value.length > 0) {
    return value;
  }

  return memoryFallback;
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
  const snapshot = Array.isArray(items) ? [...items] : [];
  feedbackReports.length = 0;
  feedbackReports.push(...snapshot);
  await writeStoreList(STORE_KEYS.feedbackReports, snapshot);
}

async function readAuthAuditLogs() {
  return readStoreList(STORE_KEYS.authAuditLogs, authAuditLogs);
}

async function saveAuthAuditLogs(items) {
  const snapshot = Array.isArray(items) ? [...items] : [];
  authAuditLogs.length = 0;
  authAuditLogs.push(...snapshot);
  await writeStoreList(STORE_KEYS.authAuditLogs, snapshot);
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

function updateBookingReviewVisibility(booking) {
  if (!booking.reviewFlow) {
    return;
  }

  const ownerSubmitted = Boolean(booking.reviewFlow.ownerReview);
  const renterSubmitted = Boolean(booking.reviewFlow.renterReview);
  const windowExpired = booking.reviewFlow.reviewWindowEndsAt
    ? new Date(booking.reviewFlow.reviewWindowEndsAt).getTime() <= Date.now()
    : false;

  booking.reviewFlow.visibility = ownerSubmitted && renterSubmitted ? 'visible' : windowExpired ? 'visible' : 'hidden';
}

function getSafeBookingView(booking) {
  const copy = { ...booking };

  if (copy.handoffMethod === 'lockbox_code') {
    const revealAllowed = copy.bookingStage === BOOKING_STAGE.IN_USE || copy.bookingStage === BOOKING_STAGE.AWAITING_RETURN || copy.bookingStage === BOOKING_STAGE.RETURNED || copy.bookingStage === BOOKING_STAGE.COMPLETED;
    copy.handoffCode = revealAllowed ? copy.handoffCode : null;
  }

  return copy;
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

function getClientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  if (forwarded) {
    return forwarded;
  }
  return req.socket?.remoteAddress || 'unknown';
}

async function appendAuthAuditLog(event, req, details = {}) {
  const logs = await readAuthAuditLogs();
  const entry = {
    id: `auth-audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    event,
    requestId: req.requestId || null,
    ip: getClientIp(req),
    timestamp: new Date().toISOString(),
    ...details
  };
  logs.unshift(entry);
  await saveAuthAuditLogs(logs.slice(0, 500));
}

function isAdminAuthorized(req) {
  if (!adminApiKey) {
    return true;
  }
  const provided = String(req.headers['x-admin-key'] || '');
  return provided && provided === adminApiKey;
}

function getAdminActor(req) {
  return String(req.headers['x-admin-user'] || 'admin').slice(0, 100);
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

function evaluateAuthRequestPolicy(req, email) {
  const now = Date.now();
  const key = `${getClientIp(req)}|${email}`;
  const current = authRequestTracker.get(key) || {
    windowStartedAt: now,
    count: 0,
    lastRequestedAt: 0,
    blockedUntil: 0
  };

  if (current.blockedUntil > now) {
    return {
      ok: false,
      reason: 'blocked',
      retryAfterSeconds: Math.ceil((current.blockedUntil - now) / 1000),
      key,
      state: current
    };
  }

  if (now - current.windowStartedAt > AUTH_REQUEST_WINDOW_MS) {
    current.windowStartedAt = now;
    current.count = 0;
  }

  const cooldownRemaining = AUTH_CODE_COOLDOWN_MS - (now - current.lastRequestedAt);
  if (current.lastRequestedAt && cooldownRemaining > 0) {
    return {
      ok: false,
      reason: 'cooldown',
      retryAfterSeconds: Math.ceil(cooldownRemaining / 1000),
      key,
      state: current
    };
  }

  if (current.count >= AUTH_REQUEST_MAX_PER_WINDOW) {
    current.blockedUntil = now + AUTH_REQUEST_WINDOW_MS;
    authRequestTracker.set(key, current);
    return {
      ok: false,
      reason: 'rate_limit',
      retryAfterSeconds: Math.ceil(AUTH_REQUEST_WINDOW_MS / 1000),
      key,
      state: current
    };
  }

  current.count += 1;
  current.lastRequestedAt = now;
  authRequestTracker.set(key, current);
  return { ok: true, key, state: current };
}

app.post('/api/auth/request-code', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!isValidEmail(email)) {
    await appendAuthAuditLog('request_code_invalid_email', req, { email });
    return res.status(400).json({ error: 'Valid email required' });
  }

  const policy = evaluateAuthRequestPolicy(req, email);
  if (!policy.ok) {
    await appendAuthAuditLog('request_code_blocked', req, {
      email,
      reason: policy.reason,
      retryAfterSeconds: policy.retryAfterSeconds
    });
    return res.status(429).json({
      error: 'Too many requests. Please wait before requesting a new code.',
      reason: policy.reason,
      retryAfterSeconds: policy.retryAfterSeconds
    });
  }

  const code = issueLoginCode(email);
  console.info(`[auth] Login code for ${email}: ${code}`);
  await appendAuthAuditLog('request_code_sent', req, {
    email,
    expiresInSeconds: Math.floor(AUTH_CODE_TTL_MS / 1000)
  });

  const response = {
    ok: true,
    expiresInSeconds: Math.floor(AUTH_CODE_TTL_MS / 1000)
  };

  if (exposeAuthCode) {
    response.devCode = code;
  }

  return res.json(response);
});

app.post('/api/auth/verify-code', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const code = String(req.body?.code || '').trim();

  if (!isValidEmail(email) || code.length !== 6) {
    await appendAuthAuditLog('verify_code_invalid_payload', req, { email });
    return res.status(400).json({ error: 'Valid email and 6-digit code required' });
  }

  cleanupExpiredCodes();
  const entry = pendingLoginCodes.get(email);
  if (!entry) {
    await appendAuthAuditLog('verify_code_missing_or_expired', req, { email });
    return res.status(400).json({ error: 'Code expired or not requested' });
  }

  if (entry.attempts >= 5) {
    pendingLoginCodes.delete(email);
    await appendAuthAuditLog('verify_code_locked', req, { email });
    return res.status(429).json({ error: 'Too many attempts. Request a new code.' });
  }

  if (entry.code !== code) {
    entry.attempts += 1;
    await appendAuthAuditLog('verify_code_failed', req, { email, attempts: entry.attempts });
    return res.status(400).json({ error: 'Invalid code' });
  }

  pendingLoginCodes.delete(email);
  const token = buildAuthToken(email);
  await appendAuthAuditLog('verify_code_success', req, { email });
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
  res.json(allBookings.filter((booking) => booking.email === session.email).map(getSafeBookingView));
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
    depositAmount: 0,
    depositStatus: 'not_required',
    depositClaimedAmount: 0,
    depositClaimReason: null,
    evidencePhotosBefore: [],
    evidencePhotosAfter: [],
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
    reviewFlow: {
      visibility: 'hidden',
      reviewWindowEndsAt: null,
      ownerReview: null,
      renterReview: null,
      ownerReviewSubmittedAt: null,
      renterReviewSubmittedAt: null
    },
    createdAt: new Date().toISOString()
  };
  booking.paidAt = booking.createdAt;
  const allBookings = await readBookings();
  allBookings.push(booking);
  await saveBookings(allBookings);
  res.json(getSafeBookingView(booking));
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

  return res.json(getSafeBookingView(booking));
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
  return res.json(getSafeBookingView(booking));
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
  return res.json(getSafeBookingView(booking));
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
  return res.json(getSafeBookingView(booking));
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
  booking.reviewFlow.reviewWindowEndsAt = new Date(Date.now() + REVIEW_REVEAL_WINDOW_MS).toISOString();
  updateBookingReviewVisibility(booking);
  await saveBookings(allBookings);
  return res.json(getSafeBookingView(booking));
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
  booking.disputeResolutionStatus = 'open';
  booking.disputeResolutionNote = null;
  booking.disputeResolvedAt = null;
  booking.disputeResolvedBy = null;
  await saveBookings(allBookings);
  return res.json(getSafeBookingView(booking));
});

app.get('/api/admin/auth-audit-logs', async (req, res) => {
  if (!isAdminAuthorized(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 500);
  const logs = await readAuthAuditLogs();
  return res.json(logs.slice(0, limit));
});

app.get('/api/admin/disputes', async (req, res) => {
  if (!isAdminAuthorized(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const status = String(req.query.status || 'all');
  const allBookings = await readBookings();
  const disputes = allBookings.filter((booking) => booking.bookingStage === BOOKING_STAGE.DISPUTED || booking.disputeResolutionStatus);

  const filtered = status === 'all' ? disputes : disputes.filter((booking) => String(booking.disputeResolutionStatus || 'open') === status);
  return res.json(filtered.map(getSafeBookingView));
});

app.patch('/api/admin/disputes/:id', async (req, res) => {
  if (!isAdminAuthorized(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const allBookings = await readBookings();
  const booking = allBookings.find((item) => item.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  if (booking.bookingStage !== BOOKING_STAGE.DISPUTED && !booking.disputeResolutionStatus) {
    return res.status(400).json({ error: 'Booking is not in dispute state' });
  }

  const resolutionStatus = String(req.body?.resolutionStatus || '').trim();
  const note = String(req.body?.note || '').trim();
  const closeBooking = Boolean(req.body?.closeBooking);

  if (!['resolved', 'rejected'].includes(resolutionStatus)) {
    return res.status(400).json({ error: 'resolutionStatus must be resolved or rejected' });
  }

  booking.disputeResolutionStatus = resolutionStatus;
  booking.disputeResolutionNote = note || null;
  booking.disputeResolvedAt = new Date().toISOString();
  booking.disputeResolvedBy = getAdminActor(req);

  if (closeBooking && booking.bookingStage === BOOKING_STAGE.DISPUTED) {
    const move = transitionBookingStage(booking, BOOKING_STAGE.COMPLETED);
    if (!move.ok) {
      return res.status(400).json({ error: move.error });
    }
    booking.bookingStatus = 'completed';
    booking.completedAt = booking.completedAt || new Date().toISOString();
  }

  await saveBookings(allBookings);
  return res.json(getSafeBookingView(booking));
});

app.post('/api/bookings/:id/deposit/setup', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const allBookings = await readBookings();
  const booking = allBookings.find((item) => item.id === req.params.id);
  if (!booking || booking.email !== session.email) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  const depositAmount = Number(req.body?.depositAmount || 0);
  if (Number.isNaN(depositAmount) || depositAmount < 0) {
    return res.status(400).json({ error: 'depositAmount must be a non-negative number' });
  }

  booking.depositAmount = depositAmount;
  booking.depositStatus = depositAmount > 0 ? 'held' : 'not_required';
  booking.depositHeldAt = depositAmount > 0 ? new Date().toISOString() : null;
  booking.depositReleasedAt = null;
  booking.depositClaimedAt = null;
  booking.depositClaimedAmount = 0;
  booking.depositClaimReason = null;

  await saveBookings(allBookings);
  return res.json(getSafeBookingView(booking));
});

app.post('/api/bookings/:id/deposit/release', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const allBookings = await readBookings();
  const booking = allBookings.find((item) => item.id === req.params.id);
  if (!booking || booking.email !== session.email) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  if (!ALLOWED_DEPOSIT_STATUS.includes(booking.depositStatus)) {
    return res.status(400).json({ error: 'Invalid deposit status' });
  }

  if (booking.depositStatus !== 'held') {
    return res.status(400).json({ error: 'Deposit can only be released from held status' });
  }

  booking.depositStatus = 'released';
  booking.depositReleasedAt = new Date().toISOString();
  await saveBookings(allBookings);
  return res.json(getSafeBookingView(booking));
});

app.post('/api/bookings/:id/deposit/claim', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const allBookings = await readBookings();
  const booking = allBookings.find((item) => item.id === req.params.id);
  if (!booking || booking.email !== session.email) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  if (!ALLOWED_DEPOSIT_STATUS.includes(booking.depositStatus)) {
    return res.status(400).json({ error: 'Invalid deposit status' });
  }

  if (booking.depositStatus !== 'held') {
    return res.status(400).json({ error: 'Deposit can only be claimed from held status' });
  }

  const requestedAmount = Number(req.body?.amount || booking.depositAmount || 0);
  if (Number.isNaN(requestedAmount) || requestedAmount < 0) {
    return res.status(400).json({ error: 'amount must be a non-negative number' });
  }

  booking.depositStatus = 'claimed';
  booking.depositClaimedAmount = Math.min(requestedAmount, booking.depositAmount || 0);
  booking.depositClaimReason = String(req.body?.reason || 'damage_reported').slice(0, 300);
  booking.depositClaimedAt = new Date().toISOString();

  await saveBookings(allBookings);
  return res.json(getSafeBookingView(booking));
});

app.post('/api/bookings/:id/evidence', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const allBookings = await readBookings();
  const booking = allBookings.find((item) => item.id === req.params.id);
  if (!booking || booking.email !== session.email) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  const phase = String(req.body?.phase || '').trim();
  const rawPhotos = Array.isArray(req.body?.photos) ? req.body.photos : [];
  if (!['before', 'after'].includes(phase)) {
    return res.status(400).json({ error: 'phase must be before or after' });
  }
  if (!rawPhotos.length) {
    return res.status(400).json({ error: 'At least one photo is required' });
  }

  const photos = rawPhotos
    .map((photo) => String(photo || '').trim())
    .filter(Boolean)
    .slice(0, 10)
    .map((url) => ({ url, uploadedAt: new Date().toISOString(), uploadedBy: session.email }));

  if (!photos.length) {
    return res.status(400).json({ error: 'photos must contain valid URLs' });
  }

  if (phase === 'before') {
    booking.evidencePhotosBefore = [...(booking.evidencePhotosBefore || []), ...photos];
    booking.evidenceBeforeUpdatedAt = new Date().toISOString();
  } else {
    booking.evidencePhotosAfter = [...(booking.evidencePhotosAfter || []), ...photos];
    booking.evidenceAfterUpdatedAt = new Date().toISOString();
  }

  await saveBookings(allBookings);
  return res.json(getSafeBookingView(booking));
});

app.post('/api/bookings/:id/reviews', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const allBookings = await readBookings();
  const booking = allBookings.find((item) => item.id === req.params.id);
  if (!booking || booking.email !== session.email) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  if (booking.bookingStage !== BOOKING_STAGE.COMPLETED) {
    return res.status(400).json({ error: 'Reviews are allowed only for completed bookings' });
  }

  const actor = String(req.body?.actor || '').trim();
  const rating = Number(req.body?.rating);
  const comment = String(req.body?.comment || '').trim();

  if (!ALLOWED_REVIEW_ACTORS.includes(actor)) {
    return res.status(400).json({ error: 'actor must be owner or renter' });
  }

  if (Number.isNaN(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'rating must be between 1 and 5' });
  }

  if (!booking.reviewFlow) {
    booking.reviewFlow = {
      visibility: 'hidden',
      reviewWindowEndsAt: new Date(Date.now() + REVIEW_REVEAL_WINDOW_MS).toISOString(),
      ownerReview: null,
      renterReview: null,
      ownerReviewSubmittedAt: null,
      renterReviewSubmittedAt: null
    };
  }

  const reviewData = {
    id: `booking-review-${Date.now()}`,
    actor,
    reviewer: session.email,
    rating,
    comment,
    createdAt: new Date().toISOString()
  };

  if (actor === 'owner') {
    booking.reviewFlow.ownerReview = reviewData;
    booking.reviewFlow.ownerReviewSubmittedAt = reviewData.createdAt;
  } else {
    booking.reviewFlow.renterReview = reviewData;
    booking.reviewFlow.renterReviewSubmittedAt = reviewData.createdAt;
  }

  updateBookingReviewVisibility(booking);
  await saveBookings(allBookings);

  return res.status(201).json({
    bookingId: booking.id,
    visibility: booking.reviewFlow.visibility,
    ownerReviewSubmitted: Boolean(booking.reviewFlow.ownerReview),
    renterReviewSubmitted: Boolean(booking.reviewFlow.renterReview)
  });
});

app.get('/api/bookings/:id/reviews', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const allBookings = await readBookings();
  const booking = allBookings.find((item) => item.id === req.params.id);
  if (!booking || booking.email !== session.email) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  if (!booking.reviewFlow) {
    return res.json({
      visibility: 'hidden',
      reviewWindowEndsAt: null,
      ownerReviewSubmitted: false,
      renterReviewSubmitted: false,
      reviews: []
    });
  }

  updateBookingReviewVisibility(booking);
  await saveBookings(allBookings);

  if (booking.reviewFlow.visibility === 'hidden') {
    return res.json({
      visibility: 'hidden',
      reviewWindowEndsAt: booking.reviewFlow.reviewWindowEndsAt,
      ownerReviewSubmitted: Boolean(booking.reviewFlow.ownerReview),
      renterReviewSubmitted: Boolean(booking.reviewFlow.renterReview),
      reviews: []
    });
  }

  const visibleReviews = [booking.reviewFlow.ownerReview, booking.reviewFlow.renterReview].filter(Boolean);
  return res.json({
    visibility: 'visible',
    reviewWindowEndsAt: booking.reviewFlow.reviewWindowEndsAt,
    ownerReviewSubmitted: Boolean(booking.reviewFlow.ownerReview),
    renterReviewSubmitted: Boolean(booking.reviewFlow.renterReview),
    reviews: visibleReviews
  });
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

app.use((error, req, res, next) => {
  console.error(`[api] Unhandled error requestId=${req.requestId || 'unknown'}`, error);
  if (res.headersSent) {
    return next(error);
  }
  return res.status(500).json({ error: 'Internal Server Error' });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Mock API server running on http://localhost:${port}`);
  });
}

module.exports = app;
