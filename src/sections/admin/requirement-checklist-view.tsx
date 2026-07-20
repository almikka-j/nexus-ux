'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';

import { ApplicationReviewHeader } from './application-review-header';
import { RequirementDocRow } from './requirement-doc-row';
import { buildRequirementChecklistSummary } from './requirement-checklist-risk';
import {
  REQUIREMENT_DOC_META,
  REQUIREMENT_CATEGORY_LABELS,
} from './requirement-checklist-docs';

import type { RequirementDoc } from 'src/auth/admin-context';
import type { RequirementDocCategory } from './requirement-checklist-docs';
import type { RequirementChecklistRiskLevel } from './requirement-checklist-risk';

// ----------------------------------------------------------------------

const CATEGORY_ORDER: RequirementDocCategory[] = ['loan', 'financial', 'appraisal'];

const RISK_STYLES: Record<
  RequirementChecklistRiskLevel,
  { bg: string; color: string; icon: string; label: string }
> = {
  good: { bg: '#E7F8F0', color: '#0C8A4F', icon: 'solar:check-circle-bold', label: 'Ready' },
  watch: { bg: '#FEF0D6', color: '#B36A05', icon: 'solar:danger-triangle-bold', label: 'Almost ready' },
  high: { bg: '#FDE2DF', color: '#B32C22', icon: 'solar:danger-triangle-bold', label: 'Not ready' },
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8891A6' }}
    >
      {children}
    </Typography>
  );
}

function SuccessState({
  icon,
  iconBg,
  iconColor,
  heading,
  body,
  stepLabel,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  heading: string;
  body: string;
  stepLabel: string;
}) {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <ApplicationReviewHeader step={stepLabel} reviewStep="requirementChecklist" />

      <Stack
        alignItems="center"
        textAlign="center"
        spacing={2}
        sx={{ p: { xs: 4, md: 6 }, borderRadius: '16px', bgcolor: 'common.white', border: '1px solid #EBEDF3' }}
      >
        <Box
          sx={{ width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: iconBg }}
        >
          <Iconify icon={icon} width={26} sx={{ color: iconColor }} />
        </Box>
        <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#14172A' }}>{heading}</Typography>
        <Typography sx={{ fontSize: 14, color: '#8891A6', maxWidth: 420 }}>{body}</Typography>
        <Button
          component="a"
          href={paths.admin.applications}
          variant="contained"
          sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', mt: 1, '&:hover': { bgcolor: '#14205A' } }}
        >
          Back to Application List
        </Button>
      </Stack>
    </Container>
  );
}

export function RequirementChecklistView() {
  const { signUpData, application } = useRegistration();
  const { review, setRequirementChecklist } = useAdmin();
  const [collateralNotes, setCollateralNotes] = useState(review.requirementChecklist.collateralNotes);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnReasonDraft, setReturnReasonDraft] = useState('');

  if (!signUpData) return null;

  const { documents, endorsed, returnedToApplicant } = review.requirementChecklist;

  const handleUploadDoc = (key: string) => (data: Partial<RequirementDoc>) => {
    setRequirementChecklist({
      documents: documents.map((doc) => (doc.key === key ? { ...doc, ...data } : doc)),
    });
  };

  const requiredMeta = REQUIREMENT_DOC_META.filter((meta) => meta.required);
  const requiredDocsByKey = new Map(documents.map((doc) => [doc.key, doc]));
  const receivedRequiredCount = requiredMeta.filter(
    (meta) => requiredDocsByKey.get(meta.key)?.status !== 'missing'
  ).length;
  const allRequiredReceived = receivedRequiredCount === requiredMeta.length;
  const progressFraction = requiredMeta.length > 0 ? receivedRequiredCount / requiredMeta.length : 0;

  const { level, summary, recommendation } = buildRequirementChecklistSummary(
    documents,
    REQUIREMENT_DOC_META,
    application.financialInfo?.monthlyIncome ?? 0,
    application.financialInfo?.desiredLoanAmount ?? 0
  );
  const riskStyle = RISK_STYLES[level];

  const handleEndorse = () => {
    setRequirementChecklist({ collateralNotes, endorsed: true });
  };

  const closeReturnDialog = () => {
    setReturnDialogOpen(false);
    setReturnReasonDraft('');
  };

  const confirmReturn = () => {
    if (!returnReasonDraft.trim()) return;
    setRequirementChecklist({
      collateralNotes,
      returnedToApplicant: true,
      returnReason: returnReasonDraft.trim(),
    });
    closeReturnDialog();
  };

  if (endorsed) {
    return (
      <SuccessState
        icon="solar:check-circle-bold"
        iconBg="#E7F8F0"
        iconColor="#12B76A"
        heading="Endorsed for comprehensive process"
        body="This application has been endorsed with its requirement checklist and collateral details for the next stage of processing."
        stepLabel="Requirement Checklist · Endorsed"
      />
    );
  }

  if (returnedToApplicant) {
    return (
      <SuccessState
        icon="solar:undo-left-round-bold"
        iconBg="#FEF0D6"
        iconColor="#B36A05"
        heading="Returned to applicant"
        body="This application has been sent back with the outstanding requirements noted. The officer's reason has been recorded on file."
        stepLabel="Requirement Checklist · Returned"
      />
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <ApplicationReviewHeader step="Step 3 · Requirement Checklist" reviewStep="requirementChecklist" />

      <Stack spacing={2.5}>
        <Box sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px', bgcolor: 'common.white', border: '1px solid #EBEDF3', boxShadow: '0 1px 2px rgba(20,23,42,0.04)' }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2} sx={{ mb: 0.5 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
              Requirement Checklist
            </Typography>
            <Stack alignItems="flex-end" spacing={0.25}>
              <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#14172A' }}>
                {receivedRequiredCount}/{requiredMeta.length}
              </Typography>
              <Typography sx={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8891A6' }}>
                Required received
              </Typography>
            </Stack>
          </Stack>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2 }}>
            Collect and verify all required documents before endorsing the application.
          </Typography>

          <Box sx={{ height: 6, borderRadius: 999, bgcolor: '#EEF0F5', overflow: 'hidden', mb: 3 }}>
            <Box sx={{ width: `${progressFraction * 100}%`, height: '100%', bgcolor: '#1C2A6E', transition: 'width 0.2s ease' }} />
          </Box>

          <Stack spacing={3}>
            {CATEGORY_ORDER.map((category) => {
              const categoryMeta = REQUIREMENT_DOC_META.filter((meta) => meta.category === category);
              return (
                <Stack key={category} spacing={1.25}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <SectionLabel>{REQUIREMENT_CATEGORY_LABELS[category]}</SectionLabel>
                    <Typography sx={{ fontSize: 12, color: '#8891A6' }}>
                      {categoryMeta.length} documents
                    </Typography>
                  </Stack>
                  <Stack spacing={1.25}>
                    {categoryMeta.map((meta) => {
                      const doc = requiredDocsByKey.get(meta.key);
                      if (!doc) return null;
                      return (
                        <RequirementDocRow
                          key={meta.key}
                          meta={meta}
                          doc={doc}
                          onUpload={handleUploadDoc(meta.key)}
                        />
                      );
                    })}
                  </Stack>
                </Stack>
              );
            })}
          </Stack>
        </Box>

        <Box sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px', bgcolor: 'common.white', border: '1px solid #EBEDF3', boxShadow: '0 1px 2px rgba(20,23,42,0.04)' }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Collateral
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2 }}>
            Request or adjust collateral details for this application, if applicable.
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={3}
            placeholder="e.g. Request updated collateral appraisal for the pledged property…"
            value={collateralNotes}
            onChange={(event) => setCollateralNotes(event.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
          />
        </Box>

        <Box sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px', bgcolor: 'common.white', border: '1px solid #EBEDF3', boxShadow: '0 1px 2px rgba(20,23,42,0.04)' }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <Iconify icon="solar:magic-stick-3-bold-duotone" width={18} sx={{ color: '#8891A6' }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
              AI review, summary &amp; recommendation
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
            Automatically checks each uploaded document for completeness, validity and consistency
            with the application.
          </Typography>

          <Stack spacing={2}>
            <Box sx={{ p: 2, borderRadius: '11px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Iconify icon="solar:document-text-bold-duotone" width={16} sx={{ color: '#5A6273' }} />
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273' }}>
                  AI Summary
                </Typography>
              </Stack>
              <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6 }}>{summary}</Typography>
            </Box>

            <Box sx={{ p: 2, borderRadius: '11px', bgcolor: riskStyle.bg }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Iconify icon={riskStyle.icon} width={16} sx={{ color: riskStyle.color }} />
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: riskStyle.color }}>
                  AI Recommendation · {riskStyle.label}
                </Typography>
              </Stack>
              <Typography sx={{ fontSize: 13.5, color: riskStyle.color, lineHeight: 1.6 }}>
                {recommendation}
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Box sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px', bgcolor: 'common.white', border: '1px solid #EBEDF3', boxShadow: '0 1px 2px rgba(20,23,42,0.04)' }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Ready to endorse?
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
            {allRequiredReceived
              ? 'All required documents are on file — ready to endorse to the next step.'
              : `Clear the ${requiredMeta.length - receivedRequiredCount} outstanding item(s) above, then endorse this application to the next step.`}
          </Typography>

          <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={1.5}>
            <Button
              onClick={handleEndorse}
              disabled={!allRequiredReceived}
              variant="contained"
              startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
              sx={{ bgcolor: '#12B76A', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#0C8A4F' } }}
            >
              Endorse
            </Button>
            <Button
              onClick={() => setReturnDialogOpen(true)}
              variant="outlined"
              startIcon={<Iconify icon="solar:close-circle-bold" width={18} />}
              sx={{ color: '#F04438', borderColor: '#F04438', borderRadius: '10px', px: 2.5, '&:hover': { borderColor: '#B32C22', bgcolor: 'rgba(240,68,56,0.04)' } }}
            >
              Return to Applicant
            </Button>
          </Stack>
        </Box>
      </Stack>

      <ConfirmDialog
        open={returnDialogOpen}
        onClose={closeReturnDialog}
        title="Reason for returning to applicant"
        content={
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            placeholder="Explain what's missing or needs correction…"
            value={returnReasonDraft}
            onChange={(event) => setReturnReasonDraft(event.target.value)}
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
          />
        }
        action={
          <Button
            variant="contained"
            disabled={!returnReasonDraft.trim()}
            onClick={confirmReturn}
            sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', '&:hover': { bgcolor: '#14205A' } }}
          >
            Confirm
          </Button>
        }
      />
    </Container>
  );
}
