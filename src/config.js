export const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_51TuHI0ImJVK1QLXX2AQRXog92zyBrAiRZTSPi3MJWdL72lpwZ8bTFMkvu0U9HmlCpLYoKJtWVT9VjqeWcORi6yZF00f1kYKKW7';

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }
  if (typeof window !== 'undefined' && window.location) {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) {
      return `${window.location.protocol}//${window.location.hostname}:3000`;
    } else {
      // In production web, frontend and backend are usually served from the same domain
      return `${window.location.protocol}//${window.location.host}`;
    }
  }
  return 'http://localhost:3000';
};

export const API_BASE_URL = getBaseUrl();
