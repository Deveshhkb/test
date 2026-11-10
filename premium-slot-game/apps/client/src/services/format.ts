/** Formats minor units (cents) as credits with 2 decimals and thousands separators. */
export function formatCredits(minor: number): string {
  return (minor / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
