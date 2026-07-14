// The CIBI form UI itself now lives inline in `bureau-reports-card.tsx` (as
// part of the compact, space-saving Bureau Reports card's collapsible CIBI
// row) rather than as its own standalone always-expanded card. This helper is
// kept here since both that file and `initial-credit-checking-view.tsx`
// (for the "Fill with Sample Data" button) need the same installment math.
export function computeInstallment(amount: string, terms: string) {
  const amt = Number(amount);
  const t = Number(terms);
  if (!amt || !t) return '';
  return (amt / t).toFixed(2);
}
