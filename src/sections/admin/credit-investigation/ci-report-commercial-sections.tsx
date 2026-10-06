'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';
import { outlinedNavyButtonSx } from 'src/components/admin-ui';
import { RichTextField } from 'src/components/rich-text-field';

import { RadioRow } from '../call-report/call-report-types';
import { fieldSx, SectionLabel, YES_NO_OPTIONS } from './ci-report-card';

import type { CiReport, CiCommercialTradeEntry } from 'src/auth/admin-context';

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
    <Stack spacing={1.5}>
      <SectionLabel>Trade Checking — {title}</SectionLabel>
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
          Add {title.slice(0, -1)}
        </Button>
      </Stack>
    </Stack>
  );
}

export function CommercialReportSections({
  report,
  onChange,
}: {
  report: CiReport;
  onChange: (data: Partial<CiReport>) => void;
}) {
  return (
    <Stack spacing={2.5}>
      <Stack spacing={1.5}>
        <SectionLabel>Business Profile</SectionLabel>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            label="Owner"
            value={report.businessOwner}
            onChange={(event) => onChange({ businessOwner: event.target.value })}
            sx={{ ...fieldSx, flex: 1 }}
          />
          <TextField
            label="Territory"
            value={report.businessTerritory}
            onChange={(event) => onChange({ businessTerritory: event.target.value })}
            sx={{ ...fieldSx, flex: 1 }}
          />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            label="No. of regular employees"
            value={report.businessRegularEmployees}
            onChange={(event) => onChange({ businessRegularEmployees: event.target.value })}
            sx={{ ...fieldSx, flex: 1 }}
          />
          <TextField
            label="No. of contractual employees"
            value={report.businessContractualEmployees}
            onChange={(event) => onChange({ businessContractualEmployees: event.target.value })}
            sx={{ ...fieldSx, flex: 1 }}
          />
        </Stack>
      </Stack>

      <Stack spacing={1.5}>
        <SectionLabel>Location and Facility</SectionLabel>
        <Box sx={{ p: 2, borderRadius: '11px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
          <Stack spacing={2}>
            <Typography variant="overline" sx={{ fontSize: 11, color: '#A0A7B5' }}>Premises</Typography>
            <TextField
              label="Construction description"
              value={report.premisesConstructionDescription}
              onChange={(event) => onChange({ premisesConstructionDescription: event.target.value })}
              sx={fieldSx}
            />
            <TextField
              label="Area description"
              value={report.premisesAreaDescription}
              onChange={(event) => onChange({ premisesAreaDescription: event.target.value })}
              sx={fieldSx}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-end' }}>
              <RadioRow
                label="Location owned?"
                value={report.locationOwned}
                options={YES_NO_OPTIONS}
                onChange={(value) => onChange({ locationOwned: value })}
              />
              <TextField
                label="Own or rent (details)"
                value={report.locationOwnRentDetails}
                onChange={(event) => onChange({ locationOwnRentDetails: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
            </Stack>

            <Typography variant="overline" sx={{ fontSize: 11, color: '#A0A7B5' }}>Equipment</Typography>
            <TextField
              label="Equipment"
              value={report.equipmentDescription}
              onChange={(event) => onChange({ equipmentDescription: event.target.value })}
              sx={fieldSx}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-end' }}>
              <RadioRow
                label="Equipment owned?"
                value={report.equipmentOwned}
                options={YES_NO_OPTIONS}
                onChange={(value) => onChange({ equipmentOwned: value })}
              />
              <TextField
                label="Equipment lease price"
                value={report.equipmentLeasePrice}
                onChange={(event) => onChange({ equipmentLeasePrice: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
            </Stack>
          </Stack>
        </Box>
      </Stack>

      <CommercialTradeCheckingSection
        title="Suppliers"
        entries={report.commercialSuppliers}
        onChange={(commercialSuppliers) => onChange({ commercialSuppliers })}
      />
      <CommercialTradeCheckingSection
        title="Customers"
        entries={report.commercialCustomers}
        onChange={(commercialCustomers) => onChange({ commercialCustomers })}
      />

      <RichTextField
        label="Comments"
        value={report.commentsNotes}
        onChange={(html) => onChange({ commentsNotes: html })}
        placeholder="Any additional remarks…"
      />
    </Stack>
  );
}
