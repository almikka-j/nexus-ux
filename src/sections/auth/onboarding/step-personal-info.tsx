'use client';

import { z as zod } from 'zod';
import { useRef, useState, useEffect, useContext, createContext } from 'react';
import { useDropzone } from 'react-dropzone';
import { useForm, useWatch, Controller, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import FormHelperText from '@mui/material/FormHelperText';
import FormControlLabel from '@mui/material/FormControlLabel';

import { Form, Field } from 'src/components/hook-form';
import { Iconify } from 'src/components/iconify';

import { fileToDataUrl } from 'src/utils/file-to-data-url';

import { authFieldSx, authFieldLabelSx, authPrimaryButtonSx } from '../auth-input-styles';

import type { PersonalInfo } from 'src/auth/registration-context';

// ----------------------------------------------------------------------
// Upload ID: pick an ID type first — the upload dropzone(s) only appear
// once a type is selected (front-only vs. front+back depends on the
// type). Uploading then auto-fills the rest of the borrower's details
// instantly (no OCR delay/reveal — purely a UX convenience, not a real
// extraction); every other field on this screen stays visible throughout,
// only the upload box itself is gated behind the ID Type choice.
// First/Middle/Extension Name are collected here since Preliminary
// Application only collects Surname; Surname itself isn't shown/
// re-editable on this screen.
// ----------------------------------------------------------------------

const ID_TYPES = ['PhilSys / National ID', 'Philippine Passport', "Driver's License", 'UMID', 'SSS ID', 'PhilHealth ID'];

// Physical card IDs carry different information on each side and require
// both; PhilSys/National ID's back is blank/QR-only and Passport is a
// booklet page, so those two stay single-upload.
const ID_TYPES_REQUIRING_BACK = new Set(["Driver's License", 'UMID', 'SSS ID', 'PhilHealth ID']);

const PROVINCES = ['Metro Manila', 'Cebu', 'Davao del Sur', 'Laguna', 'Cavite'];

const CIVIL_STATUSES = ['Single', 'Married', 'Widowed', 'Separated', 'Divorced'];

const GENDERS = ['Male', 'Female'];

const REFERRAL_SOURCES = [
  'Social Media',
  'Search Engine',
  'Referral from a Friend',
  'Advertisement',
  'Existing Customer',
  'Other',
];

// Placeholder-style values auto-filled the instant an ID is uploaded —
// there's no real OCR/AI service anywhere in this codebase, so this is
// honest filler rather than anything actually read from the image.
const AUTOFILL_VALUES = {
  idNumber: '0000 0000 0000',
  firstName: 'Juan',
  middleName: 'Santos',
  birthday: '1994-06-12',
  address: '123 Mabini St.',
  province: 'Metro Manila',
  city: 'Quezon City',
  barangay: 'Barangay Commonwealth',
  zipCode: '1121',
};

// Civil status/gender/TIN/referral defaults for the ID-read simulation —
// kept separate from SAMPLE_PERSONAL_INFO (which is Married, for the "Fill
// with Sample Data" dev button to exercise the spouse-info section) since a
// borrower reading their own ID for the first time should default to Single,
// not be auto-flagged as married with a fabricated spouse.
const ID_READ_ADDITIONAL_INFO = {
  gender: 'Male',
  civilStatus: 'Single',
  tinNumber: '123-456-789-000',
  referralSource: 'Referral from a Friend',
};

export type PersonalInfoSchemaType = zod.infer<typeof PersonalInfoSchema>;

export const PersonalInfoSchema = zod
  .object({
    idType: zod.string().min(1, { message: 'Select an ID type.' }),
    idNumber: zod.string().min(1, { message: 'ID number is required.' }),
    idFile: zod.any().nullable(),
    idFileBack: zod.any().nullable(),
    firstName: zod.string().min(1, { message: 'First name is required.' }),
    middleName: zod.string().optional(),
    lastName: zod.string().min(1, { message: 'Last name is required.' }),
    extensionName: zod.string().optional(),
    birthday: zod.string().min(1, { message: 'Birthday is required.' }),
    address: zod.string().min(1, { message: 'Address is required.' }),
    province: zod.string().min(1, { message: 'Select a province.' }),
    city: zod.string().min(1, { message: 'City is required.' }),
    barangay: zod.string().min(1, { message: 'Barangay is required.' }),
    zipCode: zod.string().min(1, { message: 'Zip code is required.' }),
    civilStatus: zod.string().min(1, { message: 'Select your civil status.' }),
    gender: zod.string().min(1, { message: 'Select your gender.' }),
    tinNumber: zod.string().optional(),
    referralSource: zod.string().min(1, { message: 'Select how you discovered PG Finance.' }),
    spouseFirstName: zod.string().optional(),
    spouseMiddleName: zod.string().optional(),
    spouseLastName: zod.string().optional(),
    spouseExtensionName: zod.string().optional(),
    spouseBirthday: zod.string().optional(),
    spouseAddress: zod.string().optional(),
    spouseProvince: zod.string().optional(),
    spouseCity: zod.string().optional(),
    spouseBarangay: zod.string().optional(),
    spouseZipCode: zod.string().optional(),
    sameAddressAsSpouse: zod.boolean(),
  })
  .superRefine((data, ctx) => {
    if (!data.idFile) {
      ctx.addIssue({
        code: zod.ZodIssueCode.custom,
        path: ['idFile'],
        message: 'Upload a valid ID.',
      });
    }
    if (ID_TYPES_REQUIRING_BACK.has(data.idType) && !data.idFileBack) {
      ctx.addIssue({
        code: zod.ZodIssueCode.custom,
        path: ['idFileBack'],
        message: 'Upload the back of your ID.',
      });
    }
    if (data.civilStatus === 'Married') {
      if (!data.spouseFirstName) {
        ctx.addIssue({
          code: zod.ZodIssueCode.custom,
          path: ['spouseFirstName'],
          message: "Spouse's first name is required.",
        });
      }
      if (!data.spouseLastName) {
        ctx.addIssue({
          code: zod.ZodIssueCode.custom,
          path: ['spouseLastName'],
          message: "Spouse's last name is required.",
        });
      }
      if (!data.spouseBirthday) {
        ctx.addIssue({
          code: zod.ZodIssueCode.custom,
          path: ['spouseBirthday'],
          message: "Spouse's birthday is required.",
        });
      }
      if (!data.sameAddressAsSpouse) {
        if (!data.spouseAddress) {
          ctx.addIssue({
            code: zod.ZodIssueCode.custom,
            path: ['spouseAddress'],
            message: "Spouse's address is required.",
          });
        }
        if (!data.spouseProvince) {
          ctx.addIssue({
            code: zod.ZodIssueCode.custom,
            path: ['spouseProvince'],
            message: "Spouse's province is required.",
          });
        }
        if (!data.spouseCity) {
          ctx.addIssue({
            code: zod.ZodIssueCode.custom,
            path: ['spouseCity'],
            message: "Spouse's city is required.",
          });
        }
        if (!data.spouseBarangay) {
          ctx.addIssue({
            code: zod.ZodIssueCode.custom,
            path: ['spouseBarangay'],
            message: "Spouse's barangay is required.",
          });
        }
        if (!data.spouseZipCode) {
          ctx.addIssue({
            code: zod.ZodIssueCode.custom,
            path: ['spouseZipCode'],
            message: "Spouse's zip code is required.",
          });
        }
      }
    }
  });

const SAMPLE_PERSONAL_INFO: PersonalInfoSchemaType = {
  idType: 'PhilSys / National ID',
  idNumber: 'P1234567A',
  idFile: null,
  idFileBack: null,
  firstName: 'Juan',
  middleName: 'Santos',
  lastName: 'Dela Cruz',
  extensionName: '',
  birthday: '1994-06-12',
  address: '123 Rizal Street',
  province: 'Metro Manila',
  city: 'Quezon City',
  barangay: 'Barangay Commonwealth',
  zipCode: '1121',
  civilStatus: 'Married',
  gender: 'Male',
  tinNumber: '123-456-789-000',
  referralSource: 'Referral from a Friend',
  spouseFirstName: 'Maria',
  spouseMiddleName: 'Reyes',
  spouseLastName: 'Dela Cruz',
  spouseExtensionName: '',
  spouseBirthday: '1992-03-14',
  spouseAddress: '',
  spouseProvince: '',
  spouseCity: '',
  spouseBarangay: '',
  spouseZipCode: '',
  sameAddressAsSpouse: true,
};

// ----------------------------------------------------------------------

const ID_UPLOAD_HEIGHT = 140;
const ID_PROCESSING_DELAY = 1800;

type DetailsState = 'idle' | 'processing' | 'ready';

type IdUploadSlotProps = {
  value: File | string | null;
  onChange: (file: File | null) => void;
  error?: boolean;
  label: string;
};

// Fixed-height, equal-size dropzone for Front/Back ID photo uploads. The
// shared `Field.Upload`/`Upload` component pads to `28% 0` once a file is
// selected (see `src/components/upload/upload.tsx`), so the Front slot
// (with a file) and Back slot (without one) end up different heights and
// both look oversized — this uses `useDropzone` + a plain `<img>` preview
// directly instead, at a fixed height regardless of upload state.
function IdUploadSlot({ value, onChange, error, label }: IdUploadSlotProps) {
  const { getRootProps, getInputProps } = useDropzone({
    multiple: false,
    accept: { 'image/*': [] },
    onDrop: (acceptedFiles) => onChange(acceptedFiles[0] ?? null),
  });

  const previewUrl = value ? (typeof value === 'string' ? value : URL.createObjectURL(value)) : null;

  return (
    <Box
      {...(value ? {} : getRootProps())}
      sx={{
        position: 'relative',
        height: ID_UPLOAD_HEIGHT,
        borderRadius: '11px',
        overflow: 'hidden',
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
          <Box component="img" src={previewUrl ?? undefined} alt={label} sx={{ width: 1, height: 1, objectFit: 'cover' }} />
          <IconButton
            size="small"
            onClick={() => onChange(null)}
            sx={{
              position: 'absolute',
              top: 6,
              right: 6,
              color: 'common.white',
              bgcolor: 'rgba(20,23,42,0.55)',
              '&:hover': { bgcolor: 'rgba(20,23,42,0.72)' },
            }}
          >
            <Iconify icon="mingcute:close-line" width={16} />
          </IconButton>
        </>
      ) : (
        <Stack alignItems="center" justifyContent="center" spacing={0.5} sx={{ width: 1, height: 1, px: 1.5 }}>
          <Iconify icon="solar:upload-minimalistic-bold-duotone" width={22} sx={{ color: '#8891A6' }} />
          <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#344054' }}>{label}</Typography>
          <Typography sx={{ fontSize: 11, color: '#8891A6' }}>PNG or JPG, up to 10MB</Typography>
        </Stack>
      )}
    </Box>
  );
}

// Matches the admin CIC form's "Auto-filled" chip (see
// src/sections/admin/bureau-reports-card.tsx) for a consistent auto-fill
// indicator across borrower and admin portals.
function AutofilledChip() {
  return (
    <Chip
      label="Auto-filled"
      size="small"
      sx={{
        height: 18,
        fontSize: 10,
        fontWeight: 700,
        bgcolor: '#E7F8F0',
        color: '#0C8A4F',
        '& .MuiChip-label': { px: 0.75 },
      }}
    />
  );
}

// Tracks which fields were *actually* set by the ID-read simulation this
// session — not just which fields are name-eligible for autofill. A resumed
// application (idFile/idNumber already saved from an earlier visit) can have
// some of those fields still genuinely blank (e.g. TIN/referral source were
// never filled in that prior visit); fillMissingFields() only fills gaps, so
// the chip must reflect what was actually written, or a blank field would
// wrongly show "Auto-filled".
const AutofilledFieldsContext = createContext<Set<keyof PersonalInfoSchemaType>>(new Set());

type FieldLabelProps = {
  children: React.ReactNode;
  name?: keyof PersonalInfoSchemaType;
  autofilled?: boolean;
};

// Wraps the field-label `Typography` used across this form, optionally
// showing an "Auto-filled" chip when this field was populated by the ID-read
// simulation — either pass `name` (checked against the current autofilled-
// fields set) or `autofilled` directly for fields not tracked there (e.g.
// spouse address fields copied from the borrower's own address).
function FieldLabel({ children, name, autofilled }: FieldLabelProps) {
  const autofilledFields = useContext(AutofilledFieldsContext);
  const showChip = autofilled ?? (name ? autofilledFields.has(name) : false);

  return (
    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.75 }}>
      <Typography sx={{ ...authFieldLabelSx, mb: 0 }}>{children}</Typography>
      {showChip && <AutofilledChip />}
    </Stack>
  );
}

type IdUploadFieldProps = {
  name: 'idFile' | 'idFileBack';
  label: string;
};

function IdUploadField({ name, label }: IdUploadFieldProps) {
  const { control, setValue } = useFormContext<PersonalInfoSchemaType>();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <Box>
          <Typography sx={authFieldLabelSx}>{label}</Typography>
          <IdUploadSlot
            value={field.value as File | string | null}
            // setValue(..., { shouldValidate: true }) instead of the bare
            // Controller field.onChange — a dropzone drop doesn't fire a
            // native input change event, so without an explicit revalidation
            // a stale "Upload a valid ID."/"Upload the back of your ID."
            // error (e.g. left over from switching ID type, which clears
            // idFile/idFileBack with shouldValidate: true) never clears once
            // a new file is actually uploaded.
            onChange={(file) => setValue(name, file, { shouldValidate: true })}
            error={!!error}
            label={label}
          />
          {!!error && <FormHelperText error>{error.message}</FormHelperText>}
        </Box>
      )}
    />
  );
}

export type PersonalInfoNameFields = {
  firstName: string;
  middleName?: string;
  lastName: string;
  extensionName?: string;
};

type StepPersonalInfoProps = {
  defaultValues: Partial<PersonalInfo>;
  nameDefaultValues?: Partial<PersonalInfoNameFields>;
  onSubmitApplication: (data: PersonalInfo, nameFields: PersonalInfoNameFields) => void;
};

export function StepPersonalInfo({ defaultValues, nameDefaultValues, onSubmitApplication }: StepPersonalInfoProps) {
  const initialValues: PersonalInfoSchemaType = {
    idType: defaultValues.idType || '',
    idNumber: defaultValues.idNumber || '',
    idFile: defaultValues.idFile || null,
    idFileBack: defaultValues.idFileBack || null,
    firstName: nameDefaultValues?.firstName || '',
    middleName: nameDefaultValues?.middleName || '',
    lastName: nameDefaultValues?.lastName || '',
    extensionName: nameDefaultValues?.extensionName || '',
    birthday: defaultValues.birthday || '',
    address: defaultValues.address || '',
    province: defaultValues.province || '',
    city: defaultValues.city || '',
    barangay: defaultValues.barangay || '',
    zipCode: defaultValues.zipCode || '',
    civilStatus: defaultValues.civilStatus || '',
    gender: defaultValues.gender || '',
    tinNumber: defaultValues.tinNumber || '',
    referralSource: defaultValues.referralSource || '',
    spouseFirstName: defaultValues.spouseFirstName || '',
    spouseMiddleName: defaultValues.spouseMiddleName || '',
    spouseLastName: defaultValues.spouseLastName || '',
    spouseExtensionName: defaultValues.spouseExtensionName || '',
    spouseBirthday: defaultValues.spouseBirthday || '',
    spouseAddress: defaultValues.spouseAddress || '',
    spouseProvince: defaultValues.spouseProvince || '',
    spouseCity: defaultValues.spouseCity || '',
    spouseBarangay: defaultValues.spouseBarangay || '',
    spouseZipCode: defaultValues.spouseZipCode || '',
    sameAddressAsSpouse: !defaultValues.spouseAddress,
  };

  const methods = useForm<PersonalInfoSchemaType>({
    resolver: zodResolver(PersonalInfoSchema),
    defaultValues: initialValues,
  });

  const { handleSubmit, reset, control, setValue } = methods;
  const hasSavedDetails = !!defaultValues.idFile && !!defaultValues.idNumber;
  const [detailsState, setDetailsState] = useState<DetailsState>(
    hasSavedDetails ? 'ready' : 'idle'
  );
  const [isSample, setIsSample] = useState(false);
  const [autofilledFields, setAutofilledFields] = useState<Set<keyof PersonalInfoSchemaType>>(
    new Set()
  );
  const restoredDetailsRef = useRef(hasSavedDetails);

  const civilStatus = useWatch({ control, name: 'civilStatus' });
  const sameAddressAsSpouse = useWatch({ control, name: 'sameAddressAsSpouse' });
  const idType = useWatch({ control, name: 'idType' });
  const idFile = useWatch({ control, name: 'idFile' });
  const idFileBack = useWatch({ control, name: 'idFileBack' });
  const isMarried = civilStatus === 'Married';
  const requiresIdBack = ID_TYPES_REQUIRING_BACK.has(idType);
  const previousIdTypeRef = useRef(idType);

  // A different ID type must be uploaded and read again; do not carry an
  // image from the previously selected document type into the new choice.
  // Not shouldValidate here — the borrower just switched types and hasn't
  // had a chance to upload yet, so forcing validation would show a red
  // "required" error on an empty slot that isn't actually an error yet.
  // (IdUploadField's own setValue on actual upload still validates, so a
  // genuinely-submitted-then-cleared error still clears correctly.)
  useEffect(() => {
    if (previousIdTypeRef.current && previousIdTypeRef.current !== idType) {
      setValue('idFile', null);
      setValue('idFileBack', null);
      setDetailsState('idle');
    }

    previousIdTypeRef.current = idType;
  }, [idType, setValue]);

  // Frontend-only ID reading simulation. Once every required side has been
  // uploaded, briefly show a processing state, then populate the details
  // using the existing sample record as if they were extracted from the ID.
  useEffect(() => {
    const hasRequiredUploads = !!idFile && (!requiresIdBack || !!idFileBack);

    if (!hasRequiredUploads) {
      restoredDetailsRef.current = false;
      setDetailsState('idle');
      return undefined;
    }

    // Fills every autofill-eligible field that is still empty — used both
    // for the full "just read the ID" pass below and for a resumed session
    // (restoredDetailsRef.current), where earlier saved data may already
    // cover some fields (address, civil status, etc. from a previous visit
    // to this step) but leave others genuinely blank (e.g. TIN/referral
    // source were never filled in that prior visit). Only touching empty
    // fields means real saved answers are never overwritten with sample data.
    const fillMissingFields = () => {
      const current = methods.getValues();
      const filled = new Set<keyof PersonalInfoSchemaType>();
      const fillIfEmpty = (field: keyof PersonalInfoSchemaType, value: string) => {
        if (!current[field]) {
          setValue(field, value, { shouldValidate: true });
          filled.add(field);
        }
      };

      (Object.keys(AUTOFILL_VALUES) as Array<keyof typeof AUTOFILL_VALUES>).forEach((field) => {
        fillIfEmpty(field, AUTOFILL_VALUES[field]);
      });
      fillIfEmpty('gender', ID_READ_ADDITIONAL_INFO.gender);
      fillIfEmpty('civilStatus', ID_READ_ADDITIONAL_INFO.civilStatus);
      fillIfEmpty('tinNumber', ID_READ_ADDITIONAL_INFO.tinNumber);
      fillIfEmpty('referralSource', ID_READ_ADDITIONAL_INFO.referralSource);
      if ((current.civilStatus || ID_READ_ADDITIONAL_INFO.civilStatus) === 'Married') {
        fillIfEmpty('spouseFirstName', SAMPLE_PERSONAL_INFO.spouseFirstName || '');
        fillIfEmpty('spouseMiddleName', SAMPLE_PERSONAL_INFO.spouseMiddleName || '');
        fillIfEmpty('spouseLastName', SAMPLE_PERSONAL_INFO.spouseLastName || '');
        fillIfEmpty('spouseBirthday', SAMPLE_PERSONAL_INFO.spouseBirthday || '');
      }

      setAutofilledFields((prev) => {
        const next = new Set(prev);
        filled.forEach((field) => next.add(field));
        return next;
      });
    };

    if (restoredDetailsRef.current) {
      fillMissingFields();
      setDetailsState('ready');
      return undefined;
    }

    setDetailsState('processing');
    const timer = setTimeout(() => {
      fillMissingFields();
      setValue('sameAddressAsSpouse', SAMPLE_PERSONAL_INFO.sameAddressAsSpouse, {
        shouldValidate: true,
      });
      setDetailsState('ready');
    }, ID_PROCESSING_DELAY);

    return () => clearTimeout(timer);
  }, [idFile, idFileBack, requiresIdBack, setValue, methods]);

  const onSubmit = handleSubmit(async (data) => {
    // Persist the uploaded ID as a data URL — a raw File object can't
    // survive JSON.stringify into localStorage (it serializes to `{}`),
    // so the admin side would otherwise have no way to see the image.
    const idFile =
      data.idFile instanceof File ? await fileToDataUrl(data.idFile) : (data.idFile ?? null);
    const idFileBack =
      data.idFileBack instanceof File ? await fileToDataUrl(data.idFileBack) : (data.idFileBack ?? null);

    const spouseAddress = isMarried
      ? data.sameAddressAsSpouse
        ? data.address
        : data.spouseAddress
      : undefined;
    const spouseProvince = isMarried
      ? data.sameAddressAsSpouse
        ? data.province
        : data.spouseProvince
      : undefined;
    const spouseCity = isMarried
      ? data.sameAddressAsSpouse
        ? data.city
        : data.spouseCity
      : undefined;
    const spouseBarangay = isMarried
      ? data.sameAddressAsSpouse
        ? data.barangay
        : data.spouseBarangay
      : undefined;
    const spouseZipCode = isMarried
      ? data.sameAddressAsSpouse
        ? data.zipCode
        : data.spouseZipCode
      : undefined;

    const {
      sameAddressAsSpouse: _unused,
      firstName,
      middleName,
      lastName,
      extensionName,
      ...personalInfo
    } = data;

    onSubmitApplication(
      {
        ...personalInfo,
        idFile,
        idFileBack: requiresIdBack ? idFileBack : null,
        spouseFirstName: isMarried ? data.spouseFirstName : undefined,
        spouseMiddleName: isMarried ? data.spouseMiddleName : undefined,
        spouseLastName: isMarried ? data.spouseLastName : undefined,
        spouseExtensionName: isMarried ? data.spouseExtensionName : undefined,
        spouseBirthday: isMarried ? data.spouseBirthday : undefined,
        spouseAddress,
        spouseProvince,
        spouseCity,
        spouseBarangay,
        spouseZipCode,
      } as PersonalInfo,
      { firstName, middleName, lastName, extensionName }
    );
  });

  return (
    <Box
      sx={{
        width: 1,
        maxWidth: 720,
        bgcolor: 'common.white',
        borderRadius: '18px',
        boxShadow: '0 22px 60px -30px rgba(20,23,42,0.28)',
        p: { xs: 3, md: 5 },
      }}
    >
      <Stack alignItems="center" textAlign="center" spacing={0.75} sx={{ mb: 3.5 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8891A6' }}>
          Step 1 · Upload ID
        </Typography>
        <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' }}>
          Upload a valid ID
        </Typography>
        <Typography sx={{ fontSize: 14, color: '#667085', lineHeight: 1.6 }}>
          Select your ID type and upload a clear photo — we&apos;ll help fill out the rest.
        </Typography>

        <Button
          onClick={() => {
            if (isSample) {
              reset(initialValues);
              setDetailsState('idle');
            } else {
              restoredDetailsRef.current = false;
              previousIdTypeRef.current = SAMPLE_PERSONAL_INFO.idType;
              reset({
                ...SAMPLE_PERSONAL_INFO,
                idFile: '/assets/placeholder.svg',
              });
            }
            setIsSample((current) => !current);
          }}
          size="small"
          sx={{ color: 'text.disabled' }}
        >
          {isSample ? 'Remove Sample Data' : 'Fill with Sample Data'}
        </Button>

      </Stack>

      <Form methods={methods} onSubmit={onSubmit}>
        <AutofilledFieldsContext.Provider value={autofilledFields}>
        <Stack spacing={2}>
          <Box>
            <Typography sx={authFieldLabelSx}>ID type</Typography>
            <Field.Select
              name="idType"
              sx={authFieldSx}
              SelectProps={{
                displayEmpty: true,
                renderValue: (value) =>
                  value ? (
                    String(value)
                  ) : (
                    <Typography component="span" sx={{ fontSize: 14, color: 'text.disabled' }}>
                      Select ID type
                    </Typography>
                  ),
              }}
            >
              <MenuItem value="" disabled>
                Select ID type
              </MenuItem>
              {ID_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Field.Select>
          </Box>

          {!idType && (
            <Box
              sx={{
                height: ID_UPLOAD_HEIGHT,
                borderRadius: '11px',
                border: '1px dashed #D6DAE3',
                bgcolor: '#F9FAFC',
              }}
            >
              <Stack alignItems="center" justifyContent="center" spacing={0.5} sx={{ width: 1, height: 1, px: 1.5 }}>
                <Iconify icon="solar:upload-minimalistic-bold-duotone" width={22} sx={{ color: '#8891A6' }} />
                <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#344054' }}>
                  Your ID upload will appear here
                </Typography>
                <Typography sx={{ fontSize: 11, color: '#8891A6' }}>
                  Select an ID type above to continue
                </Typography>
              </Stack>
            </Box>
          )}

          {!!idType && (
            <>
              {requiresIdBack ? (
              <Stack direction="row" spacing={1.75}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <IdUploadField name="idFile" label="Upload ID — Front" />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <IdUploadField name="idFileBack" label="Upload ID — Back" />
                </Box>
              </Stack>
            ) : (
              <IdUploadField name="idFile" label="Upload a valid ID" />
              )}

              {detailsState === 'processing' && (
                <Stack
                  direction="row"
                  spacing={1.25}
                  alignItems="center"
                  justifyContent="center"
                  sx={{ p: 2.25, borderRadius: '11px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}
                >
                  <CircularProgress size={20} sx={{ color: '#1C2A6E' }} />
                  <Box>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#344054' }}>
                      Reading your ID…
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: '#8891A6' }}>
                      We&apos;re securely extracting your information.
                    </Typography>
                  </Box>
                </Stack>
              )}

              {detailsState === 'ready' && (
                <>
          <Stack
            direction="row"
            spacing={1.25}
            alignItems="flex-start"
            sx={{ p: 1.75, borderRadius: '11px', bgcolor: '#FFF8E6', border: '1px solid #F5E3AA' }}
          >
            <Iconify icon="solar:danger-triangle-bold" width={18} sx={{ color: '#B7791F', mt: 0.25 }} />
            <Typography sx={{ fontSize: 12.5, color: '#7A5A0B', lineHeight: 1.5 }}>
              Fields marked <b>Auto-filled</b> were populated from your ID. Please double-check
              the information below before continuing.
            </Typography>
          </Stack>

          <Box>
            <FieldLabel name="idNumber">ID number</FieldLabel>
            <Field.Text name="idNumber" placeholder="0000 0000 0000" sx={authFieldSx} />
          </Box>

          <Stack direction="row" spacing={1.75}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <FieldLabel name="firstName" autofilled={detailsState === 'ready'}>
                First name
              </FieldLabel>
              <Field.Text name="firstName" placeholder="Juan" sx={authFieldSx} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <FieldLabel name="middleName" autofilled={detailsState === 'ready'}>
                Middle name
              </FieldLabel>
              <Field.Text name="middleName" placeholder="Santos" sx={authFieldSx} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <FieldLabel name="lastName" autofilled={detailsState === 'ready'}>
                Last name
              </FieldLabel>
              <Field.Text name="lastName" placeholder="Dela Cruz" sx={authFieldSx} />
            </Box>
            <Box sx={{ width: 140, flexShrink: 0 }}>
              <FieldLabel name="extensionName" autofilled={detailsState === 'ready'}>
                Extension
              </FieldLabel>
              <Field.Text name="extensionName" placeholder="Jr." sx={authFieldSx} />
            </Box>
          </Stack>

          <Stack direction="row" spacing={1.75}>
            <Box sx={{ flex: 1 }}>
              <FieldLabel name="birthday">Birthday</FieldLabel>
              <Field.Text name="birthday" type="date" sx={authFieldSx} InputLabelProps={{ shrink: true }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <FieldLabel name="gender">Gender</FieldLabel>
              <Field.Select name="gender" sx={authFieldSx}>
                {GENDERS.map((gender) => (
                  <MenuItem key={gender} value={gender}>
                    {gender}
                  </MenuItem>
                ))}
              </Field.Select>
            </Box>
          </Stack>

          <Box>
            <FieldLabel name="address">Address (House / Unit No., Street)</FieldLabel>
            <Field.Text name="address" placeholder="123 Mabini St." sx={authFieldSx} />
          </Box>

          <Stack direction="row" spacing={1.75}>
            <Box sx={{ flex: 1 }}>
              <FieldLabel name="province">Province</FieldLabel>
              <Field.Select name="province" sx={authFieldSx}>
                {PROVINCES.map((province) => (
                  <MenuItem key={province} value={province}>
                    {province}
                  </MenuItem>
                ))}
              </Field.Select>
            </Box>
            <Box sx={{ flex: 1 }}>
              <FieldLabel name="city">City</FieldLabel>
              <Field.Text name="city" sx={authFieldSx} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <FieldLabel name="barangay">Barangay</FieldLabel>
              <Field.Text name="barangay" sx={authFieldSx} />
            </Box>
            <Box sx={{ width: 140, flexShrink: 0 }}>
              <FieldLabel name="zipCode">Zip code</FieldLabel>
              <Field.Text name="zipCode" placeholder="1121" sx={authFieldSx} />
            </Box>
          </Stack>

          <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8891A6', pt: 1 }}>
            Additional information
          </Typography>

          <Box>
            <Typography sx={authFieldLabelSx}>Civil status</Typography>
            <Field.Select name="civilStatus" sx={authFieldSx}>
              {CIVIL_STATUSES.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </Field.Select>
          </Box>

          {isMarried && (
            <Box sx={{ p: 2, borderRadius: '11px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#14172A', mb: 1.5 }}>
                Spouse information
              </Typography>
              <Stack spacing={1.75}>
                <Stack direction="row" spacing={1.75}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={authFieldLabelSx}>Spouse&apos;s first name</Typography>
                    <Field.Text name="spouseFirstName" placeholder="Maria" sx={authFieldSx} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={authFieldLabelSx}>Spouse&apos;s middle name</Typography>
                    <Field.Text name="spouseMiddleName" placeholder="Reyes" sx={authFieldSx} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={authFieldLabelSx}>Spouse&apos;s last name</Typography>
                    <Field.Text name="spouseLastName" placeholder="Dela Cruz" sx={authFieldSx} />
                  </Box>
                  <Box sx={{ width: 110, flexShrink: 0 }}>
                    <Typography sx={authFieldLabelSx}>Extension</Typography>
                    <Field.Text name="spouseExtensionName" placeholder="Jr." sx={authFieldSx} />
                  </Box>
                </Stack>

                <Box>
                  <Typography sx={authFieldLabelSx}>Spouse&apos;s birthday</Typography>
                  <Field.Text name="spouseBirthday" type="date" sx={authFieldSx} InputLabelProps={{ shrink: true }} />
                </Box>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={sameAddressAsSpouse}
                      onChange={(event) => setValue('sameAddressAsSpouse', event.target.checked)}
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: 13, color: '#5A6273' }}>
                      Same address as spouse
                    </Typography>
                  }
                />

                {!sameAddressAsSpouse && (
                  <Stack spacing={1.75}>
                    <Box>
                      <Typography sx={authFieldLabelSx}>Address (House / Unit No., Street)</Typography>
                      <Field.Text name="spouseAddress" placeholder="123 Mabini St." sx={authFieldSx} />
                    </Box>
                    <Stack direction="row" spacing={1.75}>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={authFieldLabelSx}>Province</Typography>
                        <Field.Select name="spouseProvince" sx={authFieldSx}>
                          {PROVINCES.map((province) => (
                            <MenuItem key={province} value={province}>
                              {province}
                            </MenuItem>
                          ))}
                        </Field.Select>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={authFieldLabelSx}>City</Typography>
                        <Field.Text name="spouseCity" sx={authFieldSx} />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={authFieldLabelSx}>Barangay</Typography>
                        <Field.Text name="spouseBarangay" sx={authFieldSx} />
                      </Box>
                      <Box sx={{ width: 120 }}>
                        <Typography sx={authFieldLabelSx}>Zip code</Typography>
                        <Field.Text name="spouseZipCode" placeholder="1121" sx={authFieldSx} />
                      </Box>
                    </Stack>
                  </Stack>
                )}
              </Stack>
            </Box>
          )}

          <Box>
            <Typography sx={authFieldLabelSx}>TIN number</Typography>
            <Field.Text name="tinNumber" placeholder="000-000-000-000" sx={authFieldSx} />
          </Box>

          <Box>
            <Typography sx={authFieldLabelSx}>How did you discover PG Finance?</Typography>
            <Field.Select name="referralSource" sx={authFieldSx}>
              {REFERRAL_SOURCES.map((source) => (
                <MenuItem key={source} value={source}>
                  {source}
                </MenuItem>
              ))}
            </Field.Select>
          </Box>

              <Button fullWidth type="submit" variant="contained" sx={authPrimaryButtonSx}>
                Continue →
              </Button>
                </>
              )}
            </>
          )}
        </Stack>
        </AutofilledFieldsContext.Provider>
      </Form>
    </Box>
  );
}
