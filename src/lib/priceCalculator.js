/**
 * Helper to calculate rental prices accurately without string concatenation bugs.
 */
export function calculateRentalPrice(priceString = '', selectedTimeSlot = 'Koko päivä', addOnPrices = []) {
  let hourlyRate = 15;
  let dailyRate = 60;

  if (priceString && typeof priceString === 'string') {
    // Match hourly rate at start: e.g. "15 €" or "15€"
    const matchHourly = priceString.match(/^(\d+)\s*€/);
    if (matchHourly) {
      hourlyRate = parseInt(matchHourly[1], 10);
    }

    // Match daily rate if present: e.g. "(tai 60 € / pvä)" or "/ 60 €"
    const matchDaily = priceString.match(/(?:tai\s*|\/\s*)(\d+)\s*€\s*(?:\/\s*(?:pvä|vrk|päivä))/i);
    if (matchDaily) {
      dailyRate = parseInt(matchDaily[1], 10);
    } else {
      dailyRate = hourlyRate * 4; // Cap full day at 4 hours
    }
  }

  let hours = 3;
  let isFullDay = false;

  const slotStr = String(selectedTimeSlot || '').toLowerCase();
  if (!selectedTimeSlot || slotStr.includes('koko päivä') || slotStr.includes('full day')) {
    isFullDay = true;
    hours = 8;
  } else {
    const timeMatch = slotStr.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const startHour = parseInt(timeMatch[1], 10);
      const endHour = parseInt(timeMatch[3], 10);
      if (endHour > startHour) {
        hours = endHour - startHour;
      }
    }
  }

  const baseRentalPrice = isFullDay ? dailyRate : Math.min(hourlyRate * hours, dailyRate);
  const addOnsTotal = (Array.isArray(addOnPrices) ? addOnPrices : []).reduce((sum, p) => sum + (Number(p) || 0), 0);
  const totalPrice = baseRentalPrice + addOnsTotal;

  return {
    hourlyRate,
    dailyRate,
    hours,
    isFullDay,
    baseRentalPrice,
    addOnsTotal,
    totalPrice
  };
}
