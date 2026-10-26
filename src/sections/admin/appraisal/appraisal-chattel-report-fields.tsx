'use client';

import Box from '@mui/material/Box';
import Radio from '@mui/material/Radio';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import RadioGroup from '@mui/material/RadioGroup';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';

import { useAdmin } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';
import { outlinedNavyButtonSx } from 'src/components/admin-ui';
import { RichTextField } from 'src/components/rich-text-field';

// Real Estate's own local SectionLabel (bare label, no rule under it) —
// sections are separated by explicit Dividers below, same as Real Estate.
import { SectionLabel, MultiPhotoDropzone } from './appraiser-assignment-card';

import type {
  AppraisalChattelReport,
  AppraisalChecklistItem,
  AppraisalConditionItem,
  AppraisalFunctionItem,
  AppraisalMarketSurveyEntry,
} from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Chattel (vehicle/equipment) Appraisal Report fields — Task 4 of the
// 2026-10-24 Appraisal Chattel/Machineries plan. Matches the printed
// Chattel Appraisal Report form section-by-section: header fields,
// Description of Equipment, Accessories/Power Features checklists,
// General Condition (Good/Bad per item) and Instrument Panel & Lighting
// (Functioning Well/Not Functioning Well per item) radio checklists, the
// Market Survey comparables table, and the Appraised Value/Remarks/File
// Attachment block.
//
// Every field binds straight to AdminContext via the bundle-scoped
// setters from Task 3 (setAppraisalBundleChattelReport,
// setAppraisalChecklistItem, setAppraisalConditionItem,
// setAppraisalFunctionItem, add/update/removeAppraisalMarketSurveyEntry)
// — nothing is held in local component state, same "everything lives in
// AdminContext" convention every other admin report form in this app
// follows.
//
// `fieldSx` is intentionally duplicated here rather than imported from
// appraiser-assignment-card.tsx — this app's established convention is
// that small presentational constants like this get copied per file
// rather than shared, to minimize cross-file coupling.
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
// Accessories and Power Features are grouped under "Description of Equipment" (they're
// sub-checklists of that same step, not separate top-level sections a user
// would think of jumping to independently), and General Condition /
// Instrument Panel & Lighting each get their own entry since they're each
// rendered once, as genuinely separate steps in the printed form.
// ----------------------------------------------------------------------
export type ChattelSectionKey =
  | 'reportDetails'
  | 'descriptionOfEquipment'
  | 'generalCondition'
  | 'instrumentPanelLighting'
  | 'marketSurvey'
  | 'appraisedValue'
  | 'fileAttachment';

export const CHATTEL_SECTION_NAV_ITEMS: { key: ChattelSectionKey; label: string }[] = [
  { key: 'reportDetails', label: 'Report Details' },
  { key: 'descriptionOfEquipment', label: 'Description of Equipment' },
  { key: 'generalCondition', label: 'General Condition' },
  { key: 'instrumentPanelLighting', label: 'Instrument Panel & Lighting' },
  { key: 'marketSurvey', label: 'Market Survey' },
  { key: 'appraisedValue', label: 'Appraised Value' },
  { key: 'fileAttachment', label: 'File Attachment' },
];

// ----------------------------------------------------------------------
// Accessories / Power Features checklist — a row per item: a Checkbox
// bound to item.checked, the item's own (non-editable) label, and a
// Comments TextField disabled unless the item is checked — matching the
// reference screenshot's layout where comments are only entered for
// checked accessories.
// ----------------------------------------------------------------------
function ChecklistSection({
  title,
  items,
  editable,
  onItemChange,
}: {
  title: string;
  items: AppraisalChecklistItem[];
  editable: boolean;
  onItemChange: (itemId: string, data: Partial<Pick<AppraisalChecklistItem, 'checked' | 'comments'>>) => void;
}) {
  const allChecked = items.length > 0 && items.every((item) => item.checked);
  const someChecked = items.some((item) => item.checked);

  const handleCheckAll = (checked: boolean) => {
    items.forEach((item) => {
      onItemChange(item.id, checked ? { checked: true } : { checked: false, comments: '' });
    });
  };

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <SectionLabel>{title}</SectionLabel>
        <FormControlLabel
          label="Check all"
          sx={{ m: 0, '& .MuiFormControlLabel-label': { fontSize: 12.5, fontWeight: 600, color: '#8891A6' } }}
          control={
            <Checkbox
              size="small"
              checked={allChecked}
              indeterminate={someChecked && !allChecked}
              disabled={!editable}
              onChange={(event) => handleCheckAll(event.target.checked)}
            />
          }
        />
      </Stack>
      <Stack spacing={1.25}>
        {items.map((item) => (
          <Stack
            key={item.id}
            direction="row"
            alignItems="center"
            spacing={1.5}
            sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #EBEDF3' }}
          >
            <Checkbox
              size="small"
              checked={item.checked}
              disabled={!editable}
              onChange={(event) =>
                onItemChange(
                  item.id,
                  event.target.checked ? { checked: true } : { checked: false, comments: '' }
                )
              }
            />
            <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#14172A', width: 220, flexShrink: 0 }}>
              {item.label}
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Comments"
              value={item.comments}
              disabled={!editable || !item.checked}
              onChange={(event) => onItemChange(item.id, { comments: event.target.value })}
              sx={fieldSx}
            />
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}

// ----------------------------------------------------------------------
// General Condition checklist — a row per item: label, a Good/Bad radio
// pair, and a Comments field. Matches call-report-types.tsx's RadioRow
// `row` RadioGroup/FormControlLabel pattern.
// ----------------------------------------------------------------------
function ConditionSection({
  items,
  editable,
  onItemChange,
}: {
  items: AppraisalConditionItem[];
  editable: boolean;
  onItemChange: (itemId: string, data: Partial<Pick<AppraisalConditionItem, 'rating' | 'comments'>>) => void;
}) {
  return (
    <Stack spacing={1.5}>
      <SectionLabel>General Condition</SectionLabel>
      <Stack spacing={1.25}>
        {items.map((item) => (
          <Stack
            key={item.id}
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ sm: 'center' }}
            spacing={1.5}
            sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #EBEDF3' }}
          >
            <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#14172A', width: 140, flexShrink: 0 }}>
              {item.label}
            </Typography>
            <RadioGroup
              row
              value={item.rating}
              onChange={(event) =>
                onItemChange(item.id, { rating: event.target.value as AppraisalConditionItem['rating'] })
              }
              sx={{ flexWrap: 'nowrap', flexShrink: 0 }}
            >
              <FormControlLabel
                value="good"
                control={<Radio size="small" />}
                label={<Typography sx={{ fontSize: 13.5, whiteSpace: 'nowrap' }}>Good</Typography>}
                disabled={!editable}
                sx={{ mr: 1.5 }}
              />
              <FormControlLabel
                value="bad"
                control={<Radio size="small" />}
                label={<Typography sx={{ fontSize: 13.5, whiteSpace: 'nowrap' }}>Bad</Typography>}
                disabled={!editable}
                sx={{ mr: 0 }}
              />
            </RadioGroup>
            <TextField
              fullWidth
              size="small"
              placeholder="Comments"
              value={item.comments}
              disabled={!editable}
              onChange={(event) => onItemChange(item.id, { comments: event.target.value })}
              sx={fieldSx}
            />
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}

// ----------------------------------------------------------------------
// Instrument Panel & Lighting checklist — a row per item: label, a
// Functioning Well/Not Functioning Well radio pair. No comments field
// (unlike ConditionSection above).
// ----------------------------------------------------------------------
function FunctionSection({
  items,
  editable,
  onItemChange,
}: {
  items: AppraisalFunctionItem[];
  editable: boolean;
  onItemChange: (itemId: string, data: Partial<Pick<AppraisalFunctionItem, 'rating'>>) => void;
}) {
  return (
    <Stack spacing={1.5}>
      <SectionLabel>Instrument Panel &amp; Lighting</SectionLabel>
      <Stack spacing={1.25}>
        {items.map((item) => (
          <Stack
            key={item.id}
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ sm: 'center' }}
            spacing={1.5}
            sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #EBEDF3' }}
          >
            <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#14172A', width: 140, flexShrink: 0 }}>
              {item.label}
            </Typography>
            <RadioGroup
              row
              value={item.rating}
              onChange={(event) =>
                onItemChange(item.id, { rating: event.target.value as AppraisalFunctionItem['rating'] })
              }
            >
              <FormControlLabel
                value="functioning"
                control={<Radio size="small" />}
                label={<Typography sx={{ fontSize: 13.5 }}>Functioning Well</Typography>}
                disabled={!editable}
              />
              <FormControlLabel
                value="not-functioning"
                control={<Radio size="small" />}
                label={<Typography sx={{ fontSize: 13.5 }}>Not Functioning Well</Typography>}
                disabled={!editable}
              />
            </RadioGroup>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}

// ----------------------------------------------------------------------
// Market Survey table — Source/Date/Type/Gen. Condition/Selling Price per
// row, trailing remove IconButton. Same inline-editable-row convention as
// Cash Flow Statement's "Add Other Loan" (cash-flow-statement-card.tsx):
// a row per entry, an empty-state line when there are none, and a
// trailing "+ Add" Button.
// ----------------------------------------------------------------------
function MarketSurveySection({
  entries,
  editable,
  onUpdate,
  onRemove,
  onAdd,
}: {
  entries: AppraisalMarketSurveyEntry[];
  editable: boolean;
  onUpdate: (entryId: string, data: Partial<Omit<AppraisalMarketSurveyEntry, 'id'>>) => void;
  onRemove: (entryId: string) => void;
  onAdd: () => void;
}) {
  return (
    <Stack spacing={1.5}>
      <SectionLabel>Market Survey</SectionLabel>
      <Stack spacing={1.25}>
        {entries.length === 0 && (
          <Box sx={{ p: 1.5, borderRadius: '10px', border: '1.5px dashed #C7CCDA', bgcolor: '#F9FAFC' }}>
            <Typography sx={{ fontSize: 12, fontStyle: 'italic', color: '#5A6273' }}>
              No market survey entries yet.
            </Typography>
          </Box>
        )}
        {entries.map((entry) => (
          <Stack
            key={entry.id}
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'stretch', sm: 'flex-start' }}
            sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #EBEDF3' }}
          >
            <TextField
              fullWidth
              size="small"
              label="Source"
              value={entry.source}
              disabled={!editable}
              onChange={(event) => onUpdate(entry.id, { source: event.target.value })}
              sx={fieldSx}
            />
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Date"
              value={entry.date}
              disabled={!editable}
              onChange={(event) => onUpdate(entry.id, { date: event.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={fieldSx}
            />
            <TextField
              fullWidth
              size="small"
              label="Type"
              value={entry.type}
              disabled={!editable}
              onChange={(event) => onUpdate(entry.id, { type: event.target.value })}
              sx={fieldSx}
            />
            <TextField
              fullWidth
              size="small"
              label="Gen. Condition"
              value={entry.generalCondition}
              disabled={!editable}
              onChange={(event) => onUpdate(entry.id, { generalCondition: event.target.value })}
              sx={fieldSx}
            />
            <TextField
              fullWidth
              size="small"
              label="Selling Price"
              value={entry.sellingPrice}
              disabled={!editable}
              onChange={(event) => onUpdate(entry.id, { sellingPrice: event.target.value })}
              sx={fieldSx}
            />
            {editable && (
              <IconButton
                size="small"
                onClick={() => onRemove(entry.id)}
                aria-label="Remove market survey entry"
                sx={{ mt: { xs: 0, sm: 0.5 }, flexShrink: 0 }}
              >
                <Iconify icon="mingcute:close-line" width={16} />
              </IconButton>
            )}
          </Stack>
        ))}
      </Stack>
      {editable && (
        <Button
          onClick={onAdd}
          variant="outlined"
          startIcon={<Iconify icon="solar:add-circle-bold" width={18} />}
          sx={{ ...outlinedNavyButtonSx, alignSelf: 'flex-start' }}
        >
          Add Market Survey
        </Button>
      )}
    </Stack>
  );
}

export function ChattelReportFields({
  bundleId,
  report,
  editable,
  sectionRefs,
}: {
  bundleId: string;
  report: AppraisalChattelReport;
  editable: boolean;
  // Owned by the parent AppraiserAssignmentCard, which renders this
  // form's sidebar nav outside the white card and reads these refs for
  // its active-section highlight and jump-to-section scrolling.
  sectionRefs: React.MutableRefObject<Map<string, HTMLDivElement | null>>;
}): JSX.Element {
  const {
    setAppraisalBundleChattelReport,
    setAppraisalChecklistItem,
    setAppraisalConditionItem,
    setAppraisalFunctionItem,
    addAppraisalMarketSurveyEntry,
    updateAppraisalMarketSurveyEntry,
    removeAppraisalMarketSurveyEntry,
  } = useAdmin();

  const patch = (data: Partial<Omit<AppraisalChattelReport, 'accessories' | 'powerFeatures' | 'generalCondition' | 'instrumentPanelLighting' | 'marketSurvey'>>) =>
    setAppraisalBundleChattelReport(bundleId, data);

  return (
    <Stack spacing={2.5}>
      {/* Step 1: header fields */}
      <Stack spacing={1.5} ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('reportDetails', el); }}>
        <SectionLabel>Report Details</SectionLabel>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            size="small"
            label="Account Name"
            value={report.accountName}
            disabled={!editable}
            onChange={(event) => patch({ accountName: event.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            size="small"
            label="Requested By"
            value={report.requestedBy}
            disabled={!editable}
            onChange={(event) => patch({ requestedBy: event.target.value })}
            sx={fieldSx}
          />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            size="small"
            label="Purpose of Report"
            value={report.purposeOfReport}
            disabled={!editable}
            onChange={(event) => patch({ purposeOfReport: event.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            size="small"
            type="date"
            label="Report Date"
            value={report.reportDate}
            disabled={!editable}
            onChange={(event) => patch({ reportDate: event.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={fieldSx}
          />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            size="small"
            label="Eqpt. Under App."
            value={report.eqptUnderApp}
            disabled={!editable}
            onChange={(event) => patch({ eqptUnderApp: event.target.value })}
            sx={fieldSx}
          />
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
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            size="small"
            label="Registered Owner"
            value={report.registeredOwner}
            disabled={!editable}
            onChange={(event) => patch({ registeredOwner: event.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            size="small"
            label="Address"
            value={report.address}
            disabled={!editable}
            onChange={(event) => patch({ address: event.target.value })}
            sx={fieldSx}
          />
        </Stack>
      </Stack>

      <Divider sx={{ borderColor: '#EEF0F5' }} />

      {/* Step 2: Description of Equipment */}
      <Stack
        spacing={1.5}
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('descriptionOfEquipment', el); }}
      >
        <SectionLabel>Description of Equipment</SectionLabel>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            size="small"
            label="Make"
            value={report.make}
            disabled={!editable}
            onChange={(event) => patch({ make: event.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            size="small"
            label="MVF No."
            value={report.mvfNo}
            disabled={!editable}
            onChange={(event) => patch({ mvfNo: event.target.value })}
            sx={fieldSx}
          />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            size="small"
            label="Series"
            value={report.series}
            disabled={!editable}
            onChange={(event) => patch({ series: event.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            size="small"
            label="C.R No."
            value={report.crNo}
            disabled={!editable}
            onChange={(event) => patch({ crNo: event.target.value })}
            sx={fieldSx}
          />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            size="small"
            label="Type of Body / Denomination"
            value={report.typeOfBodyDenomination}
            disabled={!editable}
            onChange={(event) => patch({ typeOfBodyDenomination: event.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            size="small"
            type="date"
            label="Registration Date"
            value={report.registrationDate}
            disabled={!editable}
            onChange={(event) => patch({ registrationDate: event.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={fieldSx}
          />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            size="small"
            label="Year Model"
            value={report.yearModel}
            disabled={!editable}
            onChange={(event) => patch({ yearModel: event.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            size="small"
            label="Place Registered"
            value={report.placeRegistered}
            disabled={!editable}
            onChange={(event) => patch({ placeRegistered: event.target.value })}
            sx={fieldSx}
          />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            size="small"
            label="Color"
            value={report.color}
            disabled={!editable}
            onChange={(event) => patch({ color: event.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            size="small"
            label="Chassis Number"
            value={report.chassisNumber}
            disabled={!editable}
            onChange={(event) => patch({ chassisNumber: event.target.value })}
            sx={fieldSx}
          />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            size="small"
            label="Odometer Reading"
            value={report.odometerReading}
            disabled={!editable}
            onChange={(event) => patch({ odometerReading: event.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            size="small"
            label="Engine No."
            value={report.engineNo}
            disabled={!editable}
            onChange={(event) => patch({ engineNo: event.target.value })}
            sx={fieldSx}
          />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            size="small"
            label="Plate No."
            value={report.plateNo}
            disabled={!editable}
            onChange={(event) => patch({ plateNo: event.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            size="small"
            label="Fuel"
            value={report.fuel}
            disabled={!editable}
            onChange={(event) => patch({ fuel: event.target.value })}
            sx={fieldSx}
          />
        </Stack>
      </Stack>

      <Divider sx={{ borderColor: '#EEF0F5' }} />

      {/* Step 3: Accessories and Power Features checklists */}
      <ChecklistSection
        title="Accessories"
        items={report.accessories}
        editable={editable}
        onItemChange={(itemId, data) => setAppraisalChecklistItem(bundleId, 'accessories', itemId, data)}
      />
      <Divider sx={{ borderColor: '#EEF0F5' }} />

      <ChecklistSection
        title="Power Features"
        items={report.powerFeatures}
        editable={editable}
        onItemChange={(itemId, data) => setAppraisalChecklistItem(bundleId, 'powerFeatures', itemId, data)}
      />

      <Divider sx={{ borderColor: '#EEF0F5' }} />

      {/* Step 4: General Condition and Instrument Panel & Lighting checklists */}
      <Box ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('generalCondition', el); }}>
        <ConditionSection
          items={report.generalCondition}
          editable={editable}
          onItemChange={(itemId, data) => setAppraisalConditionItem(bundleId, itemId, data)}
        />
      </Box>
      <Divider sx={{ borderColor: '#EEF0F5' }} />

      <Box ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('instrumentPanelLighting', el); }}>
        <FunctionSection
          items={report.instrumentPanelLighting}
          editable={editable}
          onItemChange={(itemId, data) => setAppraisalFunctionItem(bundleId, itemId, data)}
        />
      </Box>

      <Divider sx={{ borderColor: '#EEF0F5' }} />

      {/* Step 5: Market Survey table */}
      <Box ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('marketSurvey', el); }}>
        <MarketSurveySection
          entries={report.marketSurvey}
          editable={editable}
          onAdd={() => addAppraisalMarketSurveyEntry(bundleId)}
          onUpdate={(entryId, data) => updateAppraisalMarketSurveyEntry(bundleId, entryId, data)}
          onRemove={(entryId) => removeAppraisalMarketSurveyEntry(bundleId, entryId)}
        />
      </Box>

      <Divider sx={{ borderColor: '#EEF0F5' }} />

      {/* Step 6: Appraised Value block, Remarks, and File Attachment */}
      <Stack
        spacing={1.5}
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('appraisedValue', el); }}
      >
        <SectionLabel>Appraised Value</SectionLabel>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            size="small"
            label="Appraised Value"
            value={report.appraisedValue}
            disabled={!editable}
            onChange={(event) => patch({ appraisedValue: event.target.value })}
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
            label="Appraised Value (Round Off)"
            value={report.appraisedValueRoundOff}
            disabled={!editable}
            onChange={(event) => patch({ appraisedValueRoundOff: event.target.value })}
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
            label="Encumbrances / Remarks"
            value={report.encumbrancesRemarks}
            onChange={editable ? (html) => patch({ encumbrancesRemarks: html }) : () => {}}
            placeholder="Encumbrances or remarks regarding this collateral"
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
