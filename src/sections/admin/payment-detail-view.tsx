'use client';

import { useDropzone } from 'react-dropzone';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';
import { fCurrency } from 'src/utils/format-number';
import { getLoanNumber } from 'src/utils/get-loan-number';

import { Iconify } from 'src/components/iconify';
import { FileThumbnail } from 'src/components/file-thumbnail';
import { adminCardSx, StatusBadge } from 'src/components/admin-ui';

import type { PaymentDetails, PaymentMethod } from 'src/auth/admin-context';
import { PAYMENT_METHOD_OPTIONS, DEPOSITED_TO_ROSTER } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Detail page for one Payment row — reached by clicking a row on the
// Payment list (payment-view.tsx), at paths.admin.paymentDetail(kind).
// Same list -> detail split every other fee flow in this app uses
// (ci-fee-approval-bundle-view.tsx, appraisal-fee-approval-bundle-view.tsx)
// — `kind` ('ci-fee' | 'appraisal-fee') is a real discriminator, not a
// dummy placeholder like those two pages' fixed "current" segment, since
// which fee type this page shows is meaningful. See docs/210-request-payments.md.
//
// Header card matches the same standard summary-card shape as those two
// reference pages — a 42px icon-avatar + applicant name as the title
// (15px/800) + "App No. … · email" subtitle, a StatusBadge top-right
// (For Payment / Paid), then a bordered/tinted FactChip strip (local copy
// of the same unexported FactChip shape those two pages already
// reimplement, kept in sync manually rather than sharing a module, same
// as every other admin file with this exact component).
//
// Below the header: a "{Fee} Details" card holding the SAME full
// breakdown content the CI Fee / Appraisal Fee Approval detail pages
// already render (CI Fee: description/amount/remarks; Appraisal Fee:
// per-bundle TCT numbers + appraiser + fee amount/"No fee needed", plus
// the running total) — this page is read-only for that content (no
// Approve/Decline here, this fee is already approved by the time it
// reaches Payment), it exists purely so the officer sees the full request
// context without navigating back to the approval flow's own detail page.
//
// Then a "Payment Details" card — the actual form (Payment Method /
// Deposited To / OR No. / OR Date / Attachment / Remarks) + "Mark as
// Paid". Once paid, the same card renders every field read-only plus a
// "Marked as paid" confirmation banner — there is no revise/undo step,
// matching every other terminal action in this app (e.g. a submitted
// Appraisal Report).
// ----------------------------------------------------------------------

type PaymentKind = 'ci-fee' | 'appraisal-fee';

function FactChip({ label, value }: { label: string; value?: string }) {
  return (
    <Stack spacing={0.35} sx={{ px: 1.75, py: 1, minWidth: 0, flex: '1 1 128px' }}>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: '#9AA2B4',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={label}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: 13.5,
          fontWeight: 700,
          color: '#14172A',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={value}
      >
        {value || '—'}
      </Typography>
    </Stack>
  );
}

function ReportFileDropzone({
  value,
  onChange,
  disabled,
}: {
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const { getRootProps, getInputProps } = useDropzone({
    multiple: false,
    accept: { 'image/*': [], 'application/pdf': [] },
    onDrop: (acceptedFiles) => onChange(acceptedFiles[0] ?? null),
    disabled,
  });

  const interactive = !value && !disabled;

  return (
    <Box
      {...(interactive ? getRootProps() : {})}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        minHeight: 44,
        px: 1.5,
        py: value ? 1 : 0,
        borderRadius: '10px',
        cursor: interactive ? 'pointer' : 'default',
        border: '1.5px dashed',
        borderColor: '#B0B8CC',
        bgcolor: 'common.white',
        '&:hover': interactive ? { borderColor: '#1C2A6E', bgcolor: '#F5F7FF' } : undefined,
      }}
    >
      {interactive && <input {...getInputProps()} />}
      {value ? (
        <>
          <FileThumbnail file={value} sx={{ width: 30, height: 30 }} />
          <Typography noWrap sx={{ fontSize: 13, fontWeight: 600, color: '#344054', flex: 1, minWidth: 0 }}>
            {value.name}
          </Typography>
          {!disabled && (
            <IconButton size="small" onClick={() => onChange(null)}>
              <Iconify icon="mingcute:close-line" width={16} />
            </IconButton>
          )}
        </>
      ) : (
        <>
          <Iconify icon="solar:upload-minimalistic-bold-duotone" width={20} sx={{ color: '#1C2A6E' }} />
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1C2A6E' }}>
            Choose a file — Payment Attachment
          </Typography>
        </>
      )}
    </Box>
  );
}

export function PaymentDetailView({ kind }: { kind: PaymentKind }) {
  const { signUpData, application } = useRegistration();
  const {
    review,
    setCiFeePayment,
    markCiFeeAsPaid,
    setAppraisalFeePayment,
    markAppraisalFeeAsPaid,
  } = useAdmin();
  const {
    ciFeeStatus,
    ciFeeAmount,
    ciFeeAmountDescription,
    ciFeeRemarks,
    ciFeeSubmittedAt,
    ciFeeApprovedAt,
    ciFeePayment,
  } = review.creditInvestigation;
  const { appraisalGroups } = review.requirementChecklist;
  const { feeApprovalStatus, feeSubmittedAt, feeApprovedAt, feePayment, reportBundles } = review.appraisal;

  const feeBundles = reportBundles.filter((bundle) => bundle.feeNeeded === 'yes');
  const appraisalFeeTotal = feeBundles.reduce((sum, bundle) => sum + (Number(bundle.feeAmount) || 0), 0);

  const requestExists = kind === 'ci-fee' ? ciFeeStatus === 'approved' : feeApprovalStatus === 'approved' && feeBundles.length > 0;

  if (!signUpData || !requestExists) {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <Box sx={{ ...adminCardSx, p: { xs: 4, md: 6 }, textAlign: 'center' }}>
          <Iconify icon="solar:wallet-money-bold-duotone" width={48} sx={{ color: '#C7CCDA', mb: 2 }} />
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Request not found
          </Typography>
          <Typography sx={{ fontSize: 14, color: '#8891A6', mb: 2.5 }}>
            This request isn&apos;t in your current session.
          </Typography>
          <Button component={RouterLink} href={paths.admin.payment} variant="outlined">
            Back to Payment
          </Button>
        </Box>
      </Container>
    );
  }

  const applicantName = `${signUpData.firstName} ${signUpData.lastName}`;
  const amount = kind === 'ci-fee' ? Number(ciFeeAmount) || 0 : appraisalFeeTotal;
  const requestedAt = kind === 'ci-fee' ? ciFeeSubmittedAt : feeSubmittedAt;
  const approvedAt = kind === 'ci-fee' ? ciFeeApprovedAt : feeApprovedAt;
  // Both fee types are requested by whichever officer owns the
  // application — there's no separate "requested by" field on either
  // CreditInvestigation or Appraisal, since it's always the same
  // case-owning officer shown as "Officer: …" elsewhere in this app
  // (application-details-card.tsx, application-review-header.tsx).
  const requestedBy = application.assignedOfficer;
  const payment = kind === 'ci-fee' ? ciFeePayment : feePayment;
  const isPaid = !!payment.paidAt;
  const editable = !isPaid;

  const setPayment = (data: Partial<PaymentDetails>) =>
    kind === 'ci-fee' ? setCiFeePayment(data) : setAppraisalFeePayment(data);
  const markAsPaid = () => (kind === 'ci-fee' ? markCiFeeAsPaid() : markAppraisalFeeAsPaid());

  const attachmentFile = payment.attachmentFileName ? new File([], payment.attachmentFileName) : null;
  const handleAttachmentChange = (file: File | null) => {
    if (!file) {
      setPayment({ attachmentFileName: null, attachmentFileUrl: null });
      return;
    }
    setPayment({ attachmentFileName: file.name, attachmentFileUrl: URL.createObjectURL(file) });
  };

  const canMarkPaid =
    !!payment.paymentMethod && !!payment.depositedTo && !!payment.orNumber.trim() && !!payment.orDate && !!payment.attachmentFileName;

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Box>
          <Button
            component={RouterLink}
            href={paths.admin.payment}
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" width={18} />}
            sx={{ color: '#5A6273', fontWeight: 600, fontSize: 13, px: 0.5 }}
          >
            Back to Payment
          </Button>
        </Box>

        <Box sx={{ ...adminCardSx, p: { xs: 2.5, md: 3 } }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            spacing={1}
          >
            <Stack direction="row" spacing={1.75} alignItems="center">
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  flexShrink: 0,
                  borderRadius: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: '#EEF1FE',
                }}
              >
                <Iconify icon="solar:wallet-money-bold-duotone" width={20} sx={{ color: '#1C2A6E' }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#14172A' }}>
                  {applicantName}
                </Typography>
                <Typography sx={{ fontSize: 13, color: '#8891A6', mt: 0.25 }}>
                  App No. {getLoanNumber(signUpData.email)} · {signUpData.email}
                </Typography>
              </Box>
            </Stack>
            <StatusBadge tone={isPaid ? 'success' : 'warning'} label={isPaid ? 'Paid' : 'For Payment'} />
          </Stack>

          <Stack
            direction="row"
            flexWrap="wrap"
            sx={{
              mt: 2.5,
              border: '1px solid #EEF0F5',
              borderRadius: '12px',
              bgcolor: '#FAFBFD',
              '& > div:not(:last-of-type)': { borderRight: { xs: 'none', sm: '1px solid #EEF0F5' } },
            }}
          >
            <FactChip label="Type" value={kind === 'ci-fee' ? 'CI Fee' : 'Appraisal Fee'} />
            <FactChip label="Amount" value={fCurrency(amount)} />
            <FactChip label="Requested By" value={requestedBy ?? undefined} />
            <FactChip label="Requested On" value={requestedAt ? new Date(requestedAt).toLocaleDateString() : undefined} />
            <FactChip label="Approved On" value={approvedAt ? new Date(approvedAt).toLocaleDateString() : undefined} />
          </Stack>

          <Divider sx={{ my: 2.5, borderColor: '#EEF0F5' }} />

          {kind === 'ci-fee' ? (
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
              spacing={1.5}
              sx={{ p: 1.75, borderRadius: '10px', border: '1px solid #EEF0F5', bgcolor: '#F9FAFC' }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A' }}>{applicantName}</Typography>
                {ciFeeAmountDescription && (
                  <Typography sx={{ fontSize: 12, color: '#8891A6', mt: 0.5 }}>{ciFeeAmountDescription}</Typography>
                )}
                {ciFeeRemarks && (
                  <Typography sx={{ fontSize: 12, color: '#8891A6', mt: 0.5 }}>Remarks: {ciFeeRemarks}</Typography>
                )}
              </Box>
              <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#1C2A6E', flexShrink: 0 }}>
                {fCurrency(ciFeeAmount)}
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={1.25}>
              {reportBundles.map((bundle) => {
                const bundleTctNumbers = appraisalGroups
                  .filter((group) => bundle.tctGroupIds.includes(group.id))
                  .map((group) => group.tctNumber);
                return (
                  <Stack
                    key={bundle.id}
                    direction={{ xs: 'column', sm: 'row' }}
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    justifyContent="space-between"
                    spacing={1.5}
                    sx={{ p: 1.75, borderRadius: '10px', border: '1px solid #EEF0F5', bgcolor: '#F9FAFC' }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A' }}>
                        {bundleTctNumbers.join(', ')}
                      </Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#1C2A6E', mt: 0.5 }}>
                        {bundle.appraiserName ?? 'No appraiser assigned'}
                      </Typography>
                      {bundle.feeNeeded === 'yes' && bundle.feeDescription && (
                        <Typography sx={{ fontSize: 12, color: '#8891A6', mt: 0.5 }}>
                          {bundle.feeDescription}
                        </Typography>
                      )}
                    </Box>
                    {bundle.feeNeeded === 'yes' ? (
                      <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#1C2A6E', flexShrink: 0 }}>
                        {fCurrency(bundle.feeAmount)}
                      </Typography>
                    ) : (
                      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#8891A6', flexShrink: 0 }}>
                        No fee needed
                      </Typography>
                    )}
                  </Stack>
                );
              })}
            </Stack>
          )}

          <Divider sx={{ my: 1.5, borderColor: '#EEF0F5' }} />
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 0.5, py: 0.75 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#5A6273' }}>
              Total {kind === 'ci-fee' ? 'CI Fee' : 'Appraisal Fee'}
            </Typography>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#1C2A6E' }}>{fCurrency(amount)}</Typography>
          </Stack>
        </Box>

        <Box sx={{ ...adminCardSx }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>Payment Details</Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
            Record how this fee was paid, then mark it paid.
          </Typography>

          {isPaid && (
            <Stack
              direction="row"
              spacing={1.25}
              alignItems="center"
              sx={{ mb: 2.5, p: 1.5, borderRadius: '10px', bgcolor: '#E7F7EF' }}
            >
              <Iconify icon="solar:check-circle-bold" width={20} sx={{ color: '#0C8A4F' }} />
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0C8A4F' }}>
                Marked as paid — {payment.paidAt && new Date(payment.paidAt).toLocaleString()}
              </Typography>
            </Stack>
          )}

          <Stack spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel id="payment-method-label" shrink>
                Payment Method
              </InputLabel>
              <Select
                labelId="payment-method-label"
                label="Payment Method"
                value={payment.paymentMethod ?? ''}
                onChange={(event) => setPayment({ paymentMethod: event.target.value as PaymentMethod })}
                displayEmpty
                notched
                disabled={!editable}
                sx={{ borderRadius: '10px', fontSize: 14 }}
              >
                <MenuItem value="">
                  <Typography sx={{ fontSize: 14, color: '#8891A6' }}>Select payment method…</Typography>
                </MenuItem>
                {PAYMENT_METHOD_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel id="deposited-to-label" shrink>
                Deposited To
              </InputLabel>
              <Select
                labelId="deposited-to-label"
                label="Deposited To"
                value={payment.depositedTo ?? ''}
                onChange={(event) => setPayment({ depositedTo: event.target.value })}
                displayEmpty
                notched
                disabled={!editable}
                sx={{ borderRadius: '10px', fontSize: 14 }}
              >
                <MenuItem value="">
                  <Typography sx={{ fontSize: 14, color: '#8891A6' }}>Select account…</Typography>
                </MenuItem>
                {DEPOSITED_TO_ROSTER.map((name) => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                label="Official Receipt No."
                value={payment.orNumber}
                disabled={!editable}
                onChange={(event) => setPayment({ orNumber: event.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
              />
              <TextField
                fullWidth
                size="small"
                type="date"
                label="OR Date"
                value={payment.orDate}
                disabled={!editable}
                onChange={(event) => setPayment({ orDate: event.target.value })}
                InputLabelProps={{ shrink: true }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
              />
            </Stack>

            <ReportFileDropzone value={attachmentFile} onChange={handleAttachmentChange} disabled={!editable} />

            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Remarks"
              placeholder="Optional notes"
              value={payment.remarks}
              disabled={!editable}
              onChange={(event) => setPayment({ remarks: event.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
            />
          </Stack>

          {editable && (
            <Button
              onClick={markAsPaid}
              disabled={!canMarkPaid}
              variant="contained"
              startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
              sx={{ mt: 3, bgcolor: '#1C2A6E', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#14205A' } }}
            >
              Mark as Paid
            </Button>
          )}
        </Box>
      </Stack>
    </Container>
  );
}
