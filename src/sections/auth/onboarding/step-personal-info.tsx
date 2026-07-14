'use client';

import { z as zod } from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { Form, Field } from 'src/components/hook-form';

import { fileToDataUrl } from 'src/utils/file-to-data-url';

import { authFieldSx, authFieldLabelSx, authPrimaryButtonSx } from '../auth-input-styles';

import type { PersonalInfo } from 'src/auth/registration-context';

// ----------------------------------------------------------------------

const ID_TYPES = ['PhilSys / National ID', 'Philippine Passport', "Driver's License", 'UMID', 'SSS ID', 'PhilHealth ID'];

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

export type PersonalInfoSchemaType = zod.infer<typeof PersonalInfoSchema>;

export const PersonalInfoSchema = zod.object({
  idType: zod.string().min(1, { message: 'Select an ID type.' }),
  idNumber: zod.string().min(1, { message: 'ID number is required.' }),
  idFile: zod.any().nullable(),
  address: zod.string().min(1, { message: 'Address is required.' }),
  province: zod.string().min(1, { message: 'Select a province.' }),
  city: zod.string().min(1, { message: 'City is required.' }),
  barangay: zod.string().min(1, { message: 'Barangay is required.' }),
  civilStatus: zod.string().min(1, { message: 'Select your civil status.' }),
  gender: zod.string().min(1, { message: 'Select your gender.' }),
  tinNumber: zod.string().optional(),
  referralSource: zod.string().min(1, { message: 'Select how you discovered PG Finance.' }),
});

const SAMPLE_PERSONAL_INFO: PersonalInfoSchemaType = {
  idType: 'PhilSys / National ID',
  idNumber: 'P1234567A',
  idFile: null,
  address: '123 Rizal Street',
  province: 'Metro Manila',
  city: 'Quezon City',
  barangay: 'Barangay Commonwealth',
  civilStatus: 'Single',
  gender: 'Male',
  tinNumber: '123-456-789-000',
  referralSource: 'Referral from a Friend',
};

// ----------------------------------------------------------------------

type StepPersonalInfoProps = {
  defaultValues: Partial<PersonalInfo>;
  onSubmitApplication: (data: PersonalInfo) => void;
};

export function StepPersonalInfo({ defaultValues, onSubmitApplication }: StepPersonalInfoProps) {
  const initialValues: PersonalInfoSchemaType = {
    idType: defaultValues.idType || '',
    idNumber: defaultValues.idNumber || '',
    idFile: defaultValues.idFile || null,
    address: defaultValues.address || '',
    province: defaultValues.province || '',
    city: defaultValues.city || '',
    barangay: defaultValues.barangay || '',
    civilStatus: defaultValues.civilStatus || '',
    gender: defaultValues.gender || '',
    tinNumber: defaultValues.tinNumber || '',
    referralSource: defaultValues.referralSource || '',
  };

  const methods = useForm<PersonalInfoSchemaType>({
    resolver: zodResolver(PersonalInfoSchema),
    defaultValues: initialValues,
  });

  const { handleSubmit, reset } = methods;
  const [isSample, setIsSample] = useState(false);

  const onSubmit = handleSubmit(async (data) => {
    // Persist the uploaded ID as a data URL — a raw File object can't
    // survive JSON.stringify into sessionStorage (it serializes to `{}`),
    // so the admin side would otherwise have no way to see the image.
    const idFile =
      data.idFile instanceof File ? await fileToDataUrl(data.idFile) : (data.idFile ?? null);

    onSubmitApplication({ ...data, idFile } as PersonalInfo);
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
          Step 3 · Your details
        </Typography>
        <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' }}>
          Your personal information
        </Typography>
        <Typography sx={{ fontSize: 14, color: '#667085', lineHeight: 1.6 }}>
          Please fill out your basic details so we can get in touch and process your loan
          application.
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
            <Typography sx={authFieldLabelSx}>Upload a valid ID</Typography>
            <Field.Upload name="idFile" helperText="PNG or JPG, up to 10MB" />
          </Box>

          <Stack direction="row" spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={authFieldLabelSx}>ID type</Typography>
              <Field.Select name="idType" sx={authFieldSx}>
                {ID_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Field.Select>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={authFieldLabelSx}>ID number</Typography>
              <Field.Text name="idNumber" placeholder="0000 0000 0000" sx={authFieldSx} />
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
          </Stack>

          <Stack direction="row" spacing={2}>
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
            <Box sx={{ flex: 1 }}>
              <Typography sx={authFieldLabelSx}>Civil status</Typography>
              <Field.Select name="civilStatus" sx={authFieldSx}>
                {CIVIL_STATUSES.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </Field.Select>
            </Box>
          </Stack>

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
        </Stack>
      </Form>
    </Box>
  );
}
