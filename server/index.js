const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getStoreValue, setStoreValue } = require('./sqlite-store');

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const s3Client = process.env.AWS_REGION && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
}) : null;

async function uploadToS3(filename, buffer, mimetype) {
  if (!s3Client || !process.env.AWS_BUCKET_NAME) return null;
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: filename,
    Body: buffer,
    ContentType: mimetype,
    ACL: 'public-read'
  });
  await s3Client.send(command);
  return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`;
}

const Stripe = require('stripe');
const sgMail = require('@sendgrid/mail');
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

async function sendEmail(to, subject, text, html) { // eslint-disable-line no-unused-vars
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[Email Mock] To: ${to} | Subject: ${subject}`);
    console.log(text);
    return;
  }

  try {
    await sgMail.send({
      to,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@gearspot.fi',
      subject,
      text,
      html: html || text.replace(/\n/g, '<br>')
    });
    console.log(`[email] Sent successfully to ${to}`);
  } catch (error) {
    console.error('[email-error] Failed to send email via SendGrid', error);
  }
}

const multer = require('multer');
const { createAuthProvider } = require('./authProvider');
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });
let sharp;
try { sharp = require('sharp'); } catch(e) { console.warn('Sharp not installed, skipping optimization'); }
const app = express();
const port = process.env.PORT || 3000;
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy'); // eslint-disable-line no-unused-vars
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
  notifications: 'gearspot:notifications',
  bookings: 'gearspot:bookings',
  dynamicReviews: 'gearspot:dynamicReviews',
  feedbackReports: 'gearspot:feedbackReports',
  authAuditLogs: 'gearspot:authAuditLogs',
  ownerListings: 'gearspot:ownerListings'
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
const ALLOWED_LISTING_MODERATION_STATUS = ['pending', 'approved', 'rejected'];
const REVIEW_REVEAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const authProvider = createAuthProvider({
  providerName: process.env.AUTH_PROVIDER || 'local_code',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY
});

const defaultAllowedOrigins = ['https://gearspot.xyz', 'https://www.gearspot.xyz', 'https://ai-agent-dev-eight.vercel.app'];
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (process.env.ALLOWED_ORIGINS) {
      const allowed = process.env.ALLOWED_ORIGINS.split(',');
      if (allowed.includes(origin) || allowed.includes('*')) return callback(null, true);
    }
    return callback(null, true);
  },
  optionsSuccessStatus: 200,
  credentials: true
};
app.use(cors(corsOptions));
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (!endpointSecret) {
      console.warn('STRIPE_WEBHOOK_SECRET is not configured! Failing webhook requests for security.');
      return res.status(400).send(`Webhook Error: Missing endpoint secret`);
    }
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(`[stripe-webhook-error] Signature verification failed:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const bookingId = paymentIntent.metadata.bookingId;

      console.log(`[stripe] Payment successful for booking ${bookingId}`);

      if (bookingId) {
        const allBookings = await readBookings();
        const booking = allBookings.find(b => b.id === bookingId);

        if (booking) {
          booking.paymentStatus = 'paid';
          booking.bookingStage = BOOKING_STAGE.APPROVED;
          booking.bookingStatus = 'confirmed';
          booking.paidAt = new Date().toISOString();
          booking.paymentSummary = `Stripe Payment (Intent: ${paymentIntent.id})`;

          await saveBookings(allBookings);

          // Lähetetään sähköpostikuitti käyttäjälle onnistuneesta maksusta
          await sendEmail(
            booking.email,
            `Varausvahvistus: ${booking.product.name}`,
            `Hei ${booking.name},\n\nVarauksesi lautaan ${booking.product.name} on vahvistettu ja maksettu!\n\nAika: ${booking.selectedDate} klo ${booking.selectedTime}\n\nVoit tarkastella varausta sovelluksen Profiili-sivulla.\n\nYstävällisin terveisin,\nGearSpot-tiimi`,
            `<h3>Hei ${booking.name}!</h3><p>Varauksesi lautaan <strong>${booking.product.name}</strong> on vahvistettu ja maksettu!</p><p><strong>Aika:</strong> ${booking.selectedDate} klo ${booking.selectedTime}</p><p>Voit tarkastella varauksen tietoja ja viestiä omistajan kanssa sovelluksen Profiili-sivulla.</p><p>Ystävällisin terveisin,<br>GearSpot-tiimi</p>`
          );
        }
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object;
      const bookingId = paymentIntent.metadata.bookingId;

      console.log(`[stripe] Payment failed for booking ${bookingId}`);

      if (bookingId) {
        const allBookings = await readBookings();
        const booking = allBookings.find(b => b.id === bookingId);

        if (booking) {
          booking.paymentStatus = 'failed';
          booking.paymentSummary = `Stripe Payment Failed`;

          await saveBookings(allBookings);
        }
      }
    }
  } catch (error) {
     console.error(`[stripe-webhook-error] Error handling event ${event?.type}:`, error.message);
     return res.status(500).send('Webhook handler failed');
  }

  res.json({ received: true });
});

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
    name: 'Gearspot Oulu SUP Pilot',
    description: 'Pilottivuokraamo Oulun alueelle: SUP-laudat turvallisella noudolla ja palautuksella.'
  },
  {
    id: 'provider-2',
    name: 'Nallikari Paddle Club',
    description: 'Paikallisten vuokraajien SUP-kalusto Nallikarissa ja Oulujoen varressa.'
  }
];

const products = [
  {
    id: 'sup-1',
    type: 'sup_board',
    name: "Oulu SUP Pro — Inflatable 10'6\"",
    short: 'Helppo all-around SUP Oulun kesään, mela, karkuremmi ja liivi mukana.',
    description: 'Laadukas ja erittäin stabiili SUP-lauta aloittelijoille ja kokeneemmille suppailijoille. Sopii erinomaisesti rennolle retkelle Nallikariin tai Oulujoelle.',
    price: '15 €/tunti · 60 €/päivä',
    bookingMode: 'instant',
    locationName: 'Nallikari Beach, Oulu',
    rating: 4.9,
    reviewCount: 18,
    photos: ['https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80'],
    providerId: 'provider-1',
    searchTerms: ['sup', 'lauta', 'oulu', 'nallikari', 'stand up paddle']
  },
  {
    id: 'sup-2',
    type: 'sup_board',
    name: "Nallikari Touring SUP 11'2\"",
    short: 'Vakaa touring-lauta pidemmille Oulun merirantareiteille.',
    description: 'Pidempi ja suuntavakaampi SUP-lauta kuntosuppailuun ja pidemmille päiväretkille Oulun merimaisemissa.',
    price: '18 €/tunti · 65 €/päivä',
    bookingMode: 'instant',
    locationName: 'Nallikari, Oulu',
    rating: 5.0,
    reviewCount: 12,
    photos: ['https://images.unsplash.com/photo-1517649763962-0c623266010b?auto=format&fit=crop&w=800&q=80'],
    providerId: 'provider-2',
    searchTerms: ['sup', 'lauta', 'oulu', 'tuppisaari', 'touring']
  },
  {
    id: 'sup-3',
    type: 'sup_board',
    name: 'Hietasaari SUP — Beginner Set',
    short: 'Aloittelijapaketti, kevyt lauta ja helppo kantaa rannalle.',
    description: 'Todella helppo ja turvallinen lauta ensikertalaiselle. Mukana säädettävä mela ja kelluntaliivit.',
    price: '12 €/tunti · 45 €/päivä',
    bookingMode: 'instant',
    locationName: 'Hietasaari, Oulu',
    rating: 4.8,
    reviewCount: 9,
    photos: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'],
    providerId: 'provider-2',
    searchTerms: ['sup', 'aloittelija', 'oulu', 'hietasaari', 'lauta']
  },
  {
    id: 'sup-4',
    type: 'sup_board',
    name: 'Kuivasjärvi Family & Pet SUP',
    short: 'Erittäin leveä ja vakaa lauta Kuivasjärvellä. Sopii myös koiran kanssa suppailuun.',
    description: 'Extra-leveä muotoilu takaa maksimistabiliteetin. Täydellinen lapsen tai koiran kanssa suppailuun tyynellä järvellä.',
    price: '12 €/tunti · 50 €/päivä',
    bookingMode: 'instant',
    locationName: 'Kuivasjärvi, Oulu',
    rating: 4.9,
    reviewCount: 15,
    photos: ['https://images.unsplash.com/photo-1520255870062-bd79d3865de7?auto=format&fit=crop&w=800&q=80'],
    providerId: 'provider-1',
    searchTerms: ['sup', 'lauta', 'oulu', 'kuivasjärvi', 'koira', 'perhe']
  },
  {
    id: 'sup-5',
    type: 'sup_board',
    name: "Tuira Oulujoki River Cruiser 10'8\"",
    short: 'Ketterä ja kestävä lauta Oulujoen suistoalueen tutkimiseen.',
    description: 'Erinomainen lauta Tuiran uimarannalta matkaan lähtemiseen. Rullaa kevyesti joen virtojen mukana.',
    price: '14 €/tunti · 55 €/päivä',
    bookingMode: 'instant',
    locationName: 'Tuira (Oulujoki), Oulu',
    rating: 4.9,
    reviewCount: 14,
    photos: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'],
    providerId: 'provider-1',
    searchTerms: ['sup', 'tuira', 'oulu', 'oulujoki', 'joki']
  },
  {
    id: 'sup-6',
    type: 'sup_board',
    name: "Linnanmaa Speed SUP 12'6\"",
    short: 'Sporttinen retkilauta nopeampaan menoon ja kuntoilijoille.',
    description: 'Aerodynaaminen ja pitkä muotoilu. Täydellinen aktiivikuntoilijalle pitkille retkille Oulun vesistöissä.',
    price: '20 €/tunti · 70 €/päivä',
    bookingMode: 'instant',
    locationName: 'Linnanmaa, Oulu',
    rating: 5.0,
    reviewCount: 7,
    photos: ['https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80'],
    providerId: 'provider-1',
    searchTerms: ['sup', 'linnanmaa', 'oulu', 'kuntoilu', 'speed']
  },
  {
    id: 'sup-7',
    type: 'sup_board',
    name: 'Dual Tandem SUP (2 Person / Perhe)',
    short: 'Kaksihengen suurlauta 200 kg kantavuudella pariskunnille ja kavereille.',
    description: 'Jättikokoinen tandem-SUP kahdelle melojalle. Mukana kaksi melaa ja kahdet kelluntaliivit.',
    price: '25 €/tunti · 90 €/päivä',
    bookingMode: 'instant',
    locationName: 'Tuiran ranta, Oulu',
    rating: 5.0,
    reviewCount: 11,
    photos: ['https://images.unsplash.com/photo-1517649763962-0c623266010b?auto=format&fit=crop&w=800&q=80'],
    providerId: 'provider-2',
    searchTerms: ['sup', 'tandem', 'tuira', 'oulu', 'kaksihengen']
  },
  {
    id: 'sup-8',
    type: 'sup_board',
    name: 'Oulu Premium Carbon SUP',
    short: 'Kevyt hiilikuituvahvisteinen pro-lauta vaativalle harrastajalle.',
    description: 'Erittäin jämäkkä ja kevyt harrastajalauta hiilikuitumelalla. Parasta mitä Oulun vesiltä löytyy.',
    price: '22 €/tunti · 80 €/päivä',
    bookingMode: 'instant',
    locationName: 'Nallikari, Oulu',
    rating: 5.0,
    reviewCount: 8,
    photos: ['https://images.unsplash.com/photo-1520255870062-bd79d3865de7?auto=format&fit=crop&w=800&q=80'],
    providerId: 'provider-1',
    searchTerms: ['sup', 'nallikari', 'carbon', 'premium', 'oulu']
  }
];

const locations = [
  {
    id: 'oulu-1',
    name: 'Nallikari',
    category: 'Lake',
    place: 'Oulu',
    query: 'Nallikari Oulu',
    products: ['sup-1', 'sup-2']
  },
  {
    id: 'oulu-2',
    name: 'Hietasaari',
    category: 'Lake',
    place: 'Oulu',
    query: 'Hietasaari Oulu',
    products: ['sup-3', 'sup-1']
  },
  {
    id: 'oulu-3',
    name: 'Tuiran ranta / Oulujoki',
    category: 'River',
    place: 'Oulu',
    query: 'Tuiran ranta Oulu',
    products: ['sup-2', 'sup-3']
  }
,
  {
    id: 'oulu-4',
    name: 'Kuivasjärvi',
    category: 'Lake',
    place: 'Oulu',
    query: 'Kuivasjärvi Oulu',
    products: ['sup-4']
  }];

const categories = [
  { id: 'oulu-sup', title: 'Oulu SUP Pilot', label: 'SUP-laudat Oulun alueella', query: 'oulu sup' }
];

// Simple in-memory bookings store
let bookings = [];
let dynamicReviews = [];
let ownerListings = [];
let users = {}; // userId -> { email, name, phone, avatarUrl }
const feedbackReports = [];

const notifications = [];

async function readNotifications() {
  return readStoreList(STORE_KEYS.notifications, notifications);
}

async function saveNotifications(items) {
  const snapshot = [...items];
  notifications.length = 0;
  notifications.push(...snapshot);
  await writeStoreList(STORE_KEYS.notifications, snapshot);
}

function generateNotification(userId, message, type = 'info', metadata = {}) {
  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId,
    message,
    type,
    metadata,
    createdAt: new Date().toISOString(),
    read: false
  };
}
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

async function readOwnerListings() {
  const data = await readStoreList(STORE_KEYS.ownerListings, ownerListings);
  const snapshot = Array.isArray(data) ? [...data] : [];
  ownerListings = snapshot;
  return snapshot;
}

async function saveOwnerListings(items) {
  const snapshot = Array.isArray(items) ? [...items] : [];
  ownerListings = snapshot;
  await writeStoreList(STORE_KEYS.ownerListings, snapshot);
}

function getPublicProducts() {
  return [...products, ...ownerListings.filter((listing) => listing.moderationStatus === 'approved')];
}

function buildOwnerProviderId(email) {
  return `owner-${crypto.createHash('sha256').update(String(email)).digest('hex').slice(0, 10)}`;
}

function getCommunityProviders({ includePending = false } = {}) {
  return Array.from(
    new Map(
      ownerListings
        .filter((listing) => listing.ownerEmail)
        .filter((listing) => includePending || listing.moderationStatus === 'approved')
        .map((listing) => [
          listing.providerId,
          {
            id: listing.providerId,
            name: listing.provider?.name || 'Yksityinen vuokraaja',
            description: 'Yhteisön jäsenen oma SUP-listaus'
          }
        ])
    ).values()
  );
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

function computePilotMetrics(bookingsList, periodDays) {
  const totalBookings = bookingsList.length;
  const completedBookings = bookingsList.filter((booking) => booking.bookingStage === BOOKING_STAGE.COMPLETED || booking.bookingStatus === 'completed').length;
  const disputedBookings = bookingsList.filter((booking) => booking.bookingStage === BOOKING_STAGE.DISPUTED || Boolean(booking.disputedAt)).length;

  const allReviewRatings = bookingsList.flatMap((booking) => {
    const ownerRating = booking.reviewFlow?.ownerReview?.rating;
    const renterRating = booking.reviewFlow?.renterReview?.rating;
    return [ownerRating, renterRating].filter((rating) => Number.isFinite(rating));
  });

  const averageReviewScore = allReviewRatings.length
    ? Number((allReviewRatings.reduce((sum, rating) => sum + rating, 0) / allReviewRatings.length).toFixed(2))
    : null;

  const resolutionHours = bookingsList
    .filter((booking) => booking.disputedAt && booking.disputeResolvedAt)
    .map((booking) => (new Date(booking.disputeResolvedAt).getTime() - new Date(booking.disputedAt).getTime()) / (1000 * 60 * 60))
    .filter((value) => Number.isFinite(value) && value >= 0);

  const avgResolutionHours = resolutionHours.length
    ? Number((resolutionHours.reduce((sum, value) => sum + value, 0) / resolutionHours.length).toFixed(2))
    : null;

  const listingToBookingConversionProxy = products.length ? Number(((totalBookings / products.length) * 100).toFixed(2)) : 0;

  return {
    periodDays,
    totals: {
      bookings: totalBookings,
      completedBookings,
      disputedBookings,
      reviewCount: allReviewRatings.length,
      resolvedDisputes: resolutionHours.length
    },
    metrics: {
      listingToBookingConversionProxyPct: listingToBookingConversionProxy,
      bookingCompletionRatePct: totalBookings ? Number(((completedBookings / totalBookings) * 100).toFixed(2)) : 0,
      disputeRatePct: totalBookings ? Number(((disputedBookings / totalBookings) * 100).toFixed(2)) : 0,
      averageReviewScore,
      averageResolutionHours: avgResolutionHours
    },
    notes: {
      listingToBookingConversionProxyPct: 'Uses product count as listing denominator until listing impressions are tracked.'
    }
  };
}

function getProductById(id) {
  return getPublicProducts().find((product) => product.id === id);
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
    products: getPublicProducts().filter((product) => product.providerId === provider.id)
  };
}

function buildProductResponse(product) {
  const providerFallback = {
    id: product.providerId || 'provider-community',
    name: 'Yksityinen vuokraaja',
    description: 'Yhteisön jäsenen lisäämä SUP-listaus.'
  };
  return {
    ...product,
    provider: getProviderById(product.providerId) || product.provider || providerFallback
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
  const userId = buildUserIdFromEmail(email);
  if (!users[userId]) {
    users[userId] = { id: userId, email, name: '', phone: '', avatarUrl: '' };
  }
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

  // Debug
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

  if (exposeAuthCode || process.env.NODE_ENV === 'test') {
    response.devCode = code;
  }

  await sendEmail(
    email,
    'Sisäänkirjautuminen GearSpot -sovellukseen',
    `Hei!\n\nKirjautumiskoodisi on: ${code}\n\nKoodi on voimassa 10 minuuttia.`,
    `<h3>Hei!</h3><p>Kirjautumiskoodisi on: <strong>${code}</strong></p><p>Koodi on voimassa 10 minuuttia.</p>`
  );

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

app.get('/api/auth/provider-status', (req, res) => {
  return res.json(authProvider.getPublicStatus());
});

app.post('/api/auth/magic-link/request', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!isValidEmail(email)) {
    await appendAuthAuditLog('request_magic_link_invalid_email', req, { email });
    return res.status(400).json({ error: 'Valid email required' });
  }

  if (authProvider.providerName === 'local_code') {
    const policy = evaluateAuthRequestPolicy(req, email);
    if (!policy.ok) {
      await appendAuthAuditLog('request_magic_link_blocked', req, {
        email,
        reason: policy.reason,
        retryAfterSeconds: policy.retryAfterSeconds
      });
      return res.status(429).json({
        error: 'Too many requests. Please wait before requesting a new link.',
        reason: policy.reason,
        retryAfterSeconds: policy.retryAfterSeconds
      });
    }

    const code = issueLoginCode(email);
    await appendAuthAuditLog('request_magic_link_sent_local_code', req, {
      email,
      expiresInSeconds: Math.floor(AUTH_CODE_TTL_MS / 1000)
    });

    const response = {
      ok: true,
      provider: 'local_code',
      expiresInSeconds: Math.floor(AUTH_CODE_TTL_MS / 1000)
    };
    if (exposeAuthCode) {
      response.devCode = code;
    }
    return res.json(response);
  }

  const result = await authProvider.requestMagicLink({ email, requestId: req.requestId });
  if (!result.ok) {
    await appendAuthAuditLog('request_magic_link_provider_failed', req, {
      email,
      provider: authProvider.providerName,
      providerCode: result.code || 'unknown'
    });
    return res.status(result.statusCode || 500).json({ error: result.error || 'Provider request failed' });
  }

  await appendAuthAuditLog('request_magic_link_provider_sent', req, {
    email,
    provider: authProvider.providerName
  });
  return res.json(result);
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
  const user = users[session.userId] || { id: session.userId, email: session.email };
  return res.json(user);
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
  await readOwnerListings();

  const { productId, name, paymentMethod, cardLast4, termsAccepted, safetyChecklistAccepted, selectedDate, selectedTime } = req.body || {};
  if (!productId || !name) return res.status(400).json({ error: 'Missing fields' });
  if (!termsAccepted || !safetyChecklistAccepted) {
    return res.status(400).json({ error: 'Terms and safety checklist must be accepted before booking' });
  }

  const product = getProductById(productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const id = `bkg-${Date.now()}`;

  // Dynamic Pricing Implementation
  let pricePerHour = product.pricePerHour || 15;

  if (selectedDate) {
    const dateObj = new Date(selectedDate);
    const dayOfWeek = dateObj.getDay();
    // 0 is Sunday, 6 is Saturday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Apply weekend multiplier (e.g., 1.5x)
      pricePerHour = Math.round(pricePerHour * 1.5);
    }
  }

  const amountToCharge = pricePerHour * 100; // in cents
  const isInstantBooking = product.bookingMode === 'instant' || !product.bookingMode; // Default to instant

  let paymentIntent;
  if (paymentMethod === 'stripe') {
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: amountToCharge,
        currency: 'eur',
        capture_method: 'manual',
        metadata: {
          bookingId: id,
          productId: product.id,
          renterId: session.userId,
          depositHold: 'true'
        },
      });
    } catch (err) {
      console.error(`[stripe-error] PaymentIntent creation failed for productId=${product.id}:`, err.message);
      return res.status(500).json({ error: 'Maksuvälittäjään ei saatu yhteyttä.' });
    }
  }

  const safeLast4 = String(cardLast4 || '').slice(-4);
  const booking = {
    id,
    productId,
    product,
    name,
    selectedDate,
    selectedTime,
    email: session.email,
    renterUserId: session.userId,
    bookingStatus: 'pending',
    bookingStage: paymentMethod === 'stripe' ? 'pending_payment' : (isInstantBooking ? 'approved' : 'pending_approval'),
    paymentStatus: 'pending',
    paymentIntentId: typeof paymentIntent !== 'undefined' && paymentIntent ? paymentIntent.id : null,
    refundStatus: 'not_requested',
    consentVersion: '2026-07-sup-oulu-v1',
    termsAcceptedAt: new Date().toISOString(),
    safetyChecklistAcceptedAt: new Date().toISOString(),
    depositAmount: 0,
    depositStatus: 'not_required',
    depositClaimedAmount: 0,
    depositClaimReason: null,
    evidencePhotosBefore: [],
    evidencePhotosAfter: [],
    paymentMethod: paymentMethod || 'stripe',
    paymentSummary: 'Waiting for Stripe payment...',
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

  if (paymentMethod !== 'stripe') {
      booking.paymentStatus = 'paid';
      booking.bookingStatus = 'confirmed';
      booking.bookingStage = BOOKING_STAGE.APPROVED;
      booking.paymentSummary = safeLast4 ? `Mock card ending ${safeLast4}` : 'Mock card payment approved';
      booking.paidAt = booking.createdAt;
  }

  const allBookings = await readBookings();
  allBookings.push(booking);

  const notifs = await readNotifications();
  const renterNotif = generateNotification(session.userId, `Varauksesi lautaan ${product.name} on vastaanotettu!`, 'booking_created', { bookingId: booking.id });
  const ownerNotif = generateNotification(product.providerId || 'admin', `Sait uuden varauksen lautaan ${product.name}!`, 'booking_received', { bookingId: booking.id });
  notifs.push(renterNotif, ownerNotif);

  await saveNotifications(notifs);
  await saveBookings(allBookings);

  res.status(200).json({ ...getSafeBookingView(booking), clientSecret: typeof paymentIntent !== 'undefined' && paymentIntent ? paymentIntent.client_secret : null });
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

    const notifs = await readNotifications();
    notifs.push(generateNotification(booking.renterUserId, `Varauksesi lautaan ${booking.product.name} on peruttu ja maksu palautettu.`, 'booking_refunded', { bookingId: booking.id }));
    notifs.push(generateNotification(booking.product.providerId || 'admin', `Varaus lautaan ${booking.product.name} on peruttu.`, 'booking_refunded', { bookingId: booking.id }));
    await saveNotifications(notifs);

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

app.get('/api/admin/pilot-metrics', async (req, res) => {
  if (!isAdminAuthorized(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const periodDays = Math.min(Math.max(Number(req.query.days || 30), 1), 365);
  const cutoff = Date.now() - periodDays * 24 * 60 * 60 * 1000;

  const allBookings = await readBookings();
  const scoped = allBookings.filter((booking) => {
    const created = new Date(booking.createdAt || 0).getTime();
    return Number.isFinite(created) && created >= cutoff;
  });

  return res.json(computePilotMetrics(scoped, periodDays));
});

app.get('/api/admin/listings', async (req, res) => {
  if (!isAdminAuthorized(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const status = String(req.query.status || 'pending').trim();
  const items = await readOwnerListings();
  const filtered = status === 'all' ? items : items.filter((item) => (item.moderationStatus || 'pending') === status);
  return res.json(filtered.map(buildProductResponse));
});

app.patch('/api/admin/listings/:id', async (req, res) => {
  if (!isAdminAuthorized(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const nextStatus = String(req.body?.moderationStatus || '').trim();
  if (!ALLOWED_LISTING_MODERATION_STATUS.includes(nextStatus)) {
    return res.status(400).json({ error: 'moderationStatus must be pending, approved or rejected' });
  }

  const items = await readOwnerListings();
  const listing = items.find((item) => item.id === req.params.id);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  listing.moderationStatus = nextStatus;
  listing.moderationNote = String(req.body?.note || '').trim() || null;
  listing.moderatedAt = new Date().toISOString();
  listing.moderatedBy = getAdminActor(req);

  await saveOwnerListings(items);
  return res.json(buildProductResponse(listing));
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

app.post('/api/bookings/:id/evidence', upload.array('photos', 5), async (req, res) => {
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

let demandLeads = [];
async function readDemandLeads() {
  return readStoreList('gearspot:demandLeads', demandLeads);
}
app.post('/api/leads/demand', async (req, res) => {
  const { email, locationName } = req.body || {};
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const leads = await readDemandLeads();
  const newLead = {
    id: `lead-${Date.now()}`,
    email: email.trim().toLowerCase(),
    locationName: locationName || 'Oulu',
    createdAt: new Date().toISOString()
  };
  leads.push(newLead);
  await writeStoreList('gearspot:demandLeads', leads);
  console.log('[demand-lead]', JSON.stringify(newLead));
  return res.status(201).json({ ok: true, message: 'Demand lead saved' });
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

app.get('/api/products', async (req, res) => {
  await readOwnerListings();
  res.json(getPublicProducts().map(buildProductResponse));
});

app.get('/api/products/:id', async (req, res) => {
  await readOwnerListings();
  const product = getProductById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(buildProductResponse(product));
});

app.get('/api/providers', async (req, res) => {
  await readOwnerListings();
  const communityProviders = getCommunityProviders();
  res.json(await Promise.all([...providers, ...communityProviders].map(buildProviderResponse)));
});

app.get('/api/providers/:id', async (req, res) => {
  await readOwnerListings();
  const provider = [...providers, ...getCommunityProviders()].find((item) => item.id === req.params.id);
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
  await readOwnerListings();
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

app.get('/api/owner/listings', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const status = String(req.query.status || 'all').trim();
  const items = await readOwnerListings();
  const mine = items.filter((item) => item.ownerEmail === session.email);
  const filtered = status === 'all' ? mine : mine.filter((item) => (item.moderationStatus || 'pending') === status);
  return res.json(filtered.map(buildProductResponse));
});

app.post('/api/owner/listings', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const name = String(req.body?.name || '').trim();
  const short = String(req.body?.short || '').trim();
  const locationName = String(req.body?.locationName || '').trim();
  const photos = Array.isArray(req.body?.photos)
    ? req.body.photos.map((photo) => String(photo || '').trim()).filter(Boolean).slice(0, 6)
    : [];
  const pricePerHour = Number(req.body?.pricePerHour || 0);
  const pricePerDay = Number(req.body?.pricePerDay || 0);

  if (!name || !short || !locationName) {
    return res.status(400).json({ error: 'name, short and locationName are required' });
  }

  if (!Number.isFinite(pricePerHour) || !Number.isFinite(pricePerDay) || pricePerHour <= 0 || pricePerDay <= 0) {
    return res.status(400).json({ error: 'pricePerHour and pricePerDay must be positive numbers' });
  }

  if (!photos.length) {
    return res.status(400).json({ error: 'At least one photo URL is required' });
  }

  const providerId = buildOwnerProviderId(session.email);
  const providerName = String(req.body?.providerName || '').trim() || session.email;
  const listing = {
    id: `owner-sup-${Date.now()}`,
    type: 'sup_board',
    name,
    short,
    price: `${pricePerHour} €/tunti · ${pricePerDay} €/päivä`,
    pricePerHour,
    pricePerDay,
    providerId,
    provider: {
      id: providerId,
      name: providerName,
      description: 'Yhteisön jäsenen lisäämä SUP-listaus'
    },
    ownerEmail: session.email,
    moderationStatus: 'pending',
    moderationNote: null,
    moderatedAt: null,
    moderatedBy: null,
    photos,
    locationName,
    searchTerms: ['sup', 'lauta', 'oulu', locationName.toLowerCase()],
    createdAt: new Date().toISOString()
  };

  const items = await readOwnerListings();
  items.unshift(listing);
  await saveOwnerListings(items);

  return res.status(201).json(buildProductResponse(listing));
});

app.patch('/api/owner/listings/:id', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const items = await readOwnerListings();
  const listing = items.find((item) => item.id === req.params.id);
  if (!listing || listing.ownerEmail !== session.email) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  const name = String(req.body?.name || listing.name || '').trim();
  const short = String(req.body?.short || listing.short || '').trim();
  const locationName = String(req.body?.locationName || listing.locationName || '').trim();
  const pricePerHour = Number(req.body?.pricePerHour ?? listing.pricePerHour ?? 0);
  const pricePerDay = Number(req.body?.pricePerDay ?? listing.pricePerDay ?? 0);
  const photos = Array.isArray(req.body?.photos)
    ? req.body.photos.map((photo) => String(photo || '').trim()).filter(Boolean).slice(0, 6)
    : listing.photos;

  if (!name || !short || !locationName) {
    return res.status(400).json({ error: 'name, short and locationName are required' });
  }

  if (!Number.isFinite(pricePerHour) || !Number.isFinite(pricePerDay) || pricePerHour <= 0 || pricePerDay <= 0) {
    return res.status(400).json({ error: 'pricePerHour and pricePerDay must be positive numbers' });
  }

  if (!Array.isArray(photos) || !photos.length) {
    return res.status(400).json({ error: 'At least one photo URL is required' });
  }

  listing.name = name;
  listing.short = short;
  listing.locationName = locationName;
  listing.pricePerHour = pricePerHour;
  listing.pricePerDay = pricePerDay;
  listing.price = `${pricePerHour} €/tunti · ${pricePerDay} €/päivä`;
  listing.photos = photos;
  listing.searchTerms = ['sup', 'lauta', 'oulu', locationName.toLowerCase()];
  listing.updatedAt = new Date().toISOString();

  // Every owner edit returns listing to moderation queue.
  listing.moderationStatus = 'pending';
  listing.moderationNote = null;
  listing.moderatedAt = null;
  listing.moderatedBy = null;

  await saveOwnerListings(items);
  return res.json(buildProductResponse(listing));
});

app.post('/api/owner/listings/:id/upload-photo', upload.single('photo'), async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  if (!req.file) {
    return res.status(400).json({ error: 'No photo file provided' });
  }

  const items = await readOwnerListings();
  const listing = items.find((item) => item.id === req.params.id);
  if (!listing || listing.ownerEmail !== session.email) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  const filename = `product-${req.params.id}-${Date.now()}.${req.file.mimetype.split('/')[1] || 'jpg'}`;
  let photoUrl = await uploadToS3(filename, req.file.buffer, req.file.mimetype);

  if (!photoUrl) {
    const fs = require('fs');
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir, { recursive: true }); }
    const filepath = path.join(__dirname, 'uploads', filename);
    fs.writeFileSync(filepath, req.file.buffer);
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers.host;
    photoUrl = `${protocol}://${host}/uploads/${filename}`;
  }

  if (!Array.isArray(listing.photos)) {
    listing.photos = [];
  }

  if (listing.photos.length >= 6) {
    return res.status(400).json({ error: 'Maximum 6 photos per listing' });
  }

  listing.photos.push(photoUrl);
  listing.updatedAt = new Date().toISOString();

  await saveOwnerListings(items);
  return res.json({
    ok: true,
    message: 'Photo uploaded',
    photoUrl,
    photoCount: listing.photos.length
  });
});

app.get('/api/admin/listing-moderation-throughput', async (req, res) => {
  const adminKey = String(req.headers['x-admin-user'] || '').trim();
  if (!adminKey || !adminKey.startsWith('admin')) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const items = await readOwnerListings();
  const stats = {
    total: items.length,
    pending: 0,
    approved: 0,
    rejected: 0,
    avgTimeToApprovalMinutes: 0,
    medianTimeToApprovalMinutes: 0
  };

  const approvalTimes = [];

  items.forEach((item) => {
    const status = item.moderationStatus || 'pending';
    if (status === 'pending') stats.pending += 1;
    if (status === 'approved') stats.approved += 1;
    if (status === 'rejected') stats.rejected += 1;

    if (status === 'approved' && item.createdAt && item.moderatedAt) {
      const createdTime = new Date(item.createdAt).getTime();
      const moderatedTime = new Date(item.moderatedAt).getTime();
      const diffMinutes = (moderatedTime - createdTime) / (1000 * 60);
      if (diffMinutes >= 0) {
        approvalTimes.push(diffMinutes);
      }
    }
  });

  if (approvalTimes.length > 0) {
    stats.avgTimeToApprovalMinutes = Math.round(
      approvalTimes.reduce((a, b) => a + b, 0) / approvalTimes.length
    );
    approvalTimes.sort((a, b) => a - b);
    const mid = Math.floor(approvalTimes.length / 2);
    stats.medianTimeToApprovalMinutes =
      approvalTimes.length % 2 === 0
        ? Math.round((approvalTimes[mid - 1] + approvalTimes[mid]) / 2)
        : Math.round(approvalTimes[mid]);
  }

  return res.json(stats);
});

app.post('/api/auth/magic-link/verify', async (req, res) => {
  const token = String(req.body?.token || '').trim();

  if (!token) {
    await appendAuthAuditLog('verify_magic_link_missing_token', req, {});
    return res.status(400).json({ error: 'Token is required' });
  }

  if (authProvider.providerName === 'supabase') {
    const result = await authProvider.verifyMagicLinkToken(token);
    if (result.ok) {
      const bearerToken = buildAuthToken(result.email);
      await appendAuthAuditLog('verify_magic_link_success', req, { email: result.email });
      return res.json({ token: bearerToken, email: result.email, userId: buildUserIdFromEmail(result.email) });
    }
    await appendAuthAuditLog('verify_magic_link_failed', req, { error: result.error });
    return res.status(result.statusCode || 400).json({ error: result.error });
  }

  if (authProvider.providerName === 'local_code') {
    const email = normalizeEmail(req.body?.email);
    if (!isValidEmail(email)) {
      await appendAuthAuditLog('verify_magic_link_invalid_email', req, { email });
      return res.status(400).json({ error: 'Valid email required' });
    }

    cleanupExpiredCodes();
    const entry = pendingLoginCodes.get(email);
    if (!entry) {
      await appendAuthAuditLog('verify_magic_link_missing_or_expired', req, { email });
      return res.status(400).json({ error: 'Code expired or not requested' });
    }

    if (entry.attempts >= 5) {
      pendingLoginCodes.delete(email);
      await appendAuthAuditLog('verify_magic_link_locked', req, { email });
      return res.status(429).json({ error: 'Too many attempts. Request a new code.' });
    }

    if (entry.code !== token) {
      entry.attempts += 1;
      await appendAuthAuditLog('verify_magic_link_failed', req, { email, attempts: entry.attempts });
      return res.status(400).json({ error: 'Invalid code' });
    }

    pendingLoginCodes.delete(email);
    const bearerToken = buildAuthToken(email);
    await appendAuthAuditLog('verify_magic_link_success', req, { email });
    return res.json({ token: bearerToken, email, userId: buildUserIdFromEmail(email) });
  }

  await appendAuthAuditLog('verify_magic_link_provider_not_supported', req, {});
  return res.status(400).json({ error: 'Magic-link verification not available with current provider' });
});


// Serve static frontend files if 'dist' folder exists (for production)
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // Catch-all route to serve index.html for any non-API request
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

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


app.get('/api/notifications', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const notifs = await readNotifications();
  const userNotifs = notifs.filter(n => n.userId === session.userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(userNotifs);
});

app.patch('/api/notifications/:id/read', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const notifs = await readNotifications();
  const notif = notifs.find(n => n.id === req.params.id && n.userId === session.userId);
  if (notif) {
    notif.read = true;
    await saveNotifications(notifs);
    return res.json(notif);
  }
  res.status(404).json({error: 'Not found'});
});


// Stripe Webhook Endpoint


// --- Favorites ---
app.get('/api/favorites', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  let usersObj = await getStoreValue('gearspot:users');
  if (!usersObj) usersObj = {};
  if (!usersObj[session.userId]) usersObj[session.userId] = { favorites: [] };
  res.json(usersObj[session.userId].favorites || []);
});

app.post('/api/favorites', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: 'Missing productId' });

  let usersObj = await getStoreValue('gearspot:users');
  if (!usersObj) usersObj = {};

  if (!usersObj[session.userId]) usersObj[session.userId] = { favorites: [] };
  if (!usersObj[session.userId].favorites) usersObj[session.userId].favorites = [];

  if (!usersObj[session.userId].favorites.includes(productId)) {
    usersObj[session.userId].favorites.push(productId);
    await setStoreValue('gearspot:users', usersObj);
  }
  res.json(usersObj[session.userId].favorites);
});

app.delete('/api/favorites/:id', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  let usersObj = await getStoreValue('gearspot:users');
  if (!usersObj) usersObj = {};

  if (!usersObj[session.userId] || !usersObj[session.userId].favorites) {
    return res.json([]);
  }

  usersObj[session.userId].favorites = usersObj[session.userId].favorites.filter(id => id !== req.params.id);
  await setStoreValue('gearspot:users', usersObj);
  res.json(usersObj[session.userId].favorites);
});

// --- Chat ---
app.get('/api/bookings/:id/messages', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const allBookings = await readBookings();
  const booking = allBookings.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  if (booking.renterUserId !== session.userId && session.email !== 'admin@gearspot.fi') {
      if (booking.product.providerId !== session.userId && !(booking.product.providerId || '').includes(session.email)) {
         return res.status(403).json({ error: 'Forbidden' });
      }
  }

  res.json(booking.messages || []);
});

app.post('/api/bookings/:id/messages', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const allBookings = await readBookings();
  const booking = allBookings.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  // Authorization check (same as GET)
  if (booking.renterUserId !== session.userId && session.email !== 'admin@gearspot.fi') {
      if (booking.product.providerId !== session.userId && !(booking.product.providerId || '').includes(session.email)) {
         return res.status(403).json({ error: 'Forbidden' });
      }
  }

  if (!booking.messages) booking.messages = [];

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Message text is required' });

  const newMessage = {
      id: `msg-${Date.now()}`,
      senderId: session.userId,
      senderName: session.email.split('@')[0],
      text,
      createdAt: new Date().toISOString()
  };

  booking.messages.push(newMessage);
  await saveBookings(allBookings);

  res.status(201).json(newMessage);
});

// --- User Profile fallback from users to sqlite ---
app.patch('/api/me', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const { name, phone } = req.body;

  let usersObj = await getStoreValue('gearspot:users');
  if (!usersObj) usersObj = {};
  if (!usersObj[session.userId]) {
      usersObj[session.userId] = { id: session.userId, email: session.email };
  }

  if (name !== undefined) usersObj[session.userId].name = name;
  if (phone !== undefined) usersObj[session.userId].phone = phone;

  await setStoreValue('gearspot:users', usersObj);
  return res.json(usersObj[session.userId]);
});

module.exports = app;
