// Deterministic per-bundle reference number, same hash-then-format
// convention as getLoanNumber() (keyed on the bundle's own id, since that's
// already a stable, unique UUID per AppraisalReportBundle — no separate
// counter/sequence to persist).
export function getAppraisalNumber(bundleId: string) {
  let hash = 0;
  for (let i = 0; i < bundleId.length; i += 1) {
    hash = (hash * 31 + bundleId.charCodeAt(i)) >>> 0;
  }
  return `APR-${(hash % 1000000).toString().padStart(6, '0')}`;
}
