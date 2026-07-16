'use client';

import { z as zod } from 'zod';
import { useRef, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useForm, useWatch, Controller, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
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

export type PersonalInfoSchemaType = zod.infer<typeof PersonalInfoSchema>;

export const PersonalInfoSchema = zod
  .object({
    idType: zod.string().min(1, { message: 'Select an ID type.' }),
    idNumber: zod.string().min(1, { message: 'ID number is required.' }),
    idFile: zod.any().nullable(),
    idFileBack: zod.any().nullable(),
    firstName: zod.string().min(1, { message: 'First name is required.' }),
    middleName: zod.string().optional(),
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
    spouseName: zod.string().optional(),
    spouseBirthday: zod.string().optional(),
    spouseAddress: zod.string().optional(),
    spouseProvince: zod.string().optional(),
    sameAddressAsSpouse: zod.boolean(),
  })
  .superRefine((data, ctx) => {
    if (ID_TYPES_REQUIRING_BACK.has(data.idType) && !data.idFileBack) {
      ctx.addIssue({
        code: zod.ZodIssueCode.custom,
        path: ['idFileBack'],
        message: 'Upload the back of your ID.',
      });
    }
    if (data.civilStatus === 'Married') {
      if (!data.spouseName) {
        ctx.addIssue({
          code: zod.ZodIssueCode.custom,
          path: ['spouseName'],
          message: "Spouse's name is required.",
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
  spouseName: 'Maria Dela Cruz',
  spouseBirthday: '1992-03-14',
  spouseAddress: '',
  spouseProvince: '',
  sameAddressAsSpouse: true,
};

// ----------------------------------------------------------------------

const ID_UPLOAD_HEIGHT = 140;

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

type IdUploadFieldProps = {
  name: 'idFile' | 'idFileBack';
  label: string;
};

function IdUploadField({ name, label }: IdUploadFieldProps) {
  const { control } = useFormContext<PersonalInfoSchemaType>();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <Box>
          <Typography sx={authFieldLabelSx}>{label}</Typography>
          <IdUploadSlot
            value={field.value as File | string | null}
            onChange={field.onChange}
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
    spouseName: defaultValues.spouseName || '',
    spouseBirthday: defaultValues.spouseBirthday || '',
    spouseAddress: defaultValues.spouseAddress || '',
    spouseProvince: defaultValues.spouseProvince || '',
    sameAddressAsSpouse: !defaultValues.spouseAddress,
  };

  const methods = useForm<PersonalInfoSchemaType>({
    resolver: zodResolver(PersonalInfoSchema),
    defaultValues: initialValues,
  });

  const { handleSubmit, reset, control, setValue } = methods;
  const [isSample, setIsSample] = useState(false);

  const civilStatus = useWatch({ control, name: 'civilStatus' });
  const sameAddressAsSpouse = useWatch({ control, name: 'sameAddressAsSpouse' });
  const idType = useWatch({ control, name: 'idType' });
  const idFile = useWatch({ control, name: 'idFile' });
  const isMarried = civilStatus === 'Married';
  const requiresIdBack = ID_TYPES_REQUIRING_BACK.has(idType);
  const previousIdTypeRef = useRef(idType);
  const autofilledRef = useRef(false);

  // Clears a stale back-image if the borrower switches away from a
  // two-sided ID type to one that doesn't need it (same pattern as
  // clearing businessDocument when businessType changes on Preliminary
  // Application).
  useEffect(() => {
    if (
      previousIdTypeRef.current &&
      previousIdTypeRef.current !== idType &&
      !ID_TYPES_REQUIRING_BACK.has(idType)
    ) {
      setValue('idFileBack', null, { shouldValidate: true });
    }

    previousIdTypeRef.current = idType;
  }, [idType, setValue]);

  // Instant "auto-fill" the moment the front ID image is uploaded — no
  // real OCR anywhere in this codebase, so this just fills the remaining
  // fields with placeholder-style values rather than simulating a delay.
  // Fires once per upload (guarded by a ref, same idea as the old OCR
  // file-watch), and does not overwrite fields the borrower already typed.
  useEffect(() => {
    if (!idFile) {
      autofilledRef.current = false;
      return;
    }
    if (autofilledRef.current) return;
    autofilledRef.current = true;

    const current = methods.getValues();
    (Object.keys(AUTOFILL_VALUES) as Array<keyof typeof AUTOFILL_VALUES>).forEach((field) => {
      if (!current[field]) {
        setValue(field, AUTOFILL_VALUES[field], { shouldValidate: true });
      }
    });
  }, [idFile, methods, setValue]);

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

    const {
      sameAddressAsSpouse: _unused,
      firstName,
      middleName,
      extensionName,
      ...personalInfo
    } = data;

    onSubmitApplication(
      {
        ...personalInfo,
        idFile,
        idFileBack: requiresIdBack ? idFileBack : null,
        spouseName: isMarried ? data.spouseName : undefined,
        spouseBirthday: isMarried ? data.spouseBirthday : undefined,
        spouseAddress,
        spouseProvince,
      } as PersonalInfo,
      { firstName, middleName, extensionName }
    );
  });

  return (
    <Box
      sx={{
        width: 1,
        maxWidth: 640,
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
            reset(isSample ? initialValues : SAMPLE_PERSONAL_INFO);
            setIsSample((prev) => !prev);
          }}
          size="small"
          sx={{ color: 'text.disabled' }}
        >
          {isSample ? 'Remove Sample Data' : 'Fill with Sample Data'}
        </Button>
      </Stack>

      <Form methods={methods} onSubmit={onSubmit}>
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

          <Box>
            <Typography sx={authFieldLabelSx}>ID number</Typography>
            <Field.Text name="idNumber" placeholder="0000 0000 0000" sx={authFieldSx} />
          </Box>

          <Stack direction="row" spacing={1.75}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={authFieldLabelSx}>First name</Typography>
              <Field.Text name="firstName" placeholder="Juan" sx={authFieldSx} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={authFieldLabelSx}>Middle name</Typography>
              <Field.Text name="middleName" placeholder="Santos" sx={authFieldSx} />
            </Box>
            <Box sx={{ width: 120 }}>
              <Typography sx={authFieldLabelSx}>Extension</Typography>
              <Field.Text name="extensionName" placeholder="Jr." sx={authFieldSx} />
            </Box>
          </Stack>

          <Stack direction="row" spacing={1.75}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={authFieldLabelSx}>Birthday</Typography>
              <Field.Text name="birthday" type="date" sx={authFieldSx} InputLabelProps={{ shrink: true }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={authFieldLabelSx}>Gender</Typography>
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
            <Typography sx={authFieldLabelSx}>Address (House / Unit No., Street)</Typography>
            <Field.Text name="address" placeholder="123 Mabini St." sx={authFieldSx} />
          </Box>

          <Stack direction="row" spacing={1.75}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={authFieldLabelSx}>Province</Typography>
              <Field.Select name="province" sx={authFieldSx}>
                {PROVINCES.map((province) => (
                  <MenuItem key={province} value={province}>
                    {province}
                  </MenuItem>
                ))}
              </Field.Select>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={authFieldLabelSx}>City</Typography>
              <Field.Text name="city" sx={authFieldSx} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={authFieldLabelSx}>Barangay</Typography>
              <Field.Text name="barangay" sx={authFieldSx} />
            </Box>
            <Box sx={{ width: 120 }}>
              <Typography sx={authFieldLabelSx}>Zip code</Typography>
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
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={authFieldLabelSx}>Spouse&apos;s name</Typography>
                    <Field.Text name="spouseName" sx={authFieldSx} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={authFieldLabelSx}>Spouse&apos;s birthday</Typography>
                    <Field.Text name="spouseBirthday" type="date" sx={authFieldSx} InputLabelProps={{ shrink: true }} />
                  </Box>
                </Stack>

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
                  <Stack direction="row" spacing={1.75}>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={authFieldLabelSx}>Spouse&apos;s address</Typography>
                      <Field.Text name="spouseAddress" placeholder="123 Mabini St." sx={authFieldSx} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={authFieldLabelSx}>Spouse&apos;s province</Typography>
                      <Field.Select name="spouseProvince" sx={authFieldSx}>
                        {PROVINCES.map((province) => (
                          <MenuItem key={province} value={province}>
                            {province}
                          </MenuItem>
                        ))}
                      </Field.Select>
                    </Box>
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
        </Stack>
      </Form>
    </Box>
  );
}
