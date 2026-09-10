'use client';

import type { ReactNode } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';
import { CollapsibleSection } from 'src/components/collapsible-section';

import { AI_CONTROL_STATEMENT, type AiReviewRiskDisplay } from './ai-review-tokens';
import { AiRecommendationSummary } from './ai-recommendation-summary';
import type { InitialCreditCheckingResult } from '../../sections/admin/initial-credit-checking-risk';

// ----------------------------------------------------------------------
// The one "AI review, summary & recommendation" card, shared by Initial
// Credit Checking, Requirement Checklist, Credit Investigation, and
// Financial Evaluation.
//
// One visual pattern — a CollapsibleSection with a magic-stick icon, a
// tinted risk box, and the AI Control Statement footnote — driven by
// optional content slots so each screen shows only what it actually
// computes:
//
//  - RICH variant (Initial Credit Checking): pass `richResult`. Renders
//    AiRecommendationSummary (Overall Assessment + AI Summary sub-groups +
//    Recommended Action + Review Basis + Required Verification + its own
//    Control Statement footnote).
//  - COMPACT variant (the three document-readiness screens): pass `risk` +
//    `summary` + `recommendation`. Renders an "AI Summary" box, an "AI
//    Recommendation" box (risk shown as a pill, not in the heading), and
//    the Control Statement footnote.
//
// `footer` renders extra card content below the AI blocks (Initial Credit
// Checking's "View Initial Credit Checking Result" row + its divider).
// ----------------------------------------------------------------------

const AI_CARD_ICON = 'solar:magic-stick-3-bold-duotone';
const DEFAULT_TITLE = 'AI review, summary & recommendation';

type AiReviewCardProps = {
  /** Header icon. Defaults to the magic-stick glyph. */
  icon?: string;
  title?: string;
  subtitle?: ReactNode;

  /** Collapse state. Omit both for an always-open card with no chevron. */
  expanded?: boolean;
  onToggle?: () => void;

  // --- RICH variant ---
  /** The full Initial-Credit-Checking result. Takes precedence over the compact slots. */
  richResult?: InitialCreditCheckingResult;

  // --- COMPACT variant ---
  risk?: AiReviewRiskDisplay;
  summary?: string;
  recommendation?: string;

  /**
   * Show the AI Control Statement footnote. Default: true. Ignored for the
   * rich variant, which already renders its own copy.
   */
  showControlStatement?: boolean;

  /** Extra content rendered inside the card, below the AI blocks. */
  footer?: ReactNode;
};

function ControlStatement() {
  return (
    <Stack direction="row" spacing={1} sx={{ px: 0.5, pt: 0.5 }}>
      <Iconify
        icon="solar:shield-warning-linear"
        width={15}
        sx={{ color: '#A0A7B5', mt: 0.15, flexShrink: 0 }}
      />
      <Typography sx={{ fontSize: 11.5, color: '#98A2B3', lineHeight: 1.6 }}>
        <Box component="span" sx={{ fontWeight: 700, color: '#8891A6' }}>
          AI Control Statement —{' '}
        </Box>
        {AI_CONTROL_STATEMENT}
      </Typography>
    </Stack>
  );
}

export function AiReviewCard({
  icon = AI_CARD_ICON,
  title = DEFAULT_TITLE,
  subtitle,
  expanded,
  onToggle,
  richResult,
  risk,
  summary,
  recommendation,
  showControlStatement = true,
  footer,
}: AiReviewCardProps) {
  const collapsibleProps =
    expanded === undefined ? {} : { expanded, onToggle };

  return (
    <Box
      sx={{
        p: { xs: 3, md: 4 },
        borderRadius: '16px',
        bgcolor: 'common.white',
        border: '1px solid #EBEDF3',
        boxShadow: '0 1px 2px rgba(20,23,42,0.04)',
      }}
    >
      <CollapsibleSection icon={icon} title={title} subtitle={subtitle} {...collapsibleProps}>
        <Stack spacing={2}>
          {richResult ? (
            <AiRecommendationSummary result={richResult} />
          ) : (
            <>
              {summary !== undefined && (
                <Box
                  sx={{
                    p: 2,
                    borderRadius: '11px',
                    bgcolor: '#F9FAFC',
                    border: '1px solid #EEF0F5',
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Iconify
                      icon="solar:document-text-bold-duotone"
                      width={16}
                      sx={{ color: '#5A6273' }}
                    />
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273' }}>
                      AI Summary
                    </Typography>
                  </Stack>
                  <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6 }}>
                    {summary}
                  </Typography>
                </Box>
              )}

              {recommendation !== undefined && risk && (
                <Box sx={{ p: 2, borderRadius: '11px', bgcolor: risk.bg }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={1.5}
                    sx={{ mb: 1 }}
                  >
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: risk.color }}>
                      AI Recommendation
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={0.75}
                      alignItems="center"
                      sx={{
                        px: 1.25,
                        py: 0.4,
                        borderRadius: '999px',
                        bgcolor: 'common.white',
                        flexShrink: 0,
                      }}
                    >
                      <Iconify icon={risk.icon} width={13} sx={{ color: risk.color }} />
                      <Typography
                        sx={{
                          fontSize: 11.5,
                          fontWeight: 800,
                          color: risk.color,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {risk.label}
                      </Typography>
                    </Stack>
                  </Stack>
                  <Typography sx={{ fontSize: 13.5, color: risk.color, lineHeight: 1.6 }}>
                    {recommendation}
                  </Typography>
                </Box>
              )}

              {showControlStatement && <ControlStatement />}
            </>
          )}

          {footer}
        </Stack>
      </CollapsibleSection>
    </Box>
  );
}
