'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import type { FinancialSummary, FinancialSummaryStatus } from 'src/auth/admin-context';

import { TONE_COLORS, adminCardSx } from 'src/components/admin-ui';
import { CollapsibleSection } from 'src/components/collapsible-section';

// ----------------------------------------------------------------------
// Financial Evaluation's Financial Summary card — a light workspace for the
// three legacy sub-tools (Financial Statement, Bank Loans, Financial
// Highlights). This build tracks only, per item, a manually-set status and a
// free-text Remarks note (Layout A: always-expanded sub-cards, remarks
// always visible). The legacy deep data-entry forms and XLS/PDF report views
// are a future follow-up — there are no "Manage" / "View" actions here.
// Informational: does not gate the page's Endorse / Disapprove decision.
// ----------------------------------------------------------------------

const ITEMS: { key: keyof FinancialSummary; label: string; description: string }[] = [
  {
    key: 'financialStatement',
    label: 'Financial Statement',
    description: 'Income statement, balance sheet & ratios per period (2023 – Projected).',
  },
  {
    key: 'bankLoans',
    label: 'Bank Loans',
    description: 'Existing bank / PGFC loan balances and the proposed loan; DSCR basis.',
  },
  {
    key: 'financialHighlights',
    label: 'Financial Highlights',
    description: 'Key metrics table — gross sales, net income, ratios, DSCR, rating.',
  },
];

const STATUS_META: Record<
  FinancialSummaryStatus,
  { label: string; tone: keyof typeof TONE_COLORS }
> = {
  'not-started': { label: 'Not started', tone: 'neutral' },
  'in-progress': { label: 'In progress', tone: 'info' },
  complete: { label: 'Complete', tone: 'success' },
};

const STATUS_KEYS = Object.keys(STATUS_META) as FinancialSummaryStatus[];

function StatusSelect({
  value,
  onChange,
}: {
  value: FinancialSummaryStatus;
  onChange: (next: FinancialSummaryStatus) => void;
}) {
  const meta = STATUS_META[value];
  const tone = TONE_COLORS[meta.tone];
  return (
    <TextField
      select
      size="small"
      value={value}
      onChange={(event) => onChange(event.target.value as FinancialSummaryStatus)}
      sx={{
        minWidth: 138,
        '& .MuiOutlinedInput-root': {
          borderRadius: '20px',
          bgcolor: tone.bg,
          fontSize: 12,
          fontWeight: 700,
          color: tone.text,
          '& fieldset': { borderColor: tone.border },
          '&:hover fieldset': { borderColor: tone.border },
        },
        '& .MuiSelect-select': { py: 0.65, pl: 1.5 },
        '& .MuiSelect-icon': { color: tone.text },
      }}
    >
      {STATUS_KEYS.map((key) => (
        <MenuItem key={key} value={key} sx={{ fontSize: 13 }}>
          {STATUS_META[key].label}
        </MenuItem>
      ))}
    </TextField>
  );
}

export function FinancialSummaryCard() {
  const { review, setFinancialSummaryItem } = useAdmin();
  const summary = review.financialSummary;

  const [expanded, setExpanded] = useState(true);

  const completeCount = ITEMS.filter((item) => summary[item.key].status === 'complete').length;
  const startedCount = ITEMS.filter((item) => summary[item.key].status !== 'not-started').length;

  return (
    <Box sx={adminCardSx}>
      <CollapsibleSection
        title="Financial Summary"
        expanded={expanded}
        onToggle={() => setExpanded((prev) => !prev)}
        badge={
          startedCount > 0 ? (
            <Box
              component="span"
              sx={{
                fontSize: 11,
                fontWeight: 700,
                color: '#5A6273',
                bgcolor: '#F1F3F8',
                borderRadius: 20,
                px: 1,
                py: 0.25,
              }}
            >
              {completeCount} / {ITEMS.length}
            </Box>
          ) : undefined
        }
      >
        <Stack spacing={1.5}>
          <Typography sx={{ fontSize: 13, color: '#8891A6' }}>
            Track the three financial work products. Deep data entry and reports are handled outside
            this card — record status and remarks here.
          </Typography>

          {ITEMS.map((item) => {
            const state = summary[item.key];
            return (
              <Box
                key={item.key}
                sx={{
                  borderRadius: '13px',
                  border: '1px solid #EBEDF3',
                  bgcolor: 'common.white',
                  p: 2,
                }}
              >
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  alignItems={{ sm: 'center' }}
                  spacing={1}
                  sx={{ mb: 1 }}
                >
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#14172A', flex: 1 }}>
                    {item.label}
                  </Typography>
                  <StatusSelect
                    value={state.status}
                    onChange={(next) => setFinancialSummaryItem(item.key, { status: next })}
                  />
                </Stack>
                <Typography sx={{ fontSize: 11.5, color: '#A0A7B5', mb: 1.25 }}>
                  {item.description}
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  placeholder="Remarks…"
                  value={state.remarks}
                  onChange={(event) =>
                    setFinancialSummaryItem(item.key, { remarks: event.target.value })
                  }
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      fontSize: 13.5,
                      bgcolor: '#FAFBFD',
                    },
                    '& textarea::placeholder': { color: '#98A2B3', opacity: 1 },
                  }}
                />
              </Box>
            );
          })}
        </Stack>
      </CollapsibleSection>
    </Box>
  );
}
