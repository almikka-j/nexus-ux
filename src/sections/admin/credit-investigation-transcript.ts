// ----------------------------------------------------------------------
// Simulates auto-filling the CI Report from an uploaded transcript file
// (standing in for a PLAUD.ai export). There's no real transcription/AI
// service anywhere in this codebase — this is deterministic and hash-based
// (same technique as simulateBureauFinding/getLoanNumber), not
// Math.random(), so the same transcript filename always produces the same
// result and reproduces consistently across reloads during a QA pass.
// Uploading a transcript never reads its actual contents — only its
// filename feeds the seed.
//
// Only fields a transcript could plausibly attest to are covered here.
// The read-only header block (residence/business address), Loan Purpose,
// and Comaker are sourced from application data / Call Report instead —
// see ci-report-card.tsx — and are never touched by this auto-fill, so a
// transcript re-upload can't clobber them.
// ----------------------------------------------------------------------

export type CiTranscriptAutoFill = {
  residenceLeasedType: 'owned' | 'leased' | 'rent-free';
  residenceLengthOfStay: string;
  presentAddressSameAsPermanent: boolean;
  employmentType: 'direct' | 'agency' | 'self-employed';
  lengthOfService: string;
  negativeRecordFinding: 'no-negative-findings-both-cmap-nfis' | 'negative-findings-found';
  findingsNarrativeHtml: string;
  aiSummary: string;
};

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function buildTranscriptAutoFill(seedParts: string[], applicantName: string): CiTranscriptAutoFill {
  const hash = hashSeed(seedParts.join('|'));
  const isPositive = hash % 2 === 0;

  if (isPositive) {
    return {
      residenceLeasedType: 'owned',
      residenceLengthOfStay: 'Over 5 years',
      presentAddressSameAsPermanent: true,
      employmentType: 'direct',
      lengthOfService: '5+ years',
      negativeRecordFinding: 'no-negative-findings-both-cmap-nfis',
      findingsNarrativeHtml: `<p>Site visit confirmed ${applicantName}'s identity and residence as declared. No inconsistencies were found between the transcript and the application details on file.</p>`,
      aiSummary: `Transcript reviewed for ${applicantName}. Identity and residence were confirmed on-site, and neighborhood feedback was positive. No red flags detected.`,
    };
  }

  return {
    residenceLeasedType: 'leased',
    residenceLengthOfStay: 'Less than 1 year',
    presentAddressSameAsPermanent: false,
    employmentType: 'agency',
    lengthOfService: 'Less than 1 year',
    negativeRecordFinding: 'negative-findings-found',
    findingsNarrativeHtml: `<p>Site visit for ${applicantName} raised some items that need further verification before a final assessment can be made.</p>`,
    aiSummary: `Transcript reviewed for ${applicantName}. Some details from the site visit could not be fully corroborated — additional verification is recommended before proceeding.`,
  };
}
