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
  if (!res.ok) throw new Error(json?.error || 'Koodin lähetys epäonnistui');
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
