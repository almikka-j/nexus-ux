'use client';

import type { ReactNode } from 'react';

import Box from '@mui/material/Box';

import { Iconify } from 'src/components/iconify';

import { TONE_COLORS, type SemanticTone } from './admin-tokens';

// ----------------------------------------------------------------------
// One shared status pill for every "Verified" / "Needs review" / "Missing"
// / "Not applicable" / count-badge use across the admin app, so a single
// palette change here updates every chip in the system instead of the
// dozen+ hand-copied Box/Chip sx blocks it replaces.
// ----------------------------------------------------------------------

export function StatusBadge({
  tone,
  label,
  icon,
}: {
  tone: SemanticTone;
  label: ReactNode;
  /** Optional leading icon, e.g. "solar:info-circle-linear". Omit for text-only pills. */
  icon?: string;
}) {
  const colors = TONE_COLORS[tone];
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1,
        py: 0.5,
        borderRadius: '999px',
        bgcolor: colors.bg,
        color: colors.text,
        fontSize: 11.5,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        lineHeight: 1.4,
      }}
    >
      {icon && <Iconify icon={icon} width={14} sx={{ color: colors.text, flexShrink: 0 }} />}
      {label}
    </Box>
  );
}
