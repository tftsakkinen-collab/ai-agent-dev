const { test, expect } = require('@playwright/test');
const fetch = require('node-fetch');

test('mock api serves products and requires auth for bookings', async () => {
  const products = await fetch('http://localhost:3000/api/products').then(r => r.json());
  expect(Array.isArray(products)).toBeTruthy();

  // bookings should be unauthorized without token
  const res = await fetch('http://localhost:3000/api/bookings');
  expect(res.status).toBe(401);
});
