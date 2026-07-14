// Simulates the AI review of the uploaded bureau reports coming back clean
// or with a negative finding. There's no real OCR/AI service anywhere in
// this codebase — every other "AI" text in this app is templated boilerplate
// driven by application financial data, not real document analysis — so this
// is deterministic and hash-based (same technique as getLoanNumber's email
// hash), not Math.random(), so the outcome doesn't flip between re-renders
// or page reloads and reproduces consistently for the same applicant/files
// during a QA pass.
export function simulateBureauFinding(seedParts: string[]): 'clean' | 'negative' {
  const seed = seedParts.join('|');
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % 2 === 0 ? 'clean' : 'negative';
}
