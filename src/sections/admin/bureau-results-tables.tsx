'use client';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';
import { outlinedNavyButtonSx } from 'src/components/admin-ui';

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
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Stack spacing={0.6}>
      <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#3B4256' }}>{label}</Typography>
      <TextField
        fullWidth
        size="small"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        sx={fieldSx}
      />
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

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      onClick={onClick}
      variant="outlined"
      size="small"
      startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
      sx={{ ...outlinedNavyButtonSx, alignSelf: 'flex-start' }}
    >
      {label}
    </Button>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <IconButton size="small" onClick={onClick} sx={{ mt: { xs: 0, sm: 2.75 } }}>
      <Iconify icon="mingcute:close-line" width={16} />
    </IconButton>
  );
}

export function CmapCasesTable({
  rows,
  onAdd,
  onRemove,
  onUpdate,
}: {
  rows: CmapCase[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, data: Partial<CmapCase>) => void;
}) {
  return (
    <Stack spacing={2}>
      {rows.length === 0 ? (
        <EmptyState label="No CMAP court/legal cases recorded yet." />
      ) : (
        <Stack spacing={2.5}>
          {rows.map((row) => (
            <Grid container spacing={1.5} alignItems="flex-start" key={row.id}>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Defendant / Subject" value={row.defendantSubject} onChange={(v) => onUpdate(row.id, { defendantSubject: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Plaintiff" value={row.plaintiff} onChange={(v) => onUpdate(row.id, { plaintiff: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Nature of Case" value={row.natureOfCase} onChange={(v) => onUpdate(row.id, { natureOfCase: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Amount Involved" value={row.amountInvolved} onChange={(v) => onUpdate(row.id, { amountInvolved: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Case No." value={row.caseNo} onChange={(v) => onUpdate(row.id, { caseNo: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Date Filed" value={row.dateFiled} onChange={(v) => onUpdate(row.id, { dateFiled: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Status" value={row.status} onChange={(v) => onUpdate(row.id, { status: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Field label="Credit Risk Remarks" value={row.creditRiskRemarks} onChange={(v) => onUpdate(row.id, { creditRiskRemarks: v })} />
              </Grid>
              <Grid item xs={12} md={1}>
                <RemoveButton onClick={() => onRemove(row.id)} />
              </Grid>
            </Grid>
          ))}
        </Stack>
      )}
      <AddButton label="Add Case" onClick={onAdd} />
    </Stack>
  );
}

export function BapNfisRecordsTable({
  rows,
  onAdd,
  onRemove,
  onUpdate,
}: {
  rows: BapNfisRecord[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, data: Partial<BapNfisRecord>) => void;
}) {
  return (
    <Stack spacing={2}>
      {rows.length === 0 ? (
        <EmptyState label="No BAP/NFIS credit history records yet." />
      ) : (
        <Stack spacing={2.5}>
          {rows.map((row) => (
            <Grid container spacing={1.5} alignItems="flex-start" key={row.id}>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Lending Institution / Source" value={row.lendingInstitution} onChange={(v) => onUpdate(row.id, { lendingInstitution: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Facility" value={row.facility} onChange={(v) => onUpdate(row.id, { facility: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Original Loan Amount" value={row.originalLoanAmount} onChange={(v) => onUpdate(row.id, { originalLoanAmount: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Date Granted / Reported" value={row.dateGranted} onChange={(v) => onUpdate(row.id, { dateGranted: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Maturity / Date Closed" value={row.maturityDate} onChange={(v) => onUpdate(row.id, { maturityDate: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Outstanding Balance" value={row.outstandingBalance} onChange={(v) => onUpdate(row.id, { outstandingBalance: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Payment History" value={row.paymentHistory} onChange={(v) => onUpdate(row.id, { paymentHistory: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Field label="Status / Remarks" value={row.statusRemarks} onChange={(v) => onUpdate(row.id, { statusRemarks: v })} />
              </Grid>
              <Grid item xs={12} md={1}>
                <RemoveButton onClick={() => onRemove(row.id)} />
              </Grid>
            </Grid>
          ))}
        </Stack>
      )}
      <AddButton label="Add Record" onClick={onAdd} />
    </Stack>
  );
}

export function CibiResultsTable({
  rows,
  onAdd,
  onRemove,
  onUpdate,
}: {
  rows: CibiResult[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, data: Partial<CibiResult>) => void;
}) {
  return (
    <Stack spacing={2}>
      {rows.length === 0 ? (
        <EmptyState label="No CIBI results recorded yet." />
      ) : (
        <Stack spacing={2.5}>
          {rows.map((row) => (
            <Grid container spacing={1.5} alignItems="flex-start" key={row.id}>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Provider" value={row.provider} onChange={(v) => onUpdate(row.id, { provider: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Facility Type" value={row.facilityType} onChange={(v) => onUpdate(row.id, { facilityType: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Original / Finance Amount" value={row.originalAmount} onChange={(v) => onUpdate(row.id, { originalAmount: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Outstanding Balance" value={row.outstandingBalance} onChange={(v) => onUpdate(row.id, { outstandingBalance: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Overdue Amount" value={row.overdueAmount} onChange={(v) => onUpdate(row.id, { overdueAmount: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Monthly Amortization" value={row.monthlyAmortization} onChange={(v) => onUpdate(row.id, { monthlyAmortization: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Payment Status" value={row.paymentStatus} onChange={(v) => onUpdate(row.id, { paymentStatus: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Field label="Remarks" value={row.remarks} onChange={(v) => onUpdate(row.id, { remarks: v })} />
              </Grid>
              <Grid item xs={12} md={1}>
                <RemoveButton onClick={() => onRemove(row.id)} />
              </Grid>
            </Grid>
          ))}
        </Stack>
      )}
      <AddButton label="Add Result" onClick={onAdd} />
    </Stack>
  );
}

export function CicContractsTable({
  rows,
  onAdd,
  onRemove,
  onUpdate,
}: {
  rows: CicContract[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, data: Partial<CicContract>) => void;
}) {
  return (
    <Stack spacing={2}>
      {rows.length === 0 ? (
        <EmptyState label="No CIC contracts recorded yet." />
      ) : (
        <Stack spacing={2.5}>
          {rows.map((row) => (
            <Grid container spacing={1.5} alignItems="flex-start" key={row.id}>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Contract Code" value={row.contractCode} onChange={(v) => onUpdate(row.id, { contractCode: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Contract Type" value={row.contractType} onChange={(v) => onUpdate(row.id, { contractType: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Maturity Date" value={row.maturityDate} onChange={(v) => onUpdate(row.id, { maturityDate: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Outstanding Balance" value={row.outstandingBalance} onChange={(v) => onUpdate(row.id, { outstandingBalance: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Overdue Amount" value={row.overdueAmount} onChange={(v) => onUpdate(row.id, { overdueAmount: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Monthly Amortization" value={row.monthlyAmortization} onChange={(v) => onUpdate(row.id, { monthlyAmortization: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Contract Status" value={row.contractStatus} onChange={(v) => onUpdate(row.id, { contractStatus: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Field label="Remarks" value={row.remarks} onChange={(v) => onUpdate(row.id, { remarks: v })} />
              </Grid>
              <Grid item xs={12} md={1}>
                <RemoveButton onClick={() => onRemove(row.id)} />
              </Grid>
            </Grid>
          ))}
        </Stack>
      )}
      <AddButton label="Add Contract" onClick={onAdd} />
    </Stack>
  );
}

export function LoandexRecordsTable({
  rows,
  onAdd,
  onRemove,
  onUpdate,
}: {
  rows: LoandexRecord[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, data: Partial<LoandexRecord>) => void;
}) {
  return (
    <Stack spacing={2}>
      {rows.length === 0 ? (
        <EmptyState label="No LOANDEX records recorded yet." />
      ) : (
        <Stack spacing={2.5}>
          {rows.map((row) => (
            <Grid container spacing={1.5} alignItems="flex-start" key={row.id}>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Bank / Institution" value={row.bankInstitution} onChange={(v) => onUpdate(row.id, { bankInstitution: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Loan Facility" value={row.loanFacility} onChange={(v) => onUpdate(row.id, { loanFacility: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Maturity Date" value={row.maturityDate} onChange={(v) => onUpdate(row.id, { maturityDate: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Outstanding Balance" value={row.outstandingBalance} onChange={(v) => onUpdate(row.id, { outstandingBalance: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Overdue Amount" value={row.overdueAmount} onChange={(v) => onUpdate(row.id, { overdueAmount: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Monthly Amortization" value={row.monthlyAmortization} onChange={(v) => onUpdate(row.id, { monthlyAmortization: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Account Status" value={row.accountStatus} onChange={(v) => onUpdate(row.id, { accountStatus: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Field label="Remarks" value={row.remarks} onChange={(v) => onUpdate(row.id, { remarks: v })} />
              </Grid>
              <Grid item xs={12} md={1}>
                <RemoveButton onClick={() => onRemove(row.id)} />
              </Grid>
            </Grid>
          ))}
        </Stack>
      )}
      <AddButton label="Add Record" onClick={onAdd} />
    </Stack>
  );
}

export function PgfcExposureTable({
  rows,
  onAdd,
  onRemove,
  onUpdate,
}: {
  rows: PgfcExposureRecord[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, data: Partial<PgfcExposureRecord>) => void;
}) {
  return (
    <Stack spacing={2}>
      {rows.length === 0 ? (
        <EmptyState label="No existing PGFC exposure recorded yet." />
      ) : (
        <Stack spacing={2.5}>
          {rows.map((row) => (
            <Grid container spacing={1.5} alignItems="flex-start" key={row.id}>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Principal Balance" value={row.principalBalance} onChange={(v) => onUpdate(row.id, { principalBalance: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Interest Balance" value={row.interestBalance} onChange={(v) => onUpdate(row.id, { interestBalance: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Maturity Date" value={row.maturityDate} onChange={(v) => onUpdate(row.id, { maturityDate: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Remaining Term" value={row.remainingTerm} onChange={(v) => onUpdate(row.id, { remainingTerm: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Last Payment Date" value={row.lastPaymentDate} onChange={(v) => onUpdate(row.id, { lastPaymentDate: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Monthly Amortization" value={row.monthlyAmortization} onChange={(v) => onUpdate(row.id, { monthlyAmortization: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Payment Status" value={row.paymentStatus} onChange={(v) => onUpdate(row.id, { paymentStatus: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Field label="Remarks" value={row.remarks} onChange={(v) => onUpdate(row.id, { remarks: v })} />
              </Grid>
              <Grid item xs={12} md={1}>
                <RemoveButton onClick={() => onRemove(row.id)} />
              </Grid>
            </Grid>
          ))}
        </Stack>
      )}
      <AddButton label="Add Exposure Record" onClick={onAdd} />
    </Stack>
  );
}
