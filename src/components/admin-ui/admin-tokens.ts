// ----------------------------------------------------------------------
// Canonical design tokens for the admin app — one color/shape per
// semantic meaning, so every chip, badge, card, and button converges on
// the same values instead of each screen picking its own near-identical
// hex. See docs/UI_UX_AUDIT.md for the audit that produced this list.
// ----------------------------------------------------------------------

import type { ReviewStep } from 'src/auth/admin-context';

export type SemanticTone = 'success' | 'warning' | 'error' | 'neutral' | 'info';

export const TONE_COLORS: Record<SemanticTone, { bg: string; text: string; border: string; solid: string; solidHover: string }> = {
  success: { bg: '#E7F8F0', text: '#0C8A4F', border: '#C7EDDA', solid: '#12B76A', solidHover: '#0C8A4F' },
  warning: { bg: '#FEF0D6', text: '#B36A05', border: '#F4DBA3', solid: '#F79009', solidHover: '#B36A05' },
  error: { bg: '#FDE2DF', text: '#B32C22', border: '#F3C4BE', solid: '#F04438', solidHover: '#B32C22' },
  neutral: { bg: '#F5F6FA', text: '#8891A6', border: '#E1E4ED', solid: '#8891A6', solidHover: '#667085' },
  info: { bg: '#EEF1FE', text: '#3448B0', border: '#D6DCFA', solid: '#1C2A6E', solidHover: '#14205A' },
};

// Standard white card container shared by every top-level section box
// across the admin app (Document Checklist, CI Fee, AI Summary, etc.).
export const adminCardSx = {
  p: { xs: 3, md: 4 },
  borderRadius: '16px',
  bgcolor: 'common.white',
  border: '1px solid #EBEDF3',
  boxShadow: '0 1px 2px rgba(20,23,42,0.04)',
} as const;

// Outlined navy "View / Request / secondary" button, the app's most
// duplicated button sx block.
export const outlinedNavyButtonSx = {
  color: '#1C2A6E',
  borderColor: '#C7CEEA',
  borderRadius: '9px',
  '&:hover': { borderColor: '#1C2A6E', bgcolor: 'rgba(28,42,110,0.04)' },
} as const;

// Bordered gray icon button ("⋮" more-actions trigger), with the hover
// state most instances of this control were previously missing.
export const iconButtonBorderedSx = {
  color: '#5A6273',
  border: '1px solid #E1E4ED',
  borderRadius: '9px',
  '&:hover': { borderColor: '#1C2A6E', bgcolor: 'rgba(28,42,110,0.04)' },
} as const;

// Which semantic tone each pipeline step's status pill renders in — shared
// by the Application List table's Status column and
// ApplicationReviewHeader's step pill, so a step reads the same color
// whichever screen it's viewed from. Keyed by step (not by
// review.creditChecking.decision) since the pill shows which stage an
// application is at, not its decision.
export const STEP_TONE: Record<ReviewStep, SemanticTone> = {
  creditChecking: 'warning',
  reconsideration: 'error',
  callReport: 'info',
  requirementChecklist: 'success',
  creditInvestigation: 'info',
  appraisal: 'info',
  financialEvaluation: 'info',
};
