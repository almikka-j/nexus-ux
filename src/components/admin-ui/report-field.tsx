import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------
// Extracted from appraisal-report-view.tsx (2026-10-19) as the shared
// label/value primitive for every inline, read-only report view in this
// app — see docs/110-appraisal.md, docs/080-account-solicitation-call-report.md,
// and docs/070-account-solicitation-initial-credit-checking.md for which
// pages use it. A printed-form look: uppercase section label with a
// divider underneath, then fields sitting on their own hairline rule in a
// responsive grid — the same visual language across every "view what was
// submitted" screen instead of each one inventing its own.
// ----------------------------------------------------------------------

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Box>
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
      <Divider sx={{ mt: 0.75, borderColor: '#EEF0F5' }} />
    </Box>
  );
}

// A single "form line" — label in small-caps above, value sitting directly
// on a hairline rule below, the way a filled-in printed form reads.
export function Field({ label, value, span = 1 }: { label: string; value: string; span?: number }) {
  if (!value) return null;
  return (
    <Box sx={{ minWidth: 0, gridColumn: `span ${span}` }}>
      <Typography sx={{ fontSize: 11.5, color: '#8891A6' }}>{label}</Typography>
      <Typography
        sx={{
          mt: 0.25,
          pb: 0.6,
          fontSize: 13.5,
          fontWeight: 600,
          color: '#14172A',
          wordBreak: 'break-word',
          borderBottom: '1px solid #EEF0F5',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

// Responsive field grid — 2 columns on mobile, 4 on desktop, matching a
// typical printed form's row-of-boxes layout. `Field` itself returns null
// for an empty value, so an all-empty row collapses to nothing.
export function FieldGrid({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
        columnGap: 2.5,
        rowGap: 1.75,
      }}
    >
      {children}
    </Box>
  );
}

// ----------------------------------------------------------------------
// FieldTable / FieldTableRow — a bordered 2-column field table (shaded
// label cell, white value cell, horizontal dividers between rows), the
// Initial Credit Checking Result's own Memorandum/Client Information
// layout. Extracted from credit-checking-result-modal.tsx (2026-10-24) so
// other read-only "application details"-shaped views can reuse the same
// shaded-label key-value table instead of each inventing its own.
// ----------------------------------------------------------------------

export function FieldTableRow({
  pairs,
}: {
  pairs: [label: string, value: React.ReactNode][];
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        '&:not(:last-of-type)': { borderBottom: '1px solid #EEF0F5' },
        '& > div': { flex: 1, minWidth: 0 },
        '& > div:not(:last-of-type)': {
          borderBottom: { xs: '1px solid #EEF0F5', sm: 'none' },
          borderRight: { xs: 'none', sm: '1px solid #EEF0F5' },
        },
      }}
    >
      {pairs.map(([label, value]) => (
        <Box key={label} sx={{ display: 'flex', minWidth: 0 }}>
          <Box
            sx={{
              width: 200,
              flexShrink: 0,
              px: 1.5,
              py: 0.75,
              bgcolor: '#F5F6FA',
              borderRight: '1px solid #EEF0F5',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {/* Labels vary a lot across callers (e.g. Call Report's
                "Identity / Authorized Representative") — wrap instead of
                nowrap so a long label grows the row's height rather than
                spilling past this fixed-width cell into the value cell. */}
            <Typography sx={{ fontSize: 13, color: '#8891A6', lineHeight: 1.35 }}>{label}</Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 0, px: 1.5, py: 0.75, display: 'flex', alignItems: 'center' }}>
            <Typography
              sx={{ fontSize: 13.5, fontWeight: 700, color: '#14172A', minWidth: 0, wordBreak: 'break-word' }}
            >
              {value}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

export function FieldTable({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ border: '1px solid #EEF0F5', borderRadius: '12px', bgcolor: 'common.white', overflow: 'hidden' }}>
      {children}
    </Box>
  );
}
