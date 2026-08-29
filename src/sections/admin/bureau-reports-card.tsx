'use client';

import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { fileToDataUrl } from 'src/utils/file-to-data-url';
import {
  StatusBadge,
  TONE_COLORS,
  adminCardSx,
  outlinedNavyButtonSx,
  iconButtonBorderedSx,
} from 'src/components/admin-ui';

import { computeInstallment } from './cibi-form-card';
import {
  CmapCasesTable,
  BapNfisRecordsTable,
  CibiResultsTable,
  CicContractsTable,
  LoandexRecordsTable,
  PgfcExposureTable,
} from './bureau-results-tables';

import type { CibiForm, BureauUpload } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Compact, space-saving "Bureau Reports" card — one row per bureau instead of
// a full card each. CIBI is the only bureau with a data-entry form (per the
// source diagram's callout), so its row behaves differently from the other
// four: "Create Report" expands a collapsible form inline; once submitted,
// the row shows a "Sent" status pill plus a separate "Upload document"
// action for the returned CIBI report file. LOANDEX/CIC/CMAP/NFIS-BAP are
// plain manual-upload rows, same as before, just restyled to match.
//
// Consolidation note (UI/UX audit): these rows were NOT refactored onto
// `RequirementDocRow` directly. RequirementDocRow's `doc` prop requires the
// full `RequirementDoc` shape (status/aiNote/fileUrl/remarks/reviewed/
// uploadedBy — see requirement-doc-row.tsx), but the state backing these
// rows is `BureauUpload` (`admin-context.tsx`), a deliberately slim
// `{fileName, fileData, uploadedAt}` shape with none of those fields.
// `BureauUpload` is also read directly by `credit-checking-result-modal.tsx`
// (outside this file's ownership), so widening it to match `RequirementDoc`
// would mean editing admin-context.tsx's state shape and a second unrelated
// consumer file — both out of scope for this pass. Instead, every row below
// was rebuilt to use the exact same shared tokens/components RequirementDocRow
// uses (`StatusBadge`, `TONE_COLORS` via StatusBadge, `outlinedNavyButtonSx`,
// `iconButtonBorderedSx`, same 13px-radius bordered shell, same Menu/MenuItem
// styling), plus a synthetic verified/missing StatusBadge that didn't exist
// here before — so visually these rows are indistinguishable from
// RequirementDocRow's, even though the underlying component is separate.
// ----------------------------------------------------------------------

const GENDERS = ['Male', 'Female'];
const CONTACT_TYPES = ['Mobile', 'Landline'];
// Kept in sync with each bureau's `clearResult` copy in
// credit-checking-result-modal.tsx (minus that modal's "Summary: " prefix,
// which reads redundantly inline on this card) so the finding text an
// officer sees here matches the one shown later in the Initial Credit
// Checking Result modal.
const BUREAU_SUMMARIES: Record<string, (applicantName: string) => string> = {
  LOANDEX: (applicantName) =>
    `The LOANDEX report for ${applicantName} shows one active loan account with regular payment activity and no past-due exposure reported.`,
  CIC: (applicantName) =>
    `The CIC report for ${applicantName} shows consistent borrower and account information, with no material discrepancy in the submitted credit data.`,
  CMAP: (applicantName) =>
    `The CMAP report for ${applicantName} shows no matching watch-list entry, court record, or adverse account record.`,
  'NFIS / BAP': (applicantName) =>
    `The NFIS / BAP report for ${applicantName} shows no cancelled credit card, adversely classified loan, or other negative-file indicator.`,
};

function formatUploadedAt(uploadedAt: string | null) {
  if (!uploadedAt) return null;
  return new Date(uploadedAt).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14, height: 46 },
};

function Field({
  label,
  required,
  autoFilled,
  ...props
}: {
  label: string;
  required?: boolean;
  autoFilled?: boolean;
} & React.ComponentProps<typeof TextField>) {
  return (
    <Stack spacing={0.75}>
      <Stack direction="row" alignItems="center" spacing={0.75}>
        {/* Hand-rolled asterisk kept intentionally: this label is a separate
            Typography above the TextField, not the TextField's own `label`
            prop, so MUI's native `required` prop (which only auto-renders
            an asterisk next to `<TextField label>`/InputLabel) would not
            produce a visible marker here — switching would silently drop
            the indicator across all ~19 Field usages in this file. Color
            (#F04438) matches TONE_COLORS.error.solid. */}
        <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#3B4256' }}>
          {label}
          {required && <Box component="span" sx={{ color: '#F04438' }}> *</Box>}
        </Typography>
        {autoFilled && (
          <Chip
            size="small"
            label="Auto-filled"
            sx={{
              height: 18,
              fontSize: 10,
              fontWeight: 700,
              bgcolor: '#E7F8F0',
              color: '#0C8A4F',
              '& .MuiChip-label': { px: 0.75 },
            }}
          />
        )}
      </Stack>
      <TextField fullWidth size="small" required={required} sx={fieldSx} {...props} />
    </Stack>
  );
}

function BureauRow({
  title,
  summary,
  uploadDetails,
  uploaded,
  bureauFindingStatus,
  resultsTable,
  children,
}: {
  title: string;
  summary?: string;
  uploadDetails?: string;
  /** Drives whether the badge renders at all — hidden entirely when false. */
  uploaded: boolean;
  /**
   * Once uploaded, the badge reflects the shared (simulated) bureau finding
   * for the whole application — not per-bureau — rather than always reading
   * "Verified" the moment a file is attached. `'pending'` (all 5 bureau
   * uploads aren't complete yet, so no finding has been computed) shows
   * "Uploaded" instead of a clean/negative verdict.
   */
  bureauFindingStatus: 'pending' | 'clean' | 'negative';
  /** Rendered inside this same bordered shell, below the header row —
   * matches CIBI's card, where its results table lives inside CibiRow's
   * own outer Box rather than as a separate sibling card underneath. */
  resultsTable?: React.ReactNode;
  children: React.ReactNode;
}) {
  const isNegative = uploaded && bureauFindingStatus === 'negative';
  // No badge at all before a file is attached — unlike RequirementDocRow's
  // "Missing" chip, an unattached bureau report isn't a violation to flag,
  // it just hasn't been done yet.
  const badgeTone = isNegative ? 'error' : bureauFindingStatus === 'clean' ? 'success' : 'info';
  const badgeLabel = isNegative ? 'Negative' : bureauFindingStatus === 'clean' ? 'Clear' : 'Uploaded';

  return (
    // Same 13px-radius bordered white shell as RequirementDocRow's row container.
    <Box sx={{ borderRadius: '13px', border: '1px solid #EBEDF3', bgcolor: 'common.white', overflow: 'hidden' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={1.5}
        sx={{ p: 2 }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
          {/* Plain leading icon (no boxed avatar) — matches RequirementDocRow's
              icon treatment for its non-checkbox rows instead of this card's
              previous 38x38 icon-avatar box. */}
          <Iconify
            icon={
              isNegative
                ? 'solar:danger-triangle-bold'
                : uploaded
                  ? 'solar:check-circle-bold'
                  : 'solar:file-text-linear'
            }
            width={20}
            sx={{ color: isNegative ? '#F04438' : uploaded ? '#12B76A' : '#C7CCDA', flexShrink: 0 }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#14172A' }}>{title}</Typography>
            {summary && (
              <Typography sx={{ fontSize: 12, color: '#667085', lineHeight: 1.45, mt: 0.35 }}>
                {summary}
              </Typography>
            )}
            {uploadDetails && (
              <Typography sx={{ fontSize: 11.5, color: '#A0A7B5', mt: 0.5 }}>
                {uploadDetails}
              </Typography>
            )}
          </Box>
        </Stack>

        <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={1}>
          {uploaded && <StatusBadge tone={badgeTone} label={badgeLabel} />}
          {children}
        </Stack>
      </Stack>
      {resultsTable && (
        <Box sx={{ p: 2.5, pt: 0 }}>{resultsTable}</Box>
      )}
    </Box>
  );
}

function SimpleBureauRow({
  title,
  upload,
  onUpload,
  resultsTable,
}: {
  title: string;
  upload: BureauUpload;
  onUpload: (data: Partial<BureauUpload>) => void;
  resultsTable?: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const { signUpData } = useRegistration();
  const { review } = useAdmin();
  const applicantName = signUpData
    ? [signUpData.firstName, signUpData.middleName, signUpData.lastName].filter(Boolean).join(' ')
    : 'the applicant';

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const fileData = await fileToDataUrl(file);
    onUpload({ fileName: file.name, fileData, uploadedAt: new Date().toISOString() });
    event.target.value = '';
  };

  return (
    <BureauRow
      title={title}
      uploaded={!!upload.fileName}
      bureauFindingStatus={review.creditChecking.bureauFindingStatus}
      summary={upload.fileName ? BUREAU_SUMMARIES[title]?.(applicantName) : undefined}
      uploadDetails={
        upload.fileName
          ? `${upload.fileName} · Uploaded ${formatUploadedAt(upload.uploadedAt) ?? 'date unavailable'}`
          : undefined
      }
      resultsTable={upload.fileName ? resultsTable : undefined}
    >
      <input ref={inputRef} type="file" accept="image/*,.pdf" hidden onChange={handleUpload} />
      {upload.fileName ? (
        <>
          <Button
            onClick={() => upload.fileData && window.open(upload.fileData, '_blank', 'noopener,noreferrer')}
            disabled={!upload.fileData}
            variant="outlined"
            size="small"
            startIcon={<Iconify icon="solar:eye-bold-duotone" width={16} />}
            sx={{ ...outlinedNavyButtonSx, px: 1.5 }}
          >
            View
          </Button>
          <IconButton
            onClick={(event) => setMenuAnchor(event.currentTarget)}
            aria-label={`More actions for ${title}`}
            size="small"
            sx={iconButtonBorderedSx}
          >
            <Iconify icon="eva:more-vertical-fill" width={18} />
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
            slotProps={{ paper: { sx: { mt: 0.5, minWidth: 175, borderRadius: '10px' } } }}
          >
            <MenuItem
              onClick={() => {
                setMenuAnchor(null);
                inputRef.current?.click();
              }}
              sx={{ fontSize: 13.5 }}
            >
              <Iconify icon="solar:refresh-bold-duotone" width={17} sx={{ mr: 1.25 }} />
              Replace file
            </MenuItem>
            <MenuItem
              onClick={() => {
                setMenuAnchor(null);
                onUpload({ fileName: null, fileData: null, uploadedAt: null });
              }}
              sx={{ fontSize: 13.5, color: '#B32C22', '&:hover': { bgcolor: TONE_COLORS.error.bg } }}
            >
              <Iconify icon="solar:trash-bin-trash-bold-duotone" width={17} sx={{ mr: 1.25 }} />
              Delete file
            </MenuItem>
          </Menu>
        </>
      ) : (
        <Button
          onClick={() => inputRef.current?.click()}
          variant="contained"
          size="small"
          sx={{ bgcolor: '#1C2A6E', borderRadius: '9px', px: 2, '&:hover': { bgcolor: '#14205A' } }}
        >
          Upload report
        </Button>
      )}
    </BureauRow>
  );
}

function CibiRow() {
  const { signUpData, application } = useRegistration();
  const { review, setCibiForm } = useAdmin();
  const { cibiForm } = review;
  const [formOpen, setFormOpen] = useState(false);
  const [reportMenuAnchor, setReportMenuAnchor] = useState<HTMLElement | null>(null);
  const reportInputRef = useRef<HTMLInputElement>(null);

  // Auto-populate from real applicant data the first time the form is opened
  // with an empty form — same fields/logic as the original CibiFormCard.
  useEffect(() => {
    if (cibiForm.submitted || cibiForm.firstName) return;
    if (!signUpData) return;

    const amount = application.financialInfo?.desiredLoanAmount
      ? String(application.financialInfo.desiredLoanAmount)
      : '';
    const terms = application.financialInfo?.loanTermMonths
      ? String(application.financialInfo.loanTermMonths)
      : '';

    setCibiForm({
      firstName: signUpData.firstName || '',
      middleName: signUpData.middleName || '',
      lastName: signUpData.lastName || '',
      gender: application.personalInfo?.gender || '',
      contactNumber: signUpData.mobile || '',
      addressProvince: application.personalInfo?.province || '',
      addressCity: application.personalInfo?.city || '',
      addressStreet: application.personalInfo?.address || '',
      idType: application.personalInfo?.idType || '',
      idNumber: application.personalInfo?.idNumber || '',
      creditPurpose: application.financialInfo?.loanPurpose || '',
      creditType:
        application.loanType === 'business'
          ? 'Business Loan'
          : application.loanType === 'personal'
            ? 'Personal Loan'
            : '',
      financedAmount: amount,
      terms,
      installment: computeInstallment(amount, terms),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formOpen]);

  const update = (field: keyof CibiForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const next: Partial<CibiForm> = { [field]: event.target.value };

    if (field === 'financedAmount' || field === 'terms') {
      const amount = field === 'financedAmount' ? event.target.value : cibiForm.financedAmount;
      const terms = field === 'terms' ? event.target.value : cibiForm.terms;
      next.installment = computeInstallment(amount, terms);
    }

    setCibiForm(next);
  };

  const handleSubmit = () => {
    setCibiForm({ submitted: true });
    setFormOpen(false);
  };

  const handleReportUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const dataUrl = await fileToDataUrl(file);
    setCibiForm({
      reportFile: dataUrl,
      reportFileName: file.name,
      reportUploadedAt: new Date().toISOString(),
    });
    event.target.value = '';
  };

  return (
    // Same 13px-radius bordered white shell as RequirementDocRow/BureauRow.
    <Box sx={{ borderRadius: '13px', border: '1px solid #EBEDF3', bgcolor: 'common.white', overflow: 'hidden' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={1.5}
        sx={{ p: 2 }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
          {/* Plain leading icon, matching RequirementDocRow/BureauRow — no
              boxed icon-avatar. */}
          <Iconify
            icon={cibiForm.reportFileName ? 'solar:check-circle-bold' : 'solar:document-text-bold-duotone'}
            width={20}
            sx={{ color: cibiForm.reportFileName ? '#12B76A' : '#8891A6', flexShrink: 0 }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#14172A' }}>CIBI</Typography>
            {cibiForm.reportFileName ? (
              <>
                <Typography sx={{ fontSize: 12, color: '#667085', lineHeight: 1.45, mt: 0.35 }}>
                  The credit report for{' '}
                  {[signUpData?.firstName, signUpData?.middleName, signUpData?.lastName]
                    .filter(Boolean)
                    .join(' ') || 'the applicant'}{' '}
                  shows a CIBI Bureau Score of 600. Two accounts were reported: one active and one
                  closed. Both accounts reflect payments made as agreed, with no recorded
                  delinquency.
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: '#A0A7B5', mt: 0.5 }}>
                  {cibiForm.reportFileName} · Uploaded{' '}
                  {formatUploadedAt(cibiForm.reportUploadedAt) ?? 'date unavailable'}
                </Typography>
              </>
            ) : (
              <Typography sx={{ fontSize: 12, color: '#8891A6' }}>API integration available</Typography>
            )}
          </Box>
        </Stack>

        {!cibiForm.submitted && (
          <Button
            onClick={() => setFormOpen((prev) => !prev)}
            variant="contained"
            size="small"
            endIcon={
              <Iconify
                icon="eva:chevron-down-fill"
                width={16}
                sx={{ transition: 'transform 0.15s ease', transform: formOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            }
            sx={{ bgcolor: '#1C2A6E', borderRadius: '9px', px: 2, '&:hover': { bgcolor: '#14205A' } }}
          >
            Create Report
          </Button>
        )}

        {cibiForm.submitted && (
          <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={1}>
            <StatusBadge tone="success" label="Sent" icon="solar:check-circle-bold" />
            <input
              ref={reportInputRef}
              type="file"
              accept="image/*,.pdf"
              hidden
              onChange={handleReportUpload}
            />
            {cibiForm.reportFileName ? (
              <>
                <Button
                  onClick={() =>
                    cibiForm.reportFile &&
                    window.open(cibiForm.reportFile, '_blank', 'noopener,noreferrer')
                  }
                  disabled={!cibiForm.reportFile}
                  variant="outlined"
                  size="small"
                  startIcon={<Iconify icon="solar:eye-bold-duotone" width={16} />}
                  sx={{ ...outlinedNavyButtonSx, px: 1.5 }}
                >
                  View
                </Button>
                <IconButton
                  onClick={(event) => setReportMenuAnchor(event.currentTarget)}
                  aria-label="More actions for CIBI report"
                  size="small"
                  sx={iconButtonBorderedSx}
                >
                  <Iconify icon="eva:more-vertical-fill" width={18} />
                </IconButton>
                <Menu
                  anchorEl={reportMenuAnchor}
                  open={Boolean(reportMenuAnchor)}
                  onClose={() => setReportMenuAnchor(null)}
                  slotProps={{ paper: { sx: { mt: 0.5, minWidth: 175, borderRadius: '10px' } } }}
                >
                  <MenuItem
                    onClick={() => {
                      setReportMenuAnchor(null);
                      reportInputRef.current?.click();
                    }}
                    sx={{ fontSize: 13.5 }}
                  >
                    <Iconify icon="solar:refresh-bold-duotone" width={17} sx={{ mr: 1.25 }} />
                    Replace file
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setReportMenuAnchor(null);
                      setCibiForm({
                        reportFile: null,
                        reportFileName: null,
                        reportUploadedAt: null,
                      });
                    }}
                    sx={{ fontSize: 13.5, color: '#B32C22', '&:hover': { bgcolor: TONE_COLORS.error.bg } }}
                  >
                    <Iconify icon="solar:trash-bin-trash-bold-duotone" width={17} sx={{ mr: 1.25 }} />
                    Delete file
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Button
                onClick={() => reportInputRef.current?.click()}
                variant="contained"
                size="small"
                sx={{ bgcolor: '#1C2A6E', borderRadius: '9px', px: 2, '&:hover': { bgcolor: '#14205A' } }}
              >
                Upload document
              </Button>
            )}
          </Stack>
        )}
      </Stack>

      <Collapse in={formOpen} timeout="auto" unmountOnExit>
        <Box sx={{ p: 2.5, pt: 0 }}>
          <Box sx={{ p: 2.5, borderRadius: '12px', bgcolor: '#FAFBFD', border: '1px solid #EEF0F5' }}>
            <Typography sx={{ fontSize: 12.5, color: '#8891A6', mb: 2 }}>
              CIBI is currently the only bureau with an API integration — fields we already have on
              file are pre-filled from the application; fill in the rest before submitting.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Field
                  label="First Name"
                  required
                  autoFilled={!!cibiForm.firstName}
                  value={cibiForm.firstName}
                  onChange={update('firstName')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Field
                  label="Middle Name"
                  autoFilled={!!cibiForm.middleName}
                  value={cibiForm.middleName}
                  onChange={update('middleName')}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Field
                  label="Last Name"
                  required
                  autoFilled={!!cibiForm.lastName}
                  value={cibiForm.lastName}
                  onChange={update('lastName')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Field
                  label="Date of Birth"
                  required
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={cibiForm.dateOfBirth}
                  onChange={update('dateOfBirth')}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Field
                  label="Gender"
                  required
                  select
                  autoFilled={!!cibiForm.gender}
                  value={cibiForm.gender}
                  onChange={update('gender')}
                >
                  <MenuItem value="">Select…</MenuItem>
                  {GENDERS.map((g) => (
                    <MenuItem key={g} value={g}>
                      {g}
                    </MenuItem>
                  ))}
                </Field>
              </Grid>
              <Grid item xs={12} sm={6} />

              <Grid item xs={12} sm={6}>
                <Field
                  label="Contact Type"
                  required
                  select
                  value={cibiForm.contactType}
                  onChange={update('contactType')}
                >
                  {CONTACT_TYPES.map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </Field>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Field
                  label="Contact Number"
                  required
                  autoFilled={!!cibiForm.contactNumber}
                  value={cibiForm.contactNumber}
                  onChange={update('contactNumber')}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Field
                  label="Address Region"
                  required
                  placeholder="e.g. NCR"
                  value={cibiForm.addressRegion}
                  onChange={update('addressRegion')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Field
                  label="Address Province"
                  required
                  autoFilled={!!cibiForm.addressProvince}
                  value={cibiForm.addressProvince}
                  onChange={update('addressProvince')}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Field
                  label="Address City"
                  required
                  autoFilled={!!cibiForm.addressCity}
                  value={cibiForm.addressCity}
                  onChange={update('addressCity')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Field
                  label="Address Street"
                  required
                  autoFilled={!!cibiForm.addressStreet}
                  value={cibiForm.addressStreet}
                  onChange={update('addressStreet')}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Field
                  label="ID Type"
                  required
                  autoFilled={!!cibiForm.idType}
                  value={cibiForm.idType}
                  onChange={update('idType')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Field
                  label="ID Number"
                  required
                  autoFilled={!!cibiForm.idNumber}
                  value={cibiForm.idNumber}
                  onChange={update('idNumber')}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Field
                  label="Credit Purpose"
                  required
                  autoFilled={!!cibiForm.creditPurpose}
                  value={cibiForm.creditPurpose}
                  onChange={update('creditPurpose')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Field
                  label="Credit Type"
                  required
                  autoFilled={!!cibiForm.creditType}
                  value={cibiForm.creditType}
                  onChange={update('creditType')}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Field
                  label="Financed Amount"
                  required
                  type="number"
                  autoFilled={!!cibiForm.financedAmount}
                  value={cibiForm.financedAmount}
                  onChange={update('financedAmount')}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#1C2A6E' }}>₱</Typography>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Field
                  label="Terms"
                  required
                  type="number"
                  autoFilled={!!cibiForm.terms}
                  value={cibiForm.terms}
                  onChange={update('terms')}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Field
                  label="Installment"
                  required
                  type="number"
                  autoFilled={!!cibiForm.installment}
                  helperText="Estimated — amount ÷ terms, no interest applied"
                  value={cibiForm.installment}
                  onChange={update('installment')}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#1C2A6E' }}>₱</Typography>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>

            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}>
              <Button
                onClick={handleSubmit}
                variant="contained"
                startIcon={<Iconify icon="solar:letter-bold" width={18} />}
                sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#14205A' } }}
              >
                Submit to CIBI
              </Button>
            </Stack>
          </Box>
        </Box>
      </Collapse>

      <Collapse in={!!cibiForm.reportFileName} timeout="auto" unmountOnExit>
        <Box sx={{ p: 2.5, pt: 0 }}>
          <CibiResultsTable rows={review.creditChecking.cibiResults} />
        </Box>
      </Collapse>
    </Box>
  );
}

export function BureauReportsCard() {
  const {
    review,
    setLoandexUpload,
    setCicUpload,
    setCmapUpload,
    setNfisBapUpload,
    setPgfcExposureUpload,
  } = useAdmin();
  const { loandexUpload, cicUpload, cmapUpload, nfisBapUpload, pgfcExposureUpload, creditChecking } = review;

  return (
    <Box sx={adminCardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        Bureau Reports
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Upload the returned reports. All are required to make a decision.
      </Typography>

      <Stack spacing={1.5}>
        <CibiRow />
        <SimpleBureauRow
          title="LOANDEX"
          upload={loandexUpload}
          onUpload={setLoandexUpload}
          resultsTable={<LoandexRecordsTable rows={creditChecking.loandexRecords} />}
        />
        <SimpleBureauRow
          title="CIC"
          upload={cicUpload}
          onUpload={setCicUpload}
          resultsTable={<CicContractsTable rows={creditChecking.cicContracts} />}
        />
        <SimpleBureauRow
          title="CMAP"
          upload={cmapUpload}
          onUpload={setCmapUpload}
          resultsTable={<CmapCasesTable rows={creditChecking.cmapCases} />}
        />
        <SimpleBureauRow
          title="NFIS / BAP"
          upload={nfisBapUpload}
          onUpload={setNfisBapUpload}
          resultsTable={<BapNfisRecordsTable rows={creditChecking.bapNfisRecords} />}
        />
        <SimpleBureauRow
          title="PGFC Existing Exposure"
          upload={pgfcExposureUpload}
          onUpload={setPgfcExposureUpload}
          resultsTable={<PgfcExposureTable rows={creditChecking.pgfcExposureRecords} />}
        />
      </Stack>
    </Box>
  );
}
