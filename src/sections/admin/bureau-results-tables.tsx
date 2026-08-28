'use client';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
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
// One small editable-rows table per bureau report section, matching the
// "PGFC – Integrated Initial Credit Checking Results" PDF template's exact
// columns for that section. Rendered below each bureau's upload row in
// bureau-reports-card.tsx once that bureau's file is uploaded (PGFC
// Existing Exposure has no upload gate — see that file). Each table is its
// own component rather than one generic table, since the six sections'
// columns don't share a common shape.
//
// Label-above-field row layout (this app's Field convention from
// cash-flow-statement-card.tsx / bureau-reports-card.tsx's CIBI intake
// form), NOT the PDF's literal spreadsheet grid — visual consistency with
// the rest of the admin app over matching the reference document's look.
// ----------------------------------------------------------------------

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 13.5, bgcolor: 'common.white' },
};

function Field({
  label,
  value,
  disabled,
}: {
  label: string;
  value: string;
  disabled?: boolean;
}) {
  return (
    <Stack spacing={0.6}>
      <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#3B4256' }}>{label}</Typography>
      <TextField fullWidth size="small" value={value} disabled={disabled} sx={fieldSx} />
    </Stack>
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
        <Stack spacing={2.5}>
          {rows.map((row) => (
            <Grid container spacing={1.5} alignItems="flex-start" key={row.id}>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Defendant / Subject" value={row.defendantSubject} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Plaintiff" value={row.plaintiff} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Nature of Case" value={row.natureOfCase} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Amount Involved" value={row.amountInvolved} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Case No." value={row.caseNo} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Date Filed" value={row.dateFiled} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Status" value={row.status} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Credit Risk Remarks" value={row.creditRiskRemarks} disabled />
              </Grid>
            </Grid>
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
        <Stack spacing={2.5}>
          {rows.map((row) => (
            <Grid container spacing={1.5} alignItems="flex-start" key={row.id}>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Lending Institution / Source" value={row.lendingInstitution} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Facility" value={row.facility} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Original Loan Amount" value={row.originalLoanAmount} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Date Granted / Reported" value={row.dateGranted} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Maturity / Date Closed" value={row.maturityDate} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Outstanding Balance" value={row.outstandingBalance} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Payment History" value={row.paymentHistory} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Status / Remarks" value={row.statusRemarks} disabled />
              </Grid>
            </Grid>
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
        <Stack spacing={2.5}>
          {rows.map((row) => (
            <Grid container spacing={1.5} alignItems="flex-start" key={row.id}>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Provider" value={row.provider} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Facility Type" value={row.facilityType} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Original / Finance Amount" value={row.originalAmount} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Outstanding Balance" value={row.outstandingBalance} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Overdue Amount" value={row.overdueAmount} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Monthly Amortization" value={row.monthlyAmortization} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Payment Status" value={row.paymentStatus} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Remarks" value={row.remarks} disabled />
              </Grid>
            </Grid>
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
        <Stack spacing={2.5}>
          {rows.map((row) => (
            <Grid container spacing={1.5} alignItems="flex-start" key={row.id}>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Contract Code" value={row.contractCode} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Contract Type" value={row.contractType} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Maturity Date" value={row.maturityDate} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Outstanding Balance" value={row.outstandingBalance} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Overdue Amount" value={row.overdueAmount} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Monthly Amortization" value={row.monthlyAmortization} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Contract Status" value={row.contractStatus} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Remarks" value={row.remarks} disabled />
              </Grid>
            </Grid>
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
        <Stack spacing={2.5}>
          {rows.map((row) => (
            <Grid container spacing={1.5} alignItems="flex-start" key={row.id}>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Bank / Institution" value={row.bankInstitution} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Loan Facility" value={row.loanFacility} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Maturity Date" value={row.maturityDate} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Outstanding Balance" value={row.outstandingBalance} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Overdue Amount" value={row.overdueAmount} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Monthly Amortization" value={row.monthlyAmortization} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Account Status" value={row.accountStatus} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Remarks" value={row.remarks} disabled />
              </Grid>
            </Grid>
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
        <Stack spacing={2.5}>
          {rows.map((row) => (
            <Grid container spacing={1.5} alignItems="flex-start" key={row.id}>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Principal Balance" value={row.principalBalance} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Interest Balance" value={row.interestBalance} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Maturity Date" value={row.maturityDate} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Remaining Term" value={row.remainingTerm} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Last Payment Date" value={row.lastPaymentDate} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Monthly Amortization" value={row.monthlyAmortization} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Payment Status" value={row.paymentStatus} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Remarks" value={row.remarks} disabled />
              </Grid>
            </Grid>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
