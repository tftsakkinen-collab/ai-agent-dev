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
      email: 'flow@example.com',
      paymentMethod: 'visa',
      cardLast4: '4242'
    })
  });
  expect(bookingRes.status).toBe(200);

  const bookingJson = await bookingRes.json();
  expect(bookingJson.productId).toBe(productId);
  expect(bookingJson.paymentStatus).toBe('paid');
  expect(bookingJson.bookingStatus).toBe('confirmed');

  const refundRes = await fetch(`http://localhost:3000/api/bookings/${bookingJson.id}/refund`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${loginJson.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ reason: 'changed_mind' })
  });
  expect(refundRes.status).toBe(200);

  const refundJson = await refundRes.json();
  expect(refundJson.paymentStatus).toBe('refunded');
  expect(refundJson.bookingStatus).toBe('cancelled');
  expect(refundJson.refundStatus).toBe('refunded');

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

test('feedback report can be submitted without auth', async () => {
  const feedbackRes = await fetch('http://localhost:3000/api/feedback-reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Checkout button looked stuck',
      routeName: 'Booking',
      context: 'manual_feedback'
    })
  });

  expect(feedbackRes.status).toBe(201);

  const feedbackJson = await feedbackRes.json();
  expect(feedbackJson.id).toBeTruthy();
  expect(feedbackJson.status).toBe('new');

  const feedbackUpdateRes = await fetch(`http://localhost:3000/api/feedback-reports/${feedbackJson.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'in_progress', priority: 'high' })
  });

  expect(feedbackUpdateRes.status).toBe(200);

  const feedbackUpdateJson = await feedbackUpdateRes.json();
  expect(feedbackUpdateJson.status).toBe('in_progress');
  expect(feedbackUpdateJson.priority).toBe('high');
});

test('booking lifecycle transitions and deposit evidence flow work', async () => {
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'lifecycle@example.com' })
  });
  expect(loginRes.status).toBe(200);
  const loginJson = await loginRes.json();

  const products = await fetch('http://localhost:3000/api/products').then((r) => r.json());
  const productId = products[0].id;

  const bookingRes = await fetch('http://localhost:3000/api/bookings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${loginJson.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      productId,
      name: 'Lifecycle Tester',
      paymentMethod: 'visa',
      cardLast4: '4242'
    })
  });
  expect(bookingRes.status).toBe(200);
  const booking = await bookingRes.json();
  expect(booking.bookingStage).toBe('approved');

  const setupHandoffRes = await fetch(`http://localhost:3000/api/bookings/${booking.id}/handoff/setup`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${loginJson.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ handoffMethod: 'lockbox_code', handoffCode: '1234' })
  });
  expect(setupHandoffRes.status).toBe(200);
  const handoffSetup = await setupHandoffRes.json();
  expect(handoffSetup.bookingStage).toBe('awaiting_handoff');
  expect(handoffSetup.handoffCode).toBe(null);

  const renterConfirmRes = await fetch(`http://localhost:3000/api/bookings/${booking.id}/handoff/confirm`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${loginJson.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ actor: 'renter' })
  });
  expect(renterConfirmRes.status).toBe(200);

  const ownerConfirmRes = await fetch(`http://localhost:3000/api/bookings/${booking.id}/handoff/confirm`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${loginJson.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ actor: 'owner' })
  });
  expect(ownerConfirmRes.status).toBe(200);
  const inUseBooking = await ownerConfirmRes.json();
  expect(inUseBooking.bookingStage).toBe('in_use');
  expect(inUseBooking.handoffCode).toBe('1234');

  const depositSetupRes = await fetch(`http://localhost:3000/api/bookings/${booking.id}/deposit/setup`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${loginJson.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ depositAmount: 120 })
  });
  expect(depositSetupRes.status).toBe(200);
  const depositSetup = await depositSetupRes.json();
  expect(depositSetup.depositStatus).toBe('held');
  expect(depositSetup.depositAmount).toBe(120);

  const evidenceBeforeRes = await fetch(`http://localhost:3000/api/bookings/${booking.id}/evidence`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${loginJson.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ phase: 'before', photos: ['https://img.test/before-1.jpg'] })
  });
  expect(evidenceBeforeRes.status).toBe(200);
  const beforeEvidenceBooking = await evidenceBeforeRes.json();
  expect(beforeEvidenceBooking.evidencePhotosBefore.length).toBeGreaterThan(0);

  const returnRequestRes = await fetch(`http://localhost:3000/api/bookings/${booking.id}/return/request`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${loginJson.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  expect(returnRequestRes.status).toBe(200);

  const returnConfirmRes = await fetch(`http://localhost:3000/api/bookings/${booking.id}/return/confirm`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${loginJson.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  expect(returnConfirmRes.status).toBe(200);

  const evidenceAfterRes = await fetch(`http://localhost:3000/api/bookings/${booking.id}/evidence`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${loginJson.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ phase: 'after', photos: ['https://img.test/after-1.jpg'] })
  });
  expect(evidenceAfterRes.status).toBe(200);
  const afterEvidenceBooking = await evidenceAfterRes.json();
  expect(afterEvidenceBooking.evidencePhotosAfter.length).toBeGreaterThan(0);

  const depositReleaseRes = await fetch(`http://localhost:3000/api/bookings/${booking.id}/deposit/release`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${loginJson.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  expect(depositReleaseRes.status).toBe(200);
  const releasedBooking = await depositReleaseRes.json();
  expect(releasedBooking.depositStatus).toBe('released');

  const completeRes = await fetch(`http://localhost:3000/api/bookings/${booking.id}/complete`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${loginJson.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  expect(completeRes.status).toBe(200);
  const completedBooking = await completeRes.json();
  expect(completedBooking.bookingStage).toBe('completed');
  expect(completedBooking.bookingStatus).toBe('completed');
});

test('double-blind booking reviews stay hidden until both are submitted', async () => {
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'blind-review@example.com' })
  });
  expect(loginRes.status).toBe(200);
  const loginJson = await loginRes.json();

  const products = await fetch('http://localhost:3000/api/products').then((r) => r.json());
  const productId = products[0].id;

  const bookingRes = await fetch('http://localhost:3000/api/bookings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${loginJson.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      productId,
      name: 'Blind Review Tester',
      paymentMethod: 'visa',
      cardLast4: '4242'
    })
  });
  expect(bookingRes.status).toBe(200);
  const booking = await bookingRes.json();

  // Fast-path this booking to completed stage.
  await fetch(`http://localhost:3000/api/bookings/${booking.id}/handoff/setup`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${loginJson.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ handoffMethod: 'in_person' })
  });
  await fetch(`http://localhost:3000/api/bookings/${booking.id}/handoff/confirm`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${loginJson.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor: 'owner' })
  });
  await fetch(`http://localhost:3000/api/bookings/${booking.id}/handoff/confirm`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${loginJson.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor: 'renter' })
  });
  await fetch(`http://localhost:3000/api/bookings/${booking.id}/return/request`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${loginJson.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  await fetch(`http://localhost:3000/api/bookings/${booking.id}/return/confirm`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${loginJson.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const completeRes = await fetch(`http://localhost:3000/api/bookings/${booking.id}/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${loginJson.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  expect(completeRes.status).toBe(200);

  const renterReviewRes = await fetch(`http://localhost:3000/api/bookings/${booking.id}/reviews`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${loginJson.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ actor: 'renter', rating: 5, comment: 'Great handoff and clean gear.' })
  });
  expect(renterReviewRes.status).toBe(201);

  const hiddenReadRes = await fetch(`http://localhost:3000/api/bookings/${booking.id}/reviews`, {
    headers: { Authorization: `Bearer ${loginJson.token}` }
  });
  expect(hiddenReadRes.status).toBe(200);
  const hiddenRead = await hiddenReadRes.json();
  expect(hiddenRead.visibility).toBe('hidden');
  expect(hiddenRead.reviews.length).toBe(0);

  const ownerReviewRes = await fetch(`http://localhost:3000/api/bookings/${booking.id}/reviews`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${loginJson.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ actor: 'owner', rating: 4, comment: 'Returned on time.' })
  });
  expect(ownerReviewRes.status).toBe(201);

  const visibleReadRes = await fetch(`http://localhost:3000/api/bookings/${booking.id}/reviews`, {
    headers: { Authorization: `Bearer ${loginJson.token}` }
  });
  expect(visibleReadRes.status).toBe(200);
  const visibleRead = await visibleReadRes.json();
  expect(visibleRead.visibility).toBe('visible');
  expect(visibleRead.reviews.length).toBe(2);
});

test('request-code endpoint enforces cooldown and records audit log', async () => {
  const email = `cooldown-${Date.now()}@example.com`;

  const first = await fetch('http://localhost:3000/api/auth/request-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  expect(first.status).toBe(200);

  const second = await fetch('http://localhost:3000/api/auth/request-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  expect(second.status).toBe(429);
  const secondJson = await second.json();
  expect(secondJson.reason).toBeTruthy();
  expect(secondJson.retryAfterSeconds).toBeGreaterThan(0);

  const logsRes = await fetch('http://localhost:3000/api/admin/auth-audit-logs?limit=20');
  expect(logsRes.status).toBe(200);
  const logs = await logsRes.json();
  expect(Array.isArray(logs)).toBeTruthy();
  expect(logs.some((entry) => entry.email === email && entry.event === 'request_code_sent')).toBeTruthy();
});

test('admin can resolve disputed booking', async () => {
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `dispute-${Date.now()}@example.com` })
  });
  expect(loginRes.status).toBe(200);
  const loginJson = await loginRes.json();

  const products = await fetch('http://localhost:3000/api/products').then((r) => r.json());
  const productId = products[0].id;

  const bookingRes = await fetch('http://localhost:3000/api/bookings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${loginJson.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      productId,
      name: 'Dispute Tester',
      paymentMethod: 'visa',
      cardLast4: '9999'
    })
  });
  expect(bookingRes.status).toBe(200);
  const booking = await bookingRes.json();

  const disputeRes = await fetch(`http://localhost:3000/api/bookings/${booking.id}/dispute`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${loginJson.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ reason: 'visible_damage' })
  });
  expect(disputeRes.status).toBe(200);
  const disputed = await disputeRes.json();
  expect(disputed.bookingStage).toBe('disputed');
  expect(disputed.disputeResolutionStatus).toBe('open');

  const listRes = await fetch('http://localhost:3000/api/admin/disputes?status=open');
  expect(listRes.status).toBe(200);
  const openDisputes = await listRes.json();
  expect(openDisputes.some((item) => item.id === booking.id)).toBeTruthy();

  const resolveRes = await fetch(`http://localhost:3000/api/admin/disputes/${booking.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-user': 'qa-admin'
    },
    body: JSON.stringify({ resolutionStatus: 'resolved', note: 'Damage verified with photos', closeBooking: true })
  });
  expect(resolveRes.status).toBe(200);
  const resolved = await resolveRes.json();
  expect(resolved.disputeResolutionStatus).toBe('resolved');
  expect(resolved.disputeResolvedBy).toBe('qa-admin');
  expect(resolved.bookingStage).toBe('completed');
});
