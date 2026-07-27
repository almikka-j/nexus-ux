// ----------------------------------------------------------------------
// Simulates auto-filling the CI Report from an uploaded transcript file
// (standing in for a PLAUD.ai export). There's no real transcription/AI
// service anywhere in this codebase — this is deterministic and hash-based
// (same technique as simulateBureauFinding/getLoanNumber), not
// Math.random(), so the same transcript filename always produces the same
// result and reproduces consistently across reloads during a QA pass.
// Uploading a transcript never reads its actual contents — only its
// filename feeds the seed.
// ----------------------------------------------------------------------

export type CiTranscriptAutoFill = {
  visitLocation: string;
  identityConfirmed: 'yes' | 'no' | 'for-verification';
  residenceConfirmed: 'yes' | 'no' | 'for-verification';
  businessConfirmed: 'yes' | 'no' | 'not-applicable';
  neighborhoodFeedback: string;
  neighborhoodStanding: 'good-standing' | 'with-concern' | 'not-verified';
  findings: string;
  recommendation: 'proceed-as-requested' | 'proceed-with-conditions' | 'needs-additional-verification';
  recommendationNotes: string;
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
      visitLocation: 'Residence address on file',
      identityConfirmed: 'yes',
      residenceConfirmed: 'yes',
      businessConfirmed: 'not-applicable',
      neighborhoodFeedback: `Neighbors confirmed ${applicantName} has resided at the address for an extended period with no adverse remarks.`,
      neighborhoodStanding: 'good-standing',
      findings: `Site visit confirmed ${applicantName}'s identity and residence as declared. No inconsistencies were found between the transcript and the application details on file.`,
      recommendation: 'proceed-as-requested',
      recommendationNotes: 'Findings support proceeding with the loan as requested.',
      aiSummary: `Transcript reviewed for ${applicantName}. Identity and residence were confirmed on-site, and neighborhood feedback was positive. No red flags detected.`,
    };
  }

  return {
    visitLocation: 'Residence address on file',
    identityConfirmed: 'for-verification',
    residenceConfirmed: 'for-verification',
    businessConfirmed: 'not-applicable',
    neighborhoodFeedback: `Neighbors had limited information about ${applicantName}; residency could not be fully corroborated during the visit.`,
    neighborhoodStanding: 'with-concern',
    findings: `Site visit for ${applicantName} raised some items that need further verification before a final assessment can be made.`,
    recommendation: 'needs-additional-verification',
    recommendationNotes: 'Recommend a follow-up visit or additional supporting documents before proceeding.',
    aiSummary: `Transcript reviewed for ${applicantName}. Some details from the site visit could not be fully corroborated — additional verification is recommended before proceeding.`,
  };
}
