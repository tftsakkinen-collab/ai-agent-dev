import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import {
  getCached,
  setCached,
  isUnauthProfileCached,
  setUnauthProfileCached,
  resetUnauthProfileState,
  clearCached
} from './apiCache';

const BASE_URL = API_BASE_URL;

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
  const token = await AsyncStorage.getItem('token');
  if (!token || token === 'null' || token === 'undefined') return null;
  return token;
}

export async function logout() {
  resetUnauthProfileState();
  clearCached();
  return AsyncStorage.removeItem('token');
}

export async function fetchWithAuth(path, options = {}) {
  const token = await getToken();

  // 1. ABSOLUTE ZERO NETWORK REQUESTS FOR /api/me WHEN UNAUTHENTICATED
  if (path === '/api/me' && !token) {
    setUnauthProfileCached();
    throw new Error('Unauthorized');
  }

  const url = buildUrl(path);
  const headers = Object.assign({}, options.headers || {});
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, Object.assign({}, options, { headers }));
  if (res.status === 401) {
    if (path === '/api/me') setUnauthProfileCached();
    throw new Error('Unauthorized');
  }
  return res;
}

export async function fetchJson(path, options = {}) {
  const isGet = !options.method || options.method.toUpperCase() === 'GET';

  // 2. TOISTUVIEN KUTSUJEN VÄLILUKU
  if (isGet && (path === '/api/products' || path === '/api/categories')) {
    const cached = getCached(path);
    if (cached) return cached;
  }

  const res = await fetchWithAuth(path, options);
  const json = await res.json();
  if (!res.ok) {
    const message = json?.error || res.statusText || 'API error';
    throw new Error(message);
  }

  if (isGet && (path === '/api/products' || path === '/api/categories')) {
    setCached(path, json);
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
  resetUnauthProfileState();
  clearCached();
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
  resetUnauthProfileState();
  clearCached();
  return json;
}

export async function getFavorites() {
  const token = await getToken();
  if (!token) return [];
  return fetchJson('/api/favorites');
}

export async function addFavorite(productId) {
  return fetchJson('/api/favorites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId })
  });
}

export async function removeFavorite(productId) {
  return fetchJson(`/api/favorites/${productId}`, {
    method: 'DELETE'
  });
}

// 3. ZERO UNNECESSARY /api/me NETWORK CALLS
export async function getProfile() {
  const token = await getToken();
  if (!token) {
    return null; // Return null immediately without network call!
  }

  if (isUnauthProfileCached()) {
    return null; // Return null immediately without repeated 401 network call!
  }

  const cached = getCached('/api/me');
  if (cached) return cached;

  try {
    const profile = await fetchJson('/api/me');
    setCached('/api/me', profile);
    return profile;
  } catch (err) {
    if (err.message === 'Unauthorized') {
      setUnauthProfileCached();
    }
    return null;
  }
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

export async function claimBookingDeposit(bookingId, reason) {
  return fetchJson(`/api/bookings/${bookingId}/deposit/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason })
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

export async function uploadListingPhoto(listingId, fileBlob) {
  const token = await getToken();
  const url = buildUrl(`/api/owner/listings/${listingId}/upload-photo`);
  const formData = new FormData();
  formData.append('photo', fileBlob);

  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: formData
  });

  const json = await res.json();
  if (!res.ok) {
    const message = json?.error || res.statusText || 'Kuvan lataus epäonnistui';
    throw new Error(message);
  }
  return json;
}

export async function getListingModerationThroughput() {
  return fetchJson('/api/admin/listing-moderation-throughput', {
    headers: { 'x-admin-user': 'product-admin' }
  });
}

export async function requestMagicLink(email) {
  return fetchJson('/api/auth/magic-link/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
}

export async function verifyMagicLink(token, email = null) {
  const payload = { token };
  if (email) payload.email = email;
  
  const res = await fetchWithAuth('/api/auth/magic-link/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Varmennus epäonnistui');
  if (json.token) {
    await AsyncStorage.setItem('token', json.token);
  }
  resetUnauthProfileState();
  clearCached();
  return json;
}

export async function getBooking(bookingId) {
  return fetchJson(`/api/bookings/${bookingId}`);
}

export async function confirmBookingHandoff(bookingId, actor) {
  return fetchJson(`/api/bookings/${bookingId}/handoff/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor })
  });
}

export async function submitBookingEvidence(bookingId, phase, photos) {
  return fetchJson(`/api/bookings/${bookingId}/evidence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phase, photos })
  });
}

export async function getBookingDisputes(bookingId) {
  return fetchJson(`/api/bookings/${bookingId}/disputes`);
}

export async function submitBookingDispute(bookingId, { reason, description, evidencePhotos = [] }) {
  return fetchJson(`/api/bookings/${bookingId}/dispute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason, description, evidencePhotos })
  });
}

export async function getPendingListings() {
  return fetchJson('/api/admin/listings?status=pending', {
    headers: { 'x-admin-user': 'product-admin' }
  });
}

export async function approveOwnerListing(listingId, { note = '' } = {}) {
  return fetchJson(`/api/admin/listings/${listingId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-user': 'product-admin'
    },
    body: JSON.stringify({ moderationStatus: 'approved', note })
  });
}

export async function rejectOwnerListing(listingId, { reason = '' } = {}) {
  return fetchJson(`/api/admin/listings/${listingId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-user': 'product-admin'
    },
    body: JSON.stringify({ moderationStatus: 'rejected', note: reason })
  });
}

export async function createDepositPaymentIntent(bookingId, depositAmount) {
  return fetchJson('/api/payments/deposit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId, depositAmount })
  });
}

export async function confirmDepositPayment(bookingId, paymentIntentId) {
  return fetchJson('/api/payments/deposit/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId, paymentIntentId })
  });
}

export async function createInviteCode(email) {
  return fetchJson('/api/pilot/invite-codes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-user': 'product-admin'
    },
    body: JSON.stringify({ email })
  });
}

export async function validateInviteCode(code) {
  return fetchJson('/api/pilot/validate-invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });
}

export async function listInviteCodes() {
  return fetchJson('/api/pilot/invite-codes', {
    headers: { 'x-admin-user': 'product-admin' }
  });
}

export async function getNotifications() {
  return fetchJson('/api/notifications');
}

export async function markNotificationRead(notificationId) {
  return fetchJson(`/api/notifications/${notificationId}/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
}

export async function exportBookingsAsCSV() {
  const res = await fetchWithAuth('/api/export/bookings', {
    method: 'GET',
    headers: { Accept: 'text/csv' }
  });
  if (!res.ok) throw new Error('Export failed');
  return res.text();
}

export async function exportMetricsAsCSV() {
  const res = await fetchWithAuth('/api/export/metrics', {
    method: 'GET',
    headers: {
      Accept: 'text/csv',
      'x-admin-user': 'product-admin'
    }
  });
  if (!res.ok) throw new Error('Export failed');
  return res.text();
}

export async function getRenterProfile() {
  return fetchJson('/api/profiles/renter');
}

export async function updateRenterProfile(data) {
  return fetchJson('/api/profiles/renter', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

export async function getHostProfile() {
  return fetchJson('/api/profiles/host');
}

export async function updateHostProfile(data) {
  return fetchJson('/api/profiles/host', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

export async function getMessages(bookingId) {
  return fetchJson(`/api/messages?bookingId=${bookingId}`);
}

export async function sendMessage(bookingId, text) {
  return fetchJson('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId, text })
  });
}

export async function getBookingHistory() {
  return fetchJson('/api/bookings/history');
}

export async function getPaymentHistory() {
  return fetchJson('/api/payments/history');
}

export async function cancelBooking(bookingId, data) {
  return fetchJson(`/api/bookings/${bookingId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

export async function searchProducts(query) {
  const url = new URL('http://localhost:3000/api/products/search');
  url.searchParams.set('q', query);
  const res = await fetchWithAuth(url.toString());
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

export async function submitHostOnboarding(data) {
  return fetchJson('/api/host/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

export async function postDemandLead(email, locationName) {
  return fetchJson('/api/leads/demand', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, locationName })
  });
}
