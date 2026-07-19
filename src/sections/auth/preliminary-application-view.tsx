'use client';

import { z as zod } from 'zod';
import { useRef, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import { useForm, Controller, useWatch, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';
import FormHelperText from '@mui/material/FormHelperText';
import InputAdornment from '@mui/material/InputAdornment';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useRegistration } from 'src/auth/registration-context';
import { fileToDataUrl } from 'src/utils/file-to-data-url';

import { Form, Field } from 'src/components/hook-form';
import { Iconify } from 'src/components/iconify';
import { FileThumbnail } from 'src/components/file-thumbnail';

import { AuthBrandPanel } from './auth-brand-panel';
import { authFieldSx, authFieldLabelSx, authPrimaryButtonSx } from './auth-input-styles';

// ----------------------------------------------------------------------
// The new front door of the borrower sign-up flow — screens loan
// eligibility before any account credentials are collected. Replaces the
// old SignUpView (account-first) at the same /auth/sign-up route.
// ----------------------------------------------------------------------

const MINIMUM_LOAN_AMOUNT = 150000;

const PREFIXES = ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Engr.', 'Atty.'];

const LOAN_TERMS = [6, 12, 18, 24, 36];

const INCOME_SOURCES = ['Employed', 'Self-Employed', 'Business Owner', 'OFW', 'Unemployed'];

const LOAN_PURPOSES = [
  'Working Capital',
  'Business Expansion',
  'Education',
  'Home Improvement',
  'Debt Consolidation',
  'Other',
];

const BUSINESS_TYPES = ['Corporation', 'Cooperative', 'Sole Proprietorship', 'Partnership'];

// The document each business type must upload to prove its registration —
// shown as the upload field's label/helper text once a Business Type is
// selected. No real document validation happens anywhere in this prototype;
// this only changes what the borrower is asked to upload.
const BUSINESS_TYPE_DOCUMENT: Record<string, string> = {
  Corporation: 'General Information Sheet (GIS)',
  Cooperative: 'Certificate of Registration (CDA)',
  'Sole Proprietorship': 'DTI Certificate of Registration',
  Partnership: 'SEC Certificate of Registration',
};

function formatThousands(value: string) {
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('en-US');
}

export type PreliminarySchemaType = zod.infer<typeof PreliminarySchema>;

export const PreliminarySchema = zod
  .object({
    prefix: zod.string().optional(),
    lastName: zod.string().min(1, { message: 'Surname is required.' }),
    email: zod
      .string()
      .min(1, { message: 'Email address is required.' })
      .email({ message: 'Enter a valid email address.' }),
    mobile: zod
      .string()
      .min(1, { message: 'Mobile number is required.' })
      .regex(/^9\d{9}$/, { message: 'Enter a valid mobile number (e.g. 9171234567).' }),
    desiredLoanAmount: zod.coerce.number().min(1, { message: 'Enter your desired loan amount.' }),
    loanTermMonths: zod.coerce.number().min(1, { message: 'Select a loan term.' }),
    incomeSource: zod.string().min(1, { message: 'Select your source of income.' }),
    businessType: zod.string().optional(),
    businessDocument: zod.any().nullable(),
    monthlyIncome: zod.coerce.number().min(1, { message: 'Enter your monthly income.' }),
    loanPurpose: zod.array(zod.string()).min(1, { message: 'Select at least one purpose.' }),
    dataConsent: zod.boolean().refine((value) => value === true, {
      message: 'You must agree to the Terms & Conditions and Privacy Policy to continue.',
    }),
  })
  .superRefine((data, ctx) => {
    if (data.incomeSource === 'Business Owner') {
      if (!data.businessType) {
        ctx.addIssue({
          code: zod.ZodIssueCode.custom,
          path: ['businessType'],
          message: 'Select your business type.',
        });
      }
      if (!data.businessDocument) {
        ctx.addIssue({
          code: zod.ZodIssueCode.custom,
          path: ['businessDocument'],
          message: 'Upload the required business document.',
        });
      }
    }
  });

const BLANK_VALUES: PreliminarySchemaType = {
  prefix: '',
  lastName: '',
  email: '',
  mobile: '',
  desiredLoanAmount: '' as unknown as number,
  loanTermMonths: 12,
  incomeSource: '',
  businessType: '',
  businessDocument: null,
  monthlyIncome: '' as unknown as number,
  loanPurpose: [],
  dataConsent: false,
};

const SAMPLE_VALUES: PreliminarySchemaType = {
  prefix: 'Mr.',
  lastName: 'Dela Cruz',
  email: 'juan.delacruz@example.com',
  mobile: '9171234567',
  desiredLoanAmount: 200000,
  loanTermMonths: 12,
  incomeSource: 'Employed',
  businessType: '',
  businessDocument: null,
  monthlyIncome: 30000,
  loanPurpose: ['Working Capital'],
  dataConsent: true,
};

// ----------------------------------------------------------------------

type CompactDropzoneProps = {
  value: File | string | null;
  onChange: (file: File | null) => void;
  error?: boolean;
  documentLabel: string;
};

// Slim single-line dropzone row. The shared `Field.Upload`/`Upload`
// component is built for photo uploads (large dashed dropzone, full-bleed
// image preview) and stays oversized even with sx overrides, so this field
// uses `useDropzone` + `FileThumbnail` directly instead.
function CompactDropzone({ value, onChange, error, documentLabel }: CompactDropzoneProps) {
  const { getRootProps, getInputProps } = useDropzone({
    multiple: false,
    accept: { 'image/*': [], 'application/pdf': [] },
    onDrop: (acceptedFiles) => onChange(acceptedFiles[0] ?? null),
  });

  const fileName = value ? (typeof value === 'string' ? value : value.name) : null;

  return (
    <Box
      {...(value ? {} : getRootProps())}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        minHeight: 44,
        px: 1.25,
        py: value ? 0.75 : 0,
        borderRadius: '10px',
        cursor: value ? 'default' : 'pointer',
        border: '1px dashed',
        borderColor: error ? 'error.main' : '#D6DAE3',
        bgcolor: error ? 'error.lighter' : '#F9FAFC',
        '&:hover': value ? undefined : { opacity: 0.8 },
      }}
    >
      {!value && <input {...getInputProps()} />}

      {value ? (
        <>
          <FileThumbnail file={value} sx={{ width: 28, height: 28 }} />
          <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 600, color: '#344054', flex: 1, minWidth: 0 }}>
            {fileName}
          </Typography>
          <IconButton size="small" onClick={() => onChange(null)}>
            <Iconify icon="mingcute:close-line" width={16} />
          </IconButton>
        </>
      ) : (
        <>
          <Iconify
            icon="solar:upload-minimalistic-bold-duotone"
            width={18}
            sx={{ color: error ? 'error.main' : '#8891A6' }}
          />
          <Typography sx={{ fontSize: 12.5, color: error ? 'error.main' : '#8891A6' }}>
            Choose a file — {documentLabel}
          </Typography>
        </>
      )}
    </Box>
  );
}

function BusinessDocumentUpload({ businessType }: { businessType?: string }) {
  const documentLabel = BUSINESS_TYPE_DOCUMENT[businessType || ''] ?? 'business registration document';
  const { control } = useFormContext<PreliminarySchemaType>();

  return (
    <Controller
      name="businessDocument"
      control={control}
      render={({ field, fieldState: { error } }) => (
        <Box>
          <Typography sx={authFieldLabelSx}>Upload your business document</Typography>

          <CompactDropzone
            value={field.value as File | string | null}
            onChange={field.onChange}
            error={!!error}
            documentLabel={documentLabel}
          />

          <FormHelperText error={!!error} sx={{ mx: 0 }}>
            {error?.message ?? 'PNG, JPG, or PDF, up to 10MB'}
          </FormHelperText>
        </Box>
      )}
    />
  );
}

function SoftDecline({ onTryAgain }: { onTryAgain: () => void }) {
  return (
    <Stack
      alignItems="center"
      textAlign="center"
      spacing={2}
      sx={{ minHeight: '100vh', justifyContent: 'center', px: 3, bgcolor: 'common.white' }}
    >
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#FEF0D6',
        }}
      >
        <Iconify icon="solar:heart-bold" width={34} sx={{ color: '#B36A05' }} />
      </Box>
      <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' }}>
        We appreciate you reaching out
      </Typography>
      <Typography sx={{ fontSize: 14.5, color: '#667085', lineHeight: 1.6, maxWidth: 440 }}>
        Right now, we&apos;re best able to support loan requests of{' '}
        <Box component="strong" sx={{ color: '#14172A' }}>
          ₱{MINIMUM_LOAN_AMOUNT.toLocaleString()}
        </Box>{' '}
        or more. This isn&apos;t a final decision about you — your needs may simply be better
        suited to a different amount. Feel free to come back anytime your loan amount changes.
      </Typography>
      <Stack direction="row" spacing={1.5} sx={{ pt: 1 }}>
        <Button variant="contained" onClick={onTryAgain} sx={authPrimaryButtonSx}>
          Try Again
        </Button>
        <Button variant="outlined" href={paths.root} sx={{ borderRadius: '11px' }}>
          Back to Home
        </Button>
      </Stack>
    </Stack>
  );
}

export function PreliminaryApplicationView() {
  const router = useRouter();
  const { signUpData, setSignUpData, setFinancialInfo, setPreliminaryStatus } = useRegistration();
  const [declined, setDeclined] = useState(false);

  const methods = useForm<PreliminarySchemaType>({
    resolver: zodResolver(PreliminarySchema),
    defaultValues: BLANK_VALUES,
  });

  const {
    handleSubmit,
    reset,
    control,
    setValue,
    clearErrors,
    formState: { isSubmitting },
  } = methods;
  const [isSample, setIsSample] = useState(false);

  const incomeSource = useWatch({ control, name: 'incomeSource' });
  const businessType = useWatch({ control, name: 'businessType' });
  const isBusinessOwner = incomeSource === 'Business Owner';
  const previousBusinessTypeRef = useRef(businessType);

  useEffect(() => {
    if (
      previousBusinessTypeRef.current &&
      previousBusinessTypeRef.current !== businessType
    ) {
      setValue('businessDocument', null, { shouldValidate: false });
      clearErrors('businessDocument');
    }

    previousBusinessTypeRef.current = businessType;
  }, [businessType, clearErrors, setValue]);

  const onSubmit = handleSubmit(async (data) => {
    await new Promise((resolve) => setTimeout(resolve, 400));

    if (data.desiredLoanAmount < MINIMUM_LOAN_AMOUNT) {
      setPreliminaryStatus('declined');
      setDeclined(true);
      return;
    }

    const businessDocument =
      data.businessDocument instanceof File
        ? await fileToDataUrl(data.businessDocument)
        : (data.businessDocument ?? null);

    setPreliminaryStatus('qualified');
    setSignUpData({
      prefix: data.prefix,
      firstName: signUpData?.firstName ?? '',
      middleName: signUpData?.middleName,
      lastName: data.lastName,
      extensionName: signUpData?.extensionName,
      email: data.email,
      mobile: data.mobile,
      password: signUpData?.password ?? '',
      marketingConsent: signUpData?.marketingConsent ?? false,
      termsAccepted: data.dataConsent,
    });
    setFinancialInfo({
      desiredLoanAmount: data.desiredLoanAmount,
      loanTermMonths: data.loanTermMonths,
      employmentStatus: data.incomeSource,
      monthlyIncome: data.monthlyIncome,
      loanPurpose: data.loanPurpose.join(', '),
      businessType: isBusinessOwner ? data.businessType : undefined,
      businessDocument: isBusinessOwner ? businessDocument : undefined,
    });

    router.push(paths.auth.verify);
  });

  if (declined) {
    return <SoftDecline onTryAgain={() => setDeclined(false)} />;
  }

  return (
    <Stack
      direction="row"
      sx={{ height: '100dvh', overflow: 'hidden', bgcolor: 'common.white' }}
    >
      <AuthBrandPanel
        title="Financing that moves at your pace."
        description="Tell us a bit about yourself and what you need — we'll let you know right away if you qualify."
        checklist
      />

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          p: { xs: 3, md: 6 },
          height: '100%',
          overflowY: 'auto',
          scrollbarGutter: 'stable',
        }}
      >
        <Box sx={{ width: 1, maxWidth: 600, my: 'auto' }}>
          <Stack
            direction="row"
            alignItems="flex-start"
            justifyContent="space-between"
            spacing={2}
            sx={{ mb: 0.5 }}
          >
            <Box>
              <Typography noWrap sx={{ fontSize: 27, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' }}>
                Let&apos;s find the right loan for you
              </Typography>
              <Typography noWrap sx={{ fontSize: 14.5, color: '#667085', mt: 0.75, lineHeight: 1.6 }}>
                Apply for a loan in 2 minutes—without affecting your credit score.
              </Typography>
            </Box>

            <Button
              onClick={() => {
                reset(isSample ? BLANK_VALUES : SAMPLE_VALUES);
                setIsSample((prev) => !prev);
              }}
              size="small"
              sx={{ color: 'text.disabled', flexShrink: 0 }}
            >
              {isSample ? 'Remove Sample Data' : 'Fill with Sample Data'}
            </Button>
          </Stack>

          <Form methods={methods} onSubmit={onSubmit}>
            <Stack spacing={1.75} sx={{ mt: 3 }}>
              <Stack direction="row" spacing={1.25}>
                <Box sx={{ width: 120 }}>
                  <Typography sx={authFieldLabelSx}>Prefix</Typography>
                  <Field.Select
                    name="prefix"
                    sx={authFieldSx}
                    SelectProps={{
                      displayEmpty: true,
                      renderValue: (value) =>
                        value ? (
                          String(value)
                        ) : (
                          <Typography component="span" sx={{ fontSize: 14, color: 'text.disabled' }}>
                            Select prefix
                          </Typography>
                        ),
                    }}
                  >
                    <MenuItem value="" disabled>
                      Select prefix
                    </MenuItem>
                    {PREFIXES.map((p) => (
                      <MenuItem key={p} value={p}>
                        {p}
                      </MenuItem>
                    ))}
                  </Field.Select>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={authFieldLabelSx}>Surname</Typography>
                  <Field.Text name="lastName" placeholder="Dela Cruz" sx={authFieldSx} />
                </Box>
              </Stack>

              <Stack direction="row" spacing={1.25}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={authFieldLabelSx}>Email address</Typography>
                  <Field.Text name="email" placeholder="juan@email.com" sx={authFieldSx} />
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={authFieldLabelSx}>Mobile number</Typography>
                  <Field.Text
                    name="mobile"
                    placeholder="912 345 6789"
                    sx={authFieldSx}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">+63</InputAdornment>,
                    }}
                  />
                </Box>
              </Stack>

              <Box>
                <Typography sx={authFieldLabelSx}>Purpose of loan</Typography>
                <Controller
                  name="loanPurpose"
                  control={control}
                  render={({ field, fieldState: { error } }) => (
                    <>
                      <Select
                        {...field}
                        fullWidth
                        multiple
                        displayEmpty
                        value={field.value ?? []}
                        sx={authFieldSx}
                        error={!!error}
                        renderValue={(selected) => {
                          const values = selected as string[];
                          if (values.length === 0) {
                            return (
                              <Typography component="span" sx={{ fontSize: 14, color: 'text.disabled' }}>
                                Select one or more
                              </Typography>
                            );
                          }
                          return (
                            <Typography noWrap component="span" sx={{ fontSize: 14, display: 'block' }}>
                              {values.join(', ')}
                            </Typography>
                          );
                        }}
                      >
                        {LOAN_PURPOSES.map((purpose) => (
                          <MenuItem key={purpose} value={purpose}>
                            <Checkbox checked={(field.value ?? []).includes(purpose)} size="small" />
                            <ListItemText primary={purpose} />
                          </MenuItem>
                        ))}
                      </Select>
                      {!!error && <FormHelperText error>{error.message}</FormHelperText>}
                    </>
                  )}
                />
              </Box>

              <Stack direction="row" spacing={1.25}>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={authFieldLabelSx}>Desired loan amount</Typography>
                  <Controller
                    name="desiredLoanAmount"
                    control={control}
                    render={({ field, fieldState: { error } }) => (
                      <Field.Text
                        name="desiredLoanAmount"
                        placeholder="200,000"
                        sx={authFieldSx}
                        value={!field.value ? '' : formatThousands(String(field.value))}
                        onChange={(event) => {
                          const digits = event.target.value.replace(/[^\d]/g, '');
                          field.onChange(digits === '' ? '' : Number(digits));
                        }}
                        inputMode="numeric"
                        error={!!error}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">PHP</InputAdornment>,
                        }}
                      />
                    )}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={authFieldLabelSx}>Preferred loan term</Typography>
                  <Field.Select name="loanTermMonths" sx={authFieldSx}>
                    {LOAN_TERMS.map((term) => (
                      <MenuItem key={term} value={term}>
                        {term} months
                      </MenuItem>
                    ))}
                  </Field.Select>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1.25}>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={authFieldLabelSx}>Source of income</Typography>
                  <Field.Select
                    name="incomeSource"
                    sx={authFieldSx}
                    SelectProps={{
                      displayEmpty: true,
                      renderValue: (value) =>
                        value ? (
                          String(value)
                        ) : (
                          <Typography component="span" sx={{ fontSize: 14, color: 'text.disabled' }}>
                            Select source of income
                          </Typography>
                        ),
                    }}
                  >
                    <MenuItem value="" disabled>
                      Select source of income
                    </MenuItem>
                    {INCOME_SOURCES.map((source) => (
                      <MenuItem key={source} value={source}>
                        {source}
                      </MenuItem>
                    ))}
                  </Field.Select>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={authFieldLabelSx}>Monthly income</Typography>
                  <Field.Text
                    name="monthlyIncome"
                    type="number"
                    placeholder="35,000"
                    sx={authFieldSx}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">PHP</InputAdornment>,
                    }}
                  />
                </Box>
              </Stack>

              {isBusinessOwner && (
                <Box sx={{ p: 2, borderRadius: '11px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#14172A', mb: 1.5 }}>
                    Business information
                  </Typography>
                  <Stack spacing={1.75}>
                    <Box>
                      <Typography sx={authFieldLabelSx}>Business type</Typography>
                      <Field.Select name="businessType" sx={authFieldSx}>
                        {BUSINESS_TYPES.map((type) => (
                          <MenuItem key={type} value={type}>
                            {type}
                          </MenuItem>
                        ))}
                      </Field.Select>
                    </Box>

                    <BusinessDocumentUpload businessType={businessType} />
                  </Stack>
                </Box>
              )}

              <Controller
                name="dataConsent"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <Box
                    sx={{
                      mt: 0.25,
                      p: 1.5,
                      borderRadius: '10px',
                      bgcolor: '#F9FAFC',
                      border: '1px solid #EEF0F5',
                    }}
                  >
                    <FormControlLabel
                      sx={{ m: 0, width: 1, alignItems: 'flex-start' }}
                      control={
                        <Checkbox
                          size="small"
                          checked={field.value}
                          onChange={(event) => field.onChange(event.target.checked)}
                          sx={{ p: 0.25, mt: 0.1, mr: 1 }}
                        />
                      }
                      label={
                        <Typography sx={{ fontSize: 12.5, color: '#5A6273', lineHeight: 1.55 }}>
                          I agree to the{' '}
                          <Link component={RouterLink} href={paths.terms} sx={{ color: '#4361EE', fontWeight: 600 }}>
                            Terms &amp; Conditions
                          </Link>{' '}
                          and acknowledge the{' '}
                          <Link
                            component={RouterLink}
                            href={paths.privacyPolicy}
                            sx={{ color: '#4361EE', fontWeight: 600 }}
                          >
                            Privacy Policy
                          </Link>, and consent to the collection and processing of my personal information
                          for this loan application.
                        </Typography>
                      }
                    />
                    {!!error && <FormHelperText error sx={{ mt: 0.75, ml: 3.75 }}>{error.message}</FormHelperText>}
                  </Box>
                )}
              />

              <Box sx={{ pt: 0.5 }}>
                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                  sx={{ ...authPrimaryButtonSx, height: 52 }}
                >
                  {isSubmitting ? 'Checking eligibility...' : 'Continue →'}
                </Button>
              </Box>
            </Stack>
          </Form>
        </Box>
      </Box>
    </Stack>
  );
}
