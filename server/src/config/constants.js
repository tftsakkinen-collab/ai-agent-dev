const BOOKING_STAGE = {
  APPROVED: 'approved',
  AWAITING_HANDOFF: 'awaiting_handoff',
  IN_USE: 'in_use',
  AWAITING_RETURN: 'awaiting_return',
  RETURNED: 'returned',
  COMPLETED: 'completed',
  DISPUTED: 'disputed'
};

const ALLOWED_HANDOFF_METHODS = ['lockbox_code', 'in_person'];
const ALLOWED_DEPOSIT_STATUS = ['not_required', 'held', 'released', 'claimed'];
const ALLOWED_REVIEW_ACTORS = ['owner', 'renter'];

const STORE_KEYS = {
  notifications: 'gearspot:notifications',
  bookings: 'gearspot:bookings',
  dynamicReviews: 'gearspot:dynamicReviews',
  feedbackReports: 'gearspot:feedbackReports',
  authAuditLogs: 'gearspot:authAuditLogs',
  ownerListings: 'gearspot:ownerListings',
  users: 'gearspot:users'
};

module.exports = {
  BOOKING_STAGE,
  ALLOWED_HANDOFF_METHODS,
  ALLOWED_DEPOSIT_STATUS,
  ALLOWED_REVIEW_ACTORS,
  STORE_KEYS
};
