import AsyncStorage from '@react-native-async-storage/async-storage';

const ENV_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.API_BASE_URL;
const WEB_DEFAULT_BASE_URL =
  typeof window !== 'undefined' && window.location
    ? window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? `${window.location.protocol}//${window.location.hostname}:3000`
      : `${window.location.protocol}//${window.location.host}`
    : 'http://localhost:3000';
const BASE_URL = ENV_BASE_URL || WEB_DEFAULT_BASE_URL;

function buildUrl(path) {
  if (!path) return BASE_URL;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/')) return `${BASE_URL}${path}`;
  return `${BASE_URL}/${path}`;
}

function getClientEnvironment() {
  if (typeof window === 'undefined') {
    return {
      currentUrl: null,
      userAgent: null,
      viewport: null
    };
  }

  return {
    currentUrl: window.location?.href || null,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    viewport: window.innerWidth && window.innerHeight ? `${window.innerWidth}x${window.innerHeight}` : null
  };
}

export async function getToken() {
  return AsyncStorage.getItem('token');
}

export async function logout() {
  return AsyncStorage.removeItem('token');
}

export async function fetchWithAuth(path, options = {}) {
  const url = buildUrl(path);
  const token = await getToken();
  const headers = Object.assign({}, options.headers || {});
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, Object.assign({}, options, { headers }));
  if (res.status === 401) throw new Error('Unauthorized');
  return res;
}

export async function fetchJson(path, options = {}) {
  const res = await fetchWithAuth(path, options);
  const json = await res.json();
  if (!res.ok) {
    const message = json?.error || res.statusText || 'API error';
    throw new Error(message);
  }
  return json;
}

export async function login(email) {
  const url = buildUrl('/api/auth/login');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Kirjautuminen epäonnistui');
  await AsyncStorage.setItem('token', json.token);
  return json;
}

export async function requestLoginCode(email) {
  const url = buildUrl('/api/auth/request-code');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  const json = await res.json();
  if (!res.ok) {
    const retryHint = json?.retryAfterSeconds ? ` Yritä uudelleen noin ${json.retryAfterSeconds}s kuluttua.` : '';
    throw new Error(`${json?.error || 'Koodin lähetys epäonnistui'}${retryHint}`.trim());
  }
  return json;
}

export async function verifyLoginCode(email, code) {
  const url = buildUrl('/api/auth/verify-code');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Koodin vahvistus epäonnistui');
  await AsyncStorage.setItem('token', json.token);
  return json;
}

export async function getProfile() {
  return fetchJson('/api/me');
}

export async function reportIssue({ message, reporterEmail, routeName, context, errorDetails } = {}) {
  const metadata = getClientEnvironment();

  return fetchJson('/api/feedback-reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      reporterEmail,
      routeName,
      context,
      errorDetails,
      ...metadata
    })
  });
}

export async function updateBookingLifecycle(bookingId, action, payload = {}) {
  return fetchJson(`/api/bookings/${bookingId}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function setupBookingDeposit(bookingId, depositAmount) {
  return fetchJson(`/api/bookings/${bookingId}/deposit/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ depositAmount })
  });
}

export async function releaseBookingDeposit(bookingId) {
  return fetchJson(`/api/bookings/${bookingId}/deposit/release`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
}

export async function claimBookingDeposit(bookingId, amount, reason) {
  return fetchJson(`/api/bookings/${bookingId}/deposit/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, reason })
  });
}

export async function uploadBookingEvidence(bookingId, phase, photos) {
  return fetchJson(`/api/bookings/${bookingId}/evidence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phase, photos })
  });
}

export async function submitBookingReview(bookingId, actor, rating, comment) {
  return fetchJson(`/api/bookings/${bookingId}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor, rating, comment })
  });
}

export async function getBookingReviews(bookingId) {
  return fetchJson(`/api/bookings/${bookingId}/reviews`);
}

export async function getAdminDisputes(status = 'all') {
  return fetchJson(`/api/admin/disputes?status=${encodeURIComponent(status)}`);
}

export async function resolveAdminDispute(bookingId, resolutionStatus, note, closeBooking = true) {
  return fetchJson(`/api/admin/disputes/${bookingId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-user': 'product-admin'
    },
    body: JSON.stringify({ resolutionStatus, note, closeBooking })
  });
}

export async function getAuthAuditLogs(limit = 100) {
  return fetchJson(`/api/admin/auth-audit-logs?limit=${encodeURIComponent(String(limit))}`);
}

export async function getAdminPilotMetrics(days = 30) {
  return fetchJson(`/api/admin/pilot-metrics?days=${encodeURIComponent(String(days))}`);
}

export async function getAuthProviderStatus() {
  return fetchJson('/api/auth/provider-status');
}

export async function getAdminListings(status = 'pending') {
  return fetchJson(`/api/admin/listings?status=${encodeURIComponent(status)}`);
}

export async function moderateAdminListing(listingId, moderationStatus, note = '') {
  return fetchJson(`/api/admin/listings/${listingId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-user': 'product-admin'
    },
    body: JSON.stringify({ moderationStatus, note })
  });
}

export async function getOwnerListings(status = 'all') {
  return fetchJson(`/api/owner/listings?status=${encodeURIComponent(status)}`);
}

export async function createOwnerListing(payload) {
  return fetchJson('/api/owner/listings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function updateOwnerListing(listingId, payload) {
  return fetchJson(`/api/owner/listings/${listingId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}
