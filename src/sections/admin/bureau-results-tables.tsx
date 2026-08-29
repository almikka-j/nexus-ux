'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Collapse from '@mui/material/Collapse';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';

import { Iconify } from 'src/components/iconify';

import type {
  CmapCase,
  BapNfisRecord,
  CibiResult,
  CicContract,
  LoandexRecord,
  PgfcExposureRecord,
} from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// One small read-only table per bureau report section, matching the
// "PGFC – Integrated Initial Credit Checking Results" PDF template's exact
// columns for that section. Rendered below each bureau's upload row in
// bureau-reports-card.tsx, auto-populated with exactly one canned sample row
// the instant that bureau's file is uploaded — no officer editing. PGFC
// Existing Exposure has its own upload gate matching the other five bureaus
// (see that file). Each table is its own component rather than one generic
// table, since the six sections' columns don't share a common shape.
//
// Bordered fact-chip strip (this app's summary-strip convention from
// application-details-card.tsx's FactChip), NOT disabled TextFields — a
// disabled input reads as an empty/unfilled field even when it holds real
// data, where a plain label-over-value chip reads as a completed record.
// Collapsed to a single-line summary (first two fields) by default, since
// eight chips per row no longer fit one line — "View details" expands the
// same card to show every field.
// ----------------------------------------------------------------------

function FactChip({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.35} sx={{ px: 1.75, py: 1, minWidth: 0, flex: '1 1 150px' }}>
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
        title={value}
      >
        {value || '—'}
      </Typography>
    </Stack>
  );
}

function FactChipRow({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </Stack>
  );
}

type Fact = { label: string; value: string };

// `facts[0]`/`facts[1]` double as the always-visible one-line summary, so
// each table orders its facts with the two most identifying fields first
// (e.g. institution name, then facility/type) before the rest.
function ExpandableFactCard({ facts }: { facts: Fact[] }) {
  const [expanded, setExpanded] = useState(false);
  const [primary, secondary, ...rest] = facts;

  return (
    <Box sx={{ border: '1px solid #EEF0F5', borderRadius: '12px', bgcolor: '#FAFBFD', overflow: 'hidden' }}>
      <ButtonBase
        onClick={() => setExpanded((value) => !value)}
        sx={{
          width: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 1.75,
          py: 1,
          justifyContent: 'flex-start',
        }}
      >
        <Stack direction="row" spacing={0} flexWrap="nowrap" sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <FactChip label={primary.label} value={primary.value} />
          {secondary && <FactChip label={secondary.label} value={secondary.value} />}
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0, pr: 0.5 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#3448B0', whiteSpace: 'nowrap' }}>
            {expanded ? 'Hide details' : 'View details'}
          </Typography>
          <Iconify
            icon="solar:alt-arrow-down-bold"
            width={16}
            sx={{ color: '#3448B0', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
          />
        </Stack>
      </ButtonBase>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ borderTop: '1px solid #EEF0F5' }}>
          <FactChipRow>
            <FactChip label={primary.label} value={primary.value} />
            {secondary && <FactChip label={secondary.label} value={secondary.value} />}
            {rest.map((fact) => (
              <FactChip key={fact.label} label={fact.label} value={fact.value} />
            ))}
          </FactChipRow>
        </Box>
      </Collapse>
    </Box>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <Box
      sx={{
        py: 2.5,
        px: 2,
        textAlign: 'center',
        borderRadius: '10px',
        border: '1px dashed #E1E4ED',
      }}
    >
      <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>{label}</Typography>
    </Box>
  );
}

export function CmapCasesTable({ rows }: { rows: CmapCase[] }) {
  return (
    <Stack spacing={2}>
      {rows.length === 0 ? (
        <EmptyState label="No CMAP court/legal cases recorded yet." />
      ) : (
        <Stack spacing={1.5}>
          {rows.map((row) => (
            <ExpandableFactCard
              key={row.id}
              facts={[
                { label: 'Defendant / Subject', value: row.defendantSubject },
                { label: 'Status', value: row.status },
                { label: 'Plaintiff', value: row.plaintiff },
                { label: 'Nature of Case', value: row.natureOfCase },
                { label: 'Amount Involved', value: row.amountInvolved },
                { label: 'Case No.', value: row.caseNo },
                { label: 'Date Filed', value: row.dateFiled },
                { label: 'Credit Risk Remarks', value: row.creditRiskRemarks },
              ]}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

export function BapNfisRecordsTable({ rows }: { rows: BapNfisRecord[] }) {
  return (
    <Stack spacing={2}>
      {rows.length === 0 ? (
        <EmptyState label="No BAP/NFIS credit history records yet." />
      ) : (
        <Stack spacing={1.5}>
          {rows.map((row) => (
            <ExpandableFactCard
              key={row.id}
              facts={[
                { label: 'Lending Institution / Source', value: row.lendingInstitution },
                { label: 'Facility', value: row.facility },
                { label: 'Original Loan Amount', value: row.originalLoanAmount },
                { label: 'Date Granted / Reported', value: row.dateGranted },
                { label: 'Maturity / Date Closed', value: row.maturityDate },
                { label: 'Outstanding Balance', value: row.outstandingBalance },
                { label: 'Payment History', value: row.paymentHistory },
                { label: 'Status / Remarks', value: row.statusRemarks },
              ]}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

export function CibiResultsTable({ rows }: { rows: CibiResult[] }) {
  return (
    <Stack spacing={2}>
      {rows.length === 0 ? (
        <EmptyState label="No CIBI results recorded yet." />
      ) : (
        <Stack spacing={1.5}>
          {rows.map((row) => (
            <ExpandableFactCard
              key={row.id}
              facts={[
                { label: 'Provider', value: row.provider },
                { label: 'Facility Type', value: row.facilityType },
                { label: 'Original / Finance Amount', value: row.originalAmount },
                { label: 'Outstanding Balance', value: row.outstandingBalance },
                { label: 'Overdue Amount', value: row.overdueAmount },
                { label: 'Monthly Amortization', value: row.monthlyAmortization },
                { label: 'Payment Status', value: row.paymentStatus },
                { label: 'Remarks', value: row.remarks },
              ]}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

export function CicContractsTable({ rows }: { rows: CicContract[] }) {
  return (
    <Stack spacing={2}>
      {rows.length === 0 ? (
        <EmptyState label="No CIC contracts recorded yet." />
      ) : (
        <Stack spacing={1.5}>
          {rows.map((row) => (
            <ExpandableFactCard
              key={row.id}
              facts={[
                { label: 'Contract Code', value: row.contractCode },
                { label: 'Contract Type', value: row.contractType },
                { label: 'Maturity Date', value: row.maturityDate },
                { label: 'Outstanding Balance', value: row.outstandingBalance },
                { label: 'Overdue Amount', value: row.overdueAmount },
                { label: 'Monthly Amortization', value: row.monthlyAmortization },
                { label: 'Contract Status', value: row.contractStatus },
                { label: 'Remarks', value: row.remarks },
              ]}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

export function LoandexRecordsTable({ rows }: { rows: LoandexRecord[] }) {
  return (
    <Stack spacing={2}>
      {rows.length === 0 ? (
        <EmptyState label="No LOANDEX records recorded yet." />
      ) : (
        <Stack spacing={1.5}>
          {rows.map((row) => (
            <ExpandableFactCard
              key={row.id}
              facts={[
                { label: 'Bank / Institution', value: row.bankInstitution },
                { label: 'Loan Facility', value: row.loanFacility },
                { label: 'Maturity Date', value: row.maturityDate },
                { label: 'Outstanding Balance', value: row.outstandingBalance },
                { label: 'Overdue Amount', value: row.overdueAmount },
                { label: 'Monthly Amortization', value: row.monthlyAmortization },
                { label: 'Account Status', value: row.accountStatus },
                { label: 'Remarks', value: row.remarks },
              ]}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

export function PgfcExposureTable({ rows }: { rows: PgfcExposureRecord[] }) {
  return (
    <Stack spacing={2}>
      {rows.length === 0 ? (
        <EmptyState label="No existing PGFC exposure recorded yet." />
      ) : (
        <Stack spacing={1.5}>
          {rows.map((row) => (
            <ExpandableFactCard
              key={row.id}
              facts={[
                { label: 'Principal Balance', value: row.principalBalance },
                { label: 'Payment Status', value: row.paymentStatus },
                { label: 'Interest Balance', value: row.interestBalance },
                { label: 'Maturity Date', value: row.maturityDate },
                { label: 'Remaining Term', value: row.remainingTerm },
                { label: 'Last Payment Date', value: row.lastPaymentDate },
                { label: 'Monthly Amortization', value: row.monthlyAmortization },
                { label: 'Remarks', value: row.remarks },
              ]}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
