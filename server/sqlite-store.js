const path = require('path');
const fs = require('fs');

// In-memory fallback map to guarantee zero 500 errors
const inMemoryStore = new Map();

// Determine Postgres configuration
const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.VERCEL_POSTGRES_URL;
let sql = null;

if (postgresUrl) {
  try {
    const { sql: vercelSql } = require('@vercel/postgres');
    sql = vercelSql;
    console.log('[sqlite-store] Connected via Vercel Postgres');
  } catch (e) {
    console.warn('[sqlite-store] Could not load @vercel/postgres, falling back to SQLite/Memory', e.message);
  }
}

// Determine safe SQLite path
let db = null;
let sqliteInitPromise = null;

if (!sql) {
  try {
    // Only attempt sqlite3 in non-Vercel environment or if native binary works
    if (!process.env.VERCEL) {
      const sqlite3 = require('sqlite3').verbose();
      let dbPath = ':memory:';

      if (process.env.NODE_ENV === 'test') {
        dbPath = ':memory:';
      } else {
        dbPath = path.join(__dirname, 'gearspot.sqlite');
      }

      db = new sqlite3.Database(dbPath);

      sqliteInitPromise = new Promise((resolve) => {
        db.run(
          `CREATE TABLE IF NOT EXISTS store (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
          (err) => {
            if (err) {
              console.error('[sqlite-store] SQLite table init error:', err.message);
            }
            resolve();
          }
        );
      });
    } else {
      console.log('[sqlite-store] Running on Vercel Serverless, using KV/Postgres/Memory store fallback');
    }
  } catch (err) {
    console.warn('[sqlite-store] SQLite init skipped or failed, using in-memory store:', err.message);
  }
}

// Initializer helper
let isPostgresInitialized = false;
async function initStore() {
  if (sql && !isPostgresInitialized) {
    try {
      await sql`CREATE TABLE IF NOT EXISTS store (key TEXT PRIMARY KEY, value TEXT NOT NULL);`;
      isPostgresInitialized = true;
    } catch (e) {
      console.error('[sqlite-store] Postgres init table error:', e.message);
    }
  } else if (sqliteInitPromise) {
    await sqliteInitPromise;
  }
}

async function getStoreValue(key) {
  try {
    await initStore();

    if (sql) {
      const { rows } = await sql`SELECT value FROM store WHERE key = ${key};`;
      if (rows && rows.length > 0) {
        return JSON.parse(rows[0].value);
      }
    } else if (db) {
      const row = await new Promise((resolve) => {
        db.get('SELECT value FROM store WHERE key = ?', [key], (err, rowResult) => {
          if (err) resolve(null);
          else resolve(rowResult);
        });
      });
      if (row && row.value) {
        return JSON.parse(row.value);
      }
    }
  } catch (e) {
    console.warn(`[sqlite-store] Error in getStoreValue(${key}), using memory fallback:`, e.message);
  }

  // Fallback to in-memory store
  return inMemoryStore.has(key) ? inMemoryStore.get(key) : null;
}

async function setStoreValue(key, value) {
  // Always update in-memory store for instant cache
  inMemoryStore.set(key, value);

  try {
    await initStore();

    const valStr = JSON.stringify(value);

    if (sql) {
      await sql`
        INSERT INTO store (key, value)
        VALUES (${key}, ${valStr})
        ON CONFLICT (key)
        DO UPDATE SET value = EXCLUDED.value;
      `;
      return true;
    } else if (db) {
      await new Promise((resolve) => {
        db.run(
          'INSERT OR REPLACE INTO store (key, value) VALUES (?, ?)',
          [key, valStr],
          (err) => {
            if (err) console.warn('[sqlite-store] SQLite set error:', err.message);
            resolve();
          }
        );
      });
      return true;
    }
  } catch (e) {
    console.warn(`[sqlite-store] Error in setStoreValue(${key}), saved in memory:`, e.message);
  }

  return true;
}

async function clearDb() {
  inMemoryStore.clear();

  try {
    await initStore();

    if (sql) {
      await sql`DELETE FROM store;`;
    } else if (db) {
      await new Promise((resolve) => {
        db.run('DELETE FROM store', () => resolve());
      });
    }
  } catch (e) {
    console.warn('[sqlite-store] Error clearing db:', e.message);
  }

  return true;
}

module.exports = {
  db,
  getStoreValue,
  setStoreValue,
  clearDb
};
