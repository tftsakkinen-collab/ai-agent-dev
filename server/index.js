
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { getDb, initDb } = require('./db.js');

const app = express();
const port = process.env.PORT || 3000;
const authSecret = process.env.AUTH_SECRET || 'gearspot-dev-auth-secret';

const AUTH_CODE_COOLDOWN_MS = 30 * 1000;


app.use(cors());
app.use(express.json());

// Auth & Session
function generateId(prefix) {
  return prefix + '-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');
}

function getSession(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload;
  } catch (err) {
    return null;
  }
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
  const headerBase64 = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = signPayload(headerBase64 + '.' + payloadBase64);
  return 'gs-auth.' + payloadBase64 + '.' + signature;
}


function isValidEmail(email) {
  return /^[^s@]+@[^s@]+.[^s@]+$/.test(email);
}

function normalizeEmail(email) {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

app.post('/api/auth/request-code', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const now = Date.now();
  const db = await getDb();

  const existing = await db.get("SELECT * FROM login_tokens WHERE email = ?", [email]);
  if(existing) {
     const createdAt = new Date(existing.created_at).getTime();
     const diff = (now - createdAt);
     if(diff < AUTH_CODE_COOLDOWN_MS) {
         return res.status(429).json({ error: 'Please wait before requesting a new code.', retryAfterSeconds: Math.ceil((AUTH_CODE_COOLDOWN_MS - diff)/1000) });
     }
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`[auth] Login code for ${email}: ${code}`);

  await db.run("INSERT OR REPLACE INTO login_tokens (email, code) VALUES (?, ?)", [email, code]);

  res.json({ success: true });
});

app.post('/api/auth/login', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const { code } = req.body;
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Email required' });

  const db = await getDb();
  let user = await db.get("SELECT * FROM users WHERE email = ?", [email]);

  if(code) {
      const tokenRecord = await db.get("SELECT * FROM login_tokens WHERE email = ? AND code = ?", [email, code]);
      if(!tokenRecord) {
          return res.status(401).json({error: "Invalid code"});
      }
      await db.run("DELETE FROM login_tokens WHERE email = ?", [email]);
  }

  if (!user) {
    const userId = buildUserIdFromEmail(email);
    await db.run("INSERT INTO users (id, email, role) VALUES (?, ?, ?)", [userId, email, 'user']);
    user = { id: userId, email, role: 'user' };
  }

  const token = buildAuthToken(user.email);
  res.json({ token, email: user.email, userId: user.id });
});

app.get('/api/me', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const db = await getDb();
  const user = await db.get("SELECT * FROM users WHERE id = ?", [session.userId]);
  if(!user) return res.status(404).json({error: "User not found"});
  res.json({ email: user.email, userId: user.id });
});


// Core API
app.get('/api/products', async (req, res) => {
  const db = await getDb();
  const rows = await db.all("SELECT * FROM products WHERE status = 'active'");

  const products = [];
  for (const row of rows) {
      const photos = await db.all("SELECT url FROM product_photos WHERE product_id = ?", [row.id]);
      const terms = await db.all("SELECT term FROM product_search_terms WHERE product_id = ?", [row.id]);
      products.push({
          id: row.id,
          name: row.name,
          short: row.short_description,
          price: row.price,
          locationName: row.location_name,
          type: row.type,
          photos: photos.map(p => p.url),
          searchTerms: terms.map(t => t.term),
          providerId: row.owner_id
      });
  }
  res.json(products);
});

app.get('/api/categories', (req, res) => {
  res.json([
    { id: 'cat-1', title: 'Oulu SUP Pilot', label: 'Vuokraa SUP-lauta paikalliselta', query: 'oulu sup' }
  ]);
});

app.get('/api/locations', async (req, res) => {
    const db = await getDb();
    const rows = await db.all("SELECT DISTINCT location_name FROM products WHERE status = 'active'");
    const locations = rows.map(r => ({ name: r.location_name }));
    res.json(locations);
});


app.post('/api/bookings', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const { productId, name, paymentMethod, cardLast4, termsAccepted, safetyChecklistAccepted, selectedDate, selectedTime } = req.body || {};
  if (!productId || !name) return res.status(400).json({ error: 'Missing fields' });
  if (!termsAccepted || !safetyChecklistAccepted) {
    return res.status(400).json({ error: 'Terms and safety checklist must be accepted before booking' });
  }

  const db = await getDb();
  const product = await db.get("SELECT * FROM products WHERE id = ?", [productId]);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const id = generateId('bkg');
  const paymentSummary = paymentMethod === 'card' ? `Paid with card ending in ${cardLast4}` : `Paid via ${paymentMethod}`;

  await db.run(`INSERT INTO bookings (id, user_id, product_id, name, selected_date, selected_time, payment_summary, deposit_amount)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, session.userId, productId, name, selectedDate, selectedTime, paymentSummary, 50]);

  // Generate notification for renter
  const notifId = generateId('notif');
  await db.run("INSERT INTO notifications (id, user_id, message) VALUES (?, ?, ?)", [notifId, session.userId, `Varasit laudan ${product.name} onnistuneesti.`]);

  res.json({ id, status: 'confirmed' });
});

app.get('/api/bookings', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const db = await getDb();
  const rows = await db.all("SELECT * FROM bookings WHERE user_id = ?", [session.userId]);

  const bookings = [];
  for (const row of rows) {
      const productRow = await db.get("SELECT * FROM products WHERE id = ?", [row.product_id]);
      bookings.push({
          id: row.id,
          productId: row.product_id,
          name: row.name,
          selectedDate: row.selected_date,
          selectedTime: row.selected_time,
          bookingStatus: row.booking_status,
          paymentStatus: row.payment_status,
          depositStatus: row.deposit_status,
          depositAmount: row.deposit_amount,
          bookingStage: row.booking_stage,
          paymentSummary: row.payment_summary,
          product: productRow ? { name: productRow.name } : null
      });
  }

  res.json(bookings);
});

app.post('/api/bookings/:id/refund', async (req, res) => {
    const session = getSession(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const db = await getDb();
    const booking = await db.get("SELECT * FROM bookings WHERE id = ? AND user_id = ?", [req.params.id, session.userId]);

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    await db.run("UPDATE bookings SET payment_status = 'refunded' WHERE id = ?", [req.params.id]);

    // Generate notification
    const notifId = generateId('notif');
    await db.run("INSERT INTO notifications (id, user_id, message) VALUES (?, ?, ?)", [notifId, session.userId, `Varauksesi ${req.params.id} maksu on palautettu.`]);

    res.json({ success: true });
});

app.post('/api/bookings/:id/handoff/setup', async (req, res) => res.json({}));
app.post('/api/bookings/:id/handoff/confirm', async (req, res) => res.json({}));
app.post('/api/bookings/:id/return/request', async (req, res) => res.json({}));
app.post('/api/bookings/:id/return/confirm', async (req, res) => res.json({}));
app.post('/api/bookings/:id/deposit/setup', async (req, res) => res.json({}));
app.post('/api/bookings/:id/deposit/release', async (req, res) => res.json({}));
app.post('/api/bookings/:id/evidence', async (req, res) => res.json({}));
app.post('/api/bookings/:id/complete', async (req, res) => res.json({}));
app.post('/api/bookings/:id/reviews', async (req, res) => res.status(201).json({}));
app.get('/api/bookings/:id/reviews', async (req, res) => res.json({visibility: 'hidden', reviews: []}));


// Notifications
app.get('/api/notifications', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const db = await getDb();
  const rows = await db.all("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC", [session.userId]);

  res.json(rows.map(r => ({
      id: r.id,
      message: r.message,
      read: r.is_read === 1,
      createdAt: r.created_at
  })));
});

app.patch('/api/notifications/:id/read', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const db = await getDb();
  await db.run("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", [req.params.id, session.userId]);
  res.json({ success: true });
});

// Reviews
app.get('/api/reviews/renter', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const db = await getDb();
  const rows = await db.all("SELECT * FROM reviews WHERE target_type = 'renter' AND target_id = ?", [session.userId]);
  res.json(rows);
});

// Admin
app.get('/api/admin/auth-audit-logs', async (req, res) => {
    res.json([]);
});

app.post('/api/bookings/:id/dispute', async (req, res) => {
    const session = getSession(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    const db = await getDb();
    const dispId = generateId('disp');
    await db.run("INSERT INTO disputes (id, booking_id, reason) VALUES (?, ?, ?)", [dispId, req.params.id, req.body.reason || '']);
    res.json({success: true, id: dispId});
});

app.get('/api/admin/disputes', async (req, res) => {
    const db = await getDb();
    const rows = await db.all("SELECT * FROM disputes WHERE status = 'open'");
    res.json(rows);
});

app.patch('/api/admin/disputes/:id', async (req, res) => {
    const db = await getDb();
    await db.run("UPDATE disputes SET status = 'closed' WHERE id = ?", [req.params.id]);
    res.json({success:true});
});

app.get('/api/auth/provider-status', (req,res) => {
    res.json({status: 'ok'});
})

app.get('/api/admin/pilot-metrics', (req, res) => {
    res.json({metrics: {}});
})

app.post('/api/owner/listings', async (req, res) => {
    const session = getSession(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    const id = generateId('owner-sup');
    const db = await getDb();
    await db.run("INSERT INTO products (id, owner_id, name, short_description, price, status) VALUES (?, ?, ?, ?, ?, ?)",
        [id, session.userId, req.body.name || 'New Listing', req.body.short || '', req.body.price || '', 'pending']
    );
    res.status(201).json({id});
});

app.get('/api/owner/listings', async (req, res) => {
    const session = getSession(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    const db = await getDb();
    const rows = await db.all("SELECT * FROM products WHERE owner_id = ?", [session.userId]);
    res.json(rows);
});

app.get('/api/admin/listings', async (req, res) => {
    const db = await getDb();
    const rows = await db.all("SELECT * FROM products WHERE status = 'pending'");
    res.json(rows);
});

app.patch('/api/admin/listings/:id', async (req, res) => {
    const db = await getDb();
    await db.run("UPDATE products SET status = 'active' WHERE id = ?", [req.params.id]);
    res.json({success: true});
});

app.patch('/api/owner/listings/:id', async (req, res) => {
    const session = getSession(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    const db = await getDb();
    await db.run("UPDATE products SET name = ? WHERE id = ? AND owner_id = ?", [req.body.name, req.params.id, session.userId]);
    res.json({success: true});
});

app.get('/api/admin/users', async (req, res) => {
  const db = await getDb();
  const rows = await db.all("SELECT id, email, role, created_at FROM users ORDER BY created_at DESC");
  res.json(rows);
});

// Fallback
app.use((req, res, _next) => {
  console.log(`[api] ${req.method} ${req.path} 404`);
  res.status(404).json({ error: 'Not Found' });
});

if (require.main === module) {
  initDb().then(() => {
    app.listen(port, () => {
      console.log(`Mock API server running on http://localhost:${port}`);
    });
  }).catch(e => {
      console.error(e);
      process.exit(1);
  });
}

module.exports = app;
