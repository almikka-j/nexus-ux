// src/sections/admin/financial-evaluation-view.tsx
'use client';

import { useRef, useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';
import type { RequirementDoc } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog, confirmDialogActionToneSx } from 'src/components/custom-dialog';
import { CollapsibleSection, CollapsibleSectionBadge } from 'src/components/collapsible-section';
import { AiReviewCard, adminCardSx, AI_REVIEW_RISK_STYLES } from 'src/components/admin-ui';
import { useRegisterPageActions } from 'src/layouts/admin/page-actions-context';

import { ApplicationReviewHeader } from './application-review-header';
import { BankStatementCard } from './bank-statement-card';
import { FinancialSummaryCard } from './financial-summary-card';
import { AdditionalFinancialFilesCard } from './additional-financial-files-card';
import { ApplicationDetailsCard } from './application-details-card';
import { CashFlowStatementCard } from './cash-flow-statement-card';
import { ReadOnlyRequirementDocRow } from './credit-investigation/credit-investigation-doc-row';
import { buildCreditInvestigationSummary } from './credit-investigation-risk';
import { FINANCIAL_EVALUATION_DOC_META } from './financial-evaluation-docs';

// ----------------------------------------------------------------------
// Financial Evaluation's own detail page — a read-only mirror of its 10
// documents from Requirement Checklist (the one screen that actually
// collects/edits them), the same read-only-mirror convention Credit
// Investigation's page uses for its own documents (see
// ReadOnlyRequirementDocRow); the same "AI review, summary &
// recommendation" card, built on the same buildCreditInvestigationSummary()
// (it's a generic RequirementDoc[]/RequirementDocMeta[] computation, nothing
// CI-specific in its logic) since this page has the identical constraint —
// read-only, so any outstanding item can only ever produce 'watch', not
// 'high'; the Cash Flow Statement (cash-flow-statement-card.tsx); and a
// Proceed/Disapprove decision, same shape as Credit Investigation's —
// Proceed routes to Credit Scoring (paths.admin.creditScoring, currently a
// "coming soon" stub, same as Appraisal's own Passed branch), Disapprove
// routes back to Reconsideration with a required typed reason. No
// fee/report flow — this page has no fee concept of its own.
// ----------------------------------------------------------------------

export function FinancialEvaluationView() {
  const router = useRouter();
  const { signUpData } = useRegistration();
  const {
    review,
    hydrated,
    setCashFlowStatement,
    fillFinancialEvaluationSample,
    clearFinancialEvaluationSample,
  } = useAdmin();

  const [checklistExpanded, setChecklistExpanded] = useState(true);
  const [aiReviewExpanded, setAiReviewExpanded] = useState(true);
  const [disapproveOpen, setDisapproveOpen] = useState(false);
  const [disapproveReason, setDisapproveReason] = useState('');

  const sampleFilled =
    review.bankStatements.length > 0 ||
    review.cashFlowStatement.savedAt !== null ||
    review.additionalFinancialFiles.length > 0;

  // Auto-fill on open: the first time this page is opened (after
  // localStorage hydration) with nothing on it yet, run the exact same
  // fillFinancialEvaluationSample() the "Fill with Sample Data" page action
  // calls — fields only. Never touches the Proceed/Disapprove decision:
  // skipped entirely if a decision was already made, since the sample
  // builder resets cashFlowStatement.decision to 'pending'. Fires at most
  // once per mount, so "Remove Sample Data" still leaves the page blank.
  const didAutoFillRef = useRef(false);
  useEffect(() => {
    if (didAutoFillRef.current || !hydrated) return;
    didAutoFillRef.current = true;
    if (sampleFilled || review.cashFlowStatement.decision !== 'pending') return;
    fillFinancialEvaluationSample();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useRegisterPageActions(
    useMemo(
      () => [
        {
          key: 'financial-eval-sample',
          label: sampleFilled ? 'Remove Sample Data' : 'Fill with Sample Data',
          icon: 'solar:magic-stick-3-bold-duotone',
          onClick: sampleFilled ? clearFinancialEvaluationSample : fillFinancialEvaluationSample,
        },
      ],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [sampleFilled]
    )
  );

  const applicantName = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : '';

  // Every document on this page is collected earlier, in Requirement
  // Checklist — this page reads that state directly and displays it
  // read-only instead of keeping its own separate, editable copy.
  const fixedDocsByKey = new Map(review.requirementChecklist.documents.map((doc) => [doc.key, doc]));
  const fixedDocs = FINANCIAL_EVALUATION_DOC_META.map((meta) => fixedDocsByKey.get(meta.key)).filter(
    (doc): doc is RequirementDoc => !!doc
  );
  const allFixedReceived = fixedDocs.every((doc) => doc.status !== 'missing');

  const { level, summary, recommendation } = buildCreditInvestigationSummary(
    fixedDocs,
    FINANCIAL_EVALUATION_DOC_META
  );
  const riskStyle = AI_REVIEW_RISK_STYLES[level];

  if (!signUpData) return null;

  const handleProceed = () => {
    setCashFlowStatement({ decision: 'approved' });
    router.push(paths.admin.creditScoring(encodeURIComponent(signUpData.email)));
  };

  const closeDisapprove = () => {
    setDisapproveOpen(false);
    setDisapproveReason('');
  };

  const confirmDisapprove = () => {
    if (!disapproveReason.trim()) return;
    setCashFlowStatement({ decision: 'rejected', decisionReason: disapproveReason.trim() });
    router.push(paths.admin.reconsideration(encodeURIComponent(signUpData.email)));
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <ApplicationReviewHeader
        step="Financial Evaluation"
        reviewStep="financialEvaluation"
        hideApplicationCard
      />

      <Stack spacing={2.5}>
        <ApplicationDetailsCard collapsible officerNotesProcess="Financial Evaluation" />

        <Box sx={adminCardSx}>
          <CollapsibleSection
            title="Document Checklist"
            expanded={checklistExpanded}
            onToggle={() => setChecklistExpanded((prev) => !prev)}
            badge={
              <CollapsibleSectionBadge
                received={fixedDocs.filter((doc) => doc.status !== 'missing').length}
                total={FINANCIAL_EVALUATION_DOC_META.length}
              />
            }
            completeIcon={
              allFixedReceived && (
                <Iconify icon="solar:check-circle-bold" width={17} sx={{ color: '#0C8A4F' }} />
              )
            }
          >
            <Stack spacing={1.25}>
              {FINANCIAL_EVALUATION_DOC_META.map((meta) => {
                const doc = fixedDocsByKey.get(meta.key);
                if (!doc) return null;
                return (
                  <ReadOnlyRequirementDocRow
                    key={meta.key}
                    label={meta.label}
                    doc={doc}
                    applicantName={applicantName}
                  />
                );
              })}
            </Stack>
          </CollapsibleSection>
        </Box>

        <AiReviewCard
          subtitle="Automatically checks each uploaded document for completeness against the checklist above."
          expanded={aiReviewExpanded}
          onToggle={() => setAiReviewExpanded((prev) => !prev)}
          risk={riskStyle}
          summary={summary}
          recommendation={recommendation}
        />

        <FinancialSummaryCard />

        <CashFlowStatementCard />

        <BankStatementCard />

        <AdditionalFinancialFilesCard />

        <Box sx={adminCardSx}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Proceed application?
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
            Decide whether to endorse this application to Credit Scoring or disapprove it.
          </Typography>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={1.5}>
            <Button
              onClick={handleProceed}
              variant="contained"
              startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
              sx={{ bgcolor: '#12B76A', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#0C8A4F' } }}
            >
              Endorse to Credit Scoring
            </Button>
            <Button
              onClick={() => setDisapproveOpen(true)}
              variant="outlined"
              startIcon={<Iconify icon="solar:close-circle-bold" width={18} />}
              sx={{ color: '#5A6273', borderColor: '#C7CCDA', borderRadius: '10px', px: 2.5, '&:hover': { color: '#1C2A6E', borderColor: '#1C2A6E', bgcolor: '#F5F7FF' } }}
            >
              Disapprove
            </Button>
          </Stack>
        </Box>
      </Stack>

      <ConfirmDialog
        open={disapproveOpen}
        onClose={closeDisapprove}
        title="Reason for disapproval"
        content={
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            placeholder="Explain why…"
            value={disapproveReason}
            onChange={(event) => setDisapproveReason(event.target.value)}
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
          />
        }
        action={
          <Button
            variant="contained"
            disabled={!disapproveReason.trim()}
            onClick={confirmDisapprove}
            sx={confirmDialogActionToneSx.destructive}
          >
            Confirm
          </Button>
        }
      />
    </Container>
  );
}
