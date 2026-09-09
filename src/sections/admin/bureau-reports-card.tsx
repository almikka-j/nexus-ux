'use client';

import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
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
import { deriveBureauFileSummary } from './bureau-file-summary';
import {
  CmapCasesTable,
  BapNfisRecordsTable,
  CibiResultsTable,
  CicContractsTable,
  LoandexRecordsTable,
  PgfcExposureTable,
} from './bureau-results-tables';

import type {
  CibiForm,
  BureauFileKind,
  BureauReportFile,
  CmapCase,
  BapNfisRecord,
  CibiResult,
  CicContract,
  LoandexRecord,
  PgfcExposureRecord,
} from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Compact, space-saving "Bureau Reports" card — one row per bureau. Every
// bureau now accepts MULTIPLE report files (was one file each): CIBI is still
// the only bureau with a data-entry form (its "Create Report" → "Submit to
// CIBI" intake flow is unchanged), but the returned report — like the other
// five bureaus' uploads — is now an array of files. Each uploaded file
// renders its own results table (2–3 canned sample rows), shown in a
// per-file collapsible sub-panel below the bureau header (Layout B from the
// brainstorm). File list, add/replace/delete, and the collapsible panels are
// all handled by the shared `BureauFileList` below, used by both the CIBI
// row and the five `SimpleBureauRow`s.
//
// Consolidation note (UI/UX audit): these rows were NOT refactored onto
// `RequirementDocRow` directly — `RequirementDocRow`'s `doc` prop needs the
// full `RequirementDoc` shape (status/aiNote/fileUrl/remarks/reviewed/
// uploadedBy), where these rows are backed by `BureauReportFile[]`
// (`admin-context.tsx`), a slim `{id, fileName, fileData, uploadedAt, rows}`
// shape. Instead every row uses the exact same shared tokens/components
// `RequirementDocRow` uses (`StatusBadge`, `outlinedNavyButtonSx`,
// `iconButtonBorderedSx`, the 13px-radius bordered shell, the Menu styling).
// ----------------------------------------------------------------------

const GENDERS = ['Male', 'Female'];
const CONTACT_TYPES = ['Mobile', 'Landline'];

function formatUploadedAt(uploadedAt: string | null) {
  if (!uploadedAt) return null;
  const date = new Date(uploadedAt);
  const datePart = date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const timePart = date.toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${datePart}, ${timePart}`;
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

// ----------------------------------------------------------------------
// One collapsible sub-panel per uploaded file (Layout B). Collapsed header:
// chevron + filename + row count + View + 3-dot menu (Replace / Delete).
// Expanded body: that file's results table.
// ----------------------------------------------------------------------
function BureauFilePanel({
  kind,
  file,
  bureauTitle,
  open,
  onToggle,
  onReplace,
  onDelete,
  renderTable,
}: {
  kind: BureauFileKind;
  file: BureauReportFile;
  bureauTitle: string;
  open: boolean;
  onToggle: () => void;
  onReplace: (data: { fileName: string; fileData: string }) => void;
  onDelete: () => void;
  renderTable: (file: BureauReportFile) => React.ReactNode;
}) {
  const { signUpData } = useRegistration();
  const inputRef = useRef<HTMLInputElement>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const applicantName = [signUpData?.firstName, signUpData?.lastName].filter(Boolean).join(' ');
  const fileSummary = deriveBureauFileSummary(kind, file, applicantName);
  const riskStyle = {
    Low: { bg: '#E7F8F0', color: '#0C8A4F', icon: 'solar:check-circle-bold' },
    Moderate: { bg: '#EEF1FE', color: '#3448B0', icon: 'solar:info-circle-bold' },
    High: { bg: '#FDE2DF', color: '#B32C22', icon: 'solar:danger-triangle-bold' },
  }[fileSummary.riskLevel];

  const handleReplace = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    if (!picked) return;
    const fileData = await fileToDataUrl(picked);
    onReplace({ fileName: picked.name, fileData });
    event.target.value = '';
  };

  return (
    <Box sx={{ borderTop: '1px solid #F0F1F5' }}>
      <input ref={inputRef} type="file" accept="image/*,.pdf" hidden onChange={handleReplace} />
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ px: 2, py: 1.25, cursor: 'pointer' }}
        onClick={onToggle}
      >
        <Iconify
          icon="eva:chevron-right-fill"
          width={16}
          sx={{
            color: '#8891A6',
            flexShrink: 0,
            transition: 'transform 0.15s ease',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 12.75, fontWeight: 700, color: '#14172A' }}>
            {file.fileName}
          </Typography>
          <Typography sx={{ fontSize: 11, color: '#A0A7B5', mt: 0.25 }}>
            {file.rows.length} {file.rows.length === 1 ? 'row' : 'rows'} · Uploaded{' '}
            {formatUploadedAt(file.uploadedAt) ?? 'date unavailable'}
          </Typography>
        </Box>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          onClick={(event) => event.stopPropagation()}
        >
          <Button
            onClick={() =>
              file.fileData && window.open(file.fileData, '_blank', 'noopener,noreferrer')
            }
            disabled={!file.fileData}
            variant="outlined"
            size="small"
            startIcon={<Iconify icon="solar:eye-bold-duotone" width={16} />}
            sx={{ ...outlinedNavyButtonSx, px: 1.5 }}
          >
            View
          </Button>
          <IconButton
            onClick={(event) => setMenuAnchor(event.currentTarget)}
            aria-label={`More actions for ${file.fileName}`}
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
                onDelete();
              }}
              sx={{ fontSize: 13.5, color: '#B32C22', '&:hover': { bgcolor: TONE_COLORS.error.bg } }}
            >
              <Iconify icon="solar:trash-bin-trash-bold-duotone" width={17} sx={{ mr: 1.25 }} />
              Delete file
            </MenuItem>
          </Menu>
        </Stack>
      </Stack>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <Box sx={{ px: 2.5, pb: 2.5, pt: 0.5 }}>
          <Typography sx={{ fontSize: 11, color: '#A0A7B5', mb: 1 }}>
            {bureauTitle} results extracted from {file.fileName}
          </Typography>
          {renderTable(file)}

          <Box sx={{ mt: 2, p: 2.25, borderRadius: '14px', bgcolor: riskStyle.bg }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={1.5}
              sx={{ mb: 1.25 }}
            >
              <Typography
                sx={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  color: riskStyle.color,
                }}
              >
                Summary Report
              </Typography>
              <Stack
                direction="row"
                spacing={0.75}
                alignItems="center"
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: '999px',
                  bgcolor: 'common.white',
                  flexShrink: 0,
                }}
              >
                <Iconify icon={riskStyle.icon} width={15} sx={{ color: riskStyle.color }} />
                <Typography
                  sx={{ fontSize: 12, fontWeight: 800, color: riskStyle.color, whiteSpace: 'nowrap' }}
                >
                  {fileSummary.riskLevel} risk
                </Typography>
              </Stack>
            </Stack>

            <Typography sx={{ fontSize: 13.5, color: '#14172A', lineHeight: 1.65 }}>
              {fileSummary.summary}
            </Typography>

            <Divider sx={{ borderColor: riskStyle.color, opacity: 0.15, my: 1.75 }} />

            <Stack spacing={1.5}>
              {(
                [
                  ['Recommendation', fileSummary.recommendation],
                  ['Document Match', fileSummary.documentMatch],
                ] as const
              ).map(([label, value]) => (
                <Box key={label}>
                  <Typography
                    sx={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      letterSpacing: '0.03em',
                      textTransform: 'uppercase',
                      color: riskStyle.color,
                      mb: 0.5,
                    }}
                  >
                    {label}
                  </Typography>
                  <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6 }}>
                    {value}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}

// ----------------------------------------------------------------------
// The multi-file list for one bureau: header row (icon, title, status badge,
// file count, "Add files"), then one BureauFilePanel per uploaded file. Used
// by both SimpleBureauRow and CibiRow.
// ----------------------------------------------------------------------
function BureauFileList({
  kind,
  title,
  files,
  renderTable,
  headerAction,
  emptyHint,
}: {
  kind: BureauFileKind;
  title: string;
  files: BureauReportFile[];
  renderTable: (file: BureauReportFile) => React.ReactNode;
  /** Extra element rendered in the header before "Add files" (CIBI's
   * "Create Report" / "Sent" badge). */
  headerAction?: React.ReactNode;
  /** Muted line shown under the title while no file has been uploaded. */
  emptyHint?: string;
}) {
  const { review, addBureauReportFiles, replaceBureauReportFile, removeBureauReportFile } = useAdmin();
  const addInputRef = useRef<HTMLInputElement>(null);
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  const bureauFindingStatus = review.creditChecking.bureauFindingStatus;
  const hasFiles = files.length > 0;
  const isNegative = hasFiles && bureauFindingStatus === 'negative';
  const badgeTone = isNegative ? 'error' : bureauFindingStatus === 'clean' ? 'success' : 'info';
  const badgeLabel = isNegative ? 'Negative' : bureauFindingStatus === 'clean' ? 'Clear' : 'Uploaded';

  // First file starts expanded; each toggles independently. When a brand-new
  // file lands and nothing is open yet, open the newest one.
  useEffect(() => {
    setOpenIds((prev) => {
      const next = new Set(Array.from(prev).filter((id) => files.some((f) => f.id === id)));
      if (next.size === 0 && files.length > 0) next.add(files[files.length - 1].id);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files.length]);

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleAdd = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    if (picked.length === 0) return;
    const entries = await Promise.all(
      picked.map(async (f) => ({ fileName: f.name, fileData: await fileToDataUrl(f) }))
    );
    addBureauReportFiles(kind, entries);
    event.target.value = '';
  };

  return (
    <Box
      sx={{
        borderRadius: '13px',
        border: '1px solid #EBEDF3',
        bgcolor: 'common.white',
        overflow: 'hidden',
      }}
    >
      <input
        ref={addInputRef}
        type="file"
        accept="image/*,.pdf"
        multiple
        hidden
        onChange={handleAdd}
      />
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={1.5}
        sx={{ p: 2 }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
          <Iconify
            icon={
              isNegative
                ? 'solar:danger-triangle-bold'
                : hasFiles
                  ? 'solar:check-circle-bold'
                  : 'solar:file-text-linear'
            }
            width={20}
            sx={{
              color: isNegative ? '#F04438' : hasFiles ? '#12B76A' : '#C7CCDA',
              flexShrink: 0,
            }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#14172A' }}>{title}</Typography>
            {hasFiles ? (
              <Typography sx={{ fontSize: 11.5, color: '#A0A7B5', mt: 0.5 }}>
                {files.length} {files.length === 1 ? 'file' : 'files'} uploaded
              </Typography>
            ) : (
              emptyHint && (
                <Typography sx={{ fontSize: 12, color: '#8891A6', mt: 0.25 }}>{emptyHint}</Typography>
              )
            )}
          </Box>
        </Stack>

        <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={1}>
          {hasFiles && <StatusBadge tone={badgeTone} label={badgeLabel} />}
          {headerAction}
          {hasFiles ? (
            <Button
              onClick={() => addInputRef.current?.click()}
              variant="outlined"
              size="small"
              startIcon={<Iconify icon="solar:add-circle-bold-duotone" width={16} />}
              sx={{ ...outlinedNavyButtonSx, px: 1.5 }}
            >
              Add files
            </Button>
          ) : (
            <Button
              onClick={() => addInputRef.current?.click()}
              variant="contained"
              size="small"
              sx={{ bgcolor: '#1C2A6E', borderRadius: '9px', px: 2, '&:hover': { bgcolor: '#14205A' } }}
            >
              Upload report
            </Button>
          )}
        </Stack>
      </Stack>

      {files.map((file) => (
        <BureauFilePanel
          key={file.id}
          kind={kind}
          file={file}
          bureauTitle={title}
          open={openIds.has(file.id)}
          onToggle={() => toggle(file.id)}
          onReplace={(data) => replaceBureauReportFile(kind, file.id, data)}
          onDelete={() => removeBureauReportFile(kind, file.id)}
          renderTable={renderTable}
        />
      ))}
    </Box>
  );
}

function SimpleBureauRow({
  kind,
  title,
  renderTable,
}: {
  kind: Exclude<BureauFileKind, 'cibi'>;
  title: string;
  renderTable: (file: BureauReportFile) => React.ReactNode;
}) {
  const { review } = useAdmin();
  const filesByKind: Record<Exclude<BureauFileKind, 'cibi'>, BureauReportFile[]> = {
    loandex: review.loandexFiles,
    cic: review.cicFiles,
    cmap: review.cmapFiles,
    nfisBap: review.nfisBapFiles,
    pgfcExposure: review.pgfcExposureFiles,
  };

  return (
    <BureauFileList kind={kind} title={title} files={filesByKind[kind]} renderTable={renderTable} />
  );
}

function CibiRow() {
  const { signUpData, application } = useRegistration();
  const { review, setCibiForm } = useAdmin();
  const { cibiForm } = review;
  const [formOpen, setFormOpen] = useState(false);

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

  const headerAction = !cibiForm.submitted ? (
    <Button
      onClick={() => setFormOpen((prev) => !prev)}
      variant="contained"
      size="small"
      endIcon={
        <Iconify
          icon="eva:chevron-down-fill"
          width={16}
          sx={{
            transition: 'transform 0.15s ease',
            transform: formOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      }
      sx={{ bgcolor: '#1C2A6E', borderRadius: '9px', px: 2, '&:hover': { bgcolor: '#14205A' } }}
    >
      Create Report
    </Button>
  ) : (
    <StatusBadge tone="success" label="Sent" icon="solar:check-circle-bold" />
  );

  return (
    <Box>
      <BureauFileList
        kind="cibi"
        title="CIBI"
        files={cibiForm.reportFiles}
        renderTable={(file) => <CibiResultsTable rows={file.rows as CibiResult[]} />}
        headerAction={headerAction}
        emptyHint="API integration available"
      />

      <Collapse in={formOpen} timeout="auto" unmountOnExit>
        <Box sx={{ mt: 1.5 }}>
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
    </Box>
  );
}

export function BureauReportsCard() {
  return (
    <Box sx={adminCardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        Bureau Reports
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Upload the returned reports. You can attach multiple files per bureau; each file shows its own
        results table. All bureaus are required to make a decision.
      </Typography>

      <Stack spacing={1.5}>
        <CibiRow />
        <SimpleBureauRow
          kind="loandex"
          title="LOANDEX"
          renderTable={(file) => <LoandexRecordsTable rows={file.rows as LoandexRecord[]} />}
        />
        <SimpleBureauRow
          kind="cic"
          title="CIC"
          renderTable={(file) => <CicContractsTable rows={file.rows as CicContract[]} />}
        />
        <SimpleBureauRow
          kind="cmap"
          title="CMAP"
          renderTable={(file) => <CmapCasesTable rows={file.rows as CmapCase[]} />}
        />
        <SimpleBureauRow
          kind="nfisBap"
          title="NFIS / BAP"
          renderTable={(file) => <BapNfisRecordsTable rows={file.rows as BapNfisRecord[]} />}
        />
        <SimpleBureauRow
          kind="pgfcExposure"
          title="PGFC Existing Exposure"
          renderTable={(file) => <PgfcExposureTable rows={file.rows as PgfcExposureRecord[]} />}
        />
      </Stack>
    </Box>
  );
}
