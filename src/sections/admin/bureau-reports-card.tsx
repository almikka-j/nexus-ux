'use client';

import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { fileToDataUrl } from 'src/utils/file-to-data-url';

import { computeInstallment } from './cibi-form-card';

import type { CibiForm, BureauUpload } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Compact, space-saving "Bureau Reports" card — one row per bureau instead of
// a full card each. CIBI is the only bureau with a data-entry form (per the
// source diagram's callout), so its row behaves differently from the other
// four: "Create Report" expands a collapsible form inline; once submitted,
// the row shows a "Sent" status pill plus a separate "Upload document"
// action for the returned CIBI report file. LOANDEX/CIC/CMAP/NFIS-BAP are
// plain manual-upload rows, same as before, just restyled to match.
// ----------------------------------------------------------------------

const GENDERS = ['Male', 'Female'];
const CONTACT_TYPES = ['Mobile', 'Landline'];

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
      <TextField fullWidth size="small" sx={fieldSx} {...props} />
    </Stack>
  );
}

function BureauRow({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        borderRadius: '13px',
        border: '1px solid #EBEDF3',
        overflow: 'hidden',
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        sx={{ p: 2, minHeight: 72 }}
      >
        <Box
          sx={{
            width: 38,
            height: 38,
            flexShrink: 0,
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#F5F6FA',
          }}
        >
          <Iconify icon="solar:file-text-linear" width={19} sx={{ color: '#8891A6' }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: '#14172A' }}>{title}</Typography>
        </Box>
        {children}
      </Stack>
    </Box>
  );
}

function UploadedPill({ fileName, onReplace }: { fileName: string; onReplace: () => void }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Iconify icon="solar:check-circle-bold" width={18} sx={{ color: '#12B76A' }} />
      <Typography
        sx={{
          fontSize: 12.5,
          fontWeight: 600,
          color: '#14172A',
          maxWidth: 140,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {fileName}
      </Typography>
      <Button size="small" onClick={onReplace} sx={{ minWidth: 0, px: 1 }}>
        Replace
      </Button>
    </Stack>
  );
}

function SimpleBureauRow({
  title,
  upload,
  onUpload,
}: {
  title: string;
  upload: BureauUpload;
  onUpload: (data: Partial<BureauUpload>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    onUpload({ fileName: file.name });
    event.target.value = '';
  };

  return (
    <BureauRow title={title}>
      <input ref={inputRef} type="file" accept="image/*,.pdf" hidden onChange={handleUpload} />
      {upload.fileName ? (
        <>
          <Typography sx={{ fontSize: 12, color: '#8891A6', display: { xs: 'none', sm: 'block' } }}>
            Manual report upload
          </Typography>
          <UploadedPill fileName={upload.fileName} onReplace={() => inputRef.current?.click()} />
        </>
      ) : (
        <>
          <Typography sx={{ fontSize: 12, color: '#8891A6', display: { xs: 'none', sm: 'block' } }}>
            Manual report upload
          </Typography>
          <Button
            onClick={() => inputRef.current?.click()}
            variant="contained"
            size="small"
            sx={{ bgcolor: '#1C2A6E', borderRadius: '9px', px: 2, '&:hover': { bgcolor: '#14205A' } }}
          >
            Upload report
          </Button>
        </>
      )}
    </BureauRow>
  );
}

function CibiRow() {
  const { signUpData, application } = useRegistration();
  const { review, setCibiForm } = useAdmin();
  const { cibiForm } = review;
  const [formOpen, setFormOpen] = useState(false);
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
    setCibiForm({ reportFile: dataUrl, reportFileName: file.name });
    event.target.value = '';
  };

  return (
    <Box
      sx={{
        borderRadius: '13px',
        border: '1px solid #EBEDF3',
        overflow: 'hidden',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2} sx={{ p: 2, minHeight: 72 }}>
        <Box
          sx={{
            width: 38,
            height: 38,
            flexShrink: 0,
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#EEF1FE',
          }}
        >
          <Iconify icon="solar:document-text-bold-duotone" width={19} sx={{ color: '#1C2A6E' }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: '#14172A' }}>CIBI</Typography>
          <Typography sx={{ fontSize: 12, color: '#8891A6' }}>API integration available</Typography>
        </Box>

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
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Chip
              size="small"
              color="success"
              variant="soft"
              icon={<Iconify icon="solar:check-circle-bold" width={14} />}
              label="Sent"
            />
            <input
              ref={reportInputRef}
              type="file"
              accept="image/*,.pdf"
              hidden
              onChange={handleReportUpload}
            />
            {cibiForm.reportFileName ? (
              <UploadedPill
                fileName={cibiForm.reportFileName}
                onReplace={() => reportInputRef.current?.click()}
              />
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
  const { review, setLoandexUpload, setCicUpload, setCmapUpload, setNfisBapUpload } = useAdmin();
  const { loandexUpload, cicUpload, cmapUpload, nfisBapUpload } = review;

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
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        Bureau Reports
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Upload the returned reports. All are required to make a decision.
      </Typography>

      <Stack spacing={1.5}>
        <CibiRow />
        <SimpleBureauRow title="LOANDEX" upload={loandexUpload} onUpload={setLoandexUpload} />
        <SimpleBureauRow title="CIC" upload={cicUpload} onUpload={setCicUpload} />
        <SimpleBureauRow title="CMAP" upload={cmapUpload} onUpload={setCmapUpload} />
        <SimpleBureauRow title="NFIS / BAP" upload={nfisBapUpload} onUpload={setNfisBapUpload} />
      </Stack>
    </Box>
  );
}
