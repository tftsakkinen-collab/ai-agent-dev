const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');

async function getDb() {
  return open({
    filename: dbPath,
    driver: sqlite3.Database
  });
}

async function initDb() {
  const db = await getDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      owner_id TEXT,
      name TEXT,
      short_description TEXT,
      price TEXT,
      location_name TEXT,
      type TEXT,
      latitude REAL,
      longitude REAL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(owner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS product_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT,
      url TEXT,
      FOREIGN KEY(product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS product_search_terms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT,
      term TEXT,
      FOREIGN KEY(product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      product_id TEXT,
      name TEXT,
      selected_date TEXT,
      selected_time TEXT,
      booking_status TEXT DEFAULT 'confirmed',
      payment_status TEXT DEFAULT 'pending',
      deposit_status TEXT DEFAULT 'pending',
      deposit_amount INTEGER,
      booking_stage TEXT DEFAULT 'upcoming',
      payment_summary TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      booking_id TEXT,
      target_type TEXT,
      target_id TEXT,
      reviewer_id TEXT,
      rating INTEGER,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(booking_id) REFERENCES bookings(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      message TEXT,
      is_read BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS disputes (
      id TEXT PRIMARY KEY,
      booking_id TEXT,
      status TEXT DEFAULT 'open',
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(booking_id) REFERENCES bookings(id)
    );

    CREATE TABLE IF NOT EXISTS login_tokens (
       email TEXT PRIMARY KEY,
       code TEXT,
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed initial data if products table is empty
  const count = await db.get("SELECT COUNT(*) as count FROM products");
  if (count.count === 0) {
     console.log("Seeding database with initial data...");
     await seedData(db);
  }

  return db;
}

async function seedData(db) {
    const adminUser = 'user-admin';
    const ownerUser = 'user-owner';
    const renterUser = 'user-renter';

    await db.run("INSERT OR IGNORE INTO users (id, email, role) VALUES (?, ?, ?)", [adminUser, 'admin@example.com', 'admin']);
    await db.run("INSERT OR IGNORE INTO users (id, email, role) VALUES (?, ?, ?)", [ownerUser, 'owner@example.com', 'user']);
    await db.run("INSERT OR IGNORE INTO users (id, email, role) VALUES (?, ?, ?)", [renterUser, 'renter@example.com', 'user']);

    const products = [
      { id: 'sup-1', name: 'Oulu SUP — Inflatable 10\'6"', short: 'Helppo all-around SUP Oulun kesään, mela ja liivi mukana.', price: '15 €/tunti · 60 €/päivä', locationName: 'Nallikari', type: 'sup_board', lat: 65.0287, lng: 25.4326 },
      { id: 'sup-2', name: 'Nallikari Touring SUP 11\'2"', short: 'Nopeampi malli pitkille retkille.', price: '20 €/tunti · 70 €/päivä', locationName: 'Nallikari', type: 'sup_board', lat: 65.0290, lng: 25.4310 },
      { id: 'sup-3', name: 'Hietasaari SUP — Beginner Set', short: 'Erittäin leveä ja vakaa lauta aloittelijoille.', price: '12 €/tunti · 50 €/päivä', locationName: 'Hietasaari', type: 'sup_board', lat: 65.0234, lng: 25.4385 },
      { id: 'sup-4', name: 'Kuivasjärvi Family SUP', short: 'Kestää isommankin painon, sopii aikuiselle ja lapselle.', price: '18 €/tunti · 65 €/päivä', locationName: 'Kuivasjärvi', type: 'sup_board', lat: 65.0712, lng: 25.4658 },
    ];

    for (const p of products) {
        await db.run("INSERT INTO products (id, owner_id, name, short_description, price, location_name, type, latitude, longitude, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [p.id, ownerUser, p.name, p.short, p.price, p.locationName, p.type, p.lat, p.lng, 'active']
        );
        await db.run("INSERT INTO product_photos (product_id, url) VALUES (?, ?)", [p.id, 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=500&h=500&fit=crop']);

        const terms = ['sup', 'lauta', 'oulu', p.locationName.toLowerCase(), 'stand up paddle'];
        for(const t of terms) {
             await db.run("INSERT INTO product_search_terms (product_id, term) VALUES (?, ?)", [p.id, t]);
        }
    }
}

module.exports = {
  getDb,
  initDb
};
