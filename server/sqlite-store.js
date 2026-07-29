const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.NODE_ENV === 'test'
  ? ':memory:'
  : path.join(__dirname, 'gearspot.sqlite');

const db = new sqlite3.Database(dbPath);

const initDb = new Promise((resolve, reject) => {
  db.run(`CREATE TABLE IF NOT EXISTS store (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`, (err) => {
    if (err) {
      console.error('Error opening database', err.message);
      reject(err);
    } else {
      resolve();
    }
  });
});

async function getStoreValue(key) {
  await initDb;
  return new Promise((resolve, reject) => {
    db.get('SELECT value FROM store WHERE key = ?', [key], (err, row) => {
      if (err) return reject(err);
      if (!row) return resolve(null);
      try {
        resolve(JSON.parse(row.value));
      } catch (e) {
        reject(e);
      }
    });
  });
}

async function setStoreValue(key, value) {
  await initDb;
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT OR REPLACE INTO store (key, value) VALUES (?, ?)',
      [key, JSON.stringify(value)],
      function(err) {
        if (err) return reject(err);
        resolve(true);
      }
    );
  });
}

async function clearDb() {
  await initDb;
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM store', (err) => {
      if (err) return reject(err);
      resolve(true);
    });
  });
}

module.exports = {
  db,
  getStoreValue,
  setStoreValue,
  clearDb
};
