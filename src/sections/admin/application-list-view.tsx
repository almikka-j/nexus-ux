'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import MenuItem from '@mui/material/MenuItem';
import Container from '@mui/material/Container';
import Popover from '@mui/material/Popover';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, TONE_COLORS, STEP_TONE, outlinedNavyButtonSx } from 'src/components/admin-ui';
import { AGING_LEVEL_COLORS, formatAging, getAgingLevel } from 'src/utils/format-aging';
import { getLoanNumber } from 'src/utils/get-loan-number';
import { fCurrency } from 'src/utils/format-number';

import { SAMPLE_APPLICATION } from './sample-application';
import { SAMPLE_APPLICATIONS } from './sample-applications';

import type { ReviewStep } from 'src/auth/admin-context';
import type { RegistrationState, FinancialInfo } from 'src/auth/registration-context';

// ----------------------------------------------------------------------

const STEP_ORDER: ReviewStep[] = [
  'creditChecking',
  'reconsideration',
  'callReport',
  'requirementChecklist',
  'creditInvestigation',
  'appraisal',
  'financialEvaluation',
];

const STEP_LABELS: Record<ReviewStep, string> = {
  creditChecking: 'Initial Credit Checking',
  reconsideration: 'Reconsideration',
  callReport: 'Call Report',
  requirementChecklist: 'Requirement Checklist',
  creditInvestigation: 'Credit Investigation',
  appraisal: 'Appraisal',
  financialEvaluation: 'Financial Evaluation',
};

// Account Solicitation groups these 3 forward-moving intake steps into one
// unfiltered list (replacing the old expandable "Application List" nav
// section's 3 separate sub-items) — an application shows once per step it's
// actually at, same as the per-step views, just not narrowed to just one.
const ACCOUNT_SOLICITATION_STEPS: ReviewStep[] = ['creditChecking', 'callReport', 'requirementChecklist'];

const OFFICER_ROSTER = ['Ramon Cruz', 'Bea Lopez', 'Ivan Tan', 'Grace Uy'];
const SAMPLE_ASSIGNMENTS_STORAGE_KEY = 'hhc-lms-sample-officer-assignments';

// The 7 base columns (Borrower, Loan size, Type, Date Applied, Officer,
// Status, Last activity) are always shown. MAX_TOTAL_COLUMNS is the hard
// cap on the whole table (base + optional together) — currently 8, so the
// "Add column" picker allows exactly 1 optional column (Loan term, Monthly
// income, etc.) on top of the 7 base ones.
const BASE_COLUMN_COUNT = 7;
const MAX_TOTAL_COLUMNS = 8;
const MAX_OPTIONAL_COLUMNS = MAX_TOTAL_COLUMNS - BASE_COLUMN_COUNT;

type OptionalColumnKey = 'loanTerm' | 'monthlyIncome' | 'loanPurpose' | 'collateral';

const OPTIONAL_COLUMNS: { key: OptionalColumnKey; label: string }[] = [
  { key: 'loanTerm', label: 'Loan term' },
  { key: 'monthlyIncome', label: 'Monthly income' },
  { key: 'loanPurpose', label: 'Loan purpose' },
  { key: 'collateral', label: 'Collateral' },
];

type ListRow = {
  key: string;
  isLive: boolean;
  registration: RegistrationState;
  step: ReviewStep;
  /** Only the row matching the application's actual current step is clickable. */
  isActionable: boolean;
};

// Deterministic per-borrower avatar color (same person always gets the same
// color across renders/reloads) — a small but real "modern table" signal
// that makes rows easier to tell apart at a glance, vs. every avatar being
// identical navy-on-lavender.
const AVATAR_PALETTES = [
  { bg: '#EEF1FE', text: '#3448B0' },
  { bg: '#E7F8F0', text: '#0C8A4F' },
  { bg: '#FEF0D6', text: '#B36A05' },
  { bg: '#FDE2DF', text: '#B32C22' },
  { bg: '#F3E8FD', text: '#7C3AED' },
  { bg: '#E0F7FA', text: '#0E7490' },
];

function getAvatarPalette(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTES[hash % AVATAR_PALETTES.length];
}

function renderOptionalColumnValue(
  columnKey: OptionalColumnKey,
  financialInfo: FinancialInfo | null
) {
  switch (columnKey) {
    case 'loanTerm':
      return financialInfo ? `${financialInfo.loanTermMonths} months` : '—';
    case 'monthlyIncome':
      return financialInfo ? fCurrency(financialInfo.monthlyIncome, { notation: 'compact', maximumFractionDigits: 1 }) : '—';
    case 'loanPurpose':
      return financialInfo?.loanPurpose || '—';
    case 'collateral':
      return financialInfo ? (financialInfo.hasCollateral === 'yes' ? 'Yes' : 'No') : '—';
    default:
      return '—';
  }
}

type ApplicationListViewProps = {
  /** Renders the unfiltered Account Solicitation list (Initial Credit
   * Checking + Call Report + Requirement Checklist together) instead of the
   * single-step ?step= filtered view. */
  accountSolicitation?: boolean;
};

export function ApplicationListView({ accountSolicitation = false }: ApplicationListViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUpData, application, hydrated, loadSample, reset } = useRegistration();
  const { review, resetReview } = useAdmin();
  const [sampleOfficerAssignments, setSampleOfficerAssignments] = useState<Record<string, string>>(
    () => {
      if (typeof window === 'undefined') return {};
      try {
        return JSON.parse(window.localStorage.getItem(SAMPLE_ASSIGNMENTS_STORAGE_KEY) ?? '{}');
      } catch {
        return {};
      }
    }
  );
  const [assignmentMenu, setAssignmentMenu] = useState<{
    anchorEl: HTMLElement;
    applicationKey: string;
  } | null>(null);
  const [officerSearch, setOfficerSearch] = useState('');

  // Table filter bar — pure client-side filtering over `filteredRows` below,
  // not persisted to the URL, so it resets to "All" on navigation/refresh
  // like the split-layout toggle in InitialCreditCheckingView.
  const [searchQuery, setSearchQuery] = useState('');
  // Filters by the same thing the Status column actually displays — the
  // application's stage (Initial Credit Checking / Call Report /
  // Requirement Checklist) — not the underlying decision, which no longer
  // shows anywhere in this table since Status was changed to show stage.
  const [statusFilter, setStatusFilter] = useState<'all' | ReviewStep>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'personal' | 'business'>('all');
  const [officerFilter, setOfficerFilter] = useState<string>('all');

  // "Add column" picker — capped at MAX_OPTIONAL_COLUMNS so the table never
  // exceeds MAX_TOTAL_COLUMNS columns total.
  // Defaults to Loan term shown, filling the table out to the full 8-column
  // display (7 base + 1 optional) rather than starting at 7 and requiring
  // the admin to open the Columns picker just to reach the max.
  const [visibleOptionalColumns, setVisibleOptionalColumns] = useState<OptionalColumnKey[]>(['loanTerm']);
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<HTMLElement | null>(null);

  const toggleOptionalColumn = (key: OptionalColumnKey) => {
    setVisibleOptionalColumns((prev) => {
      if (prev.includes(key)) return prev.filter((column) => column !== key);
      if (prev.length >= MAX_OPTIONAL_COLUMNS) return prev;
      return [...prev, key];
    });
  };

  const hasApplication = !!signUpData && !!application.personalInfo;

  // Auto-load the sample "live" application once localStorage has hydrated,
  // if the session is still empty, so the list isn't empty by default. Gating
  // on `hydrated` avoids clobbering a real application that just hasn't loaded
  // from localStorage yet. Also re-fires whenever `hasApplication` flips
  // back to false (e.g. after "Clear Sample Data" calls `reset()`) — the
  // dependency array used to be just `[hydrated]`, which only ever fires once
  // on mount, so clearing the sample never actually reloaded a fresh one;
  // the list just sat empty until a manual navigate-away-and-back.
  useEffect(() => {
    if (hydrated && !hasApplication) {
      loadSample(SAMPLE_APPLICATION);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, hasApplication]);

  // The live application shows up on EVERY step's list, not just its current
  // one — so a step she's already passed (e.g. Initial Credit Checking, after
  // being approved into Call Report) still always has content instead of
  // going empty. Every one of her rows is clickable (isActionable: true),
  // regardless of step — the goal is letting an admin inspect her
  // application's state at any step at will, not gating access to only her
  // "true current" step.
  const liveRows: ListRow[] = hasApplication
    ? STEP_ORDER.map((step) => ({
        key: `${signUpData!.email}-${step}`,
        isLive: true,
        registration: { signUpData, verified: true, application } as RegistrationState,
        step,
        // The live application is always clickable on every step's row,
        // same as every other step in this pipeline — letting an admin
        // inspect/act on her application at any step at will, not gating
        // access behind completing an earlier step first.
        isActionable: true,
      }))
    : [];

  // Sample applications are never clickable — they're historical/demo
  // filler, not something an admin can actually act on.
  const sampleRows: ListRow[] = SAMPLE_APPLICATIONS.map((entry) => ({
    key: entry.registration.signUpData!.email,
    isLive: false,
    registration: entry.registration,
    step: entry.step,
    isActionable: false,
  }));

  const rows: ListRow[] = [...liveRows, ...sampleRows];

  // No `?step=` param means we're on the Initial Credit Checking landing view
  // (step 1) — that should filter to creditChecking, not show every step.
  // Not used in Account Solicitation mode, which shows all 3 of its steps
  // together instead of narrowing to one.
  const stepFilter: ReviewStep = (searchParams.get('step') as ReviewStep | null) ?? 'creditChecking';
  const stepsToShow = accountSolicitation ? ACCOUNT_SOLICITATION_STEPS : [stepFilter];
  // Live application always sorts first on every step's list (she's the
  // "real" one; samples are just filler), regardless of whether she's
  // actionable on this particular step.
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();

  const filteredRows = rows
    .filter((row) => stepsToShow.includes(row.step))
    .filter((row) => statusFilter === 'all' || row.step === statusFilter)
    .filter((row) => typeFilter === 'all' || row.registration.application.loanType === typeFilter)
    .filter((row) => {
      if (officerFilter === 'all') return true;
      const officer = sampleOfficerAssignments[row.key] ?? row.registration.application.assignedOfficer;
      return officer === officerFilter;
    })
    .filter((row) => {
      if (!normalizedSearch) return true;
      const rowSignUp = row.registration.signUpData!;
      const officer = sampleOfficerAssignments[row.key] ?? row.registration.application.assignedOfficer ?? '';
      const haystack = [
        rowSignUp.firstName,
        rowSignUp.lastName,
        getLoanNumber(rowSignUp.email),
        officer,
      ]
        .join(' ')
        .toLocaleLowerCase();
      return haystack.includes(normalizedSearch);
    })
    .sort((a, b) => {
      const liveDiff = Number(b.isLive) - Number(a.isLive);
      if (liveDiff !== 0) return liveDiff;
      // Account Solicitation mixes 3 steps together — group by step
      // (in ACCOUNT_SOLICITATION_STEPS order) so rows don't interleave
      // randomly; single-step views only ever have one step present, so
      // this is a no-op there.
      return stepsToShow.indexOf(a.step) - stepsToShow.indexOf(b.step);
    });

  const pageTitle = accountSolicitation ? 'Account Solicitation' : STEP_LABELS[stepFilter];

  // Next.js `metadata` is static per-route and can't see this client-side query
  // param, so the browser tab title is kept in sync here instead of always
  // reading "Initial Credit Checking" regardless of which step is being viewed.
  useEffect(() => {
    document.title = `${pageTitle} | HHC LMS Admin`;
  }, [pageTitle]);

  const STEP_TO_PATH: Partial<Record<ReviewStep, (id: string) => string>> = {
    creditChecking: paths.admin.creditChecking,
    reconsideration: paths.admin.reconsideration,
    callReport: paths.admin.callReport,
    requirementChecklist: paths.admin.requirementChecklist,
    creditInvestigation: paths.admin.creditInvestigation,
    appraisal: paths.admin.appraisal,
    financialEvaluation: paths.admin.financialEvaluation,
  };

  const handleRowClick = (row: ListRow) => {
    if (!row.isActionable) return;

    // Route to whichever step the live application is actually at — not
    // always Initial Credit Checking — so clicking its row from a Call
    // Report/Reconsideration/etc. filtered list opens the right screen.
    const id = encodeURIComponent(row.registration.signUpData!.email);
    const stepPath = STEP_TO_PATH[row.step];
    if (stepPath) router.push(stepPath(id));
  };

  // The applicant's name is its own click target — independent of the
  // row's own click-through (which goes to the current review step, and is
  // only wired up for live/actionable rows) — so a profile with the full
  // application history is reachable for every row, live or sample alike.
  const handleNameClick = (row: ListRow, event: React.MouseEvent) => {
    event.stopPropagation();
    router.push(paths.admin.applicantProfile(encodeURIComponent(row.registration.signUpData!.email)));
  };

  const handleAssignSampleOfficer = (officer: string) => {
    if (!assignmentMenu) return;
    const nextAssignments = {
      ...sampleOfficerAssignments,
      [assignmentMenu.applicationKey]: officer,
    };
    setSampleOfficerAssignments(nextAssignments);
    window.localStorage.setItem(SAMPLE_ASSIGNMENTS_STORAGE_KEY, JSON.stringify(nextAssignments));
    setAssignmentMenu(null);
    setOfficerSearch('');
  };

  const filteredOfficerRoster = OFFICER_ROSTER.filter((officer) =>
    officer.toLocaleLowerCase().includes(officerSearch.trim().toLocaleLowerCase())
  );

  // Officer filter dropdown options — the fixed roster plus any officer
  // actually assigned on a row that isn't on that roster (e.g. the live
  // application's assignedOfficer, set elsewhere outside this sample-only
  // roster), so the filter can always find every officer that appears in
  // the table, not just the ones from OFFICER_ROSTER.
  const officerFilterOptions = Array.from(
    new Set([
      ...OFFICER_ROSTER,
      ...rows
        .map((row) => sampleOfficerAssignments[row.key] ?? row.registration.application.assignedOfficer)
        .filter((officer): officer is string => !!officer),
    ])
  ).sort();

  return (
    <Container disableGutters maxWidth={false} sx={{ py: { xs: 4, md: 6 }, px: { xs: 2, md: 5 } }}>
      <Stack spacing={4}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <Box sx={{ px: 1 }}>
            <Typography sx={{ fontSize: 30, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' }}>
              {pageTitle}
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#667085', mt: 0.5 }}>
              {accountSolicitation
                ? 'Applications across Initial Credit Checking, Call Report, and Requirement Checklist.'
                : `Applications currently at ${pageTitle}.`}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5} alignItems="center">
            {hasApplication && (
              <Button
                onClick={() => {
                  // Clearing the sample data used to only reset who the live
                  // applicant is (RegistrationContext) while leaving all of
                  // her review progress — CIBI form, bureau uploads, AI
                  // analysis, decisions, step timestamps — sitting in
                  // AdminContext untouched. That meant every screen kept
                  // showing old filled-in data from whatever was last tested,
                  // never actually resetting to a blank slate. Both must
                  // clear together.
                  reset();
                  resetReview();
                }}
                size="small"
                sx={{ color: 'text.disabled', flexShrink: 0 }}
              >
                Clear Sample Data
              </Button>
            )}
          </Stack>
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          rowGap={1}
          sx={{
            p: 1,
            borderRadius: '14px',
            bgcolor: '#F7F8FB',
            border: '1px solid #EEF0F5',
          }}
        >
          <TextField
            size="small"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search borrower, loan officer…"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="solar:magnifer-linear" width={17} sx={{ color: '#8891A6' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              flex: { xs: 1, sm: 'initial' },
              minWidth: { sm: 260 },
              '& .MuiOutlinedInput-root': {
                height: 36,
                borderRadius: '9px',
                fontSize: 13.5,
                bgcolor: 'common.white',
                '& fieldset': { borderColor: '#E1E4ED' },
              },
            }}
          />

          <Box sx={{ width: '1px', height: 20, bgcolor: '#E1E4ED', mx: 0.25, display: { xs: 'none', sm: 'block' } }} />

          <Select
            size="small"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            sx={{
              height: 36,
              borderRadius: '9px',
              fontSize: 13.5,
              bgcolor: 'common.white',
              minWidth: 148,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E1E4ED' },
            }}
          >
            <MenuItem value="all">Status: All</MenuItem>
            {stepsToShow.map((step) => (
              <MenuItem key={step} value={step}>
                {STEP_LABELS[step]}
              </MenuItem>
            ))}
          </Select>

          <Select
            size="small"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}
            sx={{
              height: 36,
              borderRadius: '9px',
              fontSize: 13.5,
              bgcolor: 'common.white',
              minWidth: 148,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E1E4ED' },
            }}
          >
            <MenuItem value="all">Type: All types</MenuItem>
            <MenuItem value="personal">Personal Loan</MenuItem>
            <MenuItem value="business">Business Loan</MenuItem>
          </Select>

          <Select
            size="small"
            value={officerFilter}
            onChange={(event) => setOfficerFilter(event.target.value)}
            sx={{
              height: 36,
              borderRadius: '9px',
              fontSize: 13.5,
              bgcolor: 'common.white',
              minWidth: 168,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E1E4ED' },
            }}
          >
            <MenuItem value="all">Officer: All officers</MenuItem>
            {officerFilterOptions.map((officer) => (
              <MenuItem key={officer} value={officer}>
                {officer}
              </MenuItem>
            ))}
          </Select>

          <Button
            size="small"
            variant="outlined"
            onClick={(event) => setColumnMenuAnchor(event.currentTarget)}
            startIcon={<Iconify icon="solar:add-square-linear" width={16} />}
            sx={{
              ...outlinedNavyButtonSx,
              height: 36,
              borderRadius: '9px',
              px: 1.5,
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
              ml: { sm: 'auto' },
              bgcolor: 'common.white',
            }}
          >
            Columns
          </Button>

          <Popover
            open={Boolean(columnMenuAnchor)}
            anchorEl={columnMenuAnchor}
            onClose={() => setColumnMenuAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            slotProps={{ paper: { sx: { mt: 0.75, width: 240, borderRadius: '12px' } } }}
          >
            <Box sx={{ px: 1.5, pt: 1.25, pb: 0.5 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#8891A6' }}>
                Table has {BASE_COLUMN_COUNT + visibleOptionalColumns.length} of {MAX_TOTAL_COLUMNS} columns
              </Typography>
            </Box>
            <Box sx={{ py: 0.5 }}>
              {OPTIONAL_COLUMNS.map((column) => {
                const checked = visibleOptionalColumns.includes(column.key);
                const disabled = !checked && visibleOptionalColumns.length >= MAX_OPTIONAL_COLUMNS;
                return (
                  <MenuItem
                    key={column.key}
                    onClick={() => !disabled && toggleOptionalColumn(column.key)}
                    disabled={disabled}
                    sx={{ mx: 0.75, px: 1, borderRadius: '8px', fontSize: 13.5 }}
                  >
                    <Checkbox checked={checked} disabled={disabled} size="small" sx={{ p: 0.5, mr: 0.5 }} />
                    <ListItemText primary={column.label} />
                  </MenuItem>
                );
              })}
            </Box>
          </Popover>
        </Stack>

        {filteredRows.length > 0 ? (
          <TableContainer
            sx={{
              ...adminCardSx,
              p: 0,
              overflowX: 'auto',
            }}
          >
            <Table sx={{ minWidth: 1180, tableLayout: 'fixed', borderCollapse: 'separate' }}>
              <TableHead>
                <TableRow
                  sx={{
                    '& th': {
                      bgcolor: '#FBFBFD',
                      borderBottom: '1px solid #E1E4ED',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#8891A6',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      py: 1.5,
                      px: 2,
                    },
                  }}
                >
                  <TableCell sx={{ width: '19%' }}>Borrower</TableCell>
                  <TableCell align="right" sx={{ width: '9%' }}>Loan size</TableCell>
                  <TableCell sx={{ width: '9%' }}>Type</TableCell>
                  {visibleOptionalColumns.map((columnKey) => (
                    <TableCell key={columnKey} sx={{ width: '11%', whiteSpace: 'nowrap' }}>
                      {OPTIONAL_COLUMNS.find((column) => column.key === columnKey)?.label}
                    </TableCell>
                  ))}
                  <TableCell sx={{ width: '11%' }}>Date Applied</TableCell>
                  <TableCell sx={{ width: '15%' }}>Officer</TableCell>
                  <TableCell sx={{ width: '15%' }}>Status</TableCell>
                  <TableCell align="right" sx={{ width: '11%' }}>Last activity</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.map((row) => {
                  const { signUpData: rowSignUp } = row.registration;
                  const rowApplication = row.registration.application;
                  const agingLevel = getAgingLevel(rowApplication.submittedAt);
                  const agingColors = AGING_LEVEL_COLORS[agingLevel];
                  const isActionable = row.isActionable;
                  const assignedOfficer =
                    sampleOfficerAssignments[row.key] ?? rowApplication.assignedOfficer;
                  const statusColors = TONE_COLORS[STEP_TONE[row.step]];
                  const fullName = `${rowSignUp!.firstName} ${rowSignUp!.lastName}`;
                  const initial = rowSignUp!.firstName?.[0]?.toUpperCase() ?? '?';
                  const avatarPalette = getAvatarPalette(rowSignUp!.email);

                  return (
                    <TableRow
                      key={row.key}
                      hover={isActionable}
                      onClick={isActionable ? () => handleRowClick(row) : undefined}
                      sx={{
                        cursor: isActionable ? 'pointer' : 'default',
                        transition: 'background-color 0.12s ease',
                        '&:last-of-type td': { borderBottom: 0 },
                        '& td': { borderColor: '#EEF0F5', py: 1.375, px: 2 },
                        '&:hover': isActionable ? { bgcolor: '#FAFBFF' } : undefined,
                      }}
                    >
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Box
                            sx={{
                              width: 30,
                              height: 30,
                              flexShrink: 0,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: avatarPalette.bg,
                              color: avatarPalette.text,
                              fontSize: 12.5,
                              fontWeight: 700,
                            }}
                          >
                            {initial}
                          </Box>
                          <Stack spacing={0.15} sx={{ minWidth: 0 }}>
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" rowGap={0.5}>
                              <Typography
                                title={fullName}
                                onClick={(event) => handleNameClick(row, event)}
                                sx={{
                                  fontSize: 13.5,
                                  fontWeight: 600,
                                  color: '#14172A',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: 220,
                                  cursor: 'pointer',
                                  '&:hover': { color: '#1C2A6E', textDecoration: 'underline' },
                                }}
                              >
                                {fullName}
                              </Typography>
                              {!row.isLive && (
                                <Box
                                  sx={{
                                    px: 0.75,
                                    py: 0.1,
                                    borderRadius: '5px',
                                    bgcolor: '#F5F6FA',
                                    color: '#8891A6',
                                    fontSize: 9.5,
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                    flexShrink: 0,
                                  }}
                                >
                                  Sample
                                </Box>
                              )}
                            </Stack>
                            <Typography sx={{ fontSize: 11.5, color: '#98A1B3', fontVariantNumeric: 'tabular-nums' }}>
                              {getLoanNumber(rowSignUp!.email)}
                            </Typography>
                          </Stack>
                        </Stack>
                      </TableCell>

                      <TableCell align="right">
                        <Typography
                          sx={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: '#14172A',
                            whiteSpace: 'nowrap',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {fCurrency(rowApplication.financialInfo?.desiredLoanAmount ?? 0, {
                            notation: 'compact',
                            maximumFractionDigits: 1,
                          })}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Box
                          sx={{
                            display: 'inline-block',
                            px: 1,
                            py: 0.3,
                            borderRadius: '6px',
                            bgcolor: '#F5F6FA',
                            fontSize: 11.5,
                            fontWeight: 600,
                            color: '#5A6273',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {rowApplication.loanType === 'business' ? 'Business' : 'Personal'}
                        </Box>
                      </TableCell>

                      {visibleOptionalColumns.map((columnKey) => (
                        <TableCell key={columnKey}>
                          <Typography sx={{ fontSize: 12.5, color: '#5A6273', whiteSpace: 'nowrap' }}>
                            {renderOptionalColumnValue(columnKey, rowApplication.financialInfo)}
                          </Typography>
                        </TableCell>
                      ))}

                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: 12.5,
                            color: '#5A6273',
                            whiteSpace: 'nowrap',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {rowApplication.submittedAt
                            ? new Date(rowApplication.submittedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : '—'}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        {row.step === 'creditChecking' && !row.isLive ? (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={
                              <Iconify
                                icon={
                                  assignedOfficer
                                    ? 'solar:user-check-rounded-bold-duotone'
                                    : 'solar:user-plus-rounded-bold-duotone'
                                }
                                width={16}
                              />
                            }
                            onClick={(event) => {
                              event.stopPropagation();
                              setOfficerSearch('');
                              setAssignmentMenu({
                                anchorEl: event.currentTarget,
                                applicationKey: row.key,
                              });
                            }}
                            sx={{
                              ...outlinedNavyButtonSx,
                              minHeight: 34,
                              px: 1.5,
                              fontSize: 11.5,
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {assignedOfficer ? 'Change Officer' : 'Assign Officer'}
                          </Button>
                        ) : (
                          <Typography sx={{ fontSize: 13, color: '#5A6273', whiteSpace: 'nowrap' }}>
                            {assignedOfficer || '—'}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={0.75}
                          sx={{
                            display: 'inline-flex',
                            pl: 0.85,
                            pr: 1.1,
                            py: 0.45,
                            borderRadius: '999px',
                            bgcolor: statusColors.bg,
                          }}
                        >
                          <Box
                            sx={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              bgcolor: statusColors.solid,
                              boxShadow: `0 0 0 2px ${statusColors.bg}, 0 0 0 3px ${statusColors.solid}33`,
                              flexShrink: 0,
                            }}
                          />
                          <Typography
                            sx={{
                              fontSize: 11.5,
                              fontWeight: 700,
                              color: statusColors.text,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {STEP_LABELS[row.step]}
                          </Typography>
                        </Stack>
                      </TableCell>

                      <TableCell align="right">
                        <Stack direction="row" spacing={2} alignItems="center" justifyContent="flex-end">
                          {rowApplication.submittedAt ? (
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <Iconify
                                icon={
                                  agingLevel === 'overdue'
                                    ? 'solar:danger-triangle-bold'
                                    : 'solar:hourglass-bold-duotone'
                                }
                                width={14}
                                sx={{ color: agingColors.icon }}
                              />
                              <Typography
                                sx={{
                                  fontSize: 12.5,
                                  color: agingColors.text,
                                  fontWeight: agingLevel === 'normal' ? 400 : 700,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {formatAging(rowApplication.submittedAt)}
                              </Typography>
                            </Stack>
                          ) : (
                            <Box sx={{ width: 14 }} />
                          )}
                          <Box sx={{ width: 20 }}>
                            {isActionable && (
                              <Iconify icon="eva:arrow-ios-forward-fill" width={20} sx={{ color: '#8891A6' }} />
                            )}
                          </Box>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box
            sx={{ ...adminCardSx, p: { xs: 4, md: 6 }, textAlign: 'center' }}
          >
            <Iconify
              icon="solar:inbox-line-bold-duotone"
              width={48}
              sx={{ color: '#C7CCDA', mb: 2 }}
            />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
              No applications yet
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#8891A6' }}>
              {accountSolicitation
                ? 'No applications are currently in Account Solicitation.'
                : `No applications are currently at ${pageTitle}.`}
            </Typography>
          </Box>
        )}

        <Popover
          anchorEl={assignmentMenu?.anchorEl ?? null}
          open={Boolean(assignmentMenu)}
          onClose={() => {
            setAssignmentMenu(null);
            setOfficerSearch('');
          }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{ paper: { sx: { mt: 0.75, width: 280, borderRadius: '12px', overflow: 'hidden' } } }}
        >
          <Box sx={{ p: 1.5, borderBottom: '1px solid #EEF0F5' }}>
            <TextField
              autoFocus
              fullWidth
              size="small"
              value={officerSearch}
              onChange={(event) => setOfficerSearch(event.target.value)}
              placeholder="Search officer"
              inputProps={{ 'aria-label': 'Search officers' }}
              InputProps={{
                startAdornment: (
                  <Iconify
                    icon="solar:magnifer-linear"
                    width={17}
                    sx={{ color: '#8891A6', mr: 1 }}
                  />
                ),
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '9px', fontSize: 13.5 } }}
            />
          </Box>
          <Box sx={{ py: 0.75, maxHeight: 240, overflowY: 'auto' }}>
            {filteredOfficerRoster.length > 0 ? (
              filteredOfficerRoster.map((officer) => (
                <MenuItem
                  key={officer}
                  onClick={() => handleAssignSampleOfficer(officer)}
                  sx={{ mx: 0.75, px: 1.25, borderRadius: '8px', fontSize: 13.5 }}
                >
                  <Iconify
                    icon="solar:user-rounded-bold-duotone"
                    width={17}
                    sx={{ color: '#8891A6', mr: 1.25 }}
                  />
                  {officer}
                </MenuItem>
              ))
            ) : (
              <Stack alignItems="center" spacing={0.75} sx={{ px: 2, py: 3 }}>
                <Iconify icon="solar:user-cross-rounded-linear" width={22} sx={{ color: '#B0B6C3' }} />
                <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>
                  No officers found
                </Typography>
              </Stack>
            )}
          </Box>
        </Popover>
      </Stack>
    </Container>
  );
}
