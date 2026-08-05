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
import { LogoFull } from 'src/components/logo/logo-full';

import { AuthBrandPanel } from './auth-brand-panel';
import { authFieldSx, authFieldLabelSx, authPrimaryButtonSx } from './auth-input-styles';

// ----------------------------------------------------------------------
// Denser field sizing for this form specifically — it packs more fields
// onto one screen than the other auth views sharing auth-input-styles, so
// it overrides height/spacing locally instead of shrinking the shared
// tokens (which would also shrink login/onboarding screens).
// ----------------------------------------------------------------------

const compactFieldSx = {
  ...authFieldSx,
  '& .MuiOutlinedInput-root': {
    ...authFieldSx['& .MuiOutlinedInput-root'],
    height: 40,
    fontSize: 13.5,
  },
  '& .MuiOutlinedInput-input::placeholder': {
    ...authFieldSx['& .MuiOutlinedInput-input::placeholder'],
    fontSize: 12.5,
  },
  '& .MuiInputAdornment-root, & .MuiInputAdornment-root .MuiTypography-root': {
    fontSize: 13.5,
  },
};

// Select's MenuItem list renders in a MUI Popover portal, outside this
// form's DOM subtree, so compactFieldSx (an sx prop on the field itself)
// never reaches it — has to be passed via MenuProps.PaperProps instead.
const compactMenuProps = {
  PaperProps: { sx: { '& .MuiMenuItem-root': { fontSize: 13.5 } } },
};

const compactFieldLabelSx = {
  ...authFieldLabelSx,
  fontSize: 12,
  mb: 0.5,
};

// ----------------------------------------------------------------------
// The new front door of the borrower sign-up flow — screens loan
// eligibility before any account credentials are collected. Replaces the
// old SignUpView (account-first) at the same /auth/sign-up route.
// ----------------------------------------------------------------------

const MINIMUM_LOAN_AMOUNT = 150000;

const PREFIXES = ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Engr.', 'Atty.'];

const LOAN_TERMS = [6, 12, 18, 24, 36];

const INCOME_SOURCES = ['Employed', 'Self-Employed', 'Business Owner', 'OFW'];

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
    hasCollateral: zod.enum(['yes', 'no'], { message: 'Select whether you have collateral.' }),
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
  hasCollateral: '' as unknown as 'yes' | 'no',
  dataConsent: false,
};

// incomeSource is 'Business Owner' (not 'Employed') so "Fill with Sample
// Data" exercises the conditional Business information section end to end —
// businessDocument is seeded as a placeholder string (CompactDropzone
// renders string values same as a real File, see fileName derivation above)
// rather than left null, since a real Business Owner submission always has
// one (superRefine requires it).
const SAMPLE_VALUES: PreliminarySchemaType = {
  prefix: 'Mr.',
  lastName: 'Dela Cruz',
  email: 'juan.delacruz@example.com',
  mobile: '9171234567',
  desiredLoanAmount: 200000,
  loanTermMonths: 12,
  incomeSource: 'Business Owner',
  businessType: 'Sole Proprietorship',
  businessDocument: '/assets/placeholder.svg',
  monthlyIncome: 30000,
  loanPurpose: ['Working Capital'],
  hasCollateral: 'no',
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
        minHeight: 40,
        px: 1.25,
        py: value ? 0.75 : 0,
        borderRadius: '10px',
        cursor: value ? 'default' : 'pointer',
        border: '1.5px dashed',
        borderColor: error ? 'error.main' : '#B0B8CC',
        bgcolor: error ? 'error.lighter' : value ? '#F9FAFC' : '#EEF1FE',
        '&:hover': value ? undefined : { borderColor: error ? 'error.main' : '#1C2A6E', bgcolor: error ? undefined : '#E4E9FD' },
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
            sx={{ color: error ? 'error.main' : '#1C2A6E' }}
          />
          <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: error ? 'error.main' : '#1C2A6E' }}>
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
          <Typography sx={compactFieldLabelSx}>Upload your business document</Typography>

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
      direction="row"
      sx={{ minHeight: '100dvh', bgcolor: '#F7F8FC' }}
    >
      <AuthBrandPanel
        title="The right financing starts with the right fit."
        description="Our eligibility check is quick, secure, and won’t affect your credit score. You’re welcome to review your request and try again."
        icon="solar:hand-heart-bold-duotone"
      />

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          px: { xs: 2, sm: 4, lg: 7 },
          py: { xs: 3, sm: 5 },
          bgcolor: 'common.white',
        }}
      >
        <Box
          sx={{
            display: { xs: 'block', md: 'none' },
            width: 1,
            maxWidth: 560,
            mb: 4,
          }}
        >
          <LogoFull width={132} height={26} />
        </Box>

        <Box
          sx={{
            width: 1,
            maxWidth: 560,
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#FFF5E5',
              mb: 3,
            }}
          >
            <Iconify icon="solar:heart-bold-duotone" width={32} sx={{ color: '#C77700' }} />
          </Box>

          <Typography
            sx={{
              fontSize: { xs: 25, sm: 30 },
              fontWeight: 800,
              lineHeight: 1.2,
              color: '#14172A',
              letterSpacing: '-0.025em',
              mb: 1.5,
            }}
          >
            We appreciate you reaching out
          </Typography>
          <Typography sx={{ fontSize: 15, color: '#667085', lineHeight: 1.7, mb: 3 }}>
            Your requested amount is currently below the minimum we can support. This is not a
            decision about your creditworthiness, and no credit check was performed.
          </Typography>

          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#344054', mb: 1.25 }}>
            What you can do next
          </Typography>
          <Stack spacing={1.15} sx={{ mb: 3.5 }}>
            {[
              'Review your application and update the requested amount.',
              'Come back anytime if your financing needs change.',
            ].map((item) => (
              <Stack key={item} direction="row" alignItems="flex-start" spacing={1.25}>
                <Iconify
                  icon="eva:checkmark-circle-2-fill"
                  width={18}
                  sx={{ color: '#12B76A', flexShrink: 0, mt: '2px' }}
                />
                <Typography sx={{ fontSize: 13.5, color: '#5A6273', lineHeight: 1.55 }}>
                  {item}
                </Typography>
              </Stack>
            ))}
          </Stack>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.25}
            sx={{ '& .MuiButton-root': { height: 50 } }}
          >
            <Button
              fullWidth
              variant="contained"
              onClick={onTryAgain}
              startIcon={<Iconify icon="solar:pen-new-square-bold" width={18} />}
              sx={{ ...authPrimaryButtonSx, flex: 1.35 }}
            >
              Review my application
            </Button>
            <Button
              fullWidth
              variant="outlined"
              href={paths.root}
              sx={{
                flex: 1,
                borderRadius: '11px',
                borderColor: '#D8DCE7',
                color: '#475467',
                fontWeight: 700,
                '&:hover': { borderColor: '#B7BECE', bgcolor: '#F9FAFC' },
              }}
            >
              Back to home
            </Button>
          </Stack>

          <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.75} sx={{ mt: 2.5 }}>
            <Iconify icon="solar:shield-check-bold-duotone" width={16} sx={{ color: '#8891A6' }} />
            <Typography sx={{ fontSize: 12, color: '#8891A6' }}>
              Your information remains private and secure
            </Typography>
          </Stack>
        </Box>
      </Box>
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
      hasCollateral: data.hasCollateral,
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
            <Stack spacing={1.1} sx={{ mt: 2.5 }}>
              <Stack direction="row" spacing={1.25}>
                <Box sx={{ width: 120 }}>
                  <Typography sx={compactFieldLabelSx}>Prefix</Typography>
                  <Field.Select
                    name="prefix"
                    sx={compactFieldSx}
                    SelectProps={{
                      displayEmpty: true,
                      MenuProps: compactMenuProps,
                      renderValue: (value) =>
                        value ? (
                          String(value)
                        ) : (
                          <Typography component="span" sx={{ fontSize: 12.5, color: 'text.disabled' }}>
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
                  <Typography sx={compactFieldLabelSx}>Surname</Typography>
                  <Field.Text name="lastName" placeholder="Dela Cruz" sx={compactFieldSx} />
                </Box>
              </Stack>

              <Stack direction="row" spacing={1.25}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={compactFieldLabelSx}>Email address</Typography>
                  <Field.Text name="email" placeholder="juan@email.com" sx={compactFieldSx} />
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={compactFieldLabelSx}>Mobile number</Typography>
                  <Field.Text
                    name="mobile"
                    placeholder="912 345 6789"
                    sx={compactFieldSx}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">+63</InputAdornment>,
                    }}
                  />
                </Box>
              </Stack>

              <Box>
                <Typography sx={compactFieldLabelSx}>Purpose of loan</Typography>
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
                        sx={compactFieldSx}
                        error={!!error}
                        MenuProps={compactMenuProps}
                        renderValue={(selected) => {
                          const values = selected as string[];
                          if (values.length === 0) {
                            return (
                              <Typography component="span" sx={{ fontSize: 12.5, color: 'text.disabled' }}>
                                Select one or more
                              </Typography>
                            );
                          }
                          return (
                            <Typography noWrap component="span" sx={{ fontSize: 13.5, display: 'block' }}>
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
                  <Typography sx={compactFieldLabelSx}>Desired loan amount</Typography>
                  <Controller
                    name="desiredLoanAmount"
                    control={control}
                    render={({ field, fieldState: { error } }) => (
                      <Field.Text
                        name="desiredLoanAmount"
                        placeholder="200,000"
                        sx={compactFieldSx}
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
                  <Typography sx={compactFieldLabelSx}>Preferred loan term</Typography>
                  <Field.Select
                    name="loanTermMonths"
                    sx={compactFieldSx}
                    SelectProps={{ MenuProps: compactMenuProps }}
                  >
                    {LOAN_TERMS.map((term) => (
                      <MenuItem key={term} value={term}>
                        {term} months
                      </MenuItem>
                    ))}
                  </Field.Select>
                </Box>
              </Stack>

              <Box>
                <Typography sx={compactFieldLabelSx}>Do you have collateral?</Typography>
                <Field.Select
                  name="hasCollateral"
                  sx={compactFieldSx}
                  SelectProps={{
                    displayEmpty: true,
                    MenuProps: compactMenuProps,
                    renderValue: (value) =>
                      value ? (
                        value === 'yes' ? 'Yes' : 'No'
                      ) : (
                        <Typography component="span" sx={{ fontSize: 12.5, color: 'text.disabled' }}>
                          Select an option
                        </Typography>
                      ),
                  }}
                >
                  <MenuItem value="" disabled>
                    Select an option
                  </MenuItem>
                  <MenuItem value="yes">Yes</MenuItem>
                  <MenuItem value="no">No</MenuItem>
                </Field.Select>
              </Box>

              <Stack direction="row" spacing={1.25}>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={compactFieldLabelSx}>Source of income</Typography>
                  <Field.Select
                    name="incomeSource"
                    sx={compactFieldSx}
                    SelectProps={{
                      displayEmpty: true,
                      MenuProps: compactMenuProps,
                      renderValue: (value) =>
                        value ? (
                          String(value)
                        ) : (
                          <Typography component="span" sx={{ fontSize: 12.5, color: 'text.disabled' }}>
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
                  <Typography sx={compactFieldLabelSx}>Gross Monthly Income</Typography>
                  <Field.Text
                    name="monthlyIncome"
                    type="number"
                    placeholder="35,000"
                    sx={compactFieldSx}
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
                  <Stack spacing={1.1}>
                    <Box>
                      <Typography sx={compactFieldLabelSx}>Business type</Typography>
                      <Field.Select
                        name="businessType"
                        sx={compactFieldSx}
                        SelectProps={{ MenuProps: compactMenuProps }}
                      >
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

              <Box sx={{ pt: 0.25 }}>
                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                  sx={{ ...authPrimaryButtonSx, height: 46 }}
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
