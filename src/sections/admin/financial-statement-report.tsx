'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';
import { selectFinancialStatementReportPeriods } from 'src/auth/financial-statement-details';
import {
  FINANCIAL_PERIODS,
  FINANCIAL_PERIOD_LABELS,
  type FinancialPeriod,
  type BalanceSheetLine,
  type BalanceSheetCategory,
} from 'src/auth/admin-context';

import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

import {
  parseNum,
  fRatio,
  fPct,
  computeGrowth,
  computeRatios,
  computeBalanceSheet,
  computePctOfSales,
  computeIncomeStatement,
} from './financial-summary-calcs';

// ----------------------------------------------------------------------
// Financial Statement Report — read-only income statement (₱ / % of sales /
// growth per period), balance sheet with an Assets = Liabilities + Equity
// tally, and a ratios block. All figures are recomputed from Financial
// Statement state (financial-summary-calcs.ts); nothing stored. On-screen
// only — no XLS/PDF. Opened from the Financial Summary card's "View" on the
// Financial Statement row.
// ----------------------------------------------------------------------

const cellSx = { fontSize: 11.5, px: 1, py: 0.6, whiteSpace: 'nowrap' as const };
const labelCellSx = { ...cellSx, fontWeight: 700, color: '#14172A', textAlign: 'left' as const };
const numCellSx = { ...cellSx, textAlign: 'right' as const, color: '#3B4256' };

/** Prior actual period for growth — Interim/Projected have no direct prior. */
function priorPeriod(period: FinancialPeriod): FinancialPeriod | null {
  const idx = FINANCIAL_PERIODS.indexOf(period);
  if (period === 'interim' || period === 'projected' || idx <= 0) return null;
  return FINANCIAL_PERIODS[idx - 1];
}

export function FinancialStatementReport({
  open,
  onClose,
  period,
}: {
  open: boolean;
  onClose: () => void;
  period?: FinancialPeriod;
}) {
  const { review } = useAdmin();
  const { signUpData, application } = useRegistration();
  const statement = review.financialStatement;
  const details = review.financialStatementDetails;
  const applicantName = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : '—';
  const amountApplied = application.financialInfo?.desiredLoanAmount;
  const periods = selectFinancialStatementReportPeriods(FINANCIAL_PERIODS, period);

  const money = (n: number) => fCurrency(n) || '₱0.00';

  const incomeRows: { label: string; value: (p: FinancialPeriod) => number; pct?: boolean }[] = [
    { label: 'Gross Sales', value: (p) => parseNum(statement[p].grossSales), pct: true },
    { label: 'Net Sales', value: (p) => computeIncomeStatement(statement[p]).netSales, pct: true },
    { label: 'Cost of Goods Sold', value: (p) => parseNum(statement[p].costOfGoodsSold), pct: true },
    { label: 'Gross Profit', value: (p) => computeIncomeStatement(statement[p]).grossProfit, pct: true },
    { label: 'Operating Expenses', value: (p) => parseNum(statement[p].operatingExpenses), pct: true },
    { label: 'Operating Income Before Other Income (Expenses)', value: (p) => computeIncomeStatement(statement[p]).operatingIncomeBeforeOther, pct: true },
    { label: 'Other Income (Expense)', value: (p) => parseNum(statement[p].otherIncomeExpense), pct: true },
    { label: 'Operating Income', value: (p) => computeIncomeStatement(statement[p]).operatingIncome, pct: true },
    { label: 'Interest Expense', value: (p) => parseNum(statement[p].interestExpense), pct: true },
    { label: 'Net Income Before Tax', value: (p) => computeIncomeStatement(statement[p]).netIncomeBeforeTax, pct: true },
    { label: 'Provision for Taxes', value: (p) => parseNum(statement[p].provisionForTaxes), pct: true },
    { label: 'Net Income After Tax', value: (p) => computeIncomeStatement(statement[p]).netIncomeAfterTax, pct: true },
    { label: 'Depreciation', value: (p) => parseNum(statement[p].depreciation), pct: true },
    { label: 'EBITDA', value: (p) => computeIncomeStatement(statement[p]).ebitda, pct: true },
  ];

  const assetRows: { label: string; value: (p: FinancialPeriod) => number }[] = [
    { label: 'Total Current Assets', value: (p) => computeBalanceSheet(statement[p]).totalCurrentAssets },
    { label: 'Total Assets', value: (p) => computeBalanceSheet(statement[p]).totalAssets },
  ];
  const liabilityRows: { label: string; value: (p: FinancialPeriod) => number }[] = [
    { label: 'Total Current Liabilities', value: (p) => computeBalanceSheet(statement[p]).totalCurrentLiabilities },
    { label: 'Total Liabilities', value: (p) => computeBalanceSheet(statement[p]).totalLiabilities },
  ];
  const equityRows: { label: string; value: (p: FinancialPeriod) => number }[] = [
    { label: 'Total Equity', value: (p) => computeBalanceSheet(statement[p]).totalEquity },
    { label: "Total Liabilities & Stockholders' Equity", value: (p) => computeBalanceSheet(statement[p]).totalLiabEquity },
  ];

  const ratioRows: { label: string; value: (p: FinancialPeriod) => string }[] = [
    { label: 'Net Working Capital', value: (p) => money(computeRatios(statement[p]).netWorkingCapital) },
    { label: 'Net Worth', value: (p) => money(computeRatios(statement[p]).netWorth) },
    { label: 'Current Ratio', value: (p) => fRatio(computeRatios(statement[p]).currentRatio) },
    { label: 'Quick Ratio (Acid Test)', value: (p) => fRatio(computeRatios(statement[p]).quickRatio) },
    { label: "Days' Receivable", value: (p) => String(computeRatios(statement[p]).daysReceivable) },
    { label: "Days' Inventory", value: (p) => String(computeRatios(statement[p]).daysInventory) },
    { label: "Days' Payable", value: (p) => String(computeRatios(statement[p]).daysPayable) },
    { label: 'Return on Equity (ROE)', value: (p) => fPct(computeRatios(statement[p]).returnOnEquity) },
    { label: 'Return on Assets (ROA)', value: (p) => fPct(computeRatios(statement[p]).returnOnAssets) },
    { label: 'Gross Profit Margin', value: (p) => fPct(computeRatios(statement[p]).grossProfitMargin) },
    { label: 'Operating Margin', value: (p) => fPct(computeRatios(statement[p]).operatingMargin) },
    { label: 'Return on Sales', value: (p) => fPct(computeRatios(statement[p]).returnOnSales) },
    { label: 'Total Assets / Equity', value: (p) => fRatio(computeRatios(statement[p]).totalAssetsToEquity) },
    { label: 'Debt to Equity Ratio', value: (p) => fRatio(computeRatios(statement[p]).debtToEquity) },
    { label: 'Debt to Asset Ratio', value: (p) => fRatio(computeRatios(statement[p]).debtToAsset) },
    { label: 'Interest Coverage', value: (p) => fRatio(computeRatios(statement[p]).interestCoverage) },
    { label: 'Debt Service Coverage', value: (p) => fRatio(computeRatios(statement[p]).debtServiceCoverage) },
  ];

  const growthCell = (period: FinancialPeriod, valueFn: (p: FinancialPeriod) => number) => {
    const prior = priorPeriod(period);
    if (!prior) return '';
    return fPct(computeGrowth(valueFn(period), valueFn(prior)));
  };

  if (period) {
    const fs = statement[period];
    const inc = computeIncomeStatement(fs);
    const balanceCategories: { key: BalanceSheetCategory; label: string; lines: BalanceSheetLine[] }[] = [
      { key: 'currentAssets', label: 'Current Assets', lines: fs.currentAssets },
      { key: 'nonCurrentAssets', label: 'Non-Current Asset', lines: fs.nonCurrentAssets },
      { key: 'currentLiabilities', label: 'Current Liabilities', lines: fs.currentLiabilities },
      { key: 'nonCurrentLiabilities', label: 'Non-Current Liabilities', lines: fs.nonCurrentLiabilities },
      { key: 'equity', label: 'Equity', lines: fs.equity },
    ];
    const bsTotal = (lines: BalanceSheetLine[]) => lines.reduce((acc, l) => acc + parseNum(l.value), 0);

    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" scroll="paper">
        <DialogTitle sx={{ p: 3, pb: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <Box>
              <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#14172A' }}>
                Financial Statement Report · {FINANCIAL_PERIOD_LABELS[period]}
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#8891A6', mt: 0.25 }}>{applicantName}</Typography>
            </Box>
            <IconButton onClick={onClose} aria-label="Close Financial Statement Report">
              <Iconify icon="mingcute:close-line" width={22} />
            </IconButton>
          </Stack>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            <Stack spacing={1.5}>
              <SinglePeriodBanner label="Income Statement" period={period} />
              <SinglePeriodTable>
                <SingleLineRow label="Gross Sales" value={money(parseNum(fs.grossSales))} />
                <SingleLineRow label="Cost of Goods Sold" value={money(parseNum(fs.costOfGoodsSold))} />
                <SingleLineRow label="Operating Expenses" value={money(parseNum(fs.operatingExpenses))} />
                <SingleLineRow label="Other Income (Expense)" value={money(parseNum(fs.otherIncomeExpense))} />
                <SingleLineRow label="Interest Expense" value={money(parseNum(fs.interestExpense))} />
                <SingleLineRow label="Provision for Tax" value={money(parseNum(fs.provisionForTaxes))} />
                <SingleLineRow label="Depreciation" value={money(parseNum(fs.depreciation))} />
                <SingleTotalRow label="Net Sale" value={money(inc.netSales)} />
                <SingleLineRow label="Gross Profit" value={money(inc.grossProfit)} />
                <SingleLineRow
                  label="Operating Income Before other Income (Expenses)"
                  value={money(inc.operatingIncomeBeforeOther)}
                />
                <SingleLineRow label="Operating Income" value={money(inc.operatingIncome)} />
                <SingleLineRow label="Net Income Before Tax" value={money(inc.netIncomeBeforeTax)} />
                <SingleTotalRow label="Net Income After Tax" value={money(inc.netIncomeAfterTax)} />
                <SingleLineRow label="EBITDA" value={money(inc.ebitda)} />
              </SinglePeriodTable>
            </Stack>

            <Stack spacing={1.5}>
              <SinglePeriodBanner label="Balance Sheet" period={period} />
              <SinglePeriodTable>
                {balanceCategories.map((cat) => (
                  <Box key={cat.key} component="tbody" sx={{ display: 'contents' }}>
                    <SingleCategoryHeadingRow label={cat.label} />
                    {cat.lines.length === 0 ? (
                      <SingleLineRow label="No line items recorded" value="—" />
                    ) : (
                      cat.lines.map((line) => (
                        <SingleLineRow key={line.id} label={line.label || '—'} value={money(parseNum(line.value))} />
                      ))
                    )}
                    <SingleTotalRow label={`Total ${cat.label}`} value={money(bsTotal(cat.lines))} />
                  </Box>
                ))}
              </SinglePeriodTable>
            </Stack>
          </Stack>
        </DialogContent>

        <Divider />

        <DialogActions sx={{ p: 2.5 }}>
          <Button
            onClick={onClose}
            variant="contained"
            sx={{
              bgcolor: '#1C2A6E',
              borderRadius: '10px',
              px: 3,
              fontWeight: 700,
              boxShadow: 'none',
              '&:hover': { bgcolor: '#14205A', boxShadow: 'none' },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" scroll="paper">
      <DialogTitle sx={{ p: 3, pb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#14172A' }}>
              Financial Statement Report
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#8891A6', mt: 0.25 }}>{applicantName}</Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="PDF export coming soon">
              <span>
                <IconButton
                  disabled
                  aria-label="Download Financial Statement Report"
                  sx={{ border: '1px solid #E1E4ED', borderRadius: '10px', px: 1.5 }}
                >
                  <Iconify icon="solar:file-download-bold" width={18} sx={{ color: '#8891A6' }} />
                </IconButton>
              </span>
            </Tooltip>
            <IconButton onClick={onClose} aria-label="Close Financial Statement Report">
              <Iconify icon="mingcute:close-line" width={22} />
            </IconButton>
          </Stack>
        </Stack>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 3 }}>
        <Stack
          direction="row"
          flexWrap="wrap"
          sx={{
            mb: 2.5,
            border: '1px solid #EEF0F5',
            borderRadius: '12px',
            bgcolor: '#FAFBFD',
            '& > div:not(:last-of-type)': { borderRight: { xs: 'none', sm: '1px solid #EEF0F5' } },
          }}
        >
          <FactChip label="Applicant Name" value={applicantName} />
          <FactChip
            label="Amount Applied"
            value={amountApplied == null ? '—' : money(amountApplied)}
          />
          <FactChip label="Product Line" value={details.productLine} />
          <FactChip label="AMD" value={details.amd} />
        </Stack>

        <Box sx={{ overflowX: 'auto', border: '1px solid #EBEDF3', borderRadius: '13px' }}>
          <Box
            component="table"
            sx={{ borderCollapse: 'collapse', width: '100%', minWidth: 900 }}
          >
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: '#EEF1FE' }}>
                <Box component="th" sx={{ ...labelCellSx, minWidth: 230 }} />
                {periods.map((p) => (
                  <Box
                    component="th"
                    key={p}
                    colSpan={3}
                    sx={{ ...cellSx, fontWeight: 800, color: '#14172A', textAlign: 'center', borderLeft: '1px solid #D6DCFA' }}
                  >
                    {FINANCIAL_PERIOD_LABELS[p]}
                    <Typography component="span" sx={{ display: 'block', fontSize: 9.5, color: '#667085', fontWeight: 600 }}>
                      12 Mos.
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Box component="tr" sx={{ bgcolor: '#F5F7FF' }}>
                <Box component="th" sx={labelCellSx} />
                {periods.map((p) => (
                  <Box key={p} sx={{ display: 'contents' }}>
                    <Box component="th" sx={{ ...cellSx, textAlign: 'right', color: '#9AA2B4', fontWeight: 700, borderLeft: '1px solid #E1E4ED' }}>
                      Amount
                    </Box>
                    <Box component="th" sx={{ ...cellSx, textAlign: 'right', color: '#9AA2B4', fontWeight: 700 }}>
                      % Sales
                    </Box>
                    <Box component="th" sx={{ ...cellSx, textAlign: 'right', color: '#9AA2B4', fontWeight: 700 }}>
                      Growth
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>

            <Box component="tbody">
              <SectionHeaderRow label="Income Statement" span={1 + periods.length * 3} />
              {incomeRows.map((row) => (
                <Box component="tr" key={row.label} sx={{ '&:nth-of-type(even)': { bgcolor: '#FAFBFD' } }}>
                  <Box component="td" sx={labelCellSx}>{row.label}</Box>
                  {periods.map((p) => (
                    <Box key={p} sx={{ display: 'contents' }}>
                      <Box component="td" sx={{ ...numCellSx, borderLeft: '1px solid #F0F1F5' }}>
                        {money(row.value(p))}
                      </Box>
                      <Box component="td" sx={numCellSx}>
                        {row.pct ? fPct(computePctOfSales(row.value(p), parseNum(statement[p].grossSales))) : ''}
                      </Box>
                      <Box component="td" sx={numCellSx}>{growthCell(p, row.value)}</Box>
                    </Box>
                  ))}
                </Box>
              ))}

              <SectionHeaderRow label="Balance Sheet" span={1 + periods.length * 3} />

              <GroupHeaderRow label="Assets" span={1 + periods.length * 3} />
              {assetRows.map((row) => (
                <Box component="tr" key={row.label} sx={{ '&:nth-of-type(even)': { bgcolor: '#FAFBFD' } }}>
                  <Box component="td" sx={labelCellSx}>{row.label}</Box>
                  {periods.map((p) => (
                    <Box key={p} sx={{ display: 'contents' }}>
                      <Box component="td" sx={{ ...numCellSx, borderLeft: '1px solid #F0F1F5' }}>
                        {money(row.value(p))}
                      </Box>
                      <Box component="td" sx={numCellSx} />
                      <Box component="td" sx={numCellSx}>{growthCell(p, row.value)}</Box>
                    </Box>
                  ))}
                </Box>
              ))}

              <GroupHeaderRow label="Liabilities" span={1 + periods.length * 3} />
              {liabilityRows.map((row) => (
                <Box component="tr" key={row.label} sx={{ '&:nth-of-type(even)': { bgcolor: '#FAFBFD' } }}>
                  <Box component="td" sx={labelCellSx}>{row.label}</Box>
                  {periods.map((p) => (
                    <Box key={p} sx={{ display: 'contents' }}>
                      <Box component="td" sx={{ ...numCellSx, borderLeft: '1px solid #F0F1F5' }}>
                        {money(row.value(p))}
                      </Box>
                      <Box component="td" sx={numCellSx} />
                      <Box component="td" sx={numCellSx}>{growthCell(p, row.value)}</Box>
                    </Box>
                  ))}
                </Box>
              ))}

              <GroupHeaderRow label="Equity" span={1 + periods.length * 3} />
              {equityRows.map((row) => (
                <Box component="tr" key={row.label} sx={{ '&:nth-of-type(even)': { bgcolor: '#FAFBFD' } }}>
                  <Box component="td" sx={labelCellSx}>{row.label}</Box>
                  {periods.map((p) => (
                    <Box key={p} sx={{ display: 'contents' }}>
                      <Box component="td" sx={{ ...numCellSx, borderLeft: '1px solid #F0F1F5' }}>
                        {money(row.value(p))}
                      </Box>
                      <Box component="td" sx={numCellSx} />
                      <Box component="td" sx={numCellSx}>{growthCell(p, row.value)}</Box>
                    </Box>
                  ))}
                </Box>
              ))}
              <Box component="tr">
                <Box component="td" sx={{ ...labelCellSx, fontWeight: 800 }}>
                  Assets and Liabilities &amp; Stockholders&apos; Equity Tally
                </Box>
                {periods.map((p) => {
                  const bs = computeBalanceSheet(statement[p]);
                  return (
                    <Box
                      component="td"
                      key={p}
                      colSpan={3}
                      sx={{
                        ...cellSx,
                        textAlign: 'center',
                        fontWeight: 700,
                        borderLeft: '1px solid #F0F1F5',
                        color: bs.tallyMatched ? '#0C8A4F' : '#B36A05',
                      }}
                    >
                      {bs.tallyMatched ? 'Matched' : `Off by ${money(Math.abs(bs.tallyDelta))}`}
                    </Box>
                  );
                })}
              </Box>

              <SectionHeaderRow label="Ratios" span={1 + periods.length * 3} />
              {ratioRows.map((row) => (
                <Box component="tr" key={row.label} sx={{ '&:nth-of-type(even)': { bgcolor: '#FAFBFD' } }}>
                  <Box component="td" sx={labelCellSx}>{row.label}</Box>
                  {periods.map((p) => (
                    <Box
                      component="td"
                      key={p}
                      colSpan={3}
                      sx={{ ...cellSx, textAlign: 'right', color: '#3B4256', borderLeft: '1px solid #F0F1F5' }}
                    >
                      {row.value(p)}
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        <Typography sx={{ fontSize: 11, color: '#98A2B3', mt: 2, textAlign: 'center' }}>
          Days&apos; Receivable / Inventory / Payable and Quick Ratio are approximated — this build
          has no receivable / inventory / payable balance fields. All figures are computed on screen.
        </Typography>

        <Box sx={{ mt: 2.5, p: 2, borderRadius: '12px', border: '1px solid #EEF0F5' }}>
          <Typography
            sx={{
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#8891A6',
              mb: 1,
            }}
          >
            Remarks
          </Typography>
          {details.remarks ? (
            <Box
              sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6, '& p': { m: 0 } }}
              dangerouslySetInnerHTML={{ __html: details.remarks }}
            />
          ) : (
            <Typography sx={{ fontSize: 13, color: '#98A2B3' }}>No remarks recorded.</Typography>
          )}
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2.5 }}>
          <Box sx={{ flex: 1, p: 2, borderRadius: '12px', border: '1px solid #EEF0F5' }}>
            <Typography
              sx={{
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#8891A6',
              }}
            >
              Prepared by
            </Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A', mt: 1 }}>
              {application.assignedOfficer ?? '—'}
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>
              Credit Officer ·{' '}
              {new Date().toLocaleString('en-PH', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Typography>
          </Box>
          <Box sx={{ flex: 1, p: 2, borderRadius: '12px', border: '1px solid #EEF0F5' }}>
            <Typography
              sx={{
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#8891A6',
              }}
            >
              Noted by
            </Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A', mt: 1 }}>—</Typography>
            <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>Pending review</Typography>
          </Box>
        </Stack>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2.5 }}>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            bgcolor: '#1C2A6E',
            borderRadius: '10px',
            px: 3,
            fontWeight: 700,
            boxShadow: 'none',
            '&:hover': { bgcolor: '#14205A', boxShadow: 'none' },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function SectionHeaderRow({ label, span }: { label: string; span: number }) {
  return (
    <Box component="tr">
      <Box
        component="td"
        colSpan={span}
        sx={{
          fontSize: 12,
          fontWeight: 800,
          color: '#14172A',
          bgcolor: '#F1F3F8',
          px: 1,
          py: 0.75,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Box>
    </Box>
  );
}

/** A lighter sub-group heading within a section (e.g. Assets / Liabilities
 *  / Equity inside Balance Sheet) — same idea as SectionHeaderRow, one
 *  tint lighter and not uppercase. */
function GroupHeaderRow({ label, span }: { label: string; span: number }) {
  return (
    <Box component="tr">
      <Box
        component="td"
        colSpan={span}
        sx={{
          fontSize: 12.5,
          fontWeight: 700,
          color: '#14172A',
          bgcolor: '#FAFBFD',
          px: 1,
          py: 0.6,
        }}
      >
        {label}
      </Box>
    </Box>
  );
}

function FactChip({ label, value }: { label: string; value: React.ReactNode }) {
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

// ----------------------------------------------------------------------
// Single-period layout — a navy full-width banner per statement, label:
// value rows, tinted total rows, styled like the Cash Flow Statement
// Report's single-column table.
// ----------------------------------------------------------------------

const singleCellSx = { fontSize: 12.5, px: 1.25, py: 0.65, verticalAlign: 'middle' as const };
const singleLabelCellSx = { ...singleCellSx, textAlign: 'left' as const, color: '#5A6273' };
const singleValueCellSx = { ...singleCellSx, textAlign: 'right' as const, color: '#3B4256' };

function SinglePeriodBanner({ label, period }: { label: string; period: FinancialPeriod }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ bgcolor: '#1C2A6E', color: 'common.white', px: 2, py: 1, borderRadius: '10px' }}
    >
      <Typography sx={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 13, fontWeight: 700 }}>({FINANCIAL_PERIOD_LABELS[period]})</Typography>
    </Stack>
  );
}

function SinglePeriodTable({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ overflowX: 'auto', border: '1px solid #EBEDF3', borderRadius: '13px' }}>
      <Box component="table" sx={{ width: '100%', minWidth: 320, borderCollapse: 'collapse' }}>
        <Box component="tbody">{children}</Box>
      </Box>
    </Box>
  );
}

function SingleLineRow({ label, value }: { label: string; value: string }) {
  return (
    <Box component="tr" sx={{ '&:nth-of-type(even)': { bgcolor: '#FAFBFD' } }}>
      <Box component="td" sx={singleLabelCellSx}>{label}</Box>
      <Box component="td" sx={singleValueCellSx}>{value}</Box>
    </Box>
  );
}

function SingleCategoryHeadingRow({ label }: { label: string }) {
  return (
    <Box component="tr">
      <Box component="td" colSpan={2} sx={{ ...singleCellSx, fontWeight: 700, color: '#14172A', pt: 1.5 }}>
        {label}
      </Box>
    </Box>
  );
}

function SingleTotalRow({ label, value }: { label: string; value: string }) {
  return (
    <Box component="tr" sx={{ bgcolor: '#EEF1FE' }}>
      <Box component="td" sx={{ ...singleLabelCellSx, fontWeight: 800, color: '#14172A', textTransform: 'uppercase', fontSize: 11.5 }}>
        {label}
      </Box>
      <Box component="td" sx={{ ...singleValueCellSx, fontWeight: 800, color: '#3448B0' }}>{value}</Box>
    </Box>
  );
}
