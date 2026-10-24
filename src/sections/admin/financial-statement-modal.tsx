'use client';

import { useState } from 'react';
import { NumericFormat } from 'react-number-format';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';
import { submitFinancialStatementDetails } from 'src/auth/financial-statement-details';
import {
  FINANCIAL_PERIODS,
  FINANCIAL_PERIOD_LABELS,
  type FinancialPeriod,
  type FinancialStatementField,
  type FinancialStatementPeriod,
  type BalanceSheetCategory,
} from 'src/auth/admin-context';

import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { TONE_COLORS, outlinedNavyButtonSx } from 'src/components/admin-ui';
import { RichTextField } from 'src/components/rich-text-field';
import { CollapsibleSection } from 'src/components/collapsible-section';

import { parseNum, computeIncomeStatement, sumBalanceSheetLines } from './financial-summary-calcs';
import { FinancialStatementReport } from './financial-statement-report';

// ----------------------------------------------------------------------
// Financial Statement sub-tool — every period's Income Statement and
// Balance Sheet sits inline in one scrollable dialog, as a
// CollapsibleSection per period (2023 … Projected), so entering or
// reviewing a period's figures never requires a separate "Manage" click
// into its own screen — every field already persists on keystroke, so
// there's nothing to navigate away from to save. A read-only Applicant
// Name / Amount Applied InfoChip1 strip sits above the periods, and a
// rich-text Remarks field + Save Record (stamps submittedAt) sits below
// them — the same "I'm done for now" marker convention as Cash Flow
// Statement's own "Save Record" button, not a real submission.
//
// Opened from the Financial Summary card's "Manage" on the Financial
// Statement row. The card's "View" opens the comparative report separately;
// each period section's own "View" button opens that one period's report.
// ----------------------------------------------------------------------

// Lock both the ₱ input and the computed-value box to this exact height so
// the two Income Statement columns stay row-for-row level.
const FS_FIELD_HEIGHT = 40;

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    fontSize: 14,
    bgcolor: 'common.white',
    height: FS_FIELD_HEIGHT,
  },
};

const primaryBtnSx = {
  bgcolor: '#1C2A6E',
  borderRadius: '10px',
  px: 3,
  fontWeight: 700,
  boxShadow: 'none',
  '&:hover': { bgcolor: '#14205A', boxShadow: 'none' },
};

// Matches the Initial Credit Checking Result's own section header pill
// (credit-checking-result-modal.tsx's NumberedSectionHeader) — a light-blue
// bar with navy uppercase text, instead of a solid navy banner.
const sectionBannerSx = {
  bgcolor: '#EEF1FE',
  color: '#1C2A6E',
  fontSize: 12.5,
  fontWeight: 800,
  letterSpacing: '0.04em',
  textTransform: 'uppercase' as const,
  px: 2,
  py: 1.25,
  borderRadius: '10px',
  mb: 2,
};

// "InfoChip1" — the original local chip, a flexbox strip with simple
// right-hand borders, used for the Applicant Name / Amount Applied strip
// (restored 2026-10-21 after briefly being migrated to the grid-based
// InfoChip2 below).
function InfoChip1({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack spacing={0.35} sx={{ px: 1.75, py: 1, minWidth: 0, flex: '1 1 160px' }}>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: '#9AA2B4',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={label}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: 13.5,
          fontWeight: 700,
          color: '#14172A',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={typeof value === 'string' ? value : undefined}
      >
        {value || '—'}
      </Typography>
    </Stack>
  );
}

// "InfoChip2" — the Credit Investigation infochip grid
// (ci-report-card.tsx's exported FactChip/FactChipRow, renamed here to
// avoid colliding with this file's own InfoChip1 above),
// reimplemented locally since the pattern isn't extracted into a shared
// component yet (see docs/225-admin-design-system.md §16's FactChip/
// FactChipRow entry). Grid cells with box-shadow dividers (not borders, so
// dividers don't consume grid track space), rounded only at the strip's
// own outer corners. `edge` marks a cell sitting on the strip's own outer
// right/bottom border so its divider isn't doubled against it; `wide`
// spans the cell full-width for a long value. Used only by the Income
// Statement's computed-values strip.
function InfoChip2({
  label,
  value,
  wide,
  edge = {},
}: {
  label: string;
  value: React.ReactNode;
  wide?: boolean;
  edge?: { right?: boolean; bottom?: boolean };
}) {
  const shadowParts = [
    !edge.right && 'inset -1px 0 0 0 #EEF0F5',
    !edge.bottom && 'inset 0 -1px 0 0 #EEF0F5',
  ].filter(Boolean);
  return (
    <Box
      sx={{
        gridColumn: wide ? '1 / -1' : 'span 1',
        minWidth: 0,
        px: 1.75,
        py: 1,
        bgcolor: 'common.white',
        ...(shadowParts.length > 0 ? { boxShadow: shadowParts.join(', ') } : {}),
      }}
    >
      <Typography
        sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#9AA2B4' }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: 13.5,
          fontWeight: 700,
          color: '#14172A',
          mt: 0.25,
          overflowWrap: 'break-word',
          wordBreak: 'break-word',
        }}
      >
        {value || '—'}
      </Typography>
    </Box>
  );
}

function InfoChip2Row({
  children,
  cols = 3,
  position = 'only',
}: {
  children: React.ReactNode;
  cols?: number;
  position?: 'only' | 'first' | 'last';
}) {
  const topRadius = position === 'last' ? 0 : 12;
  const bottomRadius = position === 'first' ? 0 : 12;
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: `repeat(${cols}, 1fr)` },
        borderRadius: `${topRadius}px ${topRadius}px ${bottomRadius}px ${bottomRadius}px`,
        border: '1px solid #EEF0F5',
        borderTop: position === 'last' ? 'none' : '1px solid #EEF0F5',
        bgcolor: 'common.white',
        overflow: 'hidden',
      }}
    >
      {children}
    </Box>
  );
}

// Legacy income-statement inputs & labels (no separate Sales Returns field —
// Gross Sales flows straight to Net Sale).
const INCOME_INPUTS: { field: FinancialStatementField; label: string; allowNegative?: boolean }[] = [
  { field: 'grossSales', label: 'Gross Sales', allowNegative: false },
  { field: 'costOfGoodsSold', label: 'Cost of Goods Sold' },
  { field: 'operatingExpenses', label: 'Operating Expenses' },
  { field: 'otherIncomeExpense', label: 'Other Income (Expense)', allowNegative: true },
  { field: 'interestExpense', label: 'Interest Expense (Expense)' },
  { field: 'provisionForTaxes', label: 'Provision for Taxes' },
  { field: 'depreciation', label: 'Depreciation' },
];

// The five Balance Sheet categories. Each is a dynamic list of line items;
// `options` is the fixed label set for a line's type dropdown.
const BALANCE_CATEGORIES: {
  key: BalanceSheetCategory;
  banner: string;
  addLabel: string;
  options: string[];
}[] = [
  {
    key: 'currentAssets',
    banner: 'Current Assets',
    addLabel: 'Add Current Asset',
    options: [
      'Cash',
      'Account Receivable – Trade',
      'Inventory',
      'Prepaid Expenses',
      'Short-term Investments',
      'Other Current Assets',
    ],
  },
  {
    key: 'nonCurrentAssets',
    banner: 'Non-Current Asset',
    addLabel: 'Add Asset',
    options: [
      'Property, plant and equipment (net of depr.)',
      'Long-term Investments',
      'Intangible Assets',
      'Deferred Tax Assets',
      'Other Non-Current Assets',
    ],
  },
  {
    key: 'currentLiabilities',
    banner: 'Current Liabilities',
    addLabel: 'Add Current Liabilities',
    options: [
      'Accounts Payable – Trade',
      'Short-term Loans',
      'Accrued Expenses',
      'Current Portion of Long-term Debt',
      'Income Tax Payable',
      'Other Current Liabilities',
    ],
  },
  {
    key: 'nonCurrentLiabilities',
    banner: 'Non-Current Liabilities',
    addLabel: 'Add Non-Current Liabilities',
    options: [
      'Long-term Loans',
      'Deferred Tax Liabilities',
      'Bonds Payable',
      'Other Non-Current Liabilities',
    ],
  },
  {
    key: 'equity',
    banner: 'Equity',
    addLabel: 'Add Equity',
    options: [
      'Capital',
      'Additional Paid-in Capital',
      'Retained Earnings',
      'Net Income',
      'Other Equity',
    ],
  },
];

function MoneyInput({
  label,
  value,
  onValueChange,
  allowNegative,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  allowNegative?: boolean;
}) {
  return (
    <Stack spacing={0.6}>
      <Typography sx={fsLabelSx}>{label}</Typography>
      <NumericFormat
        fullWidth
        size="small"
        customInput={TextField}
        placeholder="0.00"
        value={value}
        onValueChange={({ value: next }) => onValueChange(next)}
        thousandSeparator=","
        decimalScale={2}
        allowNegative={!!allowNegative}
        valueIsNumericString
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: TONE_COLORS.info.solid }}>₱</Typography>
            </InputAdornment>
          ),
        }}
        sx={fieldSx}
      />
    </Stack>
  );
}

// One line, no wrap — the dialog is wide enough that every label fits.
const fsLabelSx = {
  fontSize: 12,
  fontWeight: 600,
  color: '#3B4256',
  whiteSpace: 'nowrap' as const,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

function periodFilled(p: FinancialStatementPeriod): boolean {
  const incomeFilled = INCOME_INPUTS.some(({ field }) => parseNum(p[field]) !== 0);
  const bsFilled = BALANCE_CATEGORIES.some(({ key }) => sumBalanceSheetLines(p[key]) !== 0);
  return incomeFilled || bsFilled;
}

// One Balance Sheet category in the flat list — a plain text heading and
// its line items as single horizontal rows (item dropdown + ₱ value +
// remove), then an "Add" button matching the Cash Flow Manage form.
function BalanceCategoryBlock({
  banner,
  addLabel,
  options,
  lines,
  onAdd,
  onUpdate,
  onRemove,
}: {
  banner: string;
  addLabel: string;
  options: string[];
  lines: { id: string; label: string; value: string }[];
  onAdd: () => void;
  onUpdate: (id: string, patch: { label?: string; value?: string }) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <Stack spacing={1.25}>
      <Typography
        sx={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#8891A6',
        }}
      >
        {banner}
      </Typography>

      <Box
        sx={{
          bgcolor: '#F9FAFC',
          border: '1px solid #EEF0F5',
          borderRadius: '11px',
          p: 1.5,
        }}
      >
        <Stack spacing={1.25}>
          {lines.length === 0 ? (
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
              No {banner.toLowerCase()} items yet.
            </Box>
          ) : (
            lines.map((row) => (
              <Stack
                key={row.id}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                alignItems={{ xs: 'stretch', sm: 'center' }}
              >
                <Select
                  size="small"
                  displayEmpty
                  value={row.label}
                  onChange={(event) => onUpdate(row.id, { label: event.target.value })}
                  sx={{ flex: 1, minWidth: 0, borderRadius: '10px', fontSize: 13, bgcolor: 'common.white' }}
                  renderValue={(v) =>
                    v ? (v as string) : <Box component="span" sx={{ color: '#8891A6' }}>Select item…</Box>
                  }
                >
                  {options.map((opt) => (
                    <MenuItem key={opt} value={opt} sx={{ fontSize: 13 }}>
                      {opt}
                    </MenuItem>
                  ))}
                </Select>
                <Stack direction="row" spacing={1} alignItems="center">
                  <NumericFormat
                    size="small"
                    customInput={TextField}
                    placeholder="0.00"
                    value={row.value}
                    onValueChange={({ value }) => onUpdate(row.id, { value })}
                    thousandSeparator=","
                    decimalScale={2}
                    allowNegative={false}
                    valueIsNumericString
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: TONE_COLORS.info.solid }}>
                            Php
                          </Typography>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      width: { xs: '100%', sm: 220 },
                      flexShrink: 0,
                      '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 13, bgcolor: 'common.white' },
                      '& input': { textAlign: 'right' },
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => onRemove(row.id)}
                    aria-label="Remove line item"
                    sx={{ flexShrink: 0 }}
                  >
                    <Iconify icon="mingcute:close-line" width={15} sx={{ color: '#8891A6' }} />
                  </IconButton>
                </Stack>
              </Stack>
            ))
          )}
        </Stack>
      </Box>

      <Button
        onClick={onAdd}
        variant="outlined"
        size="small"
        startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
        sx={{ ...outlinedNavyButtonSx, alignSelf: 'flex-end' }}
      >
        {addLabel}
      </Button>
    </Stack>
  );
}

type FinancialStatementModalProps = {
  open: boolean;
  onClose: () => void;
};

// One period's Income Statement + Balance Sheet, inline — the body of
// each period's CollapsibleSection. Combines what used to be the modal's
// separate `income`/`balance`/`combined` steps into one always-visible
// block, since there's no more "proceed"/"save" gate between them.
function PeriodForm({
  data,
  onField,
  onAddLine,
  onUpdateLine,
  onRemoveLine,
}: {
  data: FinancialStatementPeriod;
  onField: (field: FinancialStatementField, value: string) => void;
  onAddLine: (category: BalanceSheetCategory) => void;
  onUpdateLine: (category: BalanceSheetCategory, id: string, patch: { label?: string; value?: string }) => void;
  onRemoveLine: (category: BalanceSheetCategory, id: string) => void;
}) {
  const inc = computeIncomeStatement(data);
  const money = (n: number) => fCurrency(n) || '₱0.00';

  return (
    <Stack spacing={3}>
      <Box>
        <Box sx={sectionBannerSx}>Income Statement</Box>

        <Box sx={{ mb: 2.5 }}>
          <InfoChip2Row cols={3}>
            <InfoChip2 label="Net Sale" value={money(inc.netSales)} />
            <InfoChip2 label="Gross Profit" value={money(inc.grossProfit)} />
            <InfoChip2 label="Operating Income" value={money(inc.operatingIncome)} edge={{ right: true }} />
            <InfoChip2 label="Net Income Before Tax" value={money(inc.netIncomeBeforeTax)} />
            <InfoChip2 label="Net Income After Tax" value={money(inc.netIncomeAfterTax)} />
            <InfoChip2 label="EBITDA" value={money(inc.ebitda)} edge={{ right: true }} />
            <InfoChip2
              label="Op. Income Before Other Inc. (Exp.)"
              value={money(inc.operatingIncomeBeforeOther)}
              wide
              edge={{ right: true, bottom: true }}
            />
          </InfoChip2Row>
        </Box>

        <Grid container spacing={2.5}>
          {INCOME_INPUTS.map(({ field, label, allowNegative }) => (
            <Grid key={field} item xs={12} sm={6}>
              <MoneyInput
                label={label}
                value={data[field]}
                onValueChange={(value) => onField(field, value)}
                allowNegative={allowNegative}
              />
            </Grid>
          ))}
        </Grid>
      </Box>

      <Box>
        <Box sx={sectionBannerSx}>Balance Sheet</Box>
        <Stack spacing={2.5}>
          {BALANCE_CATEGORIES.map((cat) => (
            <BalanceCategoryBlock
              key={cat.key}
              banner={cat.banner}
              addLabel={cat.addLabel}
              options={cat.options}
              lines={data[cat.key]}
              onAdd={() => onAddLine(cat.key)}
              onUpdate={(id, patch) => onUpdateLine(cat.key, id, patch)}
              onRemove={(id) => onRemoveLine(cat.key, id)}
            />
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}

export function FinancialStatementModal({ open, onClose }: FinancialStatementModalProps) {
  const { signUpData, application } = useRegistration();
  const {
    review,
    setFinancialStatementField,
    addBalanceSheetLine,
    updateBalanceSheetLine,
    removeBalanceSheetLine,
    setFinancialStatementDetails,
  } = useAdmin();
  // Collapsed by default for every period — the officer expands whichever
  // they want to work on; nothing needs a separate screen to reach it.
  const [expandedPeriods, setExpandedPeriods] = useState<Set<FinancialPeriod>>(new Set());
  const [reportPeriod, setReportPeriod] = useState<FinancialPeriod | null>(null);

  const details = review.financialStatementDetails;
  const applicantName = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : '—';
  const amountApplied = application.financialInfo?.desiredLoanAmount;

  const togglePeriod = (p: FinancialPeriod) => {
    setExpandedPeriods((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const handleClose = () => {
    setReportPeriod(null);
    onClose();
  };

  const handleSaveRecord = () => {
    setFinancialStatementDetails(submitFinancialStatementDetails(details, new Date().toISOString()));
    handleClose();
  };

  // Unmount the outgoing dialog so its exit transition cannot overlap the
  // incoming dialog or render a report whose selected period was cleared.
  if (reportPeriod !== null) {
    return (
      <FinancialStatementReport
        open={open}
        period={reportPeriod}
        onClose={() => setReportPeriod(null)}
      />
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle sx={{ p: 3, pb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#14172A' }}>
              Financial Statement
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#8891A6', mt: 0.25 }}>
              Every period&apos;s income statement &amp; balance sheet — expand a period to enter or review its figures.
            </Typography>
          </Box>
          <IconButton onClick={handleClose} aria-label="Close Financial Statement">
            <Iconify icon="mingcute:close-line" width={22} />
          </IconButton>
        </Stack>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <Stack
            direction="row"
            flexWrap="wrap"
            sx={{
              border: '1px solid #EEF0F5',
              borderRadius: '12px',
              bgcolor: '#FAFBFD',
              '& > div:not(:last-of-type)': { borderRight: { xs: 'none', sm: '1px solid #EEF0F5' } },
            }}
          >
            <InfoChip1 label="Applicant Name" value={applicantName} />
            <InfoChip1
              label="Amount Applied"
              value={amountApplied == null ? '—' : `₱${amountApplied.toLocaleString('en-PH')}`}
            />
          </Stack>

          {FINANCIAL_PERIODS.map((p) => {
            const data = review.financialStatement[p];
            const filled = periodFilled(data);
            return (
              <Box
                key={p}
                sx={{
                  borderRadius: '13px',
                  border: '1px solid #EBEDF3',
                  bgcolor: 'common.white',
                  p: 2,
                }}
              >
                <CollapsibleSection
                  title={FINANCIAL_PERIOD_LABELS[p]}
                  expanded={expandedPeriods.has(p)}
                  onToggle={() => togglePeriod(p)}
                  badge={
                    <Chip
                      size="small"
                      label={filled ? 'Filled' : 'Empty'}
                      sx={{
                        fontWeight: 700,
                        fontSize: 11,
                        bgcolor: filled ? TONE_COLORS.success.bg : TONE_COLORS.neutral.bg,
                        color: filled ? TONE_COLORS.success.text : TONE_COLORS.neutral.text,
                      }}
                    />
                  }
                  headerAction={
                    <Button
                      onClick={() => setReportPeriod(p)}
                      variant="outlined"
                      size="small"
                      startIcon={<Iconify icon="solar:eye-bold-duotone" width={15} />}
                      sx={{ ...outlinedNavyButtonSx, px: 2 }}
                    >
                      View
                    </Button>
                  }
                >
                  <PeriodForm
                    data={data}
                    onField={(field, value) => setFinancialStatementField(p, field, value)}
                    onAddLine={(category) => addBalanceSheetLine(p, category)}
                    onUpdateLine={(category, id, patch) => updateBalanceSheetLine(p, category, id, patch)}
                    onRemoveLine={(category, id) => removeBalanceSheetLine(p, category, id)}
                  />
                </CollapsibleSection>
              </Box>
            );
          })}

          <RichTextField
            label="Remarks"
            value={details.remarks}
            onChange={(remarks) => setFinancialStatementDetails({ remarks })}
            placeholder="Enter financial statement remarks…"
          />
        </Stack>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2.5 }}>
        <Button onClick={handleSaveRecord} variant="contained" sx={primaryBtnSx}>
          Save Record
        </Button>
      </DialogActions>
    </Dialog>
  );
}
