import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchJson, fetchWithAuth, login } from '../lib/api';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
}));

describe('api helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  test('fetchWithAuth attaches bearer token when available', async () => {
    AsyncStorage.getItem.mockResolvedValue('token-123');
    global.fetch.mockResolvedValue({ status: 200, ok: true, json: async () => ({ ok: true }) });

    await fetchWithAuth('/api/products');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/products',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token-123' })
      })
    );
  });

  test('fetchWithAuth throws Unauthorized on 401', async () => {
    AsyncStorage.getItem.mockResolvedValue('token-123');
    global.fetch.mockResolvedValue({ status: 401, ok: false, json: async () => ({ error: 'Unauthorized' }) });

    await expect(fetchWithAuth('/api/bookings')).rejects.toThrow('Unauthorized');
  });

  test('fetchJson throws api error message for non-ok response', async () => {
    AsyncStorage.getItem.mockResolvedValue(null);
    global.fetch.mockResolvedValue({
      status: 400,
      ok: false,
      statusText: 'Bad Request',
      json: async () => ({ error: 'Missing fields' })
    });

    await expect(fetchJson('/api/bookings')).rejects.toThrow('Missing fields');
  });

  test('login stores token to AsyncStorage', async () => {
    global.fetch.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ token: 'mock-token', email: 'test@example.com' })
    });

    const result = await login('test@example.com');

    expect(result.token).toBe('mock-token');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('token', 'mock-token');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/login',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
