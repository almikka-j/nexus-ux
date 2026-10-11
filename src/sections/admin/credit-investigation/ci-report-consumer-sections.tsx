'use client';

import { useDropzone } from 'react-dropzone';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';

import { Iconify } from 'src/components/iconify';
import { FileThumbnail } from 'src/components/file-thumbnail';
import { RichTextField } from 'src/components/rich-text-field';
import { adminCardSx, outlinedNavyButtonSx } from 'src/components/admin-ui';
import { PROVINCES, PROVINCE_CITIES, barangaysFor } from 'src/utils/ph-address';

import { RadioRow } from '../call-report/call-report-types';
import { fieldSx, SectionLabel, YES_NO_OPTIONS, requiredLabel, FactChip, FactChipRow } from './ci-report-card';

import type {
  CiReport,
  CiChildEntry,
  CiComakerEntry,
  CiBankAccountEntry,
  CiIncomeSourceEntry,
  CiConsumerDocumentEntry,
} from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Consumer-type CI Report sections, mirroring the Commercial branch's own
// file (ci-report-commercial-sections.tsx) — plain non-collapsible
// `adminCardSx` cards (no CollapsibleSection), one card per section, in a
// fixed order. Same "local component owns add/update/remove, calls
// onChange({ field: nextArray })" convention as every other repeatable
// section in this app — CiReport has no per-array context setters.
// ----------------------------------------------------------------------

export type ConsumerSectionKey =
  | 'family'
  | 'residenceNeighborhood'
  | 'employment'
  | 'financialInformation'
  | 'loanPurpose'
  | 'bankVerification'
  | 'comaker'
  | 'healthAndHabits'
  | 'comments'
  | 'additionalDocuments';

export const CONSUMER_SECTION_NAV_ITEMS: { key: ConsumerSectionKey; label: string }[] = [
  { key: 'family', label: 'Family' },
  { key: 'residenceNeighborhood', label: 'Residence/Neighborhood' },
  { key: 'employment', label: 'Employment' },
  { key: 'financialInformation', label: 'Financial Information' },
  { key: 'loanPurpose', label: 'Loan Purpose' },
  { key: 'bankVerification', label: 'Bank Verification' },
  { key: 'comaker', label: 'Comaker' },
  { key: 'healthAndHabits', label: 'Health and Habits' },
  { key: 'comments', label: 'Comments' },
  { key: 'additionalDocuments', label: 'Additional Documents' },
];

// Sample read-only applicant info shown in the navy-banner header's info
// chips — same reasoning as Commercial's own COMMERCIAL_SAMPLE_INFO: this
// app has no real company/applicant-profile backend, so these are fixed
// display-only values rather than real sourced data.
const CONSUMER_SAMPLE_INFO = {
  residenceTelNo: '',
  residenceMobileNo: '',
  residenceEmail: '',
  businessTelNo: '',
  businessEmail: '',
};

// ----------------------------------------------------------------------
// Info chips header — same FactChip/FactChipRow grid Commercial's own
// CommercialInfoChips uses (see ci-report-card.tsx), not a separate
// header style: Applicant Name and the two addresses each get their own
// wide chip (long values), followed by their own contact-detail chips.
// Residence contact details (Tel./Mobile/Email) have no sourced field on
// CiReport yet, so they show the same fixed sample placeholders
// Commercial's own header uses for data this app has no real backend
// for; Business/Work Address's Tel. No./Email reuse the Employment
// section's own employerTelNo/employerEmail fields, since those are
// real editable fields already on this report.
// ----------------------------------------------------------------------
export function ConsumerInfoHeader({
  applicantName,
  report,
  isBusinessOwner,
}: {
  applicantName: string;
  report: CiReport;
  isBusinessOwner: boolean;
}) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <FactChipRow position="first">
        <FactChip label="Applicant Name" value={applicantName} wide edge={{ right: true }} />
        <FactChip
          label="Residence Address"
          value={report.residencePermanentAddress || 'Not on file'}
          wide
          edge={{ right: true }}
        />
        <FactChip label="Tel. Number" value={CONSUMER_SAMPLE_INFO.residenceTelNo || '—'} />
        <FactChip label="Mobile Number" value={CONSUMER_SAMPLE_INFO.residenceMobileNo || '—'} />
        <FactChip label="Email Address" value={CONSUMER_SAMPLE_INFO.residenceEmail || '—'} edge={{ right: true }} />
        <FactChip
          label="Business/Work Address"
          value={isBusinessOwner ? report.employerAddress || 'Not yet entered below' : 'Not applicable'}
          wide
          edge={{ right: true, bottom: true }}
        />
      </FactChipRow>
      <FactChipRow cols={2} position="last">
        <FactChip label="Tel. No." value={report.employerTelNo || '—'} edge={{ bottom: true }} />
        <FactChip label="Email Address" value={report.employerEmail || '—'} edge={{ right: true, bottom: true }} />
      </FactChipRow>
    </Box>
  );
}

function ChildrenSection({
  entries,
  onChange,
}: {
  entries: CiChildEntry[];
  onChange: (next: CiChildEntry[]) => void;
}) {
  const update = (id: string, data: Partial<CiChildEntry>) =>
    onChange(entries.map((entry) => (entry.id === id ? { ...entry, ...data } : entry)));
  const remove = (id: string) => onChange(entries.filter((entry) => entry.id !== id));
  const add = () =>
    onChange([...entries, { id: crypto.randomUUID(), name: '', age: '', occupationOrSchool: '' }]);

  return (
    <Stack spacing={1.25}>
      <SectionLabel>Children</SectionLabel>
      <Stack spacing={1.25}>
        {entries.map((entry, index) => (
          <Box key={entry.id} sx={{ p: 1.5, borderRadius: '11px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Chip
                label={`Child ${index + 1}`}
                size="small"
                sx={{ bgcolor: '#EEF1FE', color: '#3448B0', fontWeight: 700 }}
              />
              <Button
                onClick={() => remove(entry.id)}
                size="small"
                startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={16} />}
                sx={{ color: '#F04438' }}
              >
                Remove
              </Button>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                label="Name"
                value={entry.name}
                onChange={(event) => update(entry.id, { name: event.target.value })}
                sx={{ ...fieldSx, flex: 2 }}
              />
              <TextField
                label="Age"
                type="number"
                value={entry.age}
                onChange={(event) => update(entry.id, { age: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
              <TextField
                label="Occupation/School"
                value={entry.occupationOrSchool}
                onChange={(event) => update(entry.id, { occupationOrSchool: event.target.value })}
                sx={{ ...fieldSx, flex: 2 }}
              />
            </Stack>
          </Box>
        ))}
        <Button
          onClick={add}
          variant="outlined"
          size="small"
          startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
          sx={{ ...outlinedNavyButtonSx, alignSelf: 'flex-start' }}
        >
          Add Children
        </Button>
      </Stack>
    </Stack>
  );
}

const ADDRESS_TYPE_OPTIONS: { value: 'own' | 'rent' | 'rent-free'; label: string }[] = [
  { value: 'own', label: 'Own' },
  { value: 'rent', label: 'Rent' },
  { value: 'rent-free', label: 'Rent-free' },
];

// One Province/City/Barangay/Street Address/Address Type column — shared
// shape between Permanent Address and Present Address. Province is a
// free dropdown (PROVINCES); City offers the cities on file for that
// province via PROVINCE_CITIES, falling back to free text once a
// province with no known cities is picked; Barangay offers the
// barangays on file for that exact province+city pair via barangaysFor,
// falling back to free text otherwise. Same "sample data, not a real
// PSGC import" convention as the onboarding Personal Info step this data
// is shared with (src/utils/ph-address.ts).
function AddressFields({
  prefix,
  province,
  city,
  barangay,
  streetAddress,
  addressType,
  lengthOfStay,
  landmark,
  remarks,
  onChange,
}: {
  prefix: string;
  province: string;
  city: string;
  barangay: string;
  streetAddress: string;
  addressType: 'own' | 'rent' | 'rent-free' | '';
  lengthOfStay: string;
  landmark: string;
  remarks: string;
  onChange: (data: {
    province?: string;
    city?: string;
    barangay?: string;
    streetAddress?: string;
    addressType?: 'own' | 'rent' | 'rent-free' | '';
    lengthOfStay?: string;
    landmark?: string;
    remarks?: string;
  }) => void;
}) {
  const knownCities = PROVINCE_CITIES[province] ?? [];
  const knownBarangays = barangaysFor(province, city);

  return (
    <Stack spacing={1.25}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          select
          fullWidth
          label={requiredLabel('Province')}
          value={province}
          onChange={(event) => onChange({ province: event.target.value, city: '', barangay: '' })}
          sx={fieldSx}
        >
          {PROVINCES.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
        {knownCities.length > 0 ? (
          <TextField
            select
            fullWidth
            label={requiredLabel('City')}
            value={city}
            onChange={(event) => onChange({ city: event.target.value, barangay: '' })}
            sx={fieldSx}
          >
            {knownCities.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        ) : (
          <TextField
            fullWidth
            label={requiredLabel('City')}
            value={city}
            onChange={(event) => onChange({ city: event.target.value, barangay: '' })}
            sx={fieldSx}
          />
        )}
        {knownBarangays.length > 0 ? (
          <TextField
            select
            fullWidth
            label={requiredLabel('Barangay')}
            value={barangay}
            onChange={(event) => onChange({ barangay: event.target.value })}
            sx={fieldSx}
          >
            {knownBarangays.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        ) : (
          <TextField
            fullWidth
            label={requiredLabel('Barangay')}
            value={barangay}
            onChange={(event) => onChange({ barangay: event.target.value })}
            sx={fieldSx}
          />
        )}
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          fullWidth
          label={requiredLabel('Street Address')}
          value={streetAddress}
          onChange={(event) => onChange({ streetAddress: event.target.value })}
          sx={fieldSx}
        />
        <TextField
          select
          fullWidth
          label={requiredLabel('Address Type')}
          value={addressType}
          onChange={(event) => onChange({ addressType: event.target.value as 'own' | 'rent' | 'rent-free' })}
          sx={fieldSx}
        >
          {ADDRESS_TYPE_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          fullWidth
          label="Length of Stay"
          value={lengthOfStay}
          onChange={(event) => onChange({ lengthOfStay: event.target.value })}
          sx={fieldSx}
        />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          fullWidth
          multiline
          minRows={1}
          label="Landmark"
          value={landmark}
          onChange={(event) => onChange({ landmark: event.target.value })}
          sx={fieldSx}
        />
        <TextField
          fullWidth
          multiline
          minRows={1}
          label="Remarks"
          value={remarks}
          onChange={(event) => onChange({ remarks: event.target.value })}
          sx={fieldSx}
        />
      </Stack>
    </Stack>
  );
}

function ResidenceNeighborhoodSection({
  report,
  onChange,
}: {
  report: CiReport;
  onChange: (data: Partial<CiReport>) => void;
}) {
  return (
    <Stack spacing={1.75}>
      <Box>
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A', mb: 1 }}>
          Permanent Address
        </Typography>
        <AddressFields
          prefix="residence"
          province={report.residenceProvince}
          city={report.residenceCity}
          barangay={report.residenceBarangay}
          streetAddress={report.residenceStreetAddress}
          addressType={report.residenceAddressType}
          lengthOfStay={report.residenceLengthOfStay}
          landmark={report.residenceLandmark}
          remarks={report.residenceRemarks}
          onChange={(data) =>
            onChange({
              ...(data.province !== undefined ? { residenceProvince: data.province } : {}),
              ...(data.city !== undefined ? { residenceCity: data.city } : {}),
              ...(data.barangay !== undefined ? { residenceBarangay: data.barangay } : {}),
              ...(data.streetAddress !== undefined ? { residenceStreetAddress: data.streetAddress } : {}),
              ...(data.addressType !== undefined ? { residenceAddressType: data.addressType } : {}),
              ...(data.lengthOfStay !== undefined ? { residenceLengthOfStay: data.lengthOfStay } : {}),
              ...(data.landmark !== undefined ? { residenceLandmark: data.landmark } : {}),
              ...(data.remarks !== undefined ? { residenceRemarks: data.remarks } : {}),
            })
          }
        />
      </Box>

      <Box sx={{ pt: 1.75, borderTop: '1px solid #EEF0F5' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>Present Address</Typography>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={report.presentSameAsPermanent}
                onChange={(event) => onChange({ presentSameAsPermanent: event.target.checked })}
              />
            }
            label={<Typography sx={{ fontSize: 13 }}>Same as Permanent</Typography>}
          />
        </Stack>
        {!report.presentSameAsPermanent && (
          <AddressFields
            prefix="present"
            province={report.presentProvince}
            city={report.presentCity}
            barangay={report.presentBarangay}
            streetAddress={report.presentStreetAddress}
            addressType={report.presentAddressType}
            lengthOfStay={report.presentLengthOfStay}
            landmark={report.presentLandmark}
            remarks={report.presentRemarks}
            onChange={(data) =>
              onChange({
                ...(data.province !== undefined ? { presentProvince: data.province } : {}),
                ...(data.city !== undefined ? { presentCity: data.city } : {}),
                ...(data.barangay !== undefined ? { presentBarangay: data.barangay } : {}),
                ...(data.streetAddress !== undefined ? { presentStreetAddress: data.streetAddress } : {}),
                ...(data.addressType !== undefined ? { presentAddressType: data.addressType } : {}),
                ...(data.lengthOfStay !== undefined ? { presentLengthOfStay: data.lengthOfStay } : {}),
                ...(data.landmark !== undefined ? { presentLandmark: data.landmark } : {}),
                ...(data.remarks !== undefined ? { presentRemarks: data.remarks } : {}),
              })
            }
          />
        )}
      </Box>
    </Stack>
  );
}

const EMPLOYMENT_TYPE_OPTIONS: { value: 'direct' | 'agency' | 'self-employed'; label: string }[] = [
  { value: 'direct', label: 'Direct' },
  { value: 'agency', label: 'Agency' },
  { value: 'self-employed', label: 'Self-Employed' },
];

function EmploymentSection({
  report,
  onChange,
  isBusinessOwner,
}: {
  report: CiReport;
  onChange: (data: Partial<CiReport>) => void;
  isBusinessOwner: boolean;
}) {
  return (
    <Stack spacing={1.25}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          label="Employment Status"
          value={report.employmentStatus}
          InputProps={{ readOnly: true }}
          sx={{ ...fieldSx, flex: 1, '& .MuiOutlinedInput-root': { ...fieldSx['& .MuiOutlinedInput-root'], bgcolor: 'common.white' } }}
        />
        <Box sx={{ flex: 1 }}>
          <RadioRow
            label="Employment Type"
            value={report.employmentType}
            options={EMPLOYMENT_TYPE_OPTIONS}
            onChange={(value) => onChange({ employmentType: value })}
          />
        </Box>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          label={isBusinessOwner ? 'Business Name' : 'Employer Name'}
          value={report.employerName}
          onChange={(event) => onChange({ employerName: event.target.value })}
          sx={{ ...fieldSx, flex: 1 }}
        />
        <TextField
          label="Position"
          value={report.position}
          onChange={(event) => onChange({ position: event.target.value })}
          sx={{ ...fieldSx, flex: 1 }}
        />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          fullWidth
          label={isBusinessOwner ? 'Business Address' : 'Employer Address'}
          value={report.employerAddress}
          onChange={(event) => onChange({ employerAddress: event.target.value })}
          sx={{ ...fieldSx, flex: 2 }}
        />
        <TextField
          label="Tel. No."
          value={report.employerTelNo}
          onChange={(event) => onChange({ employerTelNo: event.target.value })}
          sx={{ ...fieldSx, flex: 1 }}
        />
        <TextField
          label="Email Address"
          value={report.employerEmail}
          onChange={(event) => onChange({ employerEmail: event.target.value })}
          sx={{ ...fieldSx, flex: 1 }}
        />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          label="Salary"
          type="number"
          value={report.salary}
          onChange={(event) => onChange({ salary: event.target.value })}
          sx={{ ...fieldSx, flex: 1 }}
        />
        <TextField
          label="Annual Income"
          type="number"
          value={report.annualIncome}
          onChange={(event) => onChange({ annualIncome: event.target.value })}
          sx={{ ...fieldSx, flex: 1 }}
        />
        <TextField
          label="Length of Service"
          value={report.lengthOfService}
          onChange={(event) => onChange({ lengthOfService: event.target.value })}
          sx={{ ...fieldSx, flex: 1 }}
        />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          label="No. Reg. Employees"
          type="number"
          value={report.numberOfRegEmployees}
          onChange={(event) => onChange({ numberOfRegEmployees: event.target.value })}
          sx={{ ...fieldSx, flex: 1 }}
        />
        <TextField
          label="No. Contr. Employees"
          type="number"
          value={report.numberOfContrEmployees}
          onChange={(event) => onChange({ numberOfContrEmployees: event.target.value })}
          sx={{ ...fieldSx, flex: 1 }}
        />
        <Box sx={{ flex: 1 }}>
          <RadioRow
            label="Unionized?"
            value={report.isUnionized}
            options={YES_NO_OPTIONS}
            onChange={(value) => onChange({ isUnionized: value })}
          />
        </Box>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          label="SEC/DTI Reg. No."
          value={report.secDtiRegNo}
          onChange={(event) => onChange({ secDtiRegNo: event.target.value })}
          sx={{ ...fieldSx, flex: 1 }}
        />
        <TextField
          label="SEC/DTI Reg. Date"
          type="date"
          InputLabelProps={{ shrink: true }}
          value={report.secDtiRegDate}
          onChange={(event) => onChange({ secDtiRegDate: event.target.value })}
          sx={{ ...fieldSx, flex: 1 }}
        />
        <TextField
          label="SEC/DTI Exp. Date"
          type="date"
          InputLabelProps={{ shrink: true }}
          value={report.secDtiExpDate}
          onChange={(event) => onChange({ secDtiExpDate: event.target.value })}
          sx={{ ...fieldSx, flex: 1 }}
        />
      </Stack>
      <TextField
        fullWidth
        multiline
        minRows={1}
        label="Remarks"
        value={report.employmentRemarks}
        onChange={(event) => onChange({ employmentRemarks: event.target.value })}
        sx={fieldSx}
      />
    </Stack>
  );
}

const INCOME_TYPE_OPTIONS = ['Business Income', 'Rental Income', 'Freelance/Commission', 'Pension', 'Other'];

function OtherIncomeSection({
  entries,
  onChange,
}: {
  entries: CiIncomeSourceEntry[];
  onChange: (next: CiIncomeSourceEntry[]) => void;
}) {
  const update = (id: string, data: Partial<CiIncomeSourceEntry>) =>
    onChange(entries.map((entry) => (entry.id === id ? { ...entry, ...data } : entry)));
  const remove = (id: string) => onChange(entries.filter((entry) => entry.id !== id));
  const add = () =>
    onChange([
      ...entries,
      { id: crypto.randomUUID(), incomeType: '', companyName: '', owner: '', percentOfShare: '', remarks: '' },
    ]);

  return (
    <Stack spacing={1.25}>
      <SectionLabel>Other Source of Income</SectionLabel>
      <Stack spacing={1.25}>
        {entries.map((entry, index) => (
          <Box key={entry.id} sx={{ p: 1.5, borderRadius: '11px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Chip
                label={`Source ${index + 1}`}
                size="small"
                sx={{ bgcolor: '#EEF1FE', color: '#3448B0', fontWeight: 700 }}
              />
              <Button
                onClick={() => remove(entry.id)}
                size="small"
                startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={16} />}
                sx={{ color: '#F04438' }}
              >
                Remove
              </Button>
            </Stack>
            <Stack spacing={1.25}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  select
                  fullWidth
                  label={requiredLabel('Income Type')}
                  value={entry.incomeType}
                  onChange={(event) => update(entry.id, { incomeType: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                >
                  {INCOME_TYPE_OPTIONS.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  fullWidth
                  label={requiredLabel('Company Name')}
                  value={entry.companyName}
                  onChange={(event) => update(entry.id, { companyName: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  fullWidth
                  label={requiredLabel('Owner')}
                  value={entry.owner}
                  onChange={(event) => update(entry.id, { owner: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  type="number"
                  label={requiredLabel('Percent Of Share')}
                  value={entry.percentOfShare}
                  onChange={(event) => update(entry.id, { percentOfShare: event.target.value })}
                  placeholder="0"
                  InputProps={{ inputProps: { min: 0, max: 100 } }}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  fullWidth
                  multiline
                  minRows={1}
                  label={requiredLabel('Remarks')}
                  value={entry.remarks}
                  onChange={(event) => update(entry.id, { remarks: event.target.value })}
                  sx={{ ...fieldSx, flex: 2 }}
                />
              </Stack>
            </Stack>
          </Box>
        ))}
        <Button
          onClick={add}
          variant="outlined"
          size="small"
          startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
          sx={{ ...outlinedNavyButtonSx, alignSelf: 'flex-start' }}
        >
          Add Source
        </Button>
      </Stack>
    </Stack>
  );
}

function BankVerificationSection({
  entries,
  onChange,
}: {
  entries: CiBankAccountEntry[];
  onChange: (next: CiBankAccountEntry[]) => void;
}) {
  const update = (id: string, data: Partial<CiBankAccountEntry>) =>
    onChange(entries.map((entry) => (entry.id === id ? { ...entry, ...data } : entry)));
  const remove = (id: string) => onChange(entries.filter((entry) => entry.id !== id));
  const add = () =>
    onChange([
      ...entries,
      { id: crypto.randomUUID(), bankName: '', accountType: '', accountNumber: '', averageMonthlyBalance: '' },
    ]);

  return (
    <Stack spacing={1.25}>
      {entries.map((entry, index) => (
        <Box key={entry.id} sx={{ p: 1.5, borderRadius: '11px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Chip
              label={`Account ${index + 1}`}
              size="small"
              sx={{ bgcolor: '#EEF1FE', color: '#3448B0', fontWeight: 700 }}
            />
            <Button
              onClick={() => remove(entry.id)}
              size="small"
              startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={16} />}
              sx={{ color: '#F04438' }}
            >
              Remove
            </Button>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              label="Bank Name"
              value={entry.bankName}
              onChange={(event) => update(entry.id, { bankName: event.target.value })}
              sx={{ ...fieldSx, flex: 1 }}
            />
            <TextField
              label="Account Type"
              value={entry.accountType}
              onChange={(event) => update(entry.id, { accountType: event.target.value })}
              sx={{ ...fieldSx, flex: 1 }}
            />
            <TextField
              label="Account Number"
              value={entry.accountNumber}
              onChange={(event) => update(entry.id, { accountNumber: event.target.value })}
              sx={{ ...fieldSx, flex: 1 }}
            />
            <TextField
              label="Average Monthly Balance"
              type="number"
              value={entry.averageMonthlyBalance}
              onChange={(event) => update(entry.id, { averageMonthlyBalance: event.target.value })}
              sx={{ ...fieldSx, flex: 1 }}
            />
          </Stack>
        </Box>
      ))}
      <Button
        onClick={add}
        variant="outlined"
        size="small"
        startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
        sx={{ ...outlinedNavyButtonSx, alignSelf: 'flex-start' }}
      >
        Add Bank Account
      </Button>
    </Stack>
  );
}

function ComakerSection({ comakers }: { comakers: CiComakerEntry[] }) {
  return (
    <Stack spacing={1.25}>
      {comakers.length === 0 ? (
        <Box sx={{ p: 1.5, borderRadius: '11px', border: '1px dashed #DDE1EA', bgcolor: '#FAFBFD' }}>
          <Typography sx={{ fontSize: 13, color: '#8891A6' }}>
            No data found. Please add comaker information on Call Report.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.25}>
          {comakers.map((comaker) => (
            <Box key={comaker.id} sx={{ p: 1.5, borderRadius: '11px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
              <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#14172A' }}>
                {comaker.name || 'Unnamed comaker'}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: '#5A6273', mt: 0.25 }}>
                {comaker.relationshipToBorrower && `${comaker.relationshipToBorrower} · `}
                {comaker.address}
                {comaker.contactNumber && ` · ${comaker.contactNumber}`}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function createConsumerDocumentEntry(file: File): CiConsumerDocumentEntry {
  return {
    id: Math.random().toString(36).slice(2),
    label: '',
    fileName: file.name,
    fileUrl: URL.createObjectURL(file),
    uploadedAt: new Date().toISOString(),
  };
}

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];

function isImageFile(fileName: string): boolean {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTENSIONS.includes(extension);
}

function AdditionalDocumentsSection({
  entries,
  onChange,
}: {
  entries: CiConsumerDocumentEntry[];
  onChange: (entries: CiConsumerDocumentEntry[]) => void;
}) {
  const { getRootProps, getInputProps } = useDropzone({
    multiple: true,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;
      const newEntries = acceptedFiles.map((file) => createConsumerDocumentEntry(file));
      onChange([...entries, ...newEntries]);
    },
  });

  const updateLabel = (id: string, label: string) => {
    onChange(entries.map((entry) => (entry.id === id ? { ...entry, label } : entry)));
  };

  const remove = (id: string) => {
    onChange(entries.filter((entry) => entry.id !== id));
  };

  return (
    <Stack spacing={1.75}>
      <Box
        {...getRootProps()}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          minHeight: 44,
          px: 1.5,
          borderRadius: '10px',
          cursor: 'pointer',
          border: '1.5px dashed',
          borderColor: '#B0B8CC',
          bgcolor: 'common.white',
          '&:hover': { borderColor: '#1C2A6E', bgcolor: '#F5F7FF' },
        }}
      >
        <input {...getInputProps()} />
        <Iconify icon="solar:upload-minimalistic-bold-duotone" width={20} sx={{ color: '#1C2A6E' }} />
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1C2A6E' }}>
          Choose files — Additional Documents
        </Typography>
      </Box>
      {entries.length > 0 && (
        <Stack spacing={1.25}>
          {entries.map((entry) => (
            <Stack
              key={entry.id}
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{ p: 1.25, borderRadius: '10px', border: '1px solid #EEF0F5' }}
            >
              {isImageFile(entry.fileName) ? (
                <Box
                  component="img"
                  src={entry.fileUrl}
                  alt={entry.fileName}
                  sx={{
                    width: 40,
                    height: 40,
                    flexShrink: 0,
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '1px solid #EEF0F5',
                  }}
                />
              ) : (
                <FileThumbnail file={entry.fileName} sx={{ width: 40, height: 40, flexShrink: 0 }} />
              )}
              <Stack spacing={0.25} sx={{ minWidth: 0, flexShrink: 0, width: { xs: 120, sm: 160 } }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#14172A' }} noWrap>
                  {entry.fileName}
                </Typography>
              </Stack>
              <TextField
                fullWidth
                size="small"
                placeholder="Document label (optional)"
                value={entry.label}
                onChange={(event) => updateLabel(entry.id, event.target.value)}
                sx={fieldSx}
              />
              <IconButton size="small" onClick={() => remove(entry.id)} aria-label="Remove document">
                <Iconify icon="mingcute:close-line" width={16} />
              </IconButton>
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

export function ConsumerReportSections({
  report,
  onChange,
  comakers,
  isBusinessOwner,
  sectionRefs,
}: {
  report: CiReport;
  onChange: (data: Partial<CiReport>) => void;
  comakers: CiComakerEntry[];
  isBusinessOwner: boolean;
  sectionRefs: React.MutableRefObject<Map<string, HTMLDivElement | null>>;
}) {
  return (
    <Stack spacing={1.75}>
      <Box
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('family', el); }}
        sx={adminCardSx}
      >
        <Stack spacing={0.25} sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>Family</Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
            The applicant&apos;s spouse and children.
          </Typography>
        </Stack>
        <Stack spacing={1.75}>
          <RichTextField
            label="Spouse"
            value={report.spouseNotes}
            onChange={(html) => onChange({ spouseNotes: html })}
            placeholder="Spouse name, citizenship, and any relevant notes…"
          />
          <ChildrenSection
            entries={report.children}
            onChange={(children) => onChange({ children })}
          />
        </Stack>
      </Box>

      <Box
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('residenceNeighborhood', el); }}
        sx={adminCardSx}
      >
        <Stack spacing={0.25} sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>Residence/Neighborhood</Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
            The permanent address on file, and the present address if the applicant lives elsewhere.
          </Typography>
        </Stack>
        <ResidenceNeighborhoodSection report={report} onChange={onChange} />
      </Box>

      <Box
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('employment', el); }}
        sx={adminCardSx}
      >
        <Stack spacing={0.25} sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>Employment</Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
            Employer or business, income, workforce and registration details.
          </Typography>
        </Stack>
        <EmploymentSection report={report} onChange={onChange} isBusinessOwner={isBusinessOwner} />
      </Box>


      <Box
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('financialInformation', el); }}
        sx={adminCardSx}
      >
        <Stack spacing={0.25} sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>Financial Information</Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
            Assets and other sources of income.
          </Typography>
        </Stack>
        <Stack spacing={1.75}>
          <RichTextField
            label="Assets"
            value={report.assetsNotes}
            onChange={(html) => onChange({ assetsNotes: html })}
            placeholder="Real property, vehicles, and other notable assets…"
          />
          <OtherIncomeSection
            entries={report.otherIncomeSources}
            onChange={(otherIncomeSources) => onChange({ otherIncomeSources })}
          />
        </Stack>
      </Box>

      <Box
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('loanPurpose', el); }}
        sx={adminCardSx}
      >
        <Stack spacing={0.25} sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
            {requiredLabel('Loan Purpose')}
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
            What the loan proceeds will be used for.
          </Typography>
        </Stack>
        <RichTextField
          label="Loan Purpose"
          value={report.loanPurposeNotes}
          onChange={(html) => onChange({ loanPurposeNotes: html })}
          placeholder="What the loan proceeds will be used for…"
        />
      </Box>

      <Box
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('bankVerification', el); }}
        sx={adminCardSx}
      >
        <Stack spacing={0.25} sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>Bank Verification</Typography>
        </Stack>
        <BankVerificationSection
          entries={report.bankAccounts}
          onChange={(bankAccounts) => onChange({ bankAccounts })}
        />
      </Box>

      <Box
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('comaker', el); }}
        sx={adminCardSx}
      >
        <Stack spacing={0.25} sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>Comaker</Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
            The comakers backing this loan.
          </Typography>
        </Stack>
        <ComakerSection comakers={comakers} />
      </Box>

      <Box
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('healthAndHabits', el); }}
        sx={adminCardSx}
      >
        <Stack spacing={0.25} sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>Health and Habits</Typography>
        </Stack>
        <RichTextField
          label="Health and Habits"
          value={report.healthAndHabitsNotes}
          onChange={(html) => onChange({ healthAndHabitsNotes: html })}
          placeholder="Lifestyle, health, or habit observations relevant to the investigation…"
        />
      </Box>

      <Box
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('comments', el); }}
        sx={adminCardSx}
      >
        <Stack spacing={0.25} sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>Comments</Typography>
        </Stack>
        <RichTextField
          label="Comments"
          value={report.commentsNotes}
          onChange={(html) => onChange({ commentsNotes: html })}
          placeholder="Any additional remarks…"
        />
      </Box>

      <Box
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('additionalDocuments', el); }}
        sx={adminCardSx}
      >
        <Stack spacing={0.25} sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>Additional Documents</Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
            Attach any other supporting documents for this investigation.
          </Typography>
        </Stack>
        <AdditionalDocumentsSection
          entries={report.consumerDocuments}
          onChange={(consumerDocuments) => onChange({ consumerDocuments })}
        />
      </Box>
    </Stack>
  );
}
