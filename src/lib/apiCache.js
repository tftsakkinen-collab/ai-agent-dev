/**
 * Client-side in-memory cache with 60s TTL and 401 Unauthorized deduplication.
 */
const cache = new Map();
const TTL_MS = 60 * 1000; // 60 seconds default TTL

let unauthProfileCached = false;
let unauthProfileTimestamp = 0;
const UNAUTH_TTL_MS = 5 * 60 * 1000; // 5 minutes 401 deduplication

export function getCached(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > TTL_MS) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

export function setCached(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

export function clearCached(key) {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

export function isUnauthProfileCached() {
  if (!unauthProfileCached) return false;
  if (Date.now() - unauthProfileTimestamp > UNAUTH_TTL_MS) {
    unauthProfileCached = false;
    return false;
  }
  return true;
}

export function setUnauthProfileCached() {
  unauthProfileCached = true;
  unauthProfileTimestamp = Date.now();
}

export function resetUnauthProfileState() {
  unauthProfileCached = false;
  unauthProfileTimestamp = 0;
  cache.delete('/api/me');
}
