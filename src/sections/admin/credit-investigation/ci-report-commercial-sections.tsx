'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { NumericFormat } from 'react-number-format';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';
import { FileThumbnail } from 'src/components/file-thumbnail';
import { RichTextField } from 'src/components/rich-text-field';
import { TONE_COLORS, outlinedNavyButtonSx, iconButtonBorderedSx } from 'src/components/admin-ui';

import { fieldSx, SectionLabel, YES_NO_OPTIONS, requiredLabel } from './ci-report-card';

import type {
  CiReport,
  CiTrusteeEntry,
  CiStockholderType,
  CiCommercialTradeEntry,
  CiManagementEntry,
  CiStockholderEntry,
  CiSubStockholderEntry,
  CiCommercialBankAccountEntry,
  CiCommercialDocumentEntry,
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
    <Stack spacing={1.25}>
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>{title}</Typography>
      <Stack spacing={1.25}>
        {entries.map((entry, index) => (
          <Box key={entry.id} sx={{ p: 1.5, borderRadius: '11px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Chip
                label={`${title.slice(0, -1)} ${index + 1}`}
                size="small"
                sx={{ bgcolor: '#EEF1FE', color: '#3448B0', fontWeight: 700, cursor: 'default', pointerEvents: 'none' }}
              />
              <IconButton
                size="small"
                onClick={() => remove(entry.id)}
                aria-label={`Remove ${title.slice(0, -1).toLowerCase()}`}
              >
                <Iconify icon="mingcute:close-line" width={16} />
              </IconButton>
            </Stack>
            <Stack spacing={1.25}>
              <TextField
                fullWidth
                size="small"
                label={requiredLabel('Company Name')}
                value={entry.companyName}
                onChange={(event) => update(entry.id, { companyName: event.target.value })}
                sx={fieldSx}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  size="small"
                  label={requiredLabel("Representative's Name")}
                  value={entry.contactPerson}
                  onChange={(event) => update(entry.id, { contactPerson: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  size="small"
                  label={requiredLabel("Representative's Position")}
                  value={entry.position}
                  onChange={(event) => update(entry.id, { position: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  size="small"
                  label="Email Address"
                  value={entry.email}
                  onChange={(event) => update(entry.id, { email: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  size="small"
                  label={requiredLabel("Company's Tel No.")}
                  value={entry.telephoneNo}
                  onChange={(event) => update(entry.id, { telephoneNo: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  size="small"
                  label="Local No"
                  value={entry.localExtension}
                  onChange={(event) => update(entry.id, { localExtension: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  size="small"
                  label="Representative's Mobile No."
                  value={entry.mobileNumber}
                  onChange={(event) => update(entry.id, { mobileNumber: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  size="small"
                  label={requiredLabel('Payment Terms')}
                  value={entry.paymentTerms}
                  onChange={(event) => update(entry.id, { paymentTerms: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  size="small"
                  label={requiredLabel('Years of Business Contract')}
                  value={entry.yearsOfContract}
                  onChange={(event) => update(entry.id, { yearsOfContract: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>
              <TextField
                fullWidth
                size="small"
                label={requiredLabel('Transaction Details')}
                value={entry.transactionDetails}
                onChange={(event) => update(entry.id, { transactionDetails: event.target.value })}
                multiline
                minRows={3}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label={requiredLabel('Remarks')}
                value={entry.remarks}
                onChange={(event) => update(entry.id, { remarks: event.target.value })}
                multiline
                minRows={3}
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
    <Stack spacing={1.25}>
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>Management</Typography>
      <Stack spacing={1.25}>
        {entries.map((entry, index) => (
          <Box key={entry.id} sx={{ p: 1.5, borderRadius: '11px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Chip
                label={`Manager ${index + 1}`}
                size="small"
                sx={{ bgcolor: '#EEF1FE', color: '#3448B0', fontWeight: 700, cursor: 'default', pointerEvents: 'none' }}
              />
              <IconButton size="small" onClick={() => remove(entry.id)} aria-label="Remove manager">
                <Iconify icon="mingcute:close-line" width={16} />
              </IconButton>
            </Stack>
            <Stack spacing={1.25}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  size="small"
                  label={requiredLabel('Name')}
                  value={entry.fullName}
                  onChange={(event) => update(entry.id, { fullName: event.target.value })}
                  sx={{ ...fieldSx, flex: 2 }}
                />
                <TextField
                  size="small"
                  label={requiredLabel('Current Title')}
                  value={entry.jobTitle}
                  onChange={(event) => update(entry.id, { jobTitle: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  size="small"
                  label={requiredLabel('Nationality')}
                  value={entry.nationality}
                  onChange={(event) => update(entry.id, { nationality: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  size="small"
                  label={requiredLabel('Educational Attainment')}
                  value={entry.education}
                  onChange={(event) => update(entry.id, { education: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  size="small"
                  label="Other Business Affiliations"
                  value={entry.otherBusiness}
                  onChange={(event) => update(entry.id, { otherBusiness: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  size="small"
                  label={requiredLabel('Residence Address')}
                  value={entry.homeAddress}
                  onChange={(event) => update(entry.id, { homeAddress: event.target.value })}
                  sx={{ ...fieldSx, flex: 2 }}
                />
                <TextField
                  size="small"
                  label="Spouse / Partner"
                  value={entry.spousePartner}
                  onChange={(event) => update(entry.id, { spousePartner: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  size="small"
                  label={requiredLabel('Birthday')}
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={entry.birthdate}
                  onChange={(event) => update(entry.id, { birthdate: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  size="small"
                  label={requiredLabel('Place of Birth')}
                  value={entry.birthPlace}
                  onChange={(event) => update(entry.id, { birthPlace: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  size="small"
                  label={requiredLabel('Mobile Number')}
                  value={entry.mobileNumber}
                  onChange={(event) => update(entry.id, { mobileNumber: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  size="small"
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
      size="small"
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
      size="small"
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
    <Stack spacing={1.25}>
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>Board of Trustees</Typography>
      <Stack spacing={1.25}>
        {entries.map((entry, index) => (
          <Box key={entry.id} sx={{ p: 1.5, borderRadius: '11px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Chip
                label={`Trustee ${index + 1}`}
                size="small"
                sx={{ bgcolor: '#EEF1FE', color: '#3448B0', fontWeight: 700, cursor: 'default', pointerEvents: 'none' }}
              />
              <IconButton size="small" onClick={() => remove(entry.id)} aria-label="Remove trustee">
                <Iconify icon="mingcute:close-line" width={16} />
              </IconButton>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                size="small"
                label={requiredLabel('Full Name')}
                value={entry.fullName}
                onChange={(event) => update(entry.id, { fullName: event.target.value })}
                sx={{ ...fieldSx, flex: 2 }}
              />
              <TextField
                size="small"
                label={requiredLabel('Position')}
                value={entry.position}
                onChange={(event) => update(entry.id, { position: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
              <TextField
                size="small"
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
    <Stack spacing={1.25}>
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>Stockholders</Typography>
      <Stack spacing={1.25}>
        {entries.map((entry, index) => (
          <Box key={entry.id} sx={{ p: 1.5, borderRadius: '11px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Chip
                label={`Stockholder ${index + 1}`}
                size="small"
                sx={{ bgcolor: '#EEF1FE', color: '#3448B0', fontWeight: 700, cursor: 'default', pointerEvents: 'none' }}
              />
              <IconButton size="small" onClick={() => remove(entry.id)} aria-label="Remove stockholder">
                <Iconify icon="mingcute:close-line" width={16} />
              </IconButton>
            </Stack>
            <Stack spacing={1.25}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  select
                  size="small"
                  label={requiredLabel('Stockholder Type')}
                  value={entry.stockholderType}
                  onChange={(event) => update(entry.id, { stockholderType: event.target.value as CiStockholderType })}
                  sx={{ ...fieldSx, flex: 1 }}
                >
                  {STOCKHOLDER_TYPE_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  size="small"
                  label={stockholderNameLabel(entry.stockholderType)}
                  value={entry.name}
                  onChange={(event) => update(entry.id, { name: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>
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
                <Box sx={{ ml: { sm: 2 }, p: 1.25, borderRadius: '10px', border: '1px solid #EEF0F5', bgcolor: 'common.white' }}>
                  <Stack spacing={1}>
                    <SectionLabel>Sub-stockholders</SectionLabel>
                    {entry.subStockholders.map((sub, subIndex) => (
                      <Box key={sub.id} sx={{ p: 1.25, borderRadius: '10px', border: '1px solid #EEF0F5' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
                          <Chip
                            label={`Sub ${subIndex + 1}`}
                            size="small"
                            sx={{ bgcolor: '#F5F6FA', color: '#5A6273', fontWeight: 700, cursor: 'default', pointerEvents: 'none' }}
                          />
                          <IconButton
                            size="small"
                            onClick={() => removeSub(entry.id, sub.id)}
                            aria-label="Remove sub-stockholder"
                          >
                            <Iconify icon="mingcute:close-line" width={16} />
                          </IconButton>
                        </Stack>
                        <Stack spacing={1.25}>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                            <TextField
                              select
                              size="small"
                              label={requiredLabel('Stockholder Type')}
                              value={sub.stockholderType}
                              onChange={(event) =>
                                updateSub(entry.id, sub.id, { stockholderType: event.target.value as CiStockholderType })
                              }
                              sx={{ ...fieldSx, flex: 1 }}
                            >
                              {STOCKHOLDER_TYPE_OPTIONS.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                  {option.label}
                                </MenuItem>
                              ))}
                            </TextField>
                            <TextField
                              size="small"
                              label={stockholderNameLabel(sub.stockholderType)}
                              value={sub.name}
                              onChange={(event) => updateSub(entry.id, sub.id, { name: event.target.value })}
                              sx={{ ...fieldSx, flex: 1 }}
                            />
                          </Stack>
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

function createCommercialBankAccountEntry(): CiCommercialBankAccountEntry {
  return {
    id: Math.random().toString(36).slice(2),
    bankName: '',
    branch: '',
    accountNumber: '',
    accountType: '',
    averageDailyBalance: '',
    dateVerified: '',
    experience: '',
    contactPerson: '',
    contactNumber: '',
  };
}

function CommercialBankVerificationSection({
  entries,
  onChange,
}: {
  entries: CiCommercialBankAccountEntry[];
  onChange: (entries: CiCommercialBankAccountEntry[]) => void;
}) {
  const update = (id: string, patch: Partial<CiCommercialBankAccountEntry>) => {
    onChange(entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  };

  const remove = (id: string) => {
    onChange(entries.filter((entry) => entry.id !== id));
  };

  const add = () => {
    onChange([...entries, createCommercialBankAccountEntry()]);
  };

  return (
    <Stack spacing={1.25}>
      {entries.map((entry, index) => (
        <Box key={entry.id} sx={{ p: 1.5, borderRadius: '11px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
        <Stack spacing={1.25}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
            <Chip
              label={`Bank ${index + 1}`}
              size="small"
              sx={{ bgcolor: '#EEF1FE', color: '#3448B0', fontWeight: 700, cursor: 'default', pointerEvents: 'none' }}
            />
            <IconButton size="small" onClick={() => remove(entry.id)} aria-label="Remove bank">
              <Iconify icon="mingcute:close-line" width={16} />
            </IconButton>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              fullWidth
              size="small"
              label={requiredLabel('Bank Name')}
              value={entry.bankName}
              onChange={(event) => update(entry.id, { bankName: event.target.value })}
              sx={fieldSx}
            />
            <TextField
              fullWidth
              size="small"
              label={requiredLabel('Branch')}
              value={entry.branch}
              onChange={(event) => update(entry.id, { branch: event.target.value })}
              sx={fieldSx}
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              fullWidth
              size="small"
              label={requiredLabel('Account No.')}
              value={entry.accountNumber}
              onChange={(event) => update(entry.id, { accountNumber: event.target.value })}
              sx={fieldSx}
            />
            <TextField
              fullWidth
              size="small"
              label={requiredLabel('Account Type')}
              value={entry.accountType}
              onChange={(event) => update(entry.id, { accountType: event.target.value })}
              sx={fieldSx}
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <CurrencyField
              label="Ave. Daily Balance"
              value={entry.averageDailyBalance}
              onChange={(averageDailyBalance) => update(entry.id, { averageDailyBalance })}
            />
            <TextField
              fullWidth
              size="small"
              type="date"
              label={requiredLabel('Date Verified')}
              value={entry.dateVerified}
              onChange={(event) => update(entry.id, { dateVerified: event.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ ...fieldSx, flex: 1 }}
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              fullWidth
              size="small"
              label={requiredLabel('Experience')}
              value={entry.experience}
              onChange={(event) => update(entry.id, { experience: event.target.value })}
              sx={fieldSx}
            />
            <TextField
              fullWidth
              size="small"
              label={requiredLabel('Contact Person')}
              value={entry.contactPerson}
              onChange={(event) => update(entry.id, { contactPerson: event.target.value })}
              sx={fieldSx}
            />
            <TextField
              fullWidth
              size="small"
              label={requiredLabel('Contact No.')}
              value={entry.contactNumber}
              onChange={(event) => update(entry.id, { contactNumber: event.target.value })}
              sx={fieldSx}
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
        Add Bank
      </Button>
    </Stack>
  );
}

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];

// FileThumbnail infers file type from an extension on the file's own URL,
// but these are blob: object URLs with no extension — so image-ness is
// checked here, against the original fileName, instead.
function isImageFile(fileName: string): boolean {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTENSIONS.includes(extension);
}

function createCommercialDocumentEntry(file: File): CiCommercialDocumentEntry {
  return {
    id: Math.random().toString(36).slice(2),
    label: '',
    fileName: file.name,
    fileUrl: URL.createObjectURL(file),
    uploadedAt: new Date().toISOString(),
  };
}

function AdditionalDocumentsSection({
  entries,
  onChange,
}: {
  entries: CiCommercialDocumentEntry[];
  onChange: (entries: CiCommercialDocumentEntry[]) => void;
}) {
  const { getRootProps, getInputProps } = useDropzone({
    multiple: true,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;
      const newEntries = acceptedFiles.map((file) => createCommercialDocumentEntry(file));
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
                <FileThumbnail
                  file={entry.fileName}
                  sx={{ width: 40, height: 40, flexShrink: 0 }}
                />
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

export type CommercialSectionKey =
  | 'locationFacilities'
  | 'tradeChecking'
  | 'managementAndOwnership'
  | 'bankVerification'
  | 'comments'
  | 'additionalDocuments';

export const COMMERCIAL_SECTION_NAV_ITEMS: { key: CommercialSectionKey; label: string }[] = [
  { key: 'managementAndOwnership', label: 'Management and Ownership' },
  { key: 'locationFacilities', label: 'Location / Facilities' },
  { key: 'tradeChecking', label: 'Trade Checking' },
  { key: 'bankVerification', label: 'Bank Verification' },
  { key: 'comments', label: 'Comments' },
  { key: 'additionalDocuments', label: 'Additional Documents' },
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
      <Stack
        spacing={1.5}
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('managementAndOwnership', el); }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
          <SectionLabel>Management and Ownership</SectionLabel>
          <BusinessTypeMenu
            value={effectiveBusinessType}
            onChange={(businessTypeOverride) => onChange({ businessTypeOverride })}
          />
        </Stack>
        <Stack spacing={1.75}>
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
      </Stack>

      <Divider sx={{ borderColor: '#EEF0F5' }} />

      <Stack
        spacing={1.5}
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('locationFacilities', el); }}
      >
        <SectionLabel>Location / Facilities</SectionLabel>
        <Stack spacing={1.5}>
          <TextField
            fullWidth
            size="small"
            label={requiredLabel('Type of Construction / Description')}
            value={report.premisesConstructionDescription}
            onChange={(event) => onChange({ premisesConstructionDescription: event.target.value })}
            multiline
            minRows={2}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            size="small"
            label={requiredLabel('Area Description')}
            value={report.premisesAreaDescription}
            onChange={(event) => onChange({ premisesAreaDescription: event.target.value })}
            multiline
            minRows={2}
            sx={fieldSx}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              select
              size="small"
              label="Location Owned or Rented"
              value={report.locationOwned}
              onChange={(event) => onChange({ locationOwned: event.target.value as typeof report.locationOwned })}
              sx={{ ...fieldSx, flex: 1 }}
            >
              <MenuItem value="owned">Owned</MenuItem>
              <MenuItem value="rented">Rented</MenuItem>
            </TextField>
            <TextField
              select
              size="small"
              label="Equipment Owned or Leased"
              value={report.equipmentOwned}
              onChange={(event) => onChange({ equipmentOwned: event.target.value as typeof report.equipmentOwned })}
              sx={{ ...fieldSx, flex: 1 }}
            >
              <MenuItem value="owned">Owned</MenuItem>
              <MenuItem value="leased">Leased</MenuItem>
            </TextField>
          </Stack>
          <RichTextField
            label="Description *"
            value={report.facilitiesDescription}
            onChange={(html) => onChange({ facilitiesDescription: html })}
            placeholder="Details about the location and equipment…"
          />
        </Stack>
      </Stack>

      <Divider sx={{ borderColor: '#EEF0F5' }} />

      <Stack
        spacing={1.5}
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('tradeChecking', el); }}
      >
        <SectionLabel>Trade Checking</SectionLabel>
        <Stack spacing={1.75}>
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
      </Stack>

      <Divider sx={{ borderColor: '#EEF0F5' }} />

      <Stack
        spacing={1.5}
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('bankVerification', el); }}
      >
        <SectionLabel>Bank Verification</SectionLabel>
        <CommercialBankVerificationSection
          entries={report.commercialBankAccounts}
          onChange={(commercialBankAccounts) => onChange({ commercialBankAccounts })}
        />
      </Stack>

      <Divider sx={{ borderColor: '#EEF0F5' }} />

      <Stack
        spacing={1.5}
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('comments', el); }}
      >
        <SectionLabel>Comments</SectionLabel>
        <RichTextField
          label="Comments"
          value={report.commentsNotes}
          onChange={(html) => onChange({ commentsNotes: html })}
          placeholder="Any additional remarks…"
        />
      </Stack>

      <Divider sx={{ borderColor: '#EEF0F5' }} />

      <Stack
        spacing={1.5}
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('additionalDocuments', el); }}
      >
        <SectionLabel>Additional Documents</SectionLabel>
        <AdditionalDocumentsSection
          entries={report.commercialDocuments}
          onChange={(commercialDocuments) => onChange({ commercialDocuments })}
        />
      </Stack>
    </Stack>
  );
}
