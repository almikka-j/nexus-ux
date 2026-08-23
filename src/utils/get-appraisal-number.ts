// Deterministic per-bundle reference number, same hash-then-format
// convention as getLoanNumber() — keyed on the bundle's own pledged
// property/TCT group ids rather than the bundle's `id` (a fresh
// crypto.randomUUID() minted every time the bundle is (re)created), so the
// same set of properties always yields the same Appraisal No., the way
// getLoanNumber()'s email input always yields the same Application No.
export function getAppraisalNumber(tctGroupIds: string[]) {
  const seed = tctGroupIds.join(',');
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return `APR-${(hash % 1000000).toString().padStart(6, '0')}`;
}
