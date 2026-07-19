import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

function buildUrl(path) {
  if (!path) return BASE_URL;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/')) return `${BASE_URL}${path}`;
  return `${BASE_URL}/${path}`;
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

export async function getProfile() {
  return fetchJson('/api/me');
}
