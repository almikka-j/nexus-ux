'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';

import { cardSx, fieldSx, RadioRow } from './call-report-types';
import { buildCallSummary, buildCallReportAiExceptions } from './call-report-summary';
import { buildCallReportAiRecommendation, type CallReportRiskLevel } from './call-report-risk';

// ----------------------------------------------------------------------
// PDF section 8: NEXUS System Validation / Exception Handoff. AI Summary
// / AI Exceptions / AI Recommendation are computed on demand (via
// "Refresh AI Review") and stored on CallReport, same convention as
// every other field on this page, rather than recomputed silently on
// every render.
// ----------------------------------------------------------------------

const RISK_STYLES: Record<CallReportRiskLevel, { bg: string; color: string; icon: string; label: string }> = {
  good: { bg: '#E7F8F0', color: '#0C8A4F', icon: 'solar:check-circle-bold', label: 'Low risk' },
  watch: { bg: '#FEF0D6', color: '#B36A05', icon: 'solar:danger-triangle-bold', label: 'Needs a closer look' },
  high: { bg: '#FDE2DF', color: '#B32C22', icon: 'solar:danger-triangle-bold', label: 'High risk' },
};

export function SystemValidationCard() {
  const { review, setCallReport } = useAdmin();
  const { callReport } = review;
  const { signUpData } = useRegistration();

  const refreshAiReview = () => {
    const summary = buildCallSummary(callReport, signUpData);
    const exceptions = buildCallReportAiExceptions(callReport);
    const recommendation = buildCallReportAiRecommendation(callReport);
    setCallReport({ aiSummary: summary, aiExceptions: exceptions, aiRecommendation: recommendation.text });
  };

  const currentRecommendation = buildCallReportAiRecommendation(callReport);
  const riskStyle = RISK_STYLES[currentRecommendation.level];

  return (
    <Box sx={cardSx}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <Iconify icon="solar:magic-stick-3-bold-duotone" width={18} sx={{ color: '#8891A6' }} />
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
          8. NEXUS System Validation / Exception Handoff
        </Typography>
      </Stack>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        System-generated validation only. AI / automated rules are advisory and must not replace
        authorized credit, compliance, or approval judgment.
      </Typography>

      <Button
        onClick={refreshAiReview}
        variant="outlined"
        startIcon={<Iconify icon="solar:refresh-bold" width={18} />}
        sx={{
          mb: 2.5,
          color: '#1C2A6E',
          borderColor: '#C7CEEA',
          borderRadius: '10px',
          px: 2,
          '&:hover': { borderColor: '#1C2A6E', bgcolor: 'rgba(28,42,110,0.04)' },
        }}
      >
        Refresh AI Review
      </Button>

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

        <Box>
          <RadioRow
            label="AO vs. System Assessment Variance"
            value={callReport.aoVsSystemVariance}
            options={[
              { value: 'none', label: 'None' },
              { value: 'noted', label: 'Variance Noted' },
            ]}
            onChange={(value) => setCallReport({ aoVsSystemVariance: value })}
          />
          {callReport.aoVsSystemVariance === 'noted' && (
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Explanation"
              value={callReport.varianceExplanation}
              onChange={(event) => setCallReport({ varianceExplanation: event.target.value })}
              sx={{ ...fieldSx, mt: 1.5 }}
            />
          )}
        </Box>
      </Stack>
    </Box>
  );
}
