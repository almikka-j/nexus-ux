'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Collapse from '@mui/material/Collapse';
import TextField from '@mui/material/TextField';
import ButtonBase from '@mui/material/ButtonBase';
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
//
// Deliberately not a 1:1 copy of the reference screenshot's dense stacked
// form — restructured for scannability: a compact 2-column header summary
// instead of 5 stacked read-only rows, collapsible special-finding sections
// (with an at-a-glance "N added"/"None added" status) instead of 3
// permanently-expanded identical bars, numbered entry cards matching the
// Call Report collateral-entry visual language already used elsewhere in
// this app, and a completion summary + submitted-state banner.
// ----------------------------------------------------------------------

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 },
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      sx={{
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: '#8891A6',
      }}
    >
      {children}
    </Typography>
  );
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.25} sx={{ minWidth: 140 }}>
      <Typography sx={{ fontSize: 11.5, color: '#8891A6' }}>{label}</Typography>
      <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#14172A' }}>{value}</Typography>
    </Stack>
  );
}

function EntryCard({
  index,
  entry,
  labelField,
  onChange,
  onRemove,
}: {
  index: number;
  entry: NegativeReportEntry;
  labelField: string;
  onChange: (data: Partial<NegativeReportEntry>) => void;
  onRemove: () => void;
}) {
  return (
    <Box sx={{ p: 2, borderRadius: '12px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Chip
          label={`Entry ${index + 1}`}
          size="small"
          sx={{ bgcolor: '#EEF1FE', color: '#3448B0', fontWeight: 700 }}
        />
        <Button
          onClick={onRemove}
          size="small"
          startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={15} />}
          sx={{ color: '#F04438' }}
        >
          Remove
        </Button>
      </Stack>
      <Stack spacing={1.5}>
        <TextField
          label={labelField}
          value={entry.label}
          onChange={(event) => onChange({ label: event.target.value })}
          sx={fieldSx}
          fullWidth
        />
        <TextField
          label="Findings"
          value={entry.findings}
          onChange={(event) => onChange({ findings: event.target.value })}
          sx={fieldSx}
          fullWidth
          multiline
          minRows={1}
        />
      </Stack>
    </Box>
  );
}

function SpecialSection({
  listKey,
  title,
  description,
  labelField,
  entries,
  onAdd,
  onChange,
  onRemove,
}: {
  listKey: NegativeReportEntryListKey;
  title: string;
  description: string;
  labelField: string;
  entries: NegativeReportEntry[];
  onAdd: () => void;
  onChange: (id: string, data: Partial<NegativeReportEntry>) => void;
  onRemove: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasEntries = entries.length > 0;

  return (
    <Box sx={{ borderRadius: '12px', border: '1px solid #EEF0F5', overflow: 'hidden' }}>
      <ButtonBase
        onClick={() => setExpanded((prev) => !prev)}
        sx={{ width: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, textAlign: 'left' }}
        data-listkey={listKey}
      >
        <Box>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>{title}</Typography>
          <Typography sx={{ fontSize: 12, color: '#8891A6' }}>{description}</Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Chip
            size="small"
            label={hasEntries ? `${entries.length} added` : 'None added'}
            sx={{
              bgcolor: hasEntries ? '#FEF0D6' : '#F5F6FA',
              color: hasEntries ? '#B36A05' : '#8891A6',
              fontWeight: 700,
              fontSize: 11.5,
            }}
          />
          <Iconify
            icon={expanded ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'}
            width={18}
            sx={{ color: '#8891A6' }}
          />
        </Stack>
      </ButtonBase>

      <Collapse in={expanded}>
        <Stack spacing={1.5} sx={{ p: 2, pt: 0 }}>
          {entries.map((entry, index) => (
            <EntryCard
              key={entry.id}
              index={index}
              entry={entry}
              labelField={labelField}
              onChange={(data) => onChange(entry.id, data)}
              onRemove={() => onRemove(entry.id)}
            />
          ))}
          <Button
            onClick={onAdd}
            variant="outlined"
            size="small"
            startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
            sx={{ borderRadius: '9px', alignSelf: 'flex-start' }}
          >
            Add Entry
          </Button>
        </Stack>
      </Collapse>
    </Box>
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

  const filledSectionCount =
    (negativeCreditReport.accountFindings.length > 0 ? 1 : 0) +
    (negativeCreditReport.cancelledCreditCards.length > 0 ? 1 : 0) +
    (negativeCreditReport.adverseClassifiedLoans.length > 0 ? 1 : 0) +
    (negativeCreditReport.closedCurrentAccounts.length > 0 ? 1 : 0);

  if (negativeCreditReport.submitted) {
    return (
      <Box
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: '16px',
          bgcolor: '#E7F8F0',
          border: '1px solid #C7EDDA',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="flex-start" justifyContent="space-between">
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Iconify icon="solar:check-circle-bold" width={22} sx={{ color: '#0C8A4F', mt: 0.25 }} />
            <Box>
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#0C8A4F' }}>
                Negative Credit Report submitted
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#0C8A4F' }}>
                This report now appears in the Initial Credit Checking Result. You can still edit
                it below if something needs correcting.
              </Typography>
            </Box>
          </Stack>
          <Button
            onClick={() => setNegativeCreditReport({ submitted: false })}
            size="small"
            variant="outlined"
            sx={{ borderColor: '#0C8A4F', color: '#0C8A4F', borderRadius: '9px', flexShrink: 0 }}
          >
            Edit
          </Button>
        </Stack>
      </Box>
    );
  }

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
      <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 2.5 }}>
        <Box
          sx={{
            width: 38,
            height: 38,
            flexShrink: 0,
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#FDE2DF',
          }}
        >
          <Iconify icon="solar:danger-triangle-bold" width={19} sx={{ color: '#B32C22' }} />
        </Box>
        <Box>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
            Negative Credit Report
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
            A negative finding was detected in the simulated bureau review. Complete this report
            before proceeding — only Recommendation/Remarks is required.
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={2.5}>
        <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
          <SectionLabel>Report Header</SectionLabel>
          <Stack direction="row" flexWrap="wrap" spacing={3} rowGap={1.5} sx={{ mt: 1.25 }}>
            <SummaryField label="To" value="Credit Committee" />
            <SummaryField label="From" value="Credit and Collection Department" />
            <SummaryField label="Date" value={today} />
            <SummaryField label="Subject" value={subject} />
          </Stack>
          <Divider sx={{ my: 1.5, borderColor: '#EEF0F5' }} />
          <TextField
            label="Thru"
            required
            value={negativeCreditReport.thru}
            onChange={(event) => setNegativeCreditReport({ thru: event.target.value })}
            placeholder="e.g. Credit Head"
            helperText="Who this report is routed through for review"
            sx={fieldSx}
            fullWidth
          />
        </Box>

        <TextField
          label="Negative Record"
          multiline
          minRows={3}
          value={negativeCreditReport.negativeRecordText}
          onChange={(event) => setNegativeCreditReport({ negativeRecordText: event.target.value })}
          helperText="Narrative summary of the negative finding"
          sx={fieldSx}
        />

        <Box>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
            <SectionLabel>Account Findings</SectionLabel>
            {negativeCreditReport.accountFindings.length > 0 && (
              <Chip
                size="small"
                label={`${negativeCreditReport.accountFindings.length} account${negativeCreditReport.accountFindings.length > 1 ? 's' : ''}`}
                sx={{ bgcolor: '#EEF1FE', color: '#3448B0', fontWeight: 700, fontSize: 11.5 }}
              />
            )}
          </Stack>
          <Stack spacing={1.5}>
            {negativeCreditReport.accountFindings.map((entry, index) => (
              <EntryCard
                key={entry.id}
                index={index}
                entry={entry}
                labelField="Account Name"
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
              Add Account
            </Button>
          </Stack>
        </Box>

        <Box>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
            <SectionLabel>Special Findings</SectionLabel>
            <Typography sx={{ fontSize: 12, color: '#8891A6' }}>
              {filledSectionCount} of 4 optional sections filled
            </Typography>
          </Stack>
          <Stack spacing={1.5}>
            <SpecialSection
              listKey="cancelledCreditCards"
              title="Cancelled Credit Cards File"
              description="Any cards cancelled due to non-payment or fraud"
              labelField="Card / Bank"
              entries={negativeCreditReport.cancelledCreditCards}
              onAdd={() => addNegativeReportEntry('cancelledCreditCards')}
              onChange={(id, data) => updateNegativeReportEntry('cancelledCreditCards', id, data)}
              onRemove={(id) => removeNegativeReportEntry('cancelledCreditCards', id)}
            />
            <SpecialSection
              listKey="adverseClassifiedLoans"
              title="Adversely Classified Loan File"
              description="Loans flagged as substandard, doubtful, or in default"
              labelField="Loan / Institution"
              entries={negativeCreditReport.adverseClassifiedLoans}
              onAdd={() => addNegativeReportEntry('adverseClassifiedLoans')}
              onChange={(id, data) => updateNegativeReportEntry('adverseClassifiedLoans', id, data)}
              onRemove={(id) => removeNegativeReportEntry('adverseClassifiedLoans', id)}
            />
            <SpecialSection
              listKey="closedCurrentAccounts"
              title="Closed Current Account"
              description="Current accounts closed for cause"
              labelField="Account / Bank"
              entries={negativeCreditReport.closedCurrentAccounts}
              onAdd={() => addNegativeReportEntry('closedCurrentAccounts')}
              onChange={(id, data) => updateNegativeReportEntry('closedCurrentAccounts', id, data)}
              onRemove={(id) => removeNegativeReportEntry('closedCurrentAccounts', id)}
            />
          </Stack>
        </Box>

        <TextField
          label="Recommendation/Remarks"
          required
          multiline
          minRows={3}
          value={negativeCreditReport.recommendationRemarks}
          onChange={(event) => setNegativeCreditReport({ recommendationRemarks: event.target.value })}
          helperText="First line is the lead recommendation; additional lines appear as bullet points in the report"
          sx={fieldSx}
        />

        <Divider sx={{ borderColor: '#EEF0F5' }} />

        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>
            {canSubmit
              ? 'Ready to submit.'
              : 'Add a Recommendation/Remarks before submitting.'}
          </Typography>
          <Button
            onClick={() => setNegativeCreditReport({ submitted: true })}
            disabled={!canSubmit}
            variant="contained"
            startIcon={<Iconify icon="solar:diskette-bold" width={18} />}
            sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#14205A' } }}
          >
            Submit
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
