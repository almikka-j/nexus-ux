'use client';

import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';
import { SectionLabel, FieldGrid, outlinedNavyButtonSx } from 'src/components/admin-ui';
import { RichTextField } from 'src/components/rich-text-field';
import { fCurrency } from 'src/utils/format-number';

import { parseNum } from 'src/sections/admin/financial-summary-calcs';

import { MultiPhotoDropzone } from './appraiser-assignment-card';

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

// A 3-line sum — not worth a new shared calc module per this plan's
// proportion principle. Exported so Task 7 (the read-only view) can
// import and reuse this exact function rather than duplicating the sum
// logic.
export function computeTotalAppraisedValue(machineries: AppraisalMachineryEntry[]): number {
  return machineries.reduce((sum, m) => sum + parseNum(m.appraisedValueLessDepreciation), 0);
}

/** The full field form for one machinery entry — rendered only while
 *  that entry's summary line is expanded. */
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
      <Grid container spacing={1.5}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            label="Unit(s)"
            value={entry.units}
            disabled={!editable}
            onChange={(event) => onChange({ units: event.target.value })}
            sx={fieldSx}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            label="Description"
            value={entry.description}
            disabled={!editable}
            onChange={(event) => onChange({ description: event.target.value })}
            sx={fieldSx}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            label="Serial No."
            value={entry.serialNo}
            disabled={!editable}
            onChange={(event) => onChange({ serialNo: event.target.value })}
            sx={fieldSx}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            label="Acquisition Price(s) in PHP"
            value={entry.acquisitionPricePhp}
            disabled={!editable}
            onChange={(event) => onChange({ acquisitionPricePhp: event.target.value })}
            sx={fieldSx}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
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
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            label="Appraised Value (Less % Depreciation of 10% per year)"
            value={entry.appraisedValueLessDepreciation}
            disabled={!editable}
            onChange={(event) => onChange({ appraisedValueLessDepreciation: event.target.value })}
            sx={fieldSx}
          />
        </Grid>
      </Grid>
    </Box>
  );
}

/** One machinery entry's summary line — Unit(s) + Description (bold) —
 *  plus an expand pencil and a trailing remove ×. */
function MachinerySummaryLine({
  entry,
  expanded,
  onToggle,
  onRemove,
  editable,
}: {
  entry: AppraisalMachineryEntry;
  expanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  editable: boolean;
}) {
  const summary = [entry.units, entry.description].filter(Boolean).join(' — ') || 'Untitled machinery';
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Typography sx={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: '#14172A' }} noWrap>
        {summary}
      </Typography>
      <IconButton
        size="small"
        onClick={onToggle}
        aria-label={expanded ? 'Collapse machinery details' : 'Edit machinery details'}
        sx={{ flexShrink: 0 }}
      >
        <Iconify icon={expanded ? 'solar:alt-arrow-up-bold' : 'solar:pen-bold'} width={15} />
      </IconButton>
      {editable && (
        <IconButton size="small" onClick={onRemove} aria-label="Remove machinery entry" sx={{ flexShrink: 0 }}>
          <Iconify icon="mingcute:close-line" width={15} />
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const prevCountRef = useRef(machineries.length);
  useEffect(() => {
    if (machineries.length > prevCountRef.current) {
      const lastId = machineries[machineries.length - 1].id;
      setExpandedIds((prev) => new Set(prev).add(lastId));
    }
    prevCountRef.current = machineries.length;
  }, [machineries]);

  return (
    <Stack spacing={1.5}>
      <SectionLabel>Machineries</SectionLabel>
      <Box sx={{ bgcolor: '#F9FAFC', border: '1px solid #EEF0F5', borderRadius: '11px', p: 1.5 }}>
        <Stack spacing={1.25}>
          {machineries.length === 0 ? (
            <Box
              sx={{
                border: '1px dashed #E1E4ED',
                borderRadius: '10px',
                py: 1.5,
                textAlign: 'center',
                fontSize: 12.5,
                color: '#8891A6',
              }}
            >
              No machineries recorded yet.
            </Box>
          ) : (
            machineries.map((entry, index) => (
              <Box key={entry.id}>
                {index > 0 && <Divider sx={{ borderColor: '#EEF0F5', mb: 1.25 }} />}
                <MachinerySummaryLine
                  entry={entry}
                  expanded={expandedIds.has(entry.id)}
                  onToggle={() => toggle(entry.id)}
                  onRemove={() => removeAppraisalMachineryEntry(bundleId, entry.id)}
                  editable={editable}
                />
                {expandedIds.has(entry.id) && (
                  <MachineryEntryForm
                    entry={entry}
                    editable={editable}
                    onChange={(data) => updateAppraisalMachineryEntry(bundleId, entry.id, data)}
                  />
                )}
              </Box>
            ))
          )}
        </Stack>
      </Box>
      {editable && (
        <Button
          onClick={() => addAppraisalMachineryEntry(bundleId)}
          variant="outlined"
          size="small"
          startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
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
}: {
  bundleId: string;
  report: AppraisalMachineriesReport;
  editable: boolean;
}): JSX.Element {
  const { setAppraisalBundleMachineriesReport } = useAdmin();

  const patch = (data: Partial<Omit<AppraisalMachineriesReport, 'machineries'>>) =>
    setAppraisalBundleMachineriesReport(bundleId, data);

  const totalAppraisedValue = computeTotalAppraisedValue(report.machineries);

  return (
    <Stack spacing={2.5}>
      {/* Step 1: memo header fields */}
      <Stack spacing={1.5}>
        <SectionLabel>Report Details</SectionLabel>
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="To"
              value={report.to}
              disabled={!editable}
              onChange={(event) => patch({ to: event.target.value })}
              sx={fieldSx}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Thru"
              value={report.thru}
              disabled={!editable}
              onChange={(event) => patch({ thru: event.target.value })}
              sx={fieldSx}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="From"
              value={report.from}
              disabled={!editable}
              onChange={(event) => patch({ from: event.target.value })}
              sx={fieldSx}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
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
          </Grid>
          <Grid item xs={12} sm={6}>
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
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Subject"
              value={report.subject}
              disabled={!editable}
              onChange={(event) => patch({ subject: event.target.value })}
              sx={fieldSx}
            />
          </Grid>
        </Grid>
      </Stack>

      {/* Step 2: free-text Description of Equipments box */}
      <Stack spacing={1.5}>
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

      {/* Step 3: Machineries repeatable list */}
      <MachineriesSection bundleId={bundleId} machineries={report.machineries} editable={editable} />

      {/* Step 4 & 5: Total Appraised Value, Loanable Percent/Amount, Round Off,
          Qualification & Remarks, File Attachment */}
      <Stack spacing={1.5}>
        <SectionLabel>Appraised Value</SectionLabel>
        <FieldGrid>
          <Box sx={{ gridColumn: 'span 1' }}>
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
          <Box sx={{ gridColumn: 'span 1' }}>
            <TextField
              fullWidth
              size="small"
              label="Total Appraised Value (Round Off)"
              value={report.totalAppraisedValueRoundOff}
              disabled={!editable}
              onChange={(event) => patch({ totalAppraisedValueRoundOff: event.target.value })}
              sx={fieldSx}
            />
          </Box>
          <Box sx={{ gridColumn: 'span 1' }}>
            <TextField
              fullWidth
              size="small"
              label="Loanable Percent"
              value={report.loanablePercent}
              disabled={!editable}
              onChange={(event) => patch({ loanablePercent: event.target.value })}
              sx={fieldSx}
            />
          </Box>
          <Box sx={{ gridColumn: 'span 1' }}>
            <TextField
              fullWidth
              size="small"
              label="Loanable Amount"
              value={report.loanableAmount}
              disabled={!editable}
              onChange={(event) => patch({ loanableAmount: event.target.value })}
              sx={fieldSx}
            />
          </Box>
        </FieldGrid>

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

        <Stack spacing={1}>
          <SectionLabel>File Attachment</SectionLabel>
          <MultiPhotoDropzone
            photos={report.fileAttachments}
            onChange={(fileAttachments) => patch({ fileAttachments })}
            disabled={!editable}
            label="File Attachment"
          />
        </Stack>
      </Stack>
    </Stack>
  );
}
