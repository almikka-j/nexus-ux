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

import type {
  CiReport,
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
              <Typography variant="overline" sx={{ fontSize: 11, color: '#A0A7B5' }}>Personal</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="Full name"
                  value={entry.fullName}
                  onChange={(event) => update(entry.id, { fullName: event.target.value })}
                  sx={{ ...fieldSx, flex: 2 }}
                />
                <TextField
                  label="Birthdate"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={entry.birthdate}
                  onChange={(event) => update(entry.id, { birthdate: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Birth place"
                  value={entry.birthPlace}
                  onChange={(event) => update(entry.id, { birthPlace: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="Nationality"
                  value={entry.nationality}
                  onChange={(event) => update(entry.id, { nationality: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Spouse/partner"
                  value={entry.spousePartner}
                  onChange={(event) => update(entry.id, { spousePartner: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Home address"
                  value={entry.homeAddress}
                  onChange={(event) => update(entry.id, { homeAddress: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>
              <Typography variant="overline" sx={{ fontSize: 11, color: '#A0A7B5' }}>Position and Business</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="Job title"
                  value={entry.jobTitle}
                  onChange={(event) => update(entry.id, { jobTitle: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Education"
                  value={entry.education}
                  onChange={(event) => update(entry.id, { education: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Other business"
                  value={entry.otherBusiness}
                  onChange={(event) => update(entry.id, { otherBusiness: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>
              <Typography variant="overline" sx={{ fontSize: 11, color: '#A0A7B5' }}>Identification and Contact</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="TIN"
                  value={entry.tin}
                  onChange={(event) => update(entry.id, { tin: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Mobile number"
                  value={entry.mobileNumber}
                  onChange={(event) => update(entry.id, { mobileNumber: event.target.value })}
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

function createStockholderEntry(): CiStockholderEntry {
  return {
    id: crypto.randomUUID(),
    stockholderName: '',
    amountSubscribed: '',
    amountPaidUp: '',
    isCorporation: '',
    subStockholders: [],
  };
}

function createSubStockholderEntry(): CiSubStockholderEntry {
  return { id: crypto.randomUUID(), name: '', amountSubscribed: '', amountPaidUp: '' };
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
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>Major stockholders</Typography>
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
              <Typography variant="overline" sx={{ fontSize: 11, color: '#A0A7B5' }}>Stockholder</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="Stockholder name"
                  value={entry.stockholderName}
                  onChange={(event) => update(entry.id, { stockholderName: event.target.value })}
                  sx={{ ...fieldSx, flex: 2 }}
                />
                <TextField
                  label="Amount subscribed"
                  value={entry.amountSubscribed}
                  onChange={(event) => update(entry.id, { amountSubscribed: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Amount paid-up"
                  value={entry.amountPaidUp}
                  onChange={(event) => update(entry.id, { amountPaidUp: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>

              <RadioRow
                label="Is the stockholder a corporation?"
                value={entry.isCorporation}
                options={YES_NO_OPTIONS}
                onChange={(value) => update(entry.id, { isCorporation: value })}
              />

              {entry.isCorporation === 'yes' && (
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
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                          <TextField
                            label="Sub-stockholder name"
                            value={sub.name}
                            onChange={(event) => updateSub(entry.id, sub.id, { name: event.target.value })}
                            sx={{ ...fieldSx, flex: 2 }}
                          />
                          <TextField
                            label="Amount subscribed"
                            value={sub.amountSubscribed}
                            onChange={(event) => updateSub(entry.id, sub.id, { amountSubscribed: event.target.value })}
                            sx={{ ...fieldSx, flex: 1 }}
                          />
                          <TextField
                            label="Amount paid-up"
                            value={sub.amountPaidUp}
                            onChange={(event) => updateSub(entry.id, sub.id, { amountPaidUp: event.target.value })}
                            sx={{ ...fieldSx, flex: 1 }}
                          />
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
                      Add sub-stockholder
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
          Add stockholder
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
      <Stack spacing={0.25}>
        <SectionLabel>Business profile</SectionLabel>
        <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>
          From the business applied on the Call Report.
        </Typography>
      </Stack>
      <Stack spacing={1.5}>
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
        <SectionLabel>Location and facility</SectionLabel>
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

      <Box sx={{ p: 2, borderRadius: '13px', border: '1px solid #EEF0F5', bgcolor: 'common.white' }}>
        <Stack spacing={0.25} sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>Trade Checking</Typography>
          <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>
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

      <Box sx={{ p: 2, borderRadius: '13px', border: '1px solid #EEF0F5', bgcolor: 'common.white' }}>
        <Stack spacing={0.25} sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>Management and Ownership</Typography>
          <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>
            Who runs the business and who owns it.
          </Typography>
        </Stack>
        <Stack spacing={2.5}>
          <ManagementSection
            entries={report.management}
            onChange={(management) => onChange({ management })}
          />
          <StockholdersSection
            entries={report.stockholders}
            onChange={(stockholders) => onChange({ stockholders })}
          />
        </Stack>
      </Box>

      <Stack spacing={0.25}>
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>Comments</Typography>
        <Typography sx={{ fontSize: 12.5, color: '#8891A6', mb: 1 }}>
          Overall remarks from the investigation.
        </Typography>
        <RichTextField
          label="Comments"
          value={report.commentsNotes}
          onChange={(html) => onChange({ commentsNotes: html })}
          placeholder="Any additional remarks…"
        />
      </Stack>
    </Stack>
  );
}
