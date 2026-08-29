'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';
import { StatusBadge, TONE_COLORS } from 'src/components/admin-ui';

import {
  REVIEW_BASIS_LABELS,
  RECOMMENDED_ACTION_LABELS,
} from './initial-credit-checking-risk';
import type {
  InitialCreditCheckingResult,
  InitialCreditCheckingRiskLevel,
  RecommendedActionCode,
} from './initial-credit-checking-risk';

// ----------------------------------------------------------------------
// Shared rendering of an InitialCreditCheckingResult — the "AI review,
// summary & recommendation" content shown both on the Initial Credit
// Checking page and inside the Initial Credit Checking Result modal, so the
// two never visually drift apart. Pure presentation; all computation lives
// in initial-credit-checking-risk.ts.
// ----------------------------------------------------------------------

export const RISK_LEVEL_STYLES: Record<
  InitialCreditCheckingRiskLevel,
  { bg: string; color: string; icon: string; label: string }
> = {
  low: { bg: '#E7F8F0', color: '#0C8A4F', icon: 'solar:check-circle-bold', label: 'Low' },
  moderate: { bg: '#EEF1FE', color: '#3448B0', icon: 'solar:info-circle-bold', label: 'Moderate' },
  elevated: { bg: '#FEF0D6', color: '#B36A05', icon: 'solar:danger-triangle-bold', label: 'Elevated' },
  high: { bg: '#FDE2DF', color: '#B32C22', icon: 'solar:danger-triangle-bold', label: 'High' },
  'unable-to-determine': { bg: '#F5F6FA', color: '#8891A6', icon: 'solar:question-circle-bold', label: 'Unable to Determine' },
};

const NO_ADDITIONAL_VERIFICATION_LABEL = 'No additional verification identified during initial screening.';

// Each AI Recommended Action code maps to the same success/warning/error
// semantic tones as the rest of the admin app (TONE_COLORS), rather than
// reusing the risk-level color — the action is a distinct verdict from the
// risk level (e.g. "elevated" risk can still resolve to "for further
// review", a warning tone, not the risk level's own color).
const RECOMMENDED_ACTION_TONES: Record<
  RecommendedActionCode,
  { tone: keyof typeof TONE_COLORS; icon: string }
> = {
  'clear-to-proceed': { tone: 'success', icon: 'solar:check-circle-bold' },
  'proceed-subject-to-verification': { tone: 'info', icon: 'solar:shield-check-bold' },
  'for-further-credit-review': { tone: 'warning', icon: 'solar:magnifer-bold' },
  'on-hold': { tone: 'neutral', icon: 'solar:pause-circle-bold' },
  'policy-exception': { tone: 'warning', icon: 'solar:danger-triangle-bold' },
  'does-not-meet-initial-rac': { tone: 'error', icon: 'solar:close-circle-bold' },
};

// Each AI Summary sub-section gets its own icon/color instead of inheriting
// the risk banner's single color, so a reviewer can tell "favorable" from
// "adverse" from "missing" at a glance instead of reading every line.
const SUMMARY_GROUP_STYLES: Record<string, { icon: string; color: string }> = {
  favorable: { icon: 'solar:check-circle-bold', color: TONE_COLORS.success.text },
  adverse: { icon: 'solar:danger-triangle-bold', color: TONE_COLORS.error.text },
  discrepancy: { icon: 'solar:question-circle-bold', color: TONE_COLORS.warning.text },
  missing: { icon: 'solar:file-remove-bold', color: TONE_COLORS.neutral.text },
};

// One AI Summary sub-section ("Key favorable findings", "Key adverse
// findings", etc.) — hidden entirely when empty, so a clean result doesn't
// show three empty "adverse/discrepancy/missing" headings with nothing
// under them.
function AiSummaryGroup({
  label,
  items,
  kind,
}: {
  label: string;
  items: string[];
  kind: keyof typeof SUMMARY_GROUP_STYLES;
}) {
  if (items.length === 0) return null;
  const { icon, color } = SUMMARY_GROUP_STYLES[kind];
  return (
    <Box>
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
        <Iconify icon={icon} width={14} sx={{ color }} />
        <Typography sx={{ fontSize: 12, fontWeight: 700, color }}>{label}</Typography>
      </Stack>
      <Stack spacing={0.4} sx={{ pl: 2.75 }}>
        {items.map((item) => (
          <Typography key={item} sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6 }}>
            {item}
          </Typography>
        ))}
      </Stack>
    </Box>
  );
}

export function AiRecommendationSummary({ result }: { result: InitialCreditCheckingResult }) {
  const riskStyle = RISK_LEVEL_STYLES[result.riskLevel];
  const actionTone = RECOMMENDED_ACTION_TONES[result.recommendedAction];

  return (
    <Stack spacing={2}>
      <Box sx={{ p: 2.25, borderRadius: '14px', bgcolor: riskStyle.bg }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5} sx={{ mb: 1.25 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: riskStyle.color }}>
            Overall Assessment
          </Typography>
          <Stack
            direction="row"
            spacing={0.75}
            alignItems="center"
            sx={{ px: 1.5, py: 0.5, borderRadius: '999px', bgcolor: 'common.white', flexShrink: 0 }}
          >
            <Iconify icon={riskStyle.icon} width={15} sx={{ color: riskStyle.color }} />
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: riskStyle.color, whiteSpace: 'nowrap' }}>
              {riskStyle.label} risk
            </Typography>
          </Stack>
        </Stack>
        <Typography sx={{ fontSize: 13.5, color: '#14172A', lineHeight: 1.65, mb: 1.75 }}>
          {result.overallAssessment}
        </Typography>

        <Divider sx={{ borderColor: riskStyle.color, opacity: 0.15, mb: 1.75 }} />

        <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: riskStyle.color, mb: 1.25 }}>
          AI Summary
        </Typography>
        <Stack spacing={1.5}>
          <AiSummaryGroup label="Key favorable findings" items={result.favorableFindings} kind="favorable" />
          <AiSummaryGroup label="Key adverse findings" items={result.adverseFindings} kind="adverse" />
          <AiSummaryGroup
            label="Discrepancies or items requiring verification"
            items={result.discrepancies}
            kind="discrepancy"
          />
          <AiSummaryGroup label="Missing information" items={result.missingInformation} kind="missing" />
        </Stack>
      </Box>

      <Box sx={{ p: 2.25, borderRadius: '14px', bgcolor: 'common.white', border: '1px solid #EEF0F5' }}>
        <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: '#8891A6', mb: 1.25 }}>
          AI Recommended Action
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{
            display: 'inline-flex',
            px: 1.75,
            py: 0.85,
            borderRadius: '10px',
            bgcolor: TONE_COLORS[actionTone.tone].bg,
            mb: 1.5,
          }}
        >
          <Iconify icon={actionTone.icon} width={17} sx={{ color: TONE_COLORS[actionTone.tone].text }} />
          <Typography
            sx={{
              fontSize: 13.5,
              fontWeight: 800,
              letterSpacing: '0.01em',
              color: TONE_COLORS[actionTone.tone].text,
            }}
          >
            {RECOMMENDED_ACTION_LABELS[result.recommendedAction]}
          </Typography>
        </Stack>

        <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#5A6273', mb: 0.5 }}>
          Reason for Recommendation
        </Typography>
        <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6, mb: 1.75 }}>
          {result.reasonForRecommendation}
        </Typography>

        <Divider sx={{ borderColor: '#EEF0F5', mb: 1.75 }} />

        <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: '#8891A6', mb: 1 }}>
          AI Review Basis
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {result.reviewBasis.map((tag) => (
            <StatusBadge key={tag} tone="neutral" label={REVIEW_BASIS_LABELS[tag]} />
          ))}
        </Stack>
      </Box>

      <Box sx={{ p: 2.25, borderRadius: '14px', bgcolor: 'common.white', border: '1px solid #EEF0F5' }}>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1.25 }}>
          <Iconify icon="solar:checklist-minimalistic-bold-duotone" width={16} sx={{ color: '#8891A6' }} />
          <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: '#8891A6' }}>
            Required Verification or Next Steps
          </Typography>
        </Stack>
        {result.requiredVerification.length === 0 ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <Iconify icon="solar:check-circle-bold" width={16} sx={{ color: TONE_COLORS.success.text }} />
            <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6 }}>
              {NO_ADDITIONAL_VERIFICATION_LABEL}
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={0.75}>
            {result.requiredVerification.map((item) => (
              <Stack key={item} direction="row" spacing={1} alignItems="flex-start">
                <Iconify icon="solar:round-arrow-right-bold" width={14} sx={{ color: '#B0B8CC', mt: 0.25, flexShrink: 0 }} />
                <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6 }}>{item}</Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </Box>

      <Stack direction="row" spacing={1} sx={{ px: 0.5 }}>
        <Iconify icon="solar:shield-warning-linear" width={15} sx={{ color: '#A0A7B5', mt: 0.15, flexShrink: 0 }} />
        <Typography sx={{ fontSize: 11.5, color: '#98A2B3', lineHeight: 1.6 }}>
          <Box component="span" sx={{ fontWeight: 700, color: '#8891A6' }}>AI Control Statement — </Box>
          This AI-generated result is an advisory risk-screening output only. It does not
          constitute loan approval, disapproval, or a policy waiver. All findings,
          exceptions, and recommendations must be independently validated by authorized
          Credit personnel.
        </Typography>
      </Stack>
    </Stack>
  );
}
