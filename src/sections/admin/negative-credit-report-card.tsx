'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';

import type { NegativeReportEntry, NegativeReportEntryListKey } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Only rendered when the (simulated) AI review of the uploaded bureau
// reports comes back with a negative finding — see simulate-bureau-finding.ts
// and CreditChecking.bureauFindingStatus. Every field here is optional
// except Recommendation/Remarks, which is required before Submit. Once
// submitted, CreditCheckingResultModal renders this data in place of its
// hardcoded all-clear content.
// ----------------------------------------------------------------------

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 },
};

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" spacing={2}>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', width: 80, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#14172A' }}>{value}</Typography>
    </Stack>
  );
}

function NegativeReportEntryRow({
  entry,
  labelPlaceholder,
  onChange,
  onRemove,
}: {
  entry: NegativeReportEntry;
  labelPlaceholder: string;
  onChange: (data: Partial<NegativeReportEntry>) => void;
  onRemove: () => void;
}) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <TextField
        label={labelPlaceholder}
        value={entry.label}
        onChange={(event) => onChange({ label: event.target.value })}
        sx={{ ...fieldSx, flex: 1 }}
      />
      <TextField
        label="Findings"
        value={entry.findings}
        onChange={(event) => onChange({ findings: event.target.value })}
        sx={{ ...fieldSx, flex: 1 }}
      />
      <IconButton onClick={onRemove} sx={{ mt: 0.5, color: '#F04438' }}>
        <Iconify icon="solar:trash-bin-trash-bold" width={18} />
      </IconButton>
    </Stack>
  );
}

function SpecialSectionList({
  listKey,
  title,
  addLabel,
  entries,
  onAdd,
  onChange,
  onRemove,
}: {
  listKey: NegativeReportEntryListKey;
  title: string;
  addLabel: string;
  entries: NegativeReportEntry[];
  onAdd: () => void;
  onChange: (id: string, data: Partial<NegativeReportEntry>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <Stack spacing={1.5}>
      <Box sx={{ bgcolor: '#1C2A6E', borderRadius: '9px', px: 2, py: 1 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'common.white', letterSpacing: '0.04em' }}>
          {title}
        </Typography>
      </Box>

      {entries.map((entry) => (
        <NegativeReportEntryRow
          key={entry.id}
          entry={entry}
          labelPlaceholder="Description"
          onChange={(data) => onChange(entry.id, data)}
          onRemove={() => onRemove(entry.id)}
        />
      ))}

      <Button
        onClick={onAdd}
        variant="outlined"
        startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
        sx={{ borderRadius: '9px', alignSelf: 'flex-start' }}
        data-listkey={listKey}
      >
        {addLabel}
      </Button>
    </Stack>
  );
}

export function NegativeCreditReportCard() {
  const { signUpData } = useRegistration();
  const {
    review,
    setNegativeCreditReport,
    addNegativeReportEntry,
    updateNegativeReportEntry,
    removeNegativeReportEntry,
  } = useAdmin();
  const { negativeCreditReport } = review;

  if (!signUpData) return null;

  const fullName = `${signUpData.firstName} ${signUpData.lastName}`;
  const today = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const subject = `${fullName} - BAP NFIS/ CMAP/ CIC`;
  const canSubmit = !!negativeCreditReport.recommendationRemarks.trim();

  return (
    <Box
      sx={{
        p: { xs: 3, md: 4 },
        borderRadius: '16px',
        bgcolor: 'common.white',
        border: '1px solid #EBEDF3',
        boxShadow: '0 1px 2px rgba(20,23,42,0.04)',
      }}
    >
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        Negative Credit Report
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        A negative finding was detected in the simulated bureau review — complete this report
        before proceeding.
      </Typography>

      <Stack spacing={2.5}>
        <Stack spacing={1.25}>
          <FieldRow label="To" value="Credit Committee" />
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography sx={{ fontSize: 13.5, color: '#8891A6', width: 80, flexShrink: 0 }}>
              Thru *
            </Typography>
            <TextField
              value={negativeCreditReport.thru}
              onChange={(event) => setNegativeCreditReport({ thru: event.target.value })}
              placeholder="e.g. Credit Head"
              sx={{ ...fieldSx, flex: 1 }}
            />
          </Stack>
          <FieldRow label="From" value="Credit and Collection Department" />
          <FieldRow label="Date" value={today} />
          <FieldRow label="Subject" value={subject} />
        </Stack>

        <TextField
          label="Negative Record"
          multiline
          minRows={3}
          value={negativeCreditReport.negativeRecordText}
          onChange={(event) => setNegativeCreditReport({ negativeRecordText: event.target.value })}
          sx={fieldSx}
        />

        <Stack spacing={1.5}>
          {negativeCreditReport.accountFindings.map((entry) => (
            <NegativeReportEntryRow
              key={entry.id}
              entry={entry}
              labelPlaceholder="Account Name"
              onChange={(data) => updateNegativeReportEntry('accountFindings', entry.id, data)}
              onRemove={() => removeNegativeReportEntry('accountFindings', entry.id)}
            />
          ))}
          <Button
            onClick={() => addNegativeReportEntry('accountFindings', `${fullName} - Borrower`)}
            variant="outlined"
            startIcon={<Iconify icon="solar:add-circle-bold" width={18} />}
            sx={{ borderRadius: '10px', alignSelf: 'flex-start' }}
          >
            Add More Accounts
          </Button>
        </Stack>

        <SpecialSectionList
          listKey="cancelledCreditCards"
          title="Cancelled Credit Cards File"
          addLabel="Add Cancelled Credit Card File"
          entries={negativeCreditReport.cancelledCreditCards}
          onAdd={() => addNegativeReportEntry('cancelledCreditCards')}
          onChange={(id, data) => updateNegativeReportEntry('cancelledCreditCards', id, data)}
          onRemove={(id) => removeNegativeReportEntry('cancelledCreditCards', id)}
        />

        <SpecialSectionList
          listKey="adverseClassifiedLoans"
          title="Adversely Classified Loan File"
          addLabel="Add Adversely Classified Loan File"
          entries={negativeCreditReport.adverseClassifiedLoans}
          onAdd={() => addNegativeReportEntry('adverseClassifiedLoans')}
          onChange={(id, data) => updateNegativeReportEntry('adverseClassifiedLoans', id, data)}
          onRemove={(id) => removeNegativeReportEntry('adverseClassifiedLoans', id)}
        />

        <SpecialSectionList
          listKey="closedCurrentAccounts"
          title="Closed Current Account"
          addLabel="Add Closed Current Account"
          entries={negativeCreditReport.closedCurrentAccounts}
          onAdd={() => addNegativeReportEntry('closedCurrentAccounts')}
          onChange={(id, data) => updateNegativeReportEntry('closedCurrentAccounts', id, data)}
          onRemove={(id) => removeNegativeReportEntry('closedCurrentAccounts', id)}
        />

        <TextField
          label="Recommendation/Remarks"
          required
          multiline
          minRows={3}
          value={negativeCreditReport.recommendationRemarks}
          onChange={(event) => setNegativeCreditReport({ recommendationRemarks: event.target.value })}
          sx={fieldSx}
        />

        <Stack direction="row" justifyContent="flex-end">
          <Button
            onClick={() => setNegativeCreditReport({ submitted: true })}
            disabled={!canSubmit || negativeCreditReport.submitted}
            variant="contained"
            startIcon={<Iconify icon="solar:diskette-bold" width={18} />}
            sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#14205A' } }}
          >
            {negativeCreditReport.submitted ? 'Submitted' : 'Submit'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
