const { test, expect } = require('@playwright/test');
const fetch = require('node-fetch');

test('mock api serves products and requires auth for bookings', async () => {
  const products = await fetch('http://localhost:3000/api/products').then(r => r.json());
  expect(Array.isArray(products)).toBeTruthy();

  // bookings should be unauthorized without token
  const res = await fetch('http://localhost:3000/api/bookings');
  expect(res.status).toBe(401);
});

test('login, booking and review flow works with auth token', async () => {
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'flow@example.com' })
  });
  expect(loginRes.status).toBe(200);

  const loginJson = await loginRes.json();
  expect(loginJson.token).toBeTruthy();

  const products = await fetch('http://localhost:3000/api/products').then((r) => r.json());
  expect(products.length).toBeGreaterThan(0);
  const productId = products[0].id;

  const bookingRes = await fetch('http://localhost:3000/api/bookings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${loginJson.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      productId,
      name: 'Flow Tester',
      email: 'flow@example.com'
    })
  });
  expect(bookingRes.status).toBe(200);

  const bookingJson = await bookingRes.json();
  expect(bookingJson.productId).toBe(productId);

  const reviewRes = await fetch('http://localhost:3000/api/reviews', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${loginJson.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      targetType: 'product',
      targetId: productId,
      rating: 5,
      comment: 'Flow test review'
    })
  });
  expect(reviewRes.status).toBe(200);

  const reviews = await fetch(
    `http://localhost:3000/api/reviews?targetType=product&targetId=${encodeURIComponent(productId)}`
  ).then((r) => r.json());
  expect(reviews.some((review) => review.comment === 'Flow test review')).toBeTruthy();
});

test('provider details and provider reviews flow works', async () => {
  const providers = await fetch('http://localhost:3000/api/providers').then((r) => r.json());
  expect(Array.isArray(providers)).toBeTruthy();
  expect(providers.length).toBeGreaterThan(0);

  const providerId = providers[0].id;
  const providerDetails = await fetch(`http://localhost:3000/api/providers/${providerId}`).then((r) => r.json());
  expect(providerDetails.id).toBe(providerId);
  expect(Array.isArray(providerDetails.products)).toBeTruthy();

  const providerReviews = await fetch(
    `http://localhost:3000/api/reviews?targetType=provider&targetId=${encodeURIComponent(providerId)}`
  ).then((r) => r.json());
  expect(Array.isArray(providerReviews)).toBeTruthy();

  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'provider-flow@example.com' })
  });
  expect(loginRes.status).toBe(200);
  const loginJson = await loginRes.json();

  const createReviewRes = await fetch('http://localhost:3000/api/reviews', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${loginJson.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      targetType: 'provider',
      targetId: providerId,
      rating: 5,
      comment: 'Provider flow review'
    })
  });
  expect(createReviewRes.status).toBe(200);

  const providerDetailsAfter = await fetch(`http://localhost:3000/api/providers/${providerId}`).then((r) => r.json());
  expect(providerDetailsAfter.reviews.some((review) => review.comment === 'Provider flow review')).toBeTruthy();
});
