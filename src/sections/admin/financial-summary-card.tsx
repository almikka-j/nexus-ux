'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, outlinedNavyButtonSx } from 'src/components/admin-ui';
import { CollapsibleSection } from 'src/components/collapsible-section';

import { BankLoanReport } from './bank-loan-report';
import { BankLoansModal } from './bank-loans-modal';
import { FinancialStatementModal } from './financial-statement-modal';
import { FinancialStatementReport } from './financial-statement-report';
import { FinancialHighlightsModal } from './financial-highlights-modal';
import { FinancialHighlightsReport } from './financial-highlights-report';

// ----------------------------------------------------------------------
// Financial Evaluation's Financial Summary card — the workspace for the
// three legacy sub-tools (Financial Statement, Bank Loans, Financial
// Highlights). Each row opens a deep data-entry form (Manage) and an
// on-screen report view (View). All report figures are pure client-side
// arithmetic (financial-summary-calcs.ts) — no XLS/PDF export. Informational:
// does not gate the page's Endorse / Disapprove decision.
// ----------------------------------------------------------------------

type ToolKey = 'financialStatement' | 'bankLoans' | 'financialHighlights';
type ActiveTool = ToolKey | null;
type ActiveMode = 'manage' | 'view';

const ITEMS: { key: ToolKey; label: string; description: string }[] = [
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

export function FinancialSummaryCard() {
  const [expanded, setExpanded] = useState(true);
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const [activeMode, setActiveMode] = useState<ActiveMode>('manage');

  const openTool = (tool: ToolKey, mode: ActiveMode) => {
    setActiveTool(tool);
    setActiveMode(mode);
  };
  const closeTool = () => setActiveTool(null);

  return (
    <Box sx={adminCardSx}>
      <CollapsibleSection
        title="Financial Summary"
        expanded={expanded}
        onToggle={() => setExpanded((prev) => !prev)}
      >
        <Stack spacing={1.5}>
          <Typography sx={{ fontSize: 13, color: '#8891A6' }}>
            The three financial work products. Use <strong>Manage</strong> to enter data and{' '}
            <strong>View</strong> for the computed report.
          </Typography>

          {ITEMS.map((item) => (
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
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#14172A' }}>
                    {item.label}
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: '#A0A7B5', mt: 0.25 }}>
                    {item.description}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button
                    onClick={() => openTool(item.key, 'manage')}
                    variant="outlined"
                    size="small"
                    startIcon={<Iconify icon="solar:pen-bold" width={15} />}
                    sx={{ ...outlinedNavyButtonSx, px: 1.5 }}
                  >
                    Manage
                  </Button>
                  <Button
                    onClick={() => openTool(item.key, 'view')}
                    variant="outlined"
                    size="small"
                    startIcon={<Iconify icon="solar:eye-bold-duotone" width={15} />}
                    sx={{ ...outlinedNavyButtonSx, px: 1.5 }}
                  >
                    View
                  </Button>
                </Stack>
              </Stack>
            </Box>
          ))}
        </Stack>
      </CollapsibleSection>

      <FinancialStatementModal
        open={activeTool === 'financialStatement' && activeMode === 'manage'}
        onClose={closeTool}
      />
      <FinancialStatementReport
        open={activeTool === 'financialStatement' && activeMode === 'view'}
        onClose={closeTool}
      />
      <BankLoansModal open={activeTool === 'bankLoans' && activeMode === 'manage'} onClose={closeTool} />
      <BankLoanReport open={activeTool === 'bankLoans' && activeMode === 'view'} onClose={closeTool} />
      <FinancialHighlightsModal
        open={activeTool === 'financialHighlights' && activeMode === 'manage'}
        onClose={closeTool}
      />
      <FinancialHighlightsReport
        open={activeTool === 'financialHighlights' && activeMode === 'view'}
        onClose={closeTool}
      />
    </Box>
  );
}
