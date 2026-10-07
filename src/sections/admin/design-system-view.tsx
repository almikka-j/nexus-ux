'use client';

import { useState } from 'react';
import { NumericFormat } from 'react-number-format';

import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Container from '@mui/material/Container';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog, confirmDialogActionToneSx } from 'src/components/custom-dialog';
import {
  TONE_COLORS,
  STEP_TONE,
  StatusBadge,
  AiReviewCard,
  adminCardSx,
  AI_REVIEW_RISK_STYLES,
  outlinedNavyButtonSx,
  iconButtonBorderedSx,
  type SemanticTone,
} from 'src/components/admin-ui';
import { CollapsibleSection, CollapsibleSectionBadge } from 'src/components/collapsible-section';

// ----------------------------------------------------------------------
// Live showcase of the admin-portal design system — the visual counterpart
// to docs/225-admin-design-system.md. Every primitive here is rendered from
// the real shared tokens/components, so it doubles as a visual check: if a
// primitive renders wrong here, it renders wrong everywhere.
//
// Dev/reference-only, reached from the floating settings popover
// (nav-settings-button.tsx). Not a workflow step, no application state is
// touched. Structural hex literals below mirror docs/225 §4.3.
// ----------------------------------------------------------------------

const DOC_PATH = 'docs/225-admin-design-system.md';

const SEMANTIC_TONES: SemanticTone[] = ['success', 'warning', 'error', 'neutral', 'info'];

const PRINCIPLES: { title: string; body: string }[] = [
  { title: 'Consistency over novelty', body: 'Reach for an existing token/component before inventing a look.' },
  { title: 'Clear information hierarchy', body: 'One card, one concern. Title → subtitle → body. Amounts bold + tabular.' },
  { title: 'Efficient workflows', body: 'Primary action in the card header; decisions are one card at the page end.' },
  { title: 'Progressive disclosure', body: 'Long content collapses; detail lives one click away in a modal or detail page.' },
  { title: 'Error prevention', body: 'Destructive / forward actions gated by a confirm dialog; submit disabled until valid.' },
  { title: 'Visible feedback', body: 'Status is a coloured and labelled badge. No silent state changes.' },
  { title: 'Reuse of existing patterns', body: 'Queue → detail, Proceed/Disapprove card, AI-review callout, Manage/View modal pair.' },
  { title: 'Accessibility as a floor', body: 'Real button semantics, visible focus, status never by colour alone. Not a formal audit.' },
  { title: 'Desktop-first, responsive-safe', body: 'Built for a desktop reviewer at maxWidth="lg"; must stay usable, not break, when narrow.' },
];

const STRUCTURAL_HEX: { hex: string; role: string }[] = [
  { hex: '#14172A', role: 'Heading text' },
  { hex: '#3B4256', role: 'Body text' },
  { hex: '#5A6273', role: 'Secondary / table-cell text' },
  { hex: '#8891A6', role: 'Muted text — subtitles, table headers' },
  { hex: '#98A1B3', role: 'Faint meta (timestamps)' },
  { hex: '#667085', role: 'Muted page-intro text' },
  { hex: '#1C2A6E', role: 'Navy — primary buttons, links' },
  { hex: '#14205A', role: 'Navy hover' },
  { hex: '#C7CEEA', role: 'Muted navy outline (outlined buttons)' },
  { hex: '#E1E4ED', role: 'Divider under a table header' },
  { hex: '#EEF0F5', role: 'Hairline borders in cards / tables' },
  { hex: '#EBEDF3', role: 'Card border (adminCardSx)' },
  { hex: '#FBFBFD', role: 'Table header background' },
  { hex: '#FAFBFD', role: 'Tinted panel / callout background' },
  { hex: '#F1F3F8', role: 'Neutral chip / inline-code background' },
];

const TYPE_ROLES: { label: string; spec: string; sx: object }[] = [
  { label: 'Page title', spec: '30 / 800 / #14172A', sx: { fontSize: 30, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' } },
  { label: 'Showcase section heading', spec: '20 / 800 / #14172A', sx: { fontSize: 20, fontWeight: 800, color: '#14172A', letterSpacing: '-0.01em' } },
  { label: 'Card title', spec: '16 / 700 / #14172A', sx: { fontSize: 16, fontWeight: 700, color: '#14172A' } },
  { label: 'Card / section subtitle', spec: '13.5 / 400 / #8891A6', sx: { fontSize: 13.5, color: '#8891A6' } },
  { label: 'Body text', spec: '13.5 / 400 / #3B4256 / lh 1.6', sx: { fontSize: 13.5, color: '#3B4256', lineHeight: 1.6 } },
  { label: 'Field label', spec: '12.5 / 600 / #3B4256', sx: { fontSize: 12.5, fontWeight: 600, color: '#3B4256' } },
  { label: 'Sub-section label', spec: '12 / 700 / #8891A6 / uppercase', sx: { fontSize: 12, fontWeight: 700, color: '#8891A6', textTransform: 'uppercase', letterSpacing: '0.06em' } },
  { label: 'Table header', spec: '11 / 700 / #8891A6 / uppercase', sx: { fontSize: 11, fontWeight: 700, color: '#8891A6', textTransform: 'uppercase', letterSpacing: '0.05em' } },
  { label: 'Badge / pill', spec: '11.5 / 700', sx: { fontSize: 11.5, fontWeight: 700, color: '#5A6273' } },
  { label: 'Meta / timestamp', spec: '11 / 400 / #98A1B3', sx: { fontSize: 11, color: '#98A1B3' } },
];

const SPACING_SCALE: { token: string; px: number }[] = [
  { token: 'spacing={1}', px: 8 },
  { token: 'spacing={1.5}', px: 12 },
  { token: 'spacing={2}', px: 16 },
  { token: 'spacing={2.5}  (card stack)', px: 20 },
  { token: 'spacing={3}', px: 24 },
  { token: 'spacing={4}', px: 32 },
];

const CONTAINER_WIDTHS: { name: string; width: string; where: string }[] = [
  { name: 'Standard review / detail page', width: 'maxWidth="lg" (1200)', where: 'almost every admin screen — nav-bar-aligned' },
  { name: 'Two-column split page', width: 'maxWidth="xl" (1536)', where: 'Initial Credit Checking split layout only' },
  { name: 'Full-bleed listing', width: 'maxWidth={false}, px {xs:2, md:5}', where: 'Application List table page' },
];

const SAMPLE_TABLE_ROWS = [
  { id: '1', institution: 'BPI Family Savings Bank', facility: 'Salary Loan', amount: '₱80,000.00', status: 'Current' },
  { id: '2', institution: 'RCBC', facility: 'Auto Loan', amount: '₱250,000.00', status: 'Current' },
  { id: '3', institution: 'China Bank Savings', facility: 'Home Loan', amount: '₱1,200,000.00', status: 'Overdue' },
];

const SOURCE_MAP: { component: string; source: string; token: string; doc: string; screens: string }[] = [
  { component: 'adminCardSx', source: 'components/admin-ui/admin-tokens.ts', token: '—', doc: '220, 225', screens: 'every admin card' },
  { component: 'CollapsibleSection', source: 'components/collapsible-section/', token: 'adminCardSx', doc: '090, 100, 120, 225', screens: 'Document Checklist, FE cards, Bureau Reports' },
  { component: 'StatusBadge', source: 'components/admin-ui/status-badge.tsx', token: 'TONE_COLORS', doc: '220, 225', screens: 'Application List, every review header' },
  { component: 'ConfirmDialog', source: 'components/custom-dialog/', token: 'confirmDialogActionToneSx', doc: '100, 110, 120, 130, 160, 190, 210, 225', screens: 'every Proceed/Disapprove, every delete' },
  { component: 'ApplicationReviewHeader', source: 'sections/admin/application-review-header.tsx', token: 'STEP_TONE', doc: 'each review-page doc', screens: 'all 7 per-application pages' },
  { component: 'Admin table (recipe)', source: 'sections/admin/bureau-results-tables.tsx (BureauTable)', token: 'structural hex', doc: '070, 225', screens: 'Application List, Loan History, Bureau results' },
];

const KNOWN_EXCEPTIONS: string[] = [
  'ConfirmDialog declares a `tone` prop that is never used — colour comes from the `confirmDialogActionToneSx` spread instead. Do not pass `tone`. (Documented, not fixed.)',
  'ApplicationDetailsCard uses tighter padding (p {xs:2.5, md:3}) than adminCardSx.',
  'Initial Credit Checking split layout uses maxWidth="xl" instead of "lg".',
  'Field / CurrencyField / ReportFileDropzone / empty-state / admin table / FactChip are inline patterns re-declared per file — pending component extraction.',
  'Primary navy button style is hand-repeated (no primaryNavyButtonSx token yet).',
  'Cash Flow Statement card is a header-only CollapsibleSection (no body, no chevron) — a supported mode.',
];

const SIMULATED: string[] = [
  'No backend / API anywhere — all data is localStorage via React Context.',
  'AI review / summary / recommendation are deterministic template strings, never a model call.',
  'Bureau result rows are canned samples seeded on file upload; the file is not parsed.',
  'Approvals stamp a fixed dummy approver name; there is no second login or role gate.',
  'File uploads are stored as data URLs; seeded records point at a bundled sample PDF.',
  '"Fill with Sample Data" page actions write deterministic sample values straight into state.',
  'Outreach ("client notified", "sent to Odoo", Request Documents) is a label only — nothing is sent.',
  'On this page: the table rows are static demo data, and the ConfirmDialog triggers change no state.',
];

// ----------------------------------------------------------------------

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Box sx={adminCardSx}>
      <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#14172A', letterSpacing: '-0.01em' }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography sx={{ fontSize: 13.5, color: '#8891A6', mt: 0.5, mb: 2.5 }}>{subtitle}</Typography>
      )}
      {!subtitle && <Box sx={{ mb: 2.5 }} />}
      {children}
    </Box>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A', mb: 0.5 }}>{children}</Typography>
  );
}

function Swatch({ hex, label }: { hex: string; label: string }) {
  return (
    <Stack spacing={0.75} sx={{ minWidth: 0 }}>
      <Box sx={{ height: 44, borderRadius: '8px', bgcolor: hex, border: '1px solid rgba(20,23,42,0.08)' }} />
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#5A6273', fontVariantNumeric: 'tabular-nums' }}>
        {hex}
      </Typography>
      <Typography sx={{ fontSize: 11, color: '#8891A6', lineHeight: 1.4 }}>{label}</Typography>
    </Stack>
  );
}

function CalloutBox({ tone, children }: { tone: SemanticTone; children: React.ReactNode }) {
  const c = TONE_COLORS[tone];
  return (
    <Box sx={{ p: 2, borderRadius: '11px', bgcolor: c.bg, border: `1px solid ${c.border}` }}>
      <Typography
        sx={{ fontSize: 12, fontWeight: 700, color: c.text, textTransform: 'capitalize', mb: 0.5 }}
      >
        {tone}
      </Typography>
      <Typography sx={{ fontSize: 13, color: '#3B4256', lineHeight: 1.6 }}>{children}</Typography>
    </Box>
  );
}

function EmptyStateBox({ label }: { label: string }) {
  return (
    <Box sx={{ py: 3, px: 2, textAlign: 'center', borderRadius: '11px', border: '1px dashed #E1E4ED' }}>
      <Iconify icon="solar:inbox-line-bold-duotone" width={36} sx={{ color: '#C7CCDA', mb: 1 }} />
      <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>{label}</Typography>
    </Box>
  );
}

function ShowcaseNote({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: 12, color: '#98A1B3', mt: 1.5, fontStyle: 'italic' }}>
      {children}
    </Typography>
  );
}

// FactChip / FactChipRow — a horizontal strip of label-over-value cells
// (uppercase gray label, bold dark value), used for a quick read-only
// summary at the top of a card or modal. Not a shared component yet —
// every screen that uses it (application-details-card.tsx,
// appraisal-report-preview.tsx, appraisal-appraiser-bundle-view.tsx,
// cash-flow-statement-card.tsx, financial-statement-report.tsx,
// payment-detail-view.tsx, and others) reimplements it locally, kept in
// sync by convention rather than a shared module. Shown here exactly as
// those screens render it, for visual reference.
function FactChip({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box
      sx={{
        flex: '1 1 128px',
        minWidth: 0,
        px: 1.75,
        py: 1,
        borderRight: { xs: 'none', sm: '1px solid #EEF0F5' },
        '&:last-of-type': { borderRight: 'none' },
      }}
    >
      <Typography
        sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#9AA2B4' }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#14172A', mt: 0.25 }}>
        {value}
      </Typography>
    </Box>
  );
}

function FactChipRow({ children }: { children: React.ReactNode }) {
  return (
    <Stack
      direction="row"
      flexWrap="wrap"
      sx={{ borderRadius: '12px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD', overflow: 'hidden' }}
    >
      {children}
    </Stack>
  );
}

export function DesignSystemView() {
  const [cardExpanded, setCardExpanded] = useState(true);
  const [aiExpanded, setAiExpanded] = useState(true);
  const [confirmTone, setConfirmTone] = useState<'default' | 'destructive' | null>(null);
  const [demoText, setDemoText] = useState('');
  const [demoAmount, setDemoAmount] = useState('');

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      {/* Overview -------------------------------------------------- */}
      <Stack spacing={1} sx={{ mb: 4 }}>
        <Typography sx={{ fontSize: 30, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' }}>
          Design System — Admin Portal
        </Typography>
        <Typography sx={{ fontSize: 14, color: '#667085', lineHeight: 1.6 }}>
          Every primitive below is rendered from the real shared tokens in{' '}
          <Box component="code" sx={{ fontSize: 12.5, bgcolor: '#F1F3F8', px: 0.75, py: 0.25, borderRadius: '6px' }}>
            src/components/admin-ui
          </Box>{' '}
          and{' '}
          <Box component="code" sx={{ fontSize: 12.5, bgcolor: '#F1F3F8', px: 0.75, py: 0.25, borderRadius: '6px' }}>
            src/components/collapsible-section
          </Box>
          . The canonical rules — including everything not shown visually — live in{' '}
          <Box component="code" sx={{ fontSize: 12.5, bgcolor: '#F1F3F8', px: 0.75, py: 0.25, borderRadius: '6px' }}>
            {DOC_PATH}
          </Box>
          . Covers <strong>admin screens only</strong>; borrower / auth screens have their own
          conventions.
        </Typography>
      </Stack>

      <Stack spacing={4}>
        {/* Design principles ------------------------------------- */}
        <SectionCard title="Design principles" subtitle="docs/225 §3.">
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: 2,
            }}
          >
            {PRINCIPLES.map((p) => (
              <Box key={p.title} sx={{ p: 1.75, borderRadius: '11px', bgcolor: '#FAFBFD', border: '1px solid #EEF0F5' }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
                  {p.title}
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: '#5A6273', lineHeight: 1.55 }}>{p.body}</Typography>
              </Box>
            ))}
          </Box>
        </SectionCard>

        {/* Colour tokens --------------------------------------------- */}
        <SectionCard
          title="Colour tokens"
          subtitle="TONE_COLORS — one entry per semantic tone. Never hand-type a semantic hex."
        >
          <Stack spacing={2.5}>
            {SEMANTIC_TONES.map((tone) => {
              const c = TONE_COLORS[tone];
              return (
                <Box key={tone}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#14172A', mb: 1, textTransform: 'capitalize' }}>
                    {tone}
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(5, 1fr)' },
                      gap: 1.5,
                    }}
                  >
                    <Swatch hex={c.bg} label="bg" />
                    <Swatch hex={c.text} label="text" />
                    <Swatch hex={c.border} label="border" />
                    <Swatch hex={c.solid} label="solid" />
                    <Swatch hex={c.solidHover} label="solidHover" />
                  </Box>
                </Box>
              );
            })}
          </Stack>

          <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid #EEF0F5' }}>
            <SubHeading>STEP_TONE — pipeline-step pills</SubHeading>
            <Typography sx={{ fontSize: 13, color: '#8891A6', mb: 1.5 }}>
              Shared by the Application List Status column (with the <code>dot</code> variant) and
              ApplicationReviewHeader. Keyed by step, not decision.
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {(Object.keys(STEP_TONE) as (keyof typeof STEP_TONE)[]).map((step) => (
                <StatusBadge key={step} tone={STEP_TONE[step]} label={step} dot />
              ))}
            </Stack>
          </Box>

          <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid #EEF0F5' }}>
            <SubHeading>Shared structural hex (not tokenised — reuse verbatim)</SubHeading>
            <Box
              sx={{
                mt: 1.5,
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)', md: 'repeat(5, 1fr)' },
                gap: 1.5,
              }}
            >
              {STRUCTURAL_HEX.map((h) => (
                <Swatch key={h.hex} hex={h.hex} label={h.role} />
              ))}
            </Box>
          </Box>
        </SectionCard>

        {/* Typography ------------------------------------------------- */}
        <SectionCard
          title="Typography"
          subtitle="Plus Jakarta Sans. Match the role — don't invent a size."
        >
          <Stack divider={<Box sx={{ borderTop: '1px solid #EEF0F5' }} />}>
            {TYPE_ROLES.map((role) => (
              <Stack
                key={role.label}
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ sm: 'baseline' }}
                spacing={{ xs: 0.5, sm: 3 }}
                sx={{ py: 1.75 }}
              >
                <Typography sx={{ ...role.sx, flex: 1, minWidth: 0 }}>
                  {role.label} — the quick brown fox
                </Typography>
                <Typography sx={{ fontSize: 12, color: '#8891A6', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                  {role.spec}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </SectionCard>

        {/* Spacing & layout ---------------------------------------- */}
        <SectionCard title="Spacing & layout" subtitle="MUI spacing unit = 8px. docs/225 §4.5 – §5.">
          <SubHeading>Spacing scale</SubHeading>
          <Stack spacing={1} sx={{ mt: 1, mb: 3 }}>
            {SPACING_SCALE.map((s) => (
              <Stack key={s.token} direction="row" alignItems="center" spacing={2}>
                <Box sx={{ height: 12, width: s.px, bgcolor: '#1C2A6E', borderRadius: '3px', flexShrink: 0 }} />
                <Typography sx={{ fontSize: 12.5, color: '#5A6273', fontVariantNumeric: 'tabular-nums' }}>
                  {s.token} — {s.px}px
                </Typography>
              </Stack>
            ))}
          </Stack>

          <SubHeading>Container widths</SubHeading>
          <Box sx={{ mt: 1, mb: 3, border: '1px solid #EBEDF3', borderRadius: '12px', overflow: 'hidden' }}>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
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
                    <TableCell>Container</TableCell>
                    <TableCell>Width</TableCell>
                    <TableCell>Where</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {CONTAINER_WIDTHS.map((c) => (
                    <TableRow
                      key={c.name}
                      sx={{ '&:last-of-type td': { borderBottom: 0 }, '& td': { borderColor: '#EEF0F5', fontSize: 13, color: '#5A6273', py: 1.375, px: 2 } }}
                    >
                      <TableCell sx={{ fontWeight: 600, color: '#14172A' }}>{c.name}</TableCell>
                      <TableCell>{c.width}</TableCell>
                      <TableCell>{c.where}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <SubHeading>Responsive stacking</SubHeading>
          <Typography sx={{ fontSize: 12.5, color: '#8891A6', mb: 1 }}>
            Horizontal on desktop, vertical when narrow — <code>direction={'{{ xs: \'column\', sm: \'row\' }}'}</code>.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            {['Block A', 'Block B', 'Block C'].map((b) => (
              <Box key={b} sx={{ flex: 1, p: 1.5, borderRadius: '10px', bgcolor: '#FAFBFD', border: '1px solid #EEF0F5', textAlign: 'center', fontSize: 12.5, color: '#5A6273' }}>
                {b}
              </Box>
            ))}
          </Stack>
        </SectionCard>

        {/* Buttons & states ------------------------------------------ */}
        <SectionCard
          title="Buttons & states"
          subtitle="Primary = contained navy. Secondary/View/Manage = outlinedNavyButtonSx. More-actions = iconButtonBorderedSx."
        >
          <Stack direction="row" flexWrap="wrap" gap={1.5} alignItems="center">
            <Button
              variant="contained"
              startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
              sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#14205A' } }}
            >
              Primary action
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Iconify icon="solar:eye-bold-duotone" width={15} />}
              sx={{ ...outlinedNavyButtonSx, px: 1.5 }}
            >
              View
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Iconify icon="solar:pen-bold" width={15} />}
              sx={{ ...outlinedNavyButtonSx, px: 1.5 }}
            >
              Manage
            </Button>
            <Button
              variant="outlined"
              sx={{ color: '#5A6273', borderColor: '#C7CCDA', borderRadius: '10px', px: 2.5, '&:hover': { color: '#B32C22', borderColor: '#B32C22', bgcolor: '#FDF3F2' } }}
            >
              Disapprove
            </Button>
            <IconButton size="small" sx={iconButtonBorderedSx}>
              <Iconify icon="eva:more-vertical-fill" width={18} />
            </IconButton>
            <Button variant="contained" disabled sx={{ borderRadius: '10px', px: 2.5 }}>
              Disabled
            </Button>
          </Stack>
          <ShowcaseNote>
            No loading/spinner button state — admin actions write synchronous localStorage. `disabled`
            is used to gate a submit until its inputs are valid.
          </ShowcaseNote>
        </SectionCard>

        {/* Form controls & validation ------------------------------- */}
        <SectionCard
          title="Form controls & validation"
          subtitle="Label above the field (12.5/600). Required = red *. Currency via NumericFormat."
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
            <Stack spacing={0.75}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#3B4256' }}>
                Text field
                <Box component="span" sx={{ color: '#F04438' }}> *</Box>
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Type here"
                value={demoText}
                onChange={(e) => setDemoText(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14, bgcolor: 'common.white' } }}
              />
            </Stack>

            <Stack spacing={0.75}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#3B4256' }}>
                Currency field
              </Typography>
              <NumericFormat
                fullWidth
                size="small"
                customInput={TextField}
                placeholder="0.00"
                value={demoAmount}
                onValueChange={({ value }) => setDemoAmount(value)}
                thousandSeparator=","
                decimalScale={2}
                allowNegative={false}
                valueIsNumericString
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: TONE_COLORS.info.solid }}>₱</Typography>
                    </InputAdornment>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14, bgcolor: 'common.white' } }}
              />
            </Stack>

            <Stack spacing={0.75}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#3B4256' }}>Date field</Typography>
              <TextField
                fullWidth
                size="small"
                type="date"
                InputLabelProps={{ shrink: true }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14, bgcolor: 'common.white' } }}
              />
            </Stack>

            <Stack spacing={0.75}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#3B4256' }}>Disabled field</Typography>
              <TextField
                fullWidth
                size="small"
                disabled
                value="Read-only value"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
              />
            </Stack>
          </Box>
          <ShowcaseNote>
            Inline pattern, pending component extraction — screens re-declare a local `Field` /
            `CurrencyField` helper. No live inline error text: the submit button stays disabled until
            valid. Fields persist to localStorage on keystroke; a &ldquo;Save&rdquo; button only
            stamps a timestamp.
          </ShowcaseNote>
        </SectionCard>

        {/* Cards & containers -------------------------------------- */}
        <SectionCard
          title="Cards & containers — the CollapsibleSection header contract"
          subtitle="title = card name. subtitle = one-line description, under the title. headerAction = primary button(s), trailing edge."
        >
          <Stack spacing={2}>
            <Box sx={adminCardSx}>
              <CollapsibleSection
                title="Example Card"
                subtitle="This description sits under the title — part of the header, visible even when collapsed."
                expanded={cardExpanded}
                onToggle={() => setCardExpanded((prev) => !prev)}
                badge={<CollapsibleSectionBadge received={3} total={9} />}
                headerAction={
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Iconify icon="solar:pen-bold" width={15} />}
                      sx={{ ...outlinedNavyButtonSx, px: 1.5 }}
                    >
                      Manage
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Iconify icon="solar:eye-bold-duotone" width={15} />}
                      sx={{ ...outlinedNavyButtonSx, px: 1.5 }}
                    >
                      View
                    </Button>
                  </Stack>
                }
              >
                <Box
                  sx={{
                    p: 2,
                    borderRadius: '11px',
                    bgcolor: '#F9FAFC',
                    border: '1px solid #EEF0F5',
                  }}
                >
                  <Typography sx={{ fontSize: 13, color: '#8891A6' }}>
                    Body content — rows, a table, a form. The description is already in the header,
                    so the body starts straight into content.
                  </Typography>
                </Box>
              </CollapsibleSection>
            </Box>

            <CalloutBox tone="error">
              <strong>Don&apos;t:</strong> repeat the card title in a nested white box · put Manage/View
              in the body · put the description as the body&apos;s first line instead of the{' '}
              <code>subtitle</code> prop · add zebra striping to a table · hand-type{' '}
              <code>#8891A6</code>.
            </CalloutBox>
          </Stack>
        </SectionCard>

        {/* AI review card --------------------------------------------- */}
        <SectionCard
          title="AI Review card"
          subtitle="The one AiReviewCard — a CollapsibleSection with a magic-stick icon, a risk box, and the AI Control Statement footnote. Compact or rich, by the slots the screen passes."
        >
          <SubHeading>Compact — Requirement Checklist / Credit Investigation / Financial Evaluation</SubHeading>
          <Typography sx={{ fontSize: 12.5, color: '#8891A6', mb: 1.5 }}>
            Pass <code>risk</code> + <code>summary</code> + <code>recommendation</code>. The risk level
            shows as a pill, not in the heading.
          </Typography>
          <AiReviewCard
            expanded={aiExpanded}
            onToggle={() => setAiExpanded((v) => !v)}
            subtitle="Automatically checks each uploaded document for completeness against the checklist above."
            risk={AI_REVIEW_RISK_STYLES.watch}
            summary="7 of 10 documents are on file. AI verified 6 document(s), flagged 1 for review, and found 3 still missing."
            recommendation="3 outstanding item(s) — Proof of Billing, Working Visa, Statement of Account — are incomplete. Return to Requirement Checklist to resolve them before proceeding."
          />

          <Box sx={{ mt: 3 }}>
            <SubHeading>Rich — Initial Credit Checking</SubHeading>
            <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>
              Pass <code>richResult</code> (an <code>InitialCreditCheckingResult</code>). Renders{' '}
              <code>AiRecommendationSummary</code>: Overall Assessment, AI Summary sub-groups,
              Recommended Action, Review Basis, Required Verification, and its own Control Statement.
              Optionally pass a <code>footer</code> (Initial Credit Checking&apos;s &ldquo;View
              Result&rdquo; row). Shown on that screen, not duplicated here.
            </Typography>
          </Box>
        </SectionCard>

        {/* Tables & lists ---------------------------------------- */}
        <SectionCard
          title="Tables & lists"
          subtitle="#FBFBFD uppercase gray head, #EEF0F5 borders, plain white rows (no zebra), tabular-nums amounts."
        >
          <Box sx={{ border: '1px solid #EBEDF3', borderRadius: '16px', overflow: 'hidden' }}>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
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
                    <TableCell>Institution</TableCell>
                    <TableCell>Facility</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {SAMPLE_TABLE_ROWS.map((row) => (
                    <TableRow
                      key={row.id}
                      sx={{
                        '&:last-of-type td': { borderBottom: 0 },
                        '& td': { borderColor: '#EEF0F5', fontSize: 13, color: '#5A6273', py: 1.375, px: 2 },
                      }}
                    >
                      <TableCell sx={{ fontWeight: 600, color: '#14172A' }}>{row.institution}</TableCell>
                      <TableCell>{row.facility}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#14172A', fontVariantNumeric: 'tabular-nums' }}>
                        {row.amount}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={row.status === 'Overdue' ? 'error' : 'success'} label={row.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
          <ShowcaseNote>
            Demo data. Recipe only — closest shared impl is `BureauTable` (bureau-results-tables.tsx),
            still local. Pending component extraction.
          </ShowcaseNote>
        </SectionCard>

        {/* FactChip --------------------------------------------------- */}
        <SectionCard
          title="FactChip — quick-read summary strip"
          subtitle="Label-over-value cells in a horizontal strip. Used for a card/modal's at-a-glance summary."
        >
          <FactChipRow>
            <FactChip label="Loan Type" value="Personal Loan" />
            <FactChip label="Amount" value="₱150,000" />
            <FactChip label="Term" value="24 months" />
            <FactChip label="Purpose" value="Home Improvement" />
            <FactChip label="Gross Monthly Income" value="₱45,000" />
            <FactChip label="Date Filed" value="8/29/2026" />
          </FactChipRow>
          <ShowcaseNote>
            Demo data. Not a shared component — reimplemented locally per screen (see the code comment
            above `FactChip` in this file for every current usage site). Pending extraction into a
            shared module.
          </ShowcaseNote>
        </SectionCard>

        {/* Badges & status ------------------------------------------- */}
        <SectionCard
          title="Badges & status indicators"
          subtitle="StatusBadge — the one pill for every status / count chip. Status always reads as text, not colour alone."
        >
          <Stack spacing={2}>
            <Stack direction="row" flexWrap="wrap" gap={1.25}>
              {SEMANTIC_TONES.map((tone) => (
                <StatusBadge key={tone} tone={tone} label={tone} />
              ))}
            </Stack>
            <Stack direction="row" flexWrap="wrap" gap={1.25}>
              <StatusBadge tone="success" label="Verified" icon="solar:check-circle-bold" />
              <StatusBadge tone="warning" label="Needs review" icon="solar:info-circle-linear" />
              <StatusBadge tone="error" label="Missing" icon="solar:close-circle-bold" />
              <CollapsibleSectionBadge received={3} total={9} />
            </Stack>
          </Stack>
        </SectionCard>

        {/* Alerts / feedback ------------------------------------- */}
        <SectionCard
          title="Alerts & feedback"
          subtitle="Tinted callout boxes for AI/summary/warnings. No toasts in admin flows. No spinners."
        >
          <Stack spacing={1.5}>
            {SEMANTIC_TONES.map((tone) => (
              <CalloutBox key={tone} tone={tone}>
                A {tone} message uses TONE_COLORS.{tone} — bg, text, border.
              </CalloutBox>
            ))}
            <EmptyStateBox label="No files uploaded yet." />
          </Stack>
        </SectionCard>

        {/* Dialogs & modals ------------------------------------- */}
        <SectionCard
          title="Dialogs & modals"
          subtitle="ConfirmDialog — tone via confirmDialogActionToneSx: default (navy) for approve/proceed, destructive (red) for reject/delete."
        >
          <Stack direction="row" flexWrap="wrap" gap={1.5}>
            <Button
              variant="contained"
              onClick={() => setConfirmTone('default')}
              sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#14205A' } }}
            >
              Open default confirm
            </Button>
            <Button
              variant="outlined"
              onClick={() => setConfirmTone('destructive')}
              sx={{ color: '#5A6273', borderColor: '#C7CCDA', borderRadius: '10px', px: 2.5, '&:hover': { color: '#B32C22', borderColor: '#B32C22' } }}
            >
              Open destructive confirm
            </Button>
          </Stack>
          <ShowcaseNote>
            These triggers change no application state. `ConfirmDialog` also declares an unused `tone`
            prop — see Known exceptions.
          </ShowcaseNote>
        </SectionCard>

        {/* Navigation & workflow ------------------------------------- */}
        <SectionCard
          title="Navigation & workflow patterns"
          subtitle="docs/225 §10. No breadcrumbs, tabs, or steppers in the admin portal."
        >
          <SubHeading>Floating settings popover</SubHeading>
          <Typography sx={{ fontSize: 13, color: '#5A6273', lineHeight: 1.6, mb: 2.5 }}>
            Bottom-right gear button. Contains: <strong>Menu navigation</strong> (top / side nav-mode
            toggle), <strong>Page actions</strong> (per-page dev/test actions like &ldquo;Fill with
            Sample Data&rdquo;), and <strong>Reference → View design system</strong> (this page).
          </Typography>

          <SubHeading>Decision gate — Proceed / Disapprove card</SubHeading>
          <Box sx={{ mt: 1, p: 2.25, borderRadius: '12px', bgcolor: '#FAFBFD', border: '1px solid #EEF0F5' }}>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
              Proceed application?
            </Typography>
            <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2 }}>
              A single card at the end of a review page. Not gated on document completeness.
            </Typography>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={1.5}>
              <Button
                variant="contained"
                startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
                sx={{ bgcolor: '#12B76A', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#0C8A4F' } }}
              >
                Endorse
              </Button>
              <Button
                variant="outlined"
                startIcon={<Iconify icon="solar:close-circle-bold" width={18} />}
                sx={{ color: '#5A6273', borderColor: '#C7CCDA', borderRadius: '10px', px: 2.5, '&:hover': { color: '#1C2A6E', borderColor: '#1C2A6E', bgcolor: '#F5F7FF' } }}
              >
                Disapprove
              </Button>
            </Stack>
          </Box>
          <ShowcaseNote>Mock — real buttons, no state change. Disapprove normally opens a reason ConfirmDialog.</ShowcaseNote>
        </SectionCard>

        {/* Loading / empty / error --------------------------------- */}
        <SectionCard
          title="Loading, empty & error states"
          subtitle="Admin state is synchronous localStorage — there are no loading spinners or skeletons."
        >
          <Stack spacing={1.5}>
            <EmptyStateBox label="Nothing waiting on you yet." />
            <CalloutBox tone="error">
              An error / adverse finding is a TONE_COLORS.error tinted box, or a red terminal-state
              screen after a decision. Not a toast.
            </CalloutBox>
            <Box sx={{ p: 2, borderRadius: '11px', bgcolor: '#F5F6FA', border: '1px dashed #E1E4ED' }}>
              <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>
                No &ldquo;loading&hellip;&rdquo; state exists. If a future change introduces real
                latency, add a pattern to docs/225 §9 first.
              </Typography>
            </Box>
          </Stack>
        </SectionCard>

        {/* Accessibility states ----------------------------------- */}
        <SectionCard
          title="Accessibility states"
          subtitle="A floor, not a formal audit. docs/225 §11."
        >
          <SubHeading>Visible focus</SubHeading>
          <Typography sx={{ fontSize: 12.5, color: '#8891A6', mb: 1 }}>
            Tab to these — MUI&apos;s default focus ring is kept, not suppressed.
          </Typography>
          <Stack direction="row" gap={1.5} flexWrap="wrap" sx={{ mb: 2.5 }}>
            <Button variant="contained" sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2.5 }}>
              Focusable button
            </Button>
            <Button variant="outlined" sx={{ ...outlinedNavyButtonSx, px: 2 }}>
              Focusable link-style
            </Button>
            <IconButton size="small" sx={iconButtonBorderedSx} aria-label="More actions">
              <Iconify icon="eva:more-vertical-fill" width={18} />
            </IconButton>
          </Stack>

          <SubHeading>Colour + label — status never by colour alone</SubHeading>
          <Stack direction="row" gap={1.25} flexWrap="wrap">
            <StatusBadge tone="success" label="Approved" icon="solar:check-circle-bold" />
            <StatusBadge tone="error" label="Rejected" icon="solar:close-circle-bold" />
          </Stack>
          <ShowcaseNote>
            No recorded WCAG contrast pass; #8891A6 on white is borderline — meta/secondary text only.
            No systematic screen-reader pass.
          </ShowcaseNote>
        </SectionCard>

        {/* Responsive note --------------------------------------- */}
        <SectionCard
          title="Responsive"
          subtitle="Desktop-first. Built for a reviewer at maxWidth='lg'."
        >
          <Typography sx={{ fontSize: 13, color: '#5A6273', lineHeight: 1.6 }}>
            There is no mobile-specific admin layout. Narrow-viewport behaviour only has to stay
            usable: horizontal stacks reflow to vertical (
            <code>direction={'{{ xs: \'column\', sm: \'row\' }}'}</code>), grids drop columns, and
            wide tables scroll inside their own <code>overflowX: auto</code> container — the page body
            never scrolls sideways. A full device-frame preview is out of scope for this showcase.
          </Typography>
        </SectionCard>

        {/* Real screen examples --------------------------------- */}
        <SectionCard title="Real screen examples" subtitle="Reference implementations — open in a new tab.">
          <Stack spacing={1}>
            <Typography sx={{ fontSize: 13, color: '#5A6273' }}>
              • <code>/admin/credit-checking</code> — the queue table recipe + StatusBadge Status column
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#5A6273' }}>
              • any <code>/admin/applications/[id]/financial-evaluation</code> — the page shell,
              CollapsibleSection cards with subtitle/headerAction, the Proceed/Disapprove card
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#5A6273' }}>
              • <code>/admin/applications/[id]/credit-checking</code> — Bureau Reports tables +
              the AI-review tinted callout
            </Typography>
          </Stack>
        </SectionCard>

        {/* Component / source mapping --------------------------- */}
        <SectionCard title="Component / source mapping" subtitle="Component → source → related token → feature-note doc → screens.">
          <Box sx={{ border: '1px solid #EBEDF3', borderRadius: '16px', overflow: 'hidden' }}>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 760 }}>
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
                    <TableCell>Component</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell>Token</TableCell>
                    <TableCell>Doc</TableCell>
                    <TableCell>Screens</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {SOURCE_MAP.map((r) => (
                    <TableRow
                      key={r.component}
                      sx={{ '&:last-of-type td': { borderBottom: 0 }, '& td': { borderColor: '#EEF0F5', fontSize: 12.5, color: '#5A6273', py: 1.375, px: 2, verticalAlign: 'top' } }}
                    >
                      <TableCell sx={{ fontWeight: 600, color: '#14172A' }}>{r.component}</TableCell>
                      <TableCell><code>{r.source}</code></TableCell>
                      <TableCell><code>{r.token}</code></TableCell>
                      <TableCell>{r.doc}</TableCell>
                      <TableCell>{r.screens}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </SectionCard>

        {/* Known exceptions & simulated behaviour --------------- */}
        <SectionCard title="Known exceptions & simulated behaviour" subtitle="docs/225 §13 – §14.">
          <SubHeading>Known exceptions</SubHeading>
          <Stack component="ul" spacing={0.75} sx={{ m: 0, mt: 1, mb: 3, pl: 2.5 }}>
            {KNOWN_EXCEPTIONS.map((x) => (
              <Typography key={x} component="li" sx={{ fontSize: 12.5, color: '#5A6273', lineHeight: 1.55 }}>
                {x}
              </Typography>
            ))}
          </Stack>

          <SubHeading>Simulated / showcase-only</SubHeading>
          <Stack component="ul" spacing={0.75} sx={{ m: 0, mt: 1, pl: 2.5 }}>
            {SIMULATED.map((x) => (
              <Typography key={x} component="li" sx={{ fontSize: 12.5, color: '#5A6273', lineHeight: 1.55 }}>
                {x}
              </Typography>
            ))}
          </Stack>
        </SectionCard>

        <Divider sx={{ borderColor: '#EEF0F5' }} />
        <Typography sx={{ fontSize: 12.5, color: '#98A1B3', textAlign: 'center' }}>
          Canonical rules and rationale: {DOC_PATH}
        </Typography>
      </Stack>

      <ConfirmDialog
        open={confirmTone !== null}
        onClose={() => setConfirmTone(null)}
        title={confirmTone === 'destructive' ? 'Disapprove this application?' : 'Approve this request?'}
        content={
          confirmTone === 'destructive'
            ? 'This routes the application to Reconsideration. (Showcase — nothing happens.)'
            : 'This advances the application to the next step. (Showcase — nothing happens.)'
        }
        action={
          <Button
            variant="contained"
            onClick={() => setConfirmTone(null)}
            sx={
              confirmTone === 'destructive'
                ? confirmDialogActionToneSx.destructive
                : confirmDialogActionToneSx.default
            }
          >
            Confirm
          </Button>
        }
      />
    </Container>
  );
}
