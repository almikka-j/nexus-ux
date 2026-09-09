'use client';

import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
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
// One read-only results table per bureau report file, matching the
// "PGFC – Integrated Initial Credit Checking Results" PDF template's exact
// columns for that section. Rendered inside each file's collapsible panel in
// bureau-reports-card.tsx, auto-populated with 2–3 canned sample rows the
// instant that file is uploaded — no officer editing.
//
// A header-once <Table> matching the app's other admin tables (#FBFBFD
// uppercase gray head, #EEF0F5 borders, plain white rows, tabular-nums
// amounts). tableLayout: fixed with a per-column <colgroup> weight so all
// 8 columns are visible in one glance with NO horizontal scroll — every
// cell ellipsis-clips and the full value is on a hover tooltip. Each of
// the six sections keeps its own column set (the shapes don't align) but
// shares the BureauTable shell.
// ----------------------------------------------------------------------

type Align = 'left' | 'right';

type Column<Row> = {
  label: string;
  render: (row: Row) => string;
  align?: Align;
  numeric?: boolean;
  /** Relative flex weight for this column's share of the table width. */
  weight?: number;
};

function BureauTable<Row extends { id: string }>({
  rows,
  columns,
  emptyLabel,
}: {
  rows: Row[];
  columns: Column<Row>[];
  emptyLabel: string;
}) {
  if (rows.length === 0) {
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
        <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>{emptyLabel}</Typography>
      </Box>
    );
  }

  const totalWeight = columns.reduce((sum, column) => sum + (column.weight ?? 1), 0);

  return (
    <Box sx={{ border: '1px solid #EBEDF3', borderRadius: '16px', overflow: 'hidden' }}>
      <Table size="small" sx={{ width: '100%', tableLayout: 'fixed' }}>
        <colgroup>
          {columns.map((column) => (
            <col key={column.label} style={{ width: `${((column.weight ?? 1) / totalWeight) * 100}%` }} />
          ))}
        </colgroup>
        <TableHead>
          <TableRow
            sx={{
              '& th': {
                bgcolor: '#FBFBFD',
                borderBottom: '1px solid #E1E4ED',
                fontSize: 10.5,
                fontWeight: 700,
                color: '#8891A6',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                lineHeight: 1.3,
                py: 1.25,
                px: 1.25,
              },
            }}
          >
            {columns.map((column) => (
              <TableCell key={column.label} align={column.align ?? 'left'}>
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              sx={{
                '&:last-of-type td': { borderBottom: 0 },
                '& td': {
                  borderColor: '#EEF0F5',
                  fontSize: 12.5,
                  color: '#5A6273',
                  py: 1.25,
                  px: 1.25,
                },
              }}
            >
              {columns.map((column) => {
                const value = column.render(row) || '—';
                return (
                  <TableCell
                    key={column.label}
                    align={column.align ?? 'left'}
                    sx={{
                      fontVariantNumeric: column.numeric ? 'tabular-nums' : undefined,
                      fontWeight: column.numeric ? 700 : 400,
                      color: column.numeric ? '#14172A' : '#5A6273',
                    }}
                  >
                    <Tooltip title={value} arrow placement="top" enterDelay={400}>
                      <Box
                        component="span"
                        sx={{
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          cursor: 'default',
                        }}
                      >
                        {value}
                      </Box>
                    </Tooltip>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

export function CmapCasesTable({ rows }: { rows: CmapCase[] }) {
  return (
    <BureauTable
      rows={rows}
      emptyLabel="No CMAP court/legal cases recorded yet."
      columns={[
        { label: 'Defendant / Subject', render: (r) => r.defendantSubject, weight: 1.6 },
        { label: 'Plaintiff', render: (r) => r.plaintiff, weight: 1.1 },
        { label: 'Nature of Case', render: (r) => r.natureOfCase, weight: 1.2 },
        { label: 'Amount', render: (r) => r.amountInvolved, align: 'right', numeric: true, weight: 0.9 },
        { label: 'Case No.', render: (r) => r.caseNo, weight: 1 },
        { label: 'Date Filed', render: (r) => r.dateFiled, align: 'right', weight: 0.9 },
        { label: 'Status', render: (r) => r.status, weight: 1 },
        { label: 'Credit Risk Remarks', render: (r) => r.creditRiskRemarks, weight: 1.6 },
      ]}
    />
  );
}

export function BapNfisRecordsTable({ rows }: { rows: BapNfisRecord[] }) {
  return (
    <BureauTable
      rows={rows}
      emptyLabel="No BAP/NFIS credit history records yet."
      columns={[
        { label: 'Lending Institution', render: (r) => r.lendingInstitution, weight: 1.4 },
        { label: 'Facility', render: (r) => r.facility, weight: 0.9 },
        { label: 'Original Amount', render: (r) => r.originalLoanAmount, align: 'right', numeric: true, weight: 1 },
        { label: 'Date Granted', render: (r) => r.dateGranted, align: 'right', weight: 0.9 },
        { label: 'Maturity', render: (r) => r.maturityDate, align: 'right', weight: 0.9 },
        { label: 'Outstanding', render: (r) => r.outstandingBalance, align: 'right', numeric: true, weight: 1 },
        { label: 'Payment History', render: (r) => r.paymentHistory, weight: 1.5 },
        { label: 'Status / Remarks', render: (r) => r.statusRemarks, weight: 1.6 },
      ]}
    />
  );
}

export function CibiResultsTable({ rows }: { rows: CibiResult[] }) {
  return (
    <BureauTable
      rows={rows}
      emptyLabel="No CIBI results recorded yet."
      columns={[
        { label: 'Provider', render: (r) => r.provider, weight: 0.8 },
        { label: 'Facility Type', render: (r) => r.facilityType, weight: 1 },
        { label: 'Original Amount', render: (r) => r.originalAmount, align: 'right', numeric: true, weight: 1 },
        { label: 'Outstanding', render: (r) => r.outstandingBalance, align: 'right', numeric: true, weight: 1 },
        { label: 'Overdue', render: (r) => r.overdueAmount, align: 'right', numeric: true, weight: 0.9 },
        { label: 'Monthly Amort.', render: (r) => r.monthlyAmortization, align: 'right', numeric: true, weight: 1 },
        { label: 'Payment Status', render: (r) => r.paymentStatus, weight: 1.2 },
        { label: 'Remarks', render: (r) => r.remarks, weight: 1.8 },
      ]}
    />
  );
}

export function CicContractsTable({ rows }: { rows: CicContract[] }) {
  return (
    <BureauTable
      rows={rows}
      emptyLabel="No CIC contracts recorded yet."
      columns={[
        { label: 'Contract Code', render: (r) => r.contractCode, weight: 1.3 },
        { label: 'Contract Type', render: (r) => r.contractType, weight: 1 },
        { label: 'Maturity', render: (r) => r.maturityDate, align: 'right', weight: 0.9 },
        { label: 'Outstanding', render: (r) => r.outstandingBalance, align: 'right', numeric: true, weight: 1 },
        { label: 'Overdue', render: (r) => r.overdueAmount, align: 'right', numeric: true, weight: 0.9 },
        { label: 'Monthly Amort.', render: (r) => r.monthlyAmortization, align: 'right', numeric: true, weight: 1 },
        { label: 'Contract Status', render: (r) => r.contractStatus, weight: 1.2 },
        { label: 'Remarks', render: (r) => r.remarks, weight: 1.8 },
      ]}
    />
  );
}

export function LoandexRecordsTable({ rows }: { rows: LoandexRecord[] }) {
  return (
    <BureauTable
      rows={rows}
      emptyLabel="No LOANDEX records recorded yet."
      columns={[
        { label: 'Bank / Institution', render: (r) => r.bankInstitution, weight: 1.3 },
        { label: 'Loan Facility', render: (r) => r.loanFacility, weight: 1 },
        { label: 'Maturity', render: (r) => r.maturityDate, align: 'right', weight: 0.9 },
        { label: 'Outstanding', render: (r) => r.outstandingBalance, align: 'right', numeric: true, weight: 1 },
        { label: 'Overdue', render: (r) => r.overdueAmount, align: 'right', numeric: true, weight: 0.9 },
        { label: 'Monthly Amort.', render: (r) => r.monthlyAmortization, align: 'right', numeric: true, weight: 1 },
        { label: 'Account Status', render: (r) => r.accountStatus, weight: 1.2 },
        { label: 'Remarks', render: (r) => r.remarks, weight: 1.8 },
      ]}
    />
  );
}

export function PgfcExposureTable({ rows }: { rows: PgfcExposureRecord[] }) {
  return (
    <BureauTable
      rows={rows}
      emptyLabel="No existing PGFC exposure recorded yet."
      columns={[
        { label: 'Principal Balance', render: (r) => r.principalBalance, align: 'right', numeric: true, weight: 1 },
        { label: 'Interest Balance', render: (r) => r.interestBalance, align: 'right', numeric: true, weight: 1 },
        { label: 'Maturity', render: (r) => r.maturityDate, align: 'right', weight: 0.9 },
        { label: 'Remaining Term', render: (r) => r.remainingTerm, weight: 1 },
        { label: 'Last Payment', render: (r) => r.lastPaymentDate, align: 'right', weight: 0.9 },
        { label: 'Monthly Amort.', render: (r) => r.monthlyAmortization, align: 'right', numeric: true, weight: 1 },
        { label: 'Payment Status', render: (r) => r.paymentStatus, weight: 1.2 },
        { label: 'Remarks', render: (r) => r.remarks, weight: 1.8 },
      ]}
    />
  );
}
