'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';
import { outlinedNavyButtonSx } from 'src/components/admin-ui';
import { RichTextField } from 'src/components/rich-text-field';
import { fCurrency } from 'src/utils/format-number';

import { parseNum } from 'src/sections/admin/financial-summary-calcs';

// Real Estate's own local SectionLabel (bare label, no rule under it) —
// sections are separated by explicit Dividers below, same as Real Estate.
import { SectionLabel, MultiPhotoDropzone } from './appraiser-assignment-card';

import type { AppraisalMachineriesReport, AppraisalMachineryEntry } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Machineries Appraisal Report fields — Task 5 of the 2026-10-24
// Appraisal Chattel/Machineries plan. Matches the printed Machineries
// Appraisal Report form: memo header fields (To/Thru/From/Date
// Report/Date Inspected/Subject), a free-text "I. Description of
// Equipments" box, the repeatable Machineries list (mirroring
// bank-loans-modal.tsx's LoanSummaryLine/LoanRowForm row-collapse
// pattern), the computed Total Appraised Value display, Loanable
// Percent/Amount + manually-typed Round Off, a rich-text "II.
// Qualification & Remarks", and File Attachment.
//
// Every field binds straight to AdminContext via the bundle-scoped
// setters from Task 3 (setAppraisalBundleMachineriesReport,
// add/update/removeAppraisalMachineryEntry) — nothing besides the
// row-expansion UI state is held locally, same "everything lives in
// AdminContext" convention every other admin report form in this app
// follows.
//
// `fieldSx` is intentionally duplicated here rather than imported from
// appraisal-chattel-report-fields.tsx — this app's established
// convention is that small presentational constants like this get
// copied per file rather than shared, to minimize cross-file coupling.
// ----------------------------------------------------------------------

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    fontSize: 14,
    '&.Mui-disabled': {
      bgcolor: '#F5F6FA',
      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E1E4ED' },
    },
  },
  '& .MuiInputBase-input.Mui-disabled': {
    WebkitTextFillColor: '#14172A',
    color: '#14172A',
  },
};

// ----------------------------------------------------------------------
// Sticky left section nav items for this form. The sidebar itself is
// rendered by the parent AppraiserAssignmentCard (as a sibling of the
// white card, same as Real Estate's), which also owns this form's
// `sectionRefs` and active-section state and passes the refs down via the
// `sectionRefs` prop so the sections below can register themselves.
// Exported so the parent can feed this list to AppraisalSectionNav.
// "Qualification & Remarks" (the printed form's own "II.") gets its own nav entry distinct
// from "Appraised Value" (the computed/entered value fields plus Loanable
// Percent/Amount) even though both currently render inside the same JSX
// Stack — they're two separate steps in the printed form, and a user
// scanning the nav would expect to jump to the remarks rich-text box
// without it being lumped under "Appraised Value".
// ----------------------------------------------------------------------
export type MachineriesSectionKey =
  | 'reportDetails'
  | 'descriptionOfEquipments'
  | 'machineries'
  | 'appraisedValue'
  | 'qualificationRemarks'
  | 'fileAttachment';

export const MACHINERIES_SECTION_NAV_ITEMS: { key: MachineriesSectionKey; label: string }[] = [
  { key: 'reportDetails', label: 'Report Details' },
  { key: 'descriptionOfEquipments', label: 'Description of Equipments' },
  { key: 'machineries', label: 'Machineries' },
  { key: 'appraisedValue', label: 'Appraised Value' },
  { key: 'qualificationRemarks', label: 'Qualification & Remarks' },
  { key: 'fileAttachment', label: 'File Attachment' },
];

// A 3-line sum — not worth a new shared calc module per this plan's
// proportion principle. Exported so Task 7 (the read-only view) can
// import and reuse this exact function rather than duplicating the sum
// logic.
export function computeTotalAppraisedValue(machineries: AppraisalMachineryEntry[]): number {
  return machineries.reduce((sum, m) => sum + parseNum(m.appraisedValueLessDepreciation), 0);
}

/** The full field form for one machinery entry — always visible, no collapse. */
function MachineryEntryForm({
  entry,
  editable,
  onChange,
}: {
  entry: AppraisalMachineryEntry;
  editable: boolean;
  onChange: (data: Partial<Omit<AppraisalMachineryEntry, 'id'>>) => void;
}) {
  return (
    <Box sx={{ pt: 1.5 }}>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            size="small"
            label="Unit(s)"
            value={entry.units}
            disabled={!editable}
            onChange={(event) => onChange({ units: event.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            size="small"
            label="Description"
            value={entry.description}
            disabled={!editable}
            onChange={(event) => onChange({ description: event.target.value })}
            sx={fieldSx}
          />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            size="small"
            label="Serial No."
            value={entry.serialNo}
            disabled={!editable}
            onChange={(event) => onChange({ serialNo: event.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            size="small"
            label="Acquisition Price(s) in PHP"
            value={entry.acquisitionPricePhp}
            disabled={!editable}
            onChange={(event) => onChange({ acquisitionPricePhp: event.target.value })}
            sx={fieldSx}
          />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            size="small"
            type="date"
            label="Date of Proforma Invoice"
            value={entry.dateOfProformaInvoice}
            disabled={!editable}
            onChange={(event) => onChange({ dateOfProformaInvoice: event.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            size="small"
            label="Appraised Value (Less % Depreciation of 10% per year)"
            value={entry.appraisedValueLessDepreciation}
            disabled={!editable}
            onChange={(event) => onChange({ appraisedValueLessDepreciation: event.target.value })}
            sx={fieldSx}
          />
        </Stack>
      </Stack>
    </Box>
  );
}

/** One machinery entry's header row — a "Machinery N" badge (same
 *  Chip-badge convention as Real Estate's Improvement/Particular
 *  Description/Comparable cards) plus a trailing remove ×. All fields
 *  are always visible below (see MachineriesSection) — no collapse. */
function MachineryEntryHeader({
  index,
  onRemove,
  editable,
}: {
  index: number;
  onRemove: () => void;
  editable: boolean;
}) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Chip
        label={`Machinery ${index + 1}`}
        size="small"
        sx={{ bgcolor: '#EEF1FE', color: '#3448B0', fontWeight: 700, cursor: 'default', pointerEvents: 'none' }}
      />
      {editable && (
        <IconButton size="small" onClick={onRemove} aria-label="Remove machinery entry">
          <Iconify icon="mingcute:close-line" width={16} />
        </IconButton>
      )}
    </Stack>
  );
}

// ----------------------------------------------------------------------
// Machineries repeatable list — mirrors bank-loans-modal.tsx's
// LoanSection: component-local expandedIds state, a prevCountRef-based
// effect that auto-expands a newly-added row, and an "+ Add" Button.
// ----------------------------------------------------------------------
function MachineriesSection({
  bundleId,
  machineries,
  editable,
}: {
  bundleId: string;
  machineries: AppraisalMachineryEntry[];
  editable: boolean;
}) {
  const { addAppraisalMachineryEntry, updateAppraisalMachineryEntry, removeAppraisalMachineryEntry } = useAdmin();

  return (
    <Stack spacing={1.5}>
      <SectionLabel>Machineries</SectionLabel>
      <Stack spacing={1.25}>
        {machineries.length === 0 ? (
          <Box sx={{ p: 1.5, borderRadius: '10px', border: '1.5px dashed #C7CCDA', bgcolor: '#F9FAFC' }}>
            <Typography sx={{ fontSize: 12, fontStyle: 'italic', color: '#5A6273' }}>
              No machineries recorded yet.
            </Typography>
          </Box>
        ) : (
          machineries.map((entry, index) => (
            <Box
              key={entry.id}
              sx={{ p: 1.5, borderRadius: '10px', bgcolor: '#FAFBFD', border: '1px solid #EBEDF3' }}
            >
              <MachineryEntryHeader
                index={index}
                onRemove={() => removeAppraisalMachineryEntry(bundleId, entry.id)}
                editable={editable}
              />
              <MachineryEntryForm
                entry={entry}
                editable={editable}
                onChange={(data) => updateAppraisalMachineryEntry(bundleId, entry.id, data)}
              />
            </Box>
          ))
        )}
      </Stack>
      {editable && (
        <Button
          onClick={() => addAppraisalMachineryEntry(bundleId)}
          variant="outlined"
          startIcon={<Iconify icon="solar:add-circle-bold" width={18} />}
          sx={{ ...outlinedNavyButtonSx, alignSelf: 'flex-start' }}
        >
          Add Machinery
        </Button>
      )}
    </Stack>
  );
}

export function MachineriesReportFields({
  bundleId,
  report,
  editable,
  sectionRefs,
}: {
  bundleId: string;
  report: AppraisalMachineriesReport;
  editable: boolean;
  // Owned by the parent AppraiserAssignmentCard, which renders this
  // form's sidebar nav outside the white card and reads these refs for
  // its active-section highlight and jump-to-section scrolling.
  sectionRefs: React.MutableRefObject<Map<string, HTMLDivElement | null>>;
}): JSX.Element {
  const { setAppraisalBundleMachineriesReport } = useAdmin();

  const patch = (data: Partial<Omit<AppraisalMachineriesReport, 'machineries'>>) =>
    setAppraisalBundleMachineriesReport(bundleId, data);

  const totalAppraisedValue = computeTotalAppraisedValue(report.machineries);

  return (
    <Stack spacing={2.5}>
      {/* Step 1: memo header fields */}
      <Stack
        spacing={1.5}
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('reportDetails', el); }}
      >
        <SectionLabel>Report Details</SectionLabel>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            size="small"
            label="To"
            value={report.to}
            disabled={!editable}
            onChange={(event) => patch({ to: event.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            size="small"
            label="Thru"
            value={report.thru}
            disabled={!editable}
            onChange={(event) => patch({ thru: event.target.value })}
            sx={fieldSx}
          />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            size="small"
            label="From"
            value={report.from}
            disabled={!editable}
            onChange={(event) => patch({ from: event.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            size="small"
            type="date"
            label="Date Report"
            value={report.dateReport}
            disabled={!editable}
            onChange={(event) => patch({ dateReport: event.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={fieldSx}
          />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            size="small"
            type="date"
            label="Date Inspected"
            value={report.dateInspected}
            disabled={!editable}
            onChange={(event) => patch({ dateInspected: event.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            size="small"
            label="Subject"
            value={report.subject}
            disabled={!editable}
            onChange={(event) => patch({ subject: event.target.value })}
            sx={fieldSx}
          />
        </Stack>
      </Stack>

      <Divider sx={{ borderColor: '#EEF0F5' }} />

      {/* Step 2: free-text Description of Equipments box */}
      <Stack
        spacing={1.5}
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('descriptionOfEquipments', el); }}
      >
        <SectionLabel>I. Description of Equipments</SectionLabel>
        <TextField
          fullWidth
          multiline
          minRows={4}
          size="small"
          value={report.descriptionOfEquipments}
          disabled={!editable}
          onChange={(event) => patch({ descriptionOfEquipments: event.target.value })}
          sx={fieldSx}
        />
      </Stack>

      <Divider sx={{ borderColor: '#EEF0F5' }} />

      {/* Step 3: Machineries repeatable list */}
      <Box ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('machineries', el); }}>
        <MachineriesSection bundleId={bundleId} machineries={report.machineries} editable={editable} />
      </Box>

      <Divider sx={{ borderColor: '#EEF0F5' }} />

      {/* Step 4 & 5: Total Appraised Value, Loanable Percent/Amount, Round Off,
          Qualification & Remarks, File Attachment */}
      <Stack
        spacing={1.5}
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('appraisedValue', el); }}
      >
        <SectionLabel>Appraised Value</SectionLabel>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'flex-start' }}>
          {/* The one genuinely computed, read-only value — rendered in the
              shared Field label/value style rather than as an input. */}
          <Box sx={{ width: '100%', minWidth: 0 }}>
            <Typography sx={{ fontSize: 11.5, color: '#8891A6' }}>Total Appraised Value</Typography>
            <Typography
              sx={{
                mt: 0.25,
                pb: 0.6,
                fontSize: 13.5,
                fontWeight: 600,
                color: '#14172A',
                borderBottom: '1px solid #EEF0F5',
              }}
            >
              {fCurrency(totalAppraisedValue)}
            </Typography>
          </Box>
          <TextField
            fullWidth
            size="small"
            label="Total Appraised Value (Round Off)"
            value={report.totalAppraisedValueRoundOff}
            disabled={!editable}
            onChange={(event) => patch({ totalAppraisedValueRoundOff: event.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            size="small"
            label="Loanable Percent"
            value={report.loanablePercent}
            disabled={!editable}
            onChange={(event) => patch({ loanablePercent: event.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            size="small"
            label="Loanable Amount"
            value={report.loanableAmount}
            disabled={!editable}
            onChange={(event) => patch({ loanableAmount: event.target.value })}
            sx={fieldSx}
          />
        </Stack>
      </Stack>

      <Divider sx={{ borderColor: '#EEF0F5' }} />

      <Stack
        spacing={1.5}
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('qualificationRemarks', el); }}
      >
        {/* RichTextField has no disabled/read-only prop of its own (see
            src/components/rich-text-field/rich-text-field.tsx) — when
            !editable, wrap it so it's visually and functionally inert
            rather than modifying the shared component, which other
            callers outside this task also rely on. The stored value
            still renders underneath; it just can't be edited. The wrapper
            only blocks the pointer, so onChange is also a no-op while
            locked — keyboard focus can't then mutate the stored report. */}
        <Box
          sx={!editable ? { pointerEvents: 'none', opacity: 0.7 } : undefined}
          tabIndex={!editable ? -1 : undefined}
        >
          <RichTextField
            label="II. Qualification & Remarks"
            value={report.qualificationRemarks}
            onChange={editable ? (html) => patch({ qualificationRemarks: html }) : () => {}}
            placeholder="Qualification and remarks regarding this collateral"
          />
        </Box>
      </Stack>

      <Divider sx={{ borderColor: '#EEF0F5' }} />

      <Stack
        spacing={1.5}
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('fileAttachment', el); }}
      >
        <SectionLabel>File Attachment</SectionLabel>
        <MultiPhotoDropzone
          photos={report.fileAttachments}
          onChange={(fileAttachments) => patch({ fileAttachments })}
          disabled={!editable}
          label="File Attachment"
        />
      </Stack>
    </Stack>
  );
}
