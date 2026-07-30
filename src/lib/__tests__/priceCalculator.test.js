import { calculateRentalPrice } from '../priceCalculator';

describe('calculateRentalPrice', () => {
  test('calculates 3 hour window (09:00 - 12:00) at 15 €/h correctly to 45 € (NOT 1560 €)', () => {
    const res = calculateRentalPrice('15 € / h (tai 60 € / pvä)', '09:00 - 12:00', []);
    expect(res.hourlyRate).toBe(15);
    expect(res.hours).toBe(3);
    expect(res.baseRentalPrice).toBe(45);
    expect(res.totalPrice).toBe(45);
  });

  test('calculates full day at 60 € correctly', () => {
    const res = calculateRentalPrice('15 € / h (tai 60 € / pvä)', 'Koko päivä', []);
    expect(res.isFullDay).toBe(true);
    expect(res.baseRentalPrice).toBe(60);
    expect(res.totalPrice).toBe(60);
  });

  test('adds add-on equipment correctly', () => {
    const res = calculateRentalPrice('15 € / h (tai 60 € / pvä)', '09:00 - 12:00', [5, 3, 10]);
    expect(res.baseRentalPrice).toBe(45);
    expect(res.addOnsTotal).toBe(18);
    expect(res.totalPrice).toBe(63);
  });

  test('handles plain price string gracefully', () => {
    const res = calculateRentalPrice('20 €', '12:00 - 15:00', []);
    expect(res.hourlyRate).toBe(20);
    expect(res.baseRentalPrice).toBe(60);
  });
});
