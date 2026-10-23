/**
 * What this business adds to a publisher's list price.
 *
 * One number, in one file, because three price lists that each carried their
 * own copy would drift the first time one of them was changed and the others
 * were not — and the symptom would be a catalogue where Adobe is priced on one
 * policy and Autodesk on another, with nothing on the site saying so.
 *
 * It began as a flat ₹5,000 per user, named for the Adobe list. That is heavy
 * at the cheap end and light at the expensive one: on Microsoft 365 Business
 * Basic at ₹2,040 a year it is a 245% uplift, and on Microsoft 365 E7 at
 * ₹98,820 it is 5%. The business chose a percentage instead, and chose to
 * apply it across all three publishers.
 *
 * Applied to the publisher's own list price, excluding GST. GST is added on
 * the invoice at the prevailing rate and is not part of this.
 */
export const MARGIN_PERCENT = 25;

/**
 * A publisher's list price in rupees, as this business sells it, in paise.
 *
 * Rounded to the rupee rather than left fractional: a price is quoted,
 * invoiced and paid in whole rupees, and a catalogue figure that cannot be
 * paid exactly is a figure that disagrees with its own invoice.
 */
export function sellingPriceMinor(listRupees: number): number {
  return Math.round(listRupees * (1 + MARGIN_PERCENT / 100)) * 100;
}
