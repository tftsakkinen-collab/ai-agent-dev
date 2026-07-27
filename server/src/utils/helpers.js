function generateNotification(userId, message, type = 'info', metadata = {}) {
  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    userId,
    message,
    type,
    metadata,
    read: false,
    createdAt: new Date().toISOString()
  };
}

function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildUserIdFromEmail(email) {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(email).digest('hex');
  return `user-${hash.slice(0, 12)}`;
}

function getClientIp(req) {
  return req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
}

function buildProductResponse(item) {
  return {
    id: item.id,
    type: item.type || 'sup_board',
    name: item.name,
    short: item.short,
    price: item.price,
    pricePerHour: item.pricePerHour || 15,
    pricePerDay: item.pricePerDay || 45,
    providerId: item.providerId,
    provider: item.provider || { id: item.providerId, name: 'Unknown' },
    ownerEmail: item.ownerEmail || null,
    rating: item.rating || 4.5,
    photos: item.photos || ['https://via.placeholder.com/600x400?text=GearSpot+Tuote'],
    locationName: item.locationName || 'Oulu',
    searchTerms: item.searchTerms || [],
    moderationStatus: item.moderationStatus || 'approved'
  };
}

function getSafeBookingView(booking) {
  return {
    ...booking,
    handoffCode: booking.bookingStage === 'in_use' || booking.bookingStage === 'awaiting_handoff' ? booking.handoffCode : null
  };
}

function buildOwnerProviderId(email) {
  const crypto = require('crypto');
  const hash = crypto.createHash('md5').update(email).digest('hex');
  return `provider-${hash.slice(0, 8)}`;
}

module.exports = {
  generateNotification,
  normalizeEmail,
  isValidEmail,
  buildUserIdFromEmail,
  getClientIp,
  buildProductResponse,
  getSafeBookingView,
  buildOwnerProviderId
};
