const { bookingSchema } = require('../../server/src/utils/validation');

describe('Zod Validation tests', () => {
  it('bookingSchema requires terms and safety checklist to be accepted', () => {
    const validData = {
      productId: 'sup-1',
      name: 'Pekka',
      paymentMethod: 'visa',
      termsAccepted: true,
      safetyChecklistAccepted: true
    };

    expect(() => bookingSchema.parse(validData)).not.toThrow();

    const invalidData = { ...validData, termsAccepted: false };
    expect(() => bookingSchema.parse(invalidData)).toThrow();
  });

  it('bookingSchema enforces minimum string lengths', () => {
     const invalidData = {
      productId: 'sup-1',
      name: 'P', // Liian lyhyt
      paymentMethod: 'visa',
      termsAccepted: true,
      safetyChecklistAccepted: true
    };
    expect(() => bookingSchema.parse(invalidData)).toThrow();
  });
});
