// Simulates the AI review of the uploaded bureau reports coming back clean
// or with a negative finding. There's no real OCR/AI service anywhere in
// this codebase — every other "AI" text in this app is templated boilerplate
// driven by application financial data, not real document analysis — so this
// is deterministic and hash-based (same technique as getLoanNumber's email
// hash), not Math.random(), so the outcome doesn't flip between re-renders
// or page reloads and reproduces consistently for the same applicant/files
// during a QA pass.
//
// The reason pool per bureau below mirrors the actual PGFC bureau
// acceptance/disposition policy table (NFIS, CMAP, CIBI, CIC, LOANDEX) —
// see docs/ADMIN_INITIAL_CREDIT_CHECKING.md for the source table. Only
// NFIS and CMAP are modeled as capable of a negative finding: CIBI's
// disposition is a score threshold (not a fixed reason list) and this app
// has no bureau-score field to compare against, and CIC/LOANDEX's own
// findings largely overlap NFIS/CMAP's reason set. Every application is
// checked against the same reason pools — this app has no SME/Clean/
// Housing account-type field to restrict CIC/LOANDEX by loan product, so
// that restriction from the source table isn't modeled.
export type BureauFindingBureau = 'NFIS' | 'CMAP';

export type BureauFinding = {
  status: 'clean' | 'negative';
  bureau: BureauFindingBureau | null;
  reason: string | null;
};

const NFIS_REASONS = [
  'Closed Current account due to Improper Handling',
  'Closed Current account due to DAIF',
  'Closed Current account due to Unfunded Check',
  'Closed Current account due to Negative Balance',
  'Closed Current account due to Returned Checks',
  'Closed Current account due to Bank-Initiated Closure',
  'Adversely Classified Loan due to Past Due',
  'Adversely Classified Loan due to Foreclosure',
  'Adversely Classified Loan due to Litigation',
  'Adversely Classified Loan due to Written-Off',
  'Cancelled Credit Card due to Payment Default',
  'Cancelled Credit Card due to Multiple Past Due Accounts',
];

const CMAP_REASONS = [
  'Court Case due to Estafa',
  'Court Case due to Batas Pambansa Blg. 22',
  'Court Case due to Foreclosure',
  'Court Case due to Illegal Recruitment',
  'Court Case due to Ejectment',
  'Court Case due to Falsification of Public Document',
  'Court Case due to Replevin',
  'Court Case due to Unlawful Detainer',
  'Court Case due to Swindling',
  'Accounts Referred to Lawyers due to Past Due',
  'Telecom Data due to Past Due',
  'Returned Cheque due to DAIF',
  'Returned Cheque due to Account Closed',
  'Returned Cheque due to Improper Handling',
];

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function simulateBureauFinding(seedParts: string[]): BureauFinding {
  const seed = seedParts.join('|');
  const hash = hashSeed(seed);

  if (hash % 2 === 0) {
    return { status: 'clean', bureau: null, reason: null };
  }

  // Odd hashes are negative — a second, independent hash over a re-salted
  // seed picks which bureau's reason pool applies, and a third picks the
  // specific reason, so the choice doesn't collapse to always-NFIS or
  // always-the-first-reason for structurally similar file names.
  const bureauHash = hashSeed(`${seed}|bureau`);
  const bureau: BureauFindingBureau = bureauHash % 2 === 0 ? 'NFIS' : 'CMAP';
  const reasons = bureau === 'NFIS' ? NFIS_REASONS : CMAP_REASONS;
  const reasonHash = hashSeed(`${seed}|reason`);
  const reason = reasons[reasonHash % reasons.length];

  return { status: 'negative', bureau, reason };
}
