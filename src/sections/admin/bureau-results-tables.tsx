'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

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
// Chips share the row's width via flex (no horizontal scroll, no wrapping)
// so the whole record stays on one line at any container width. The one
// free-text field per bureau (remarks / status-remarks) is pulled out of
// the chip row entirely — long prose forced into an equal-width chip would
// either overflow or squeeze every other field — and rendered as a plain
// wrapped text line beneath the row instead.
// ----------------------------------------------------------------------

function FactChip({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.3} sx={{ px: 1.25, py: 0.85, flex: 1, minWidth: 0 }}>
      <Typography
        sx={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.03em',
          textTransform: 'uppercase',
          color: '#9AA2B4',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </Typography>
      <Tooltip title={value || '—'} arrow placement="top" enterDelay={300}>
        <Typography
          sx={{
            fontSize: 12.5,
            fontWeight: 700,
            color: '#14172A',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            cursor: 'default',
          }}
        >
          {value || '—'}
        </Typography>
      </Tooltip>
    </Stack>
  );
}

function FactChipRow({ children }: { children: React.ReactNode }) {
  return (
    <Stack
      direction="row"
      flexWrap="nowrap"
      sx={{
        border: '1px solid #EEF0F5',
        borderRadius: '12px',
        bgcolor: '#FAFBFD',
        '& > div:not(:last-of-type)': { borderRight: '1px solid #EEF0F5' },
      }}
    >
      {children}
    </Stack>
  );
}

function RemarksLine({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ px: 1.75, py: 1.1, borderRadius: '10px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
      <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#9AA2B4', mb: 0.3 }}>{label}</Typography>
      <Typography sx={{ fontSize: 13, color: '#14172A', lineHeight: 1.5 }}>{value || '—'}</Typography>
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
            <Stack spacing={1} key={row.id}>
              <FactChipRow>
                <FactChip label="Defendant / Subject" value={row.defendantSubject} />
                <FactChip label="Plaintiff" value={row.plaintiff} />
                <FactChip label="Nature of Case" value={row.natureOfCase} />
                <FactChip label="Amount Involved" value={row.amountInvolved} />
                <FactChip label="Case No." value={row.caseNo} />
                <FactChip label="Date Filed" value={row.dateFiled} />
                <FactChip label="Status" value={row.status} />
              </FactChipRow>
              <RemarksLine label="Credit Risk Remarks" value={row.creditRiskRemarks} />
            </Stack>
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
            <Stack spacing={1} key={row.id}>
              <FactChipRow>
                <FactChip label="Lending Institution / Source" value={row.lendingInstitution} />
                <FactChip label="Facility" value={row.facility} />
                <FactChip label="Original Loan Amount" value={row.originalLoanAmount} />
                <FactChip label="Date Granted / Reported" value={row.dateGranted} />
                <FactChip label="Maturity / Date Closed" value={row.maturityDate} />
                <FactChip label="Outstanding Balance" value={row.outstandingBalance} />
                <FactChip label="Payment History" value={row.paymentHistory} />
              </FactChipRow>
              <RemarksLine label="Status / Remarks" value={row.statusRemarks} />
            </Stack>
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
            <Stack spacing={1} key={row.id}>
              <FactChipRow>
                <FactChip label="Provider" value={row.provider} />
                <FactChip label="Facility Type" value={row.facilityType} />
                <FactChip label="Original / Finance Amount" value={row.originalAmount} />
                <FactChip label="Outstanding Balance" value={row.outstandingBalance} />
                <FactChip label="Overdue Amount" value={row.overdueAmount} />
                <FactChip label="Monthly Amortization" value={row.monthlyAmortization} />
                <FactChip label="Payment Status" value={row.paymentStatus} />
              </FactChipRow>
              <RemarksLine label="Remarks" value={row.remarks} />
            </Stack>
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
            <Stack spacing={1} key={row.id}>
              <FactChipRow>
                <FactChip label="Contract Code" value={row.contractCode} />
                <FactChip label="Contract Type" value={row.contractType} />
                <FactChip label="Maturity Date" value={row.maturityDate} />
                <FactChip label="Outstanding Balance" value={row.outstandingBalance} />
                <FactChip label="Overdue Amount" value={row.overdueAmount} />
                <FactChip label="Monthly Amortization" value={row.monthlyAmortization} />
                <FactChip label="Contract Status" value={row.contractStatus} />
              </FactChipRow>
              <RemarksLine label="Remarks" value={row.remarks} />
            </Stack>
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
            <Stack spacing={1} key={row.id}>
              <FactChipRow>
                <FactChip label="Bank / Institution" value={row.bankInstitution} />
                <FactChip label="Loan Facility" value={row.loanFacility} />
                <FactChip label="Maturity Date" value={row.maturityDate} />
                <FactChip label="Outstanding Balance" value={row.outstandingBalance} />
                <FactChip label="Overdue Amount" value={row.overdueAmount} />
                <FactChip label="Monthly Amortization" value={row.monthlyAmortization} />
                <FactChip label="Account Status" value={row.accountStatus} />
              </FactChipRow>
              <RemarksLine label="Remarks" value={row.remarks} />
            </Stack>
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
            <Stack spacing={1} key={row.id}>
              <FactChipRow>
                <FactChip label="Principal Balance" value={row.principalBalance} />
                <FactChip label="Interest Balance" value={row.interestBalance} />
                <FactChip label="Maturity Date" value={row.maturityDate} />
                <FactChip label="Remaining Term" value={row.remainingTerm} />
                <FactChip label="Last Payment Date" value={row.lastPaymentDate} />
                <FactChip label="Monthly Amortization" value={row.monthlyAmortization} />
                <FactChip label="Payment Status" value={row.paymentStatus} />
              </FactChipRow>
              <RemarksLine label="Remarks" value={row.remarks} />
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
