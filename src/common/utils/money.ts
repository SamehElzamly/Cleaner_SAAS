// Floating point can't represent most decimals exactly (0.1 + 0.2 !== 0.3),
// which is unacceptable for invoices. Every calculation goes through integer
// cents; values are only converted back to decimals at the edges.
export const toCents = (amount: number): number => Math.round((amount + Number.EPSILON) * 100);
export const fromCents = (cents: number): number => cents / 100;
