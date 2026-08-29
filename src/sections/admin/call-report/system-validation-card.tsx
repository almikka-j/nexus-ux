'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { outlinedNavyButtonSx } from 'src/components/admin-ui';

import { cardSx } from './call-report-types';
import { buildCallSummary, buildCallReportAiExceptions } from './call-report-summary';
import {
  buildCallReportAiRecommendation,
  buildCallReportVariance,
  type CallReportRiskLevel,
} from './call-report-risk';

// ----------------------------------------------------------------------
// PDF section 8: NEXUS System Validation / Exception Handoff — titled
// "AI review, summary & recommendation" on-page instead, matching the
// naming convention used for the equivalent AI section on Initial Credit
// Checking. AI Summary / AI Exceptions / AI Recommendation are computed on
// demand (via "Refresh AI Review") and stored on CallReport, same
// convention as every other field on this page, rather than recomputed
// silently on every render.
// ----------------------------------------------------------------------

const RISK_STYLES: Record<CallReportRiskLevel, { bg: string; color: string; icon: string; label: string }> = {
  good: { bg: '#E7F8F0', color: '#0C8A4F', icon: 'solar:check-circle-bold', label: 'Low risk' },
  watch: { bg: '#FEF0D6', color: '#B36A05', icon: 'solar:danger-triangle-bold', label: 'Needs a closer look' },
  high: { bg: '#FDE2DF', color: '#B32C22', icon: 'solar:danger-triangle-bold', label: 'High risk' },
};

export function SystemValidationCard({ onViewResult }: { onViewResult: () => void }) {
  const { review, setCallReport } = useAdmin();
  const { callReport } = review;
  const { signUpData } = useRegistration();

  const refreshAiReview = () => {
    const summary = buildCallSummary(callReport, signUpData);
    const exceptions = buildCallReportAiExceptions(callReport);
    const recommendation = buildCallReportAiRecommendation(callReport);
    const variance = buildCallReportVariance(callReport);
    setCallReport({
      aiSummary: summary,
      aiExceptions: exceptions,
      aiRecommendation: recommendation.text,
      aoVsSystemVariance: variance.status,
      varianceExplanation: variance.explanation,
    });
  };

  const currentRecommendation = buildCallReportAiRecommendation(callReport);
  const riskStyle = RISK_STYLES[currentRecommendation.level];
  const currentVariance = buildCallReportVariance(callReport);

  return (
    <Box sx={cardSx}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
        justifyContent="space-between"
        spacing={1.5}
        sx={{ mb: 2.5 }}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <Iconify icon="solar:magic-stick-3-bold-duotone" width={18} sx={{ color: '#8891A6' }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
              AI review, summary &amp; recommendation
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
            System-generated validation only. AI / automated rules are advisory and must not replace
            authorized credit, compliance, or approval judgment.
          </Typography>
        </Box>

        <Button
          onClick={refreshAiReview}
          variant="outlined"
          startIcon={<Iconify icon="solar:refresh-bold" width={18} />}
          sx={{ ...outlinedNavyButtonSx, px: 2, flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          Refresh AI Review
        </Button>
      </Stack>

      <Stack spacing={2}>
        <Box sx={{ p: 2, borderRadius: '11px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273', mb: 1 }}>AI Summary</Typography>
          <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6 }}>
            {callReport.aiSummary || 'Click "Refresh AI Review" to generate a summary.'}
          </Typography>
        </Box>

        <Box sx={{ p: 2, borderRadius: '11px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273', mb: 1 }}>
            AI Exceptions / Inconsistencies
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6 }}>
            {callReport.aiExceptions || 'Click "Refresh AI Review" to check for exceptions.'}
          </Typography>
        </Box>

        <Box sx={{ p: 2, borderRadius: '11px', bgcolor: riskStyle.bg }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Iconify icon={riskStyle.icon} width={16} sx={{ color: riskStyle.color }} />
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: riskStyle.color }}>
              AI Recommendation / Risk Level · {riskStyle.label}
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: 13.5, color: riskStyle.color, lineHeight: 1.6 }}>
            {callReport.aiRecommendation || currentRecommendation.text}
          </Typography>
        </Box>

        <Box sx={{ p: 2, borderRadius: '11px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273', mb: 1 }}>
            AO vs. System Assessment Variance
          </Typography>
          {currentVariance.status === '' ? (
            <Typography sx={{ fontSize: 13.5, color: '#8891A6', lineHeight: 1.6 }}>
              Enter an AO Preliminary Risk rating above and click &quot;Refresh AI Review&quot; to compare
              it against the system assessment.
            </Typography>
          ) : (
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <Iconify
                icon={currentVariance.status === 'noted' ? 'solar:danger-triangle-bold' : 'solar:check-circle-bold'}
                width={16}
                sx={{ color: currentVariance.status === 'noted' ? '#B36A05' : '#0C8A4F', mt: 0.15, flexShrink: 0 }}
              />
              <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6 }}>
                {currentVariance.status === 'noted'
                  ? callReport.varianceExplanation || currentVariance.explanation
                  : 'None — the AO Preliminary Risk rating matches the system assessment.'}
              </Typography>
            </Stack>
          )}
        </Box>

        <Divider sx={{ borderColor: '#EEF0F5' }} />

        <Button
          onClick={onViewResult}
          variant="outlined"
          startIcon={<Iconify icon="solar:document-text-bold-duotone" width={18} />}
          sx={{ ...outlinedNavyButtonSx, px: 2, alignSelf: 'flex-start' }}
        >
          View Call Report Result
        </Button>
      </Stack>
    </Box>
  );
}
