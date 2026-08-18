'use client';

import { NumericFormat } from 'react-number-format';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';
import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, TONE_COLORS, type SemanticTone } from 'src/components/admin-ui';
import { getLoanNumber } from 'src/utils/get-loan-number';

import { AppraiserAssignmentCard } from './appraisal/appraiser-assignment-card';

// ----------------------------------------------------------------------
// Per-bundle detail page for the Appraiser — reached by clicking a row on
// "My Assignments" (appraisal-appraiser-view.tsx), at
// paths.admin.appraisalAppraiserBundle(bundleId). This is a real page
// navigation, not an inline expand/collapse: the list page only ever
// shows the table (TCT number, applicant, fee status, progress status),
// and every bundle's own fee-decision fields + report form live here
// instead. An earlier version made each list row expand in place via a
// Collapse; that toggle was removed in favor of this dedicated page so
// there's nothing to expand/collapse on the list at all.
//
// Shows this bundle's Appraisal Fee panel (editable while
// feeApprovalStatus === 'not-submitted', read-only once submitted — same
// fields/behavior the list page's row panel used to have) followed by
// AppraiserAssignmentCard (the report form), locked until the whole
// batch's fee is settled — same gating as before, just on its own page
// now. The batch-level actions (Submit Fees for Approval, Advise Client,
// Payment Received) still live on the list page, since those cover every
// bundle at once, not just this one.
// ----------------------------------------------------------------------

const STATUS_COPY: Record<'on-process' | 'for-approval' | 'for-report' | 'reported', { label: string; tone: SemanticTone }> = {
  'on-process': { label: 'On Process', tone: 'neutral' },
  'for-approval': { label: 'For Approval', tone: 'warning' },
  'for-report': { label: 'For Report', tone: 'info' },
  reported: { label: 'Reported', tone: 'success' },
};

function FeeNeededOption({
  needed,
  selected,
  onSelect,
}: {
  needed: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const label = needed ? 'Yes' : 'No';

  return (
    <Box
      onClick={onSelect}
      role="button"
      sx={{
        flex: 1,
        p: 1,
        borderRadius: '10px',
        border: '1.5px solid',
        borderColor: selected ? '#1C2A6E' : '#E1E4ED',
        bgcolor: selected ? '#EEF1FE' : 'common.white',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'border-color 0.15s ease, background-color 0.15s ease',
      }}
    >
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: selected ? '#1C2A6E' : '#14172A' }}>
        {label}
      </Typography>
    </Box>
  );
}

export function AppraisalAppraiserBundleView({ bundleId }: { bundleId: string }) {
  const { signUpData } = useRegistration();
  const { review, setAppraisalBundleFee } = useAdmin();
  const { appraisalGroups } = review.requirementChecklist;
  const { feeApprovalStatus, paymentReceivedAt, reportBundles } = review.appraisal;

  const bundle = reportBundles.find((entry) => entry.id === bundleId);
  const feeSettled = feeApprovalStatus === 'approved' && !!paymentReceivedAt;

  if (!signUpData || !bundle) {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <Box sx={{ ...adminCardSx, p: { xs: 4, md: 6 }, textAlign: 'center' }}>
          <Iconify icon="solar:document-text-bold-duotone" width={48} sx={{ color: '#C7CCDA', mb: 2 }} />
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Assignment not found
          </Typography>
          <Typography sx={{ fontSize: 14, color: '#8891A6', mb: 2.5 }}>
            This assignment isn&apos;t in your current session.
          </Typography>
          <Button component={RouterLink} href={paths.admin.appraisalAppraiser} variant="outlined">
            Back to My Assignments
          </Button>
        </Box>
      </Container>
    );
  }

  const bundleTctNumbers = appraisalGroups
    .filter((group) => bundle.tctGroupIds.includes(group.id))
    .map((group) => group.tctNumber);

  const status = bundle.report.uploadedAt
    ? 'reported'
    : feeApprovalStatus === 'approved' && feeSettled
      ? 'for-report'
      : feeApprovalStatus === 'pending-approval'
        ? 'for-approval'
        : 'on-process';
  const copy = STATUS_COPY[status];
  const toneColors = TONE_COLORS[copy.tone];

  const feeEditable = feeApprovalStatus === 'not-submitted';
  const hasValidFeeAmount = Number(bundle.feeAmount) > 0;
  const applicantName = `${signUpData.firstName} ${signUpData.lastName}`;

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Box>
          <Button
            component={RouterLink}
            href={paths.admin.appraisalAppraiser}
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" width={18} />}
            sx={{ color: '#5A6273', fontWeight: 600, fontSize: 13, px: 0.5 }}
          >
            Back to My Assignments
          </Button>
        </Box>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={1}
          sx={{ px: 1 }}
        >
          <Box>
            <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' }}>
              {bundleTctNumbers.join(', ')}
            </Typography>
            <Typography sx={{ fontSize: 13.5, color: '#667085', mt: 0.5 }}>
              {applicantName} · App No. {getLoanNumber(signUpData.email)}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'inline-flex',
              px: 1.25,
              py: 0.5,
              borderRadius: '999px',
              bgcolor: toneColors.bg,
              color: toneColors.text,
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {copy.label}
          </Box>
        </Stack>

        <Stack spacing={1.25} sx={{ ...adminCardSx }}>
          <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#14172A' }}>
            Appraisal Fee
          </Typography>

          {feeEditable ? (
            <>
              <Typography sx={{ fontSize: 12.5, color: '#5A6273' }}>
                Does this property need an Appraisal fee?
              </Typography>
              <Stack direction="row" spacing={1}>
                <FeeNeededOption
                  needed
                  selected={bundle.feeNeeded === 'yes'}
                  onSelect={() => setAppraisalBundleFee(bundle.id, { feeNeeded: 'yes' })}
                />
                <FeeNeededOption
                  needed={false}
                  selected={bundle.feeNeeded === 'no'}
                  onSelect={() =>
                    setAppraisalBundleFee(bundle.id, {
                      feeNeeded: 'no',
                      feeAmount: '',
                      feeDescription: '',
                      feeRemarks: '',
                    })
                  }
                />
              </Stack>

              <Collapse in={bundle.feeNeeded === 'yes'} unmountOnExit>
                <Stack spacing={1.25}>
                  <NumericFormat
                    fullWidth
                    size="small"
                    customInput={TextField}
                    label="Request Amount"
                    placeholder="0.00"
                    value={bundle.feeAmount}
                    onValueChange={({ value }) => setAppraisalBundleFee(bundle.id, { feeAmount: value })}
                    thousandSeparator=","
                    decimalScale={2}
                    allowNegative={false}
                    allowLeadingZeros={false}
                    valueIsNumericString
                    error={bundle.feeAmount !== '' && !hasValidFeeAmount}
                    helperText={
                      bundle.feeAmount !== '' && !hasValidFeeAmount
                        ? 'Enter an amount greater than ₱0.00.'
                        : undefined
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#1C2A6E' }}>₱</Typography>
                        </InputAdornment>
                      ),
                    }}
                    inputProps={{ inputMode: 'decimal' }}
                    sx={{
                      '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 },
                      '& .MuiFormHelperText-root': { mx: 0, fontSize: 11 },
                    }}
                  />
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    label="Request Amount Description"
                    placeholder="What this amount covers, e.g. Site visit + valuation fee"
                    value={bundle.feeDescription}
                    onChange={(event) => setAppraisalBundleFee(bundle.id, { feeDescription: event.target.value })}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
                  />
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    label="Remarks"
                    placeholder="Optional notes for this request"
                    value={bundle.feeRemarks}
                    onChange={(event) => setAppraisalBundleFee(bundle.id, { feeRemarks: event.target.value })}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
                  />
                </Stack>
              </Collapse>
            </>
          ) : bundle.feeNeeded === 'yes' ? (
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>
                {bundle.feeDescription}
              </Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#1C2A6E' }}>
                {fCurrency(bundle.feeAmount)}
              </Typography>
            </Stack>
          ) : (
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#8891A6' }}>
              No fee needed
            </Typography>
          )}
        </Stack>

        {feeSettled ? (
          <AppraiserAssignmentCard bundleId={bundle.id} tctNumbers={bundleTctNumbers} />
        ) : (
          <Box sx={{ ...adminCardSx, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 13, color: '#8891A6' }}>
              Submit and settle the Appraisal Fee above (from the My Assignments page) before the
              report form for this property unlocks.
            </Typography>
          </Box>
        )}
      </Stack>
    </Container>
  );
}
