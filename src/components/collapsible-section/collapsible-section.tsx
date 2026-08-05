'use client';

import type { ReactNode } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Collapse from '@mui/material/Collapse';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';
import { StatusBadge } from 'src/components/admin-ui';

// ----------------------------------------------------------------------
// Single source of truth for every collapsible card-section header in the
// admin app (Document Checklist, Requirement Checklist's per-tab groups,
// Negative Credit Report entries, etc.) — a rotating chevron plus an
// animated Collapse, so opening/closing reads the same everywhere instead
// of each screen inventing its own icon-swap or instant show/hide.
// ----------------------------------------------------------------------

export type CollapsibleSectionProps = {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  /** Small pill next to the title, e.g. "9/9 on file". Hidden when omitted. */
  badge?: ReactNode;
  /** Shown next to the badge only when fully complete, e.g. a green checkmark. */
  completeIcon?: ReactNode;
  /** Rendered at the row's trailing edge; clicks inside it never toggle the section (e.g. "Request Documents"). */
  headerAction?: ReactNode;
  children: ReactNode;
};

export function CollapsibleSection({
  title,
  expanded,
  onToggle,
  badge,
  completeIcon,
  headerAction,
  children,
}: CollapsibleSectionProps) {
  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
        <Stack
          component={ButtonBase}
          onClick={onToggle}
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ borderRadius: '8px', px: 0.5, py: 0.25, ml: -0.5 }}
        >
          <Iconify
            icon="eva:chevron-down-fill"
            width={20}
            sx={{
              color: '#8891A6',
              transition: 'transform 0.15s ease',
              transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
              flexShrink: 0,
            }}
          />
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>{title}</Typography>
          {badge}
          {expanded && completeIcon}
        </Stack>
        {headerAction}
      </Stack>

      <Collapse in={expanded}>
        <Box sx={{ pt: 2.5 }}>{children}</Box>
      </Collapse>
    </Box>
  );
}

export function CollapsibleSectionBadge({ received, total }: { received: number; total: number }) {
  return <StatusBadge tone="neutral" label={`${received}/${total} on file`} />;
}
