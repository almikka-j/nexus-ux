'use client';

import { useState } from 'react';
import { NumericFormat } from 'react-number-format';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import FormControlLabel from '@mui/material/FormControlLabel';

import { Iconify } from 'src/components/iconify';
import { RichTextField } from 'src/components/rich-text-field';
import { adminCardSx, TONE_COLORS, outlinedNavyButtonSx, iconButtonBorderedSx } from 'src/components/admin-ui';

import { RadioRow } from '../call-report/call-report-types';
import { fieldSx, SectionLabel, YES_NO_OPTIONS, requiredLabel } from './ci-report-card';

import type {
  CiReport,
  CiTrusteeEntry,
  CiStockholderType,
  CiCommercialTradeEntry,
  CiManagementEntry,
  CiStockholderEntry,
  CiSubStockholderEntry,
} from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Commercial-type CI Report sections — Business Profile, Location and
// Facility, Trade Checking (Commercial shape: company-level contact
// fields, distinct from the Consumer branch's CiTradeEntry), Management
// and Ownership with nested Stockholder → Sub-stockholder lists, and
// Comments. Mirrors the existing Consumer sections' "local component
// owns add/update/remove, calls onChange({ field: nextArray })"
// convention — no dedicated context setters exist for any CiReport
// array, Commercial included.
// ----------------------------------------------------------------------

// A two-way "which one" choice rendered as a pair of checkboxes (per the
// reference tool), not a RadioRow — visually a checkbox, but still
// mutually exclusive under the hood: checking one always unchecks the
// other, so the stored value is still a single `trueValue | falseValue | ''`
// union, same shape as every other either/or field in this app.
function CheckboxPairRow<TrueValue extends string, FalseValue extends string>({
  label,
  value,
  trueValue,
  falseValue,
  trueLabel,
  falseLabel,
  onChange,
}: {
  label: string;
  value: TrueValue | FalseValue | '';
  trueValue: TrueValue;
  falseValue: FalseValue;
  trueLabel: string;
  falseLabel: string;
  onChange: (value: TrueValue | FalseValue) => void;
}) {
  return (
    <Stack spacing={0.75}>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A' }}>{label}</Typography>
      <Stack direction="row" spacing={2}>
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={value === trueValue}
              onChange={() => onChange(trueValue)}
            />
          }
          label={<Typography sx={{ fontSize: 13.5 }}>{trueLabel}</Typography>}
        />
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={value === falseValue}
              onChange={() => onChange(falseValue)}
            />
          }
          label={<Typography sx={{ fontSize: 13.5 }}>{falseLabel}</Typography>}
        />
      </Stack>
    </Stack>
  );
}

function createCommercialTradeEntry(): CiCommercialTradeEntry {
  return {
    id: crypto.randomUUID(),
    companyName: '',
    contactPerson: '',
    position: '',
    mobileNumber: '',
    email: '',
    telephoneNo: '',
    localExtension: '',
    transactionDetails: '',
    paymentTerms: '',
    yearsOfContract: '',
    remarks: '',
  };
}

function CommercialTradeCheckingSection({
  title,
  entries,
  onChange,
}: {
  title: string;
  entries: CiCommercialTradeEntry[];
  onChange: (next: CiCommercialTradeEntry[]) => void;
}) {
  const update = (id: string, data: Partial<CiCommercialTradeEntry>) =>
    onChange(entries.map((entry) => (entry.id === id ? { ...entry, ...data } : entry)));
  const remove = (id: string) => onChange(entries.filter((entry) => entry.id !== id));
  const add = () => onChange([...entries, createCommercialTradeEntry()]);

  return (
    <Stack spacing={1.5}>
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>{title}</Typography>
      <Stack spacing={1.5}>
        {entries.map((entry, index) => (
          <Box key={entry.id} sx={{ p: 2, borderRadius: '11px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
              <Chip
                label={`${title.slice(0, -1)} ${index + 1}`}
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
            <Stack spacing={1.5}>
              <Typography variant="overline" sx={{ fontSize: 11, color: '#A0A7B5' }}>Company</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="Company name"
                  value={entry.companyName}
                  onChange={(event) => update(entry.id, { companyName: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Contact person"
                  value={entry.contactPerson}
                  onChange={(event) => update(entry.id, { contactPerson: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Position"
                  value={entry.position}
                  onChange={(event) => update(entry.id, { position: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>
              <Typography variant="overline" sx={{ fontSize: 11, color: '#A0A7B5' }}>Contact details</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="Mobile number"
                  value={entry.mobileNumber}
                  onChange={(event) => update(entry.id, { mobileNumber: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Email address"
                  value={entry.email}
                  onChange={(event) => update(entry.id, { email: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="Telephone no."
                  value={entry.telephoneNo}
                  onChange={(event) => update(entry.id, { telephoneNo: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Local/extension"
                  value={entry.localExtension}
                  onChange={(event) => update(entry.id, { localExtension: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>
              <Typography variant="overline" sx={{ fontSize: 11, color: '#A0A7B5' }}>Transaction</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="Transaction details"
                  value={entry.transactionDetails}
                  onChange={(event) => update(entry.id, { transactionDetails: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Payment terms"
                  value={entry.paymentTerms}
                  onChange={(event) => update(entry.id, { paymentTerms: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Years of contract"
                  value={entry.yearsOfContract}
                  onChange={(event) => update(entry.id, { yearsOfContract: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>
              <Typography variant="overline" sx={{ fontSize: 11, color: '#A0A7B5' }}>Notes</Typography>
              <TextField
                label="Remarks"
                value={entry.remarks}
                onChange={(event) => update(entry.id, { remarks: event.target.value })}
                sx={fieldSx}
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
          Add {title.slice(0, -1).toLowerCase()}
        </Button>
      </Stack>
    </Stack>
  );
}

function createManagementEntry(): CiManagementEntry {
  return {
    id: crypto.randomUUID(),
    fullName: '',
    birthdate: '',
    birthPlace: '',
    nationality: '',
    spousePartner: '',
    homeAddress: '',
    jobTitle: '',
    education: '',
    otherBusiness: '',
    tin: '',
    mobileNumber: '',
  };
}

function ManagementSection({
  entries,
  onChange,
}: {
  entries: CiManagementEntry[];
  onChange: (next: CiManagementEntry[]) => void;
}) {
  const update = (id: string, data: Partial<CiManagementEntry>) =>
    onChange(entries.map((entry) => (entry.id === id ? { ...entry, ...data } : entry)));
  const remove = (id: string) => onChange(entries.filter((entry) => entry.id !== id));
  const add = () => onChange([...entries, createManagementEntry()]);

  return (
    <Stack spacing={1.5}>
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>Management</Typography>
      <Stack spacing={1.5}>
        {entries.map((entry, index) => (
          <Box key={entry.id} sx={{ p: 2, borderRadius: '11px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
              <Chip
                label={`Manager ${index + 1}`}
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
            <Stack spacing={1.5}>
              <TextField
                label={requiredLabel('Name')}
                value={entry.fullName}
                onChange={(event) => update(entry.id, { fullName: event.target.value })}
                sx={fieldSx}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label={requiredLabel('Current Title')}
                  value={entry.jobTitle}
                  onChange={(event) => update(entry.id, { jobTitle: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label={requiredLabel('Nationality')}
                  value={entry.nationality}
                  onChange={(event) => update(entry.id, { nationality: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>
              <TextField
                label={requiredLabel('Educational Attainment')}
                value={entry.education}
                onChange={(event) => update(entry.id, { education: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                label="Other Business Affiliations"
                value={entry.otherBusiness}
                onChange={(event) => update(entry.id, { otherBusiness: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                label={requiredLabel('Residence Address')}
                value={entry.homeAddress}
                onChange={(event) => update(entry.id, { homeAddress: event.target.value })}
                sx={fieldSx}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label={requiredLabel('Birthday')}
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={entry.birthdate}
                  onChange={(event) => update(entry.id, { birthdate: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label={requiredLabel('Place of Birth')}
                  value={entry.birthPlace}
                  onChange={(event) => update(entry.id, { birthPlace: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>
              <TextField
                label="Spouse / Partner"
                value={entry.spousePartner}
                onChange={(event) => update(entry.id, { spousePartner: event.target.value })}
                sx={fieldSx}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label={requiredLabel('Mobile Number')}
                  value={entry.mobileNumber}
                  onChange={(event) => update(entry.id, { mobileNumber: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label={requiredLabel('Tax Identification Number')}
                  value={entry.tin}
                  onChange={(event) => update(entry.id, { tin: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
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
          Add management
        </Button>
      </Stack>
    </Stack>
  );
}

// Shared currency/percentage input look for Trustees/Stockholders money
// fields — NumericFormat + a ₱ adornment, same convention as the Design
// System page's own "Currency field" showcase.
function CurrencyField({
  label,
  value,
  onChange,
}: {
  label: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <NumericFormat
      label={label}
      customInput={TextField}
      value={value}
      onValueChange={({ value: nextValue }) => onChange(nextValue)}
      thousandSeparator=","
      decimalScale={2}
      allowNegative={false}
      valueIsNumericString
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: TONE_COLORS.info.solid }}>₱</Typography>
          </InputAdornment>
        ),
      }}
      sx={{ ...fieldSx, flex: 1 }}
    />
  );
}

function PercentageField({
  label,
  value,
  onChange,
}: {
  label: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <NumericFormat
      label={label}
      customInput={TextField}
      value={value}
      onValueChange={({ value: nextValue }) => onChange(nextValue)}
      decimalScale={2}
      allowNegative={false}
      isAllowed={({ floatValue }) => floatValue === undefined || (floatValue >= 0 && floatValue <= 100)}
      valueIsNumericString
      InputProps={{
        endAdornment: <InputAdornment position="end">%</InputAdornment>,
      }}
      sx={{ ...fieldSx, flex: 1 }}
    />
  );
}

const STOCKHOLDER_TYPE_OPTIONS: { value: 'individual' | 'corporation'; label: string }[] = [
  { value: 'individual', label: 'Individual' },
  { value: 'corporation', label: 'Corporation' },
];

function createTrusteeEntry(): CiTrusteeEntry {
  return { id: crypto.randomUUID(), fullName: '', position: '', birthdate: '' };
}

function TrusteesSection({
  entries,
  onChange,
}: {
  entries: CiTrusteeEntry[];
  onChange: (next: CiTrusteeEntry[]) => void;
}) {
  const update = (id: string, data: Partial<CiTrusteeEntry>) =>
    onChange(entries.map((entry) => (entry.id === id ? { ...entry, ...data } : entry)));
  const remove = (id: string) => onChange(entries.filter((entry) => entry.id !== id));
  const add = () => onChange([...entries, createTrusteeEntry()]);

  return (
    <Stack spacing={1.5}>
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>Board of Trustees</Typography>
      <Stack spacing={1.5}>
        {entries.map((entry, index) => (
          <Box key={entry.id} sx={{ p: 2, borderRadius: '11px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
              <Chip
                label={`Trustee ${index + 1}`}
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
                label={requiredLabel('Full Name')}
                value={entry.fullName}
                onChange={(event) => update(entry.id, { fullName: event.target.value })}
                sx={{ ...fieldSx, flex: 2 }}
              />
              <TextField
                label={requiredLabel('Position')}
                value={entry.position}
                onChange={(event) => update(entry.id, { position: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
              <TextField
                label={requiredLabel('Birthdate')}
                type="date"
                InputLabelProps={{ shrink: true }}
                value={entry.birthdate}
                onChange={(event) => update(entry.id, { birthdate: event.target.value })}
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
          Add Trustee
        </Button>
      </Stack>
    </Stack>
  );
}

function createStockholderEntry(): CiStockholderEntry {
  return {
    id: crypto.randomUUID(),
    stockholderType: '',
    name: '',
    amountSubscribed: '',
    amountPaidUp: '',
    percentageShare: '',
    subStockholders: [],
  };
}

function createSubStockholderEntry(): CiSubStockholderEntry {
  return {
    id: crypto.randomUUID(),
    name: '',
    stockholderType: '',
    amountSubscribed: '',
    amountPaidUp: '',
    percentageShare: '',
  };
}

// Label swaps between "Name" and "Company Name" depending on the
// stockholder's own type — before a type is picked, falls back to the
// generic "Name / Company Name" the spec names it as.
function stockholderNameLabel(stockholderType: CiStockholderType, required = true): string {
  const base =
    stockholderType === 'corporation' ? 'Company Name' : stockholderType === 'individual' ? 'Name' : 'Name / Company Name';
  return required ? `${base} *` : base;
}

function StockholdersSection({
  entries,
  onChange,
}: {
  entries: CiStockholderEntry[];
  onChange: (next: CiStockholderEntry[]) => void;
}) {
  const update = (id: string, data: Partial<CiStockholderEntry>) =>
    onChange(entries.map((entry) => (entry.id === id ? { ...entry, ...data } : entry)));
  // Removing a stockholder removes its whole entry, sub-stockholders
  // included — there is no orphaned-sub-array case, since the sub array
  // lives inside the removed entry itself.
  const remove = (id: string) => onChange(entries.filter((entry) => entry.id !== id));
  const add = () => onChange([...entries, createStockholderEntry()]);

  // Sub-stockholder mutations locate the parent stockholder by id, then
  // replace only that parent's own subStockholders array — a sibling
  // stockholder's subStockholders is never touched, since `entries.map`
  // only rewrites the one entry whose id matches `stockholderId`.
  const updateSub = (stockholderId: string, subId: string, data: Partial<CiSubStockholderEntry>) =>
    onChange(
      entries.map((entry) =>
        entry.id !== stockholderId
          ? entry
          : {
              ...entry,
              subStockholders: entry.subStockholders.map((sub) =>
                sub.id === subId ? { ...sub, ...data } : sub
              ),
            }
      )
    );
  const removeSub = (stockholderId: string, subId: string) =>
    onChange(
      entries.map((entry) =>
        entry.id !== stockholderId
          ? entry
          : { ...entry, subStockholders: entry.subStockholders.filter((sub) => sub.id !== subId) }
      )
    );
  const addSub = (stockholderId: string) =>
    onChange(
      entries.map((entry) =>
        entry.id !== stockholderId
          ? entry
          : { ...entry, subStockholders: [...entry.subStockholders, createSubStockholderEntry()] }
      )
    );

  return (
    <Stack spacing={1.5}>
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>Stockholders</Typography>
      <Stack spacing={1.5}>
        {entries.map((entry, index) => (
          <Box key={entry.id} sx={{ p: 2, borderRadius: '11px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
              <Chip
                label={`Stockholder ${index + 1}`}
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
            <Stack spacing={1.5}>
              <RadioRow
                label="Stockholder Type *"
                value={entry.stockholderType}
                options={STOCKHOLDER_TYPE_OPTIONS}
                onChange={(value) => update(entry.id, { stockholderType: value })}
              />
              <TextField
                label={stockholderNameLabel(entry.stockholderType)}
                value={entry.name}
                onChange={(event) => update(entry.id, { name: event.target.value })}
                sx={fieldSx}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <CurrencyField
                  label={requiredLabel('Amount Subscribed')}
                  value={entry.amountSubscribed}
                  onChange={(value) => update(entry.id, { amountSubscribed: value })}
                />
                <CurrencyField
                  label={requiredLabel('Amount Paid')}
                  value={entry.amountPaidUp}
                  onChange={(value) => update(entry.id, { amountPaidUp: value })}
                />
                <PercentageField
                  label={requiredLabel('Percentage Share')}
                  value={entry.percentageShare}
                  onChange={(value) => update(entry.id, { percentageShare: value })}
                />
              </Stack>

              {entry.stockholderType === 'corporation' && (
                <Box sx={{ ml: { sm: 2 }, p: 1.5, borderRadius: '10px', border: '1px solid #EEF0F5', bgcolor: 'common.white' }}>
                  <Stack spacing={1.25}>
                    <SectionLabel>Sub-stockholders</SectionLabel>
                    {entry.subStockholders.map((sub, subIndex) => (
                      <Box key={sub.id} sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #EEF0F5' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Chip
                            label={`Sub ${subIndex + 1}`}
                            size="small"
                            sx={{ bgcolor: '#F5F6FA', color: '#5A6273', fontWeight: 700 }}
                          />
                          <Button
                            onClick={() => removeSub(entry.id, sub.id)}
                            size="small"
                            startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={16} />}
                            sx={{ color: '#F04438' }}
                          >
                            Remove
                          </Button>
                        </Stack>
                        <Stack spacing={1.5}>
                          <RadioRow
                            label="Stockholder Type *"
                            value={sub.stockholderType}
                            options={STOCKHOLDER_TYPE_OPTIONS}
                            onChange={(value) => updateSub(entry.id, sub.id, { stockholderType: value })}
                          />
                          <TextField
                            label={stockholderNameLabel(sub.stockholderType)}
                            value={sub.name}
                            onChange={(event) => updateSub(entry.id, sub.id, { name: event.target.value })}
                            sx={fieldSx}
                          />
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                            <CurrencyField
                              label={requiredLabel('Amount Subscribed')}
                              value={sub.amountSubscribed}
                              onChange={(value) => updateSub(entry.id, sub.id, { amountSubscribed: value })}
                            />
                            <CurrencyField
                              label={requiredLabel('Amount Paid')}
                              value={sub.amountPaidUp}
                              onChange={(value) => updateSub(entry.id, sub.id, { amountPaidUp: value })}
                            />
                            <PercentageField
                              label={requiredLabel('Percentage Share')}
                              value={sub.percentageShare}
                              onChange={(value) => updateSub(entry.id, sub.id, { percentageShare: value })}
                            />
                          </Stack>
                        </Stack>
                      </Box>
                    ))}
                    <Button
                      onClick={() => addSub(entry.id)}
                      variant="outlined"
                      size="small"
                      startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
                      sx={{ ...outlinedNavyButtonSx, alignSelf: 'flex-start' }}
                    >
                      Add Sub-stockholder
                    </Button>
                  </Stack>
                </Box>
              )}
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
          Add Stockholder
        </Button>
      </Stack>
    </Stack>
  );
}

// Resolves the effective business type for the Trustees/Stockholders
// gate: the card's own "⋮" override (report.businessTypeOverride) wins
// if set, otherwise falls back to the application's own
// financialInfo.businessType (as entered at sign-up — 'Corporation' |
// 'Cooperative' | 'Sole Proprietorship' | 'Partnership' | undefined).
// Sole Proprietorship (and anything unrecognised/unset) has neither a
// Board of Trustees nor Stockholders — it's a single owner, which
// Business Profile's own "Owner" field (in the info chips header)
// already covers.
export type CommercialBusinessType = 'cooperative' | 'corporation' | 'partnership' | '';

export function resolveCommercialBusinessType(
  businessTypeOverride: CommercialBusinessType,
  applicationBusinessType: string | undefined
): CommercialBusinessType {
  if (businessTypeOverride) return businessTypeOverride;
  switch (applicationBusinessType) {
    case 'Cooperative':
      return 'cooperative';
    case 'Corporation':
      return 'corporation';
    case 'Partnership':
      return 'partnership';
    default:
      return '';
  }
}

const BUSINESS_TYPE_MENU_OPTIONS: { value: 'cooperative' | 'corporation' | 'partnership'; label: string }[] = [
  { value: 'cooperative', label: 'Cooperative' },
  { value: 'corporation', label: 'Corporation' },
  { value: 'partnership', label: 'Partnership' },
];

// The "⋮" menu on the Management and Ownership card header — lets the
// officer override which of Board of Trustees / Stockholders renders,
// regardless of what financialInfo.businessType says. Defaults to
// whatever resolveCommercialBusinessType() already resolved to, so
// opening the menu never looks like it reset anything.
function BusinessTypeMenu({
  value,
  onChange,
}: {
  value: CommercialBusinessType;
  onChange: (value: 'cooperative' | 'corporation' | 'partnership') => void;
}) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  return (
    <>
      <IconButton
        onClick={(event) => setAnchorEl(event.currentTarget)}
        aria-label="Business type options"
        size="small"
        sx={iconButtonBorderedSx}
      >
        <Iconify icon="eva:more-vertical-fill" width={18} />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { sx: { mt: 0.5, minWidth: 200, borderRadius: '10px' } } }}
      >
        {BUSINESS_TYPE_MENU_OPTIONS.map((option) => (
          <MenuItem
            key={option.value}
            selected={value === option.value}
            onClick={() => {
              setAnchorEl(null);
              onChange(option.value);
            }}
            sx={{ fontSize: 13.5 }}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export type CommercialSectionKey =
  | 'fieldInvestigation'
  | 'locationFacilities'
  | 'tradeChecking'
  | 'managementAndOwnership'
  | 'comments';

export const COMMERCIAL_SECTION_NAV_ITEMS: { key: CommercialSectionKey; label: string }[] = [
  { key: 'managementAndOwnership', label: 'Management and Ownership' },
  { key: 'locationFacilities', label: 'Location / Facilities' },
  { key: 'fieldInvestigation', label: 'Field Investigation' },
  { key: 'tradeChecking', label: 'Trade Checking' },
  { key: 'comments', label: 'Comments' },
];

export function CommercialReportSections({
  report,
  onChange,
  sectionRefs,
  expandedSections,
  onToggleSection,
  applicationBusinessType,
}: {
  report: CiReport;
  onChange: (data: Partial<CiReport>) => void;
  sectionRefs: React.MutableRefObject<Map<string, HTMLDivElement | null>>;
  expandedSections: Record<CommercialSectionKey, boolean>;
  onToggleSection: (key: CommercialSectionKey) => void;
  applicationBusinessType: string | undefined;
}) {
  const effectiveBusinessType = resolveCommercialBusinessType(
    report.businessTypeOverride,
    applicationBusinessType
  );

  return (
    <Stack spacing={2.5}>
      <Box
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('managementAndOwnership', el); }}
        sx={adminCardSx}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5} sx={{ mb: 2.5 }}>
          <Stack spacing={0.25}>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>Management and Ownership</Typography>
            <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
              Who runs the business and who owns it.
            </Typography>
          </Stack>
          <BusinessTypeMenu
            value={effectiveBusinessType}
            onChange={(businessTypeOverride) => onChange({ businessTypeOverride })}
          />
        </Stack>
        <Stack spacing={2.5}>
          <ManagementSection
            entries={report.management}
            onChange={(management) => onChange({ management })}
          />
          {effectiveBusinessType === 'cooperative' && (
            <TrusteesSection
              entries={report.trustees}
              onChange={(trustees) => onChange({ trustees })}
            />
          )}
          {(effectiveBusinessType === 'corporation' || effectiveBusinessType === 'partnership') && (
            <StockholdersSection
              entries={report.stockholders}
              onChange={(stockholders) => onChange({ stockholders })}
            />
          )}
          {effectiveBusinessType === '' && (
            <Typography sx={{ fontSize: 13, color: '#8891A6', fontStyle: 'italic' }}>
              Select a business type (via the ⋮ menu above) to show Board of Trustees or Stockholders.
            </Typography>
          )}
        </Stack>
      </Box>

      <Box
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('locationFacilities', el); }}
        sx={adminCardSx}
      >
        <Stack spacing={0.25} sx={{ mb: 2.5 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>Location / Facilities</Typography>
        </Stack>
        <Stack spacing={2}>
          <TextField
            label={requiredLabel('Type of Construction / Description')}
            value={report.premisesConstructionDescription}
            onChange={(event) => onChange({ premisesConstructionDescription: event.target.value })}
            multiline
            minRows={3}
            sx={fieldSx}
          />
          <TextField
            label={requiredLabel('Area Description')}
            value={report.premisesAreaDescription}
            onChange={(event) => onChange({ premisesAreaDescription: event.target.value })}
            multiline
            minRows={3}
            sx={fieldSx}
          />
          <CheckboxPairRow
            label="Location Owned or rented? If rented, how much?"
            value={report.locationOwned}
            trueLabel="Owned"
            falseLabel="Rented"
            trueValue="owned"
            falseValue="rented"
            onChange={(value) => onChange({ locationOwned: value })}
          />
          <CheckboxPairRow
            label="Equipment owned or leased"
            value={report.equipmentOwned}
            trueLabel="Owned"
            falseLabel="Leased"
            trueValue="owned"
            falseValue="leased"
            onChange={(value) => onChange({ equipmentOwned: value })}
          />
          <RichTextField
            label="Description *"
            value={report.facilitiesDescription}
            onChange={(html) => onChange({ facilitiesDescription: html })}
            placeholder="Details about the location and equipment…"
          />
        </Stack>
      </Box>

      <Box
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('fieldInvestigation', el); }}
        sx={adminCardSx}
      >
        <Stack spacing={0.25} sx={{ mb: 2.5 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>Field Investigation</Typography>
        </Stack>
        <Stack spacing={1.5}>
          <SectionLabel>Business profile</SectionLabel>
          <Typography sx={{ fontSize: 12.5, color: '#8891A6', mt: -1 }}>
            From the business applied on the Call Report.
          </Typography>
          <TextField
            label="Line of Business"
            value={report.businessLineOfBusiness}
            onChange={(event) => onChange({ businessLineOfBusiness: event.target.value })}
            sx={fieldSx}
          />
        </Stack>
      </Box>

      <Box
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('tradeChecking', el); }}
        sx={adminCardSx}
      >
        <Stack spacing={0.25} sx={{ mb: 2.5 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>Trade Checking</Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
            Customers and suppliers verified during the visit.
          </Typography>
        </Stack>
        <Stack spacing={2.5}>
          <CommercialTradeCheckingSection
            title="Customers"
            entries={report.commercialCustomers}
            onChange={(commercialCustomers) => onChange({ commercialCustomers })}
          />
          <CommercialTradeCheckingSection
            title="Suppliers"
            entries={report.commercialSuppliers}
            onChange={(commercialSuppliers) => onChange({ commercialSuppliers })}
          />
        </Stack>
      </Box>

      <Box
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('comments', el); }}
        sx={adminCardSx}
      >
        <Stack spacing={0.25} sx={{ mb: 2.5 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>Comments</Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
            Overall remarks from the investigation.
          </Typography>
        </Stack>
        <RichTextField
          label="Comments"
          value={report.commentsNotes}
          onChange={(html) => onChange({ commentsNotes: html })}
          placeholder="Any additional remarks…"
        />
      </Box>
    </Stack>
  );
}
