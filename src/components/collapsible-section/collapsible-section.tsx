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
  /**
   * Small icon rendered before the title (after the chevron), e.g.
   * "solar:magic-stick-3-bold-duotone" for the AI review card. Muted grey,
   * 18px. Omit for a plain text header.
   */
  icon?: string;
  /** Required when `children` is given; ignored for a header-only card. */
  expanded?: boolean;
  /** Required when `children` is given; ignored for a header-only card. */
  onToggle?: () => void;
  /**
   * One-line description shown directly under the title, aligned with the
   * title text. Part of the header, so it stays visible when collapsed.
   * Prefer this over putting the description as the first line of the body.
   */
  subtitle?: ReactNode;
  /** Small pill next to the title, e.g. "9/9 on file". Hidden when omitted. */
  badge?: ReactNode;
  /** Shown next to the badge only when fully complete, e.g. a green checkmark. */
  completeIcon?: ReactNode;
  /** Rendered at the row's trailing edge; clicks inside it never toggle the section (e.g. "Request Documents"). */
  headerAction?: ReactNode;
  /** Body revealed by the toggle. Omit for a header-only card (title + subtitle + headerAction, nothing to expand). */
  children?: ReactNode;
};

export function CollapsibleSection({
  title,
  icon,
  expanded = true,
  onToggle,
  subtitle,
  badge,
  completeIcon,
  headerAction,
  children,
}: CollapsibleSectionProps) {
  const hasBody = children != null && children !== false;
  const subtitleNode = subtitle && (
    <Typography sx={{ fontSize: 13.5, color: '#8891A6', mt: 0.25 }}>{subtitle}</Typography>
  );
  const iconNode = icon && (
    <Iconify icon={icon} width={18} sx={{ color: '#8891A6', flexShrink: 0 }} />
  );
  // Subtitle indent: chevron (~2.75) + optional icon (~1.75) so it aligns
  // under the title text, not the chevron.
  const subtitleIndent = icon ? 4.5 : 3.5;

  return (
    <Box>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
        <Box sx={{ minWidth: 0 }}>
          {hasBody ? (
            <>
              <Stack
                component={ButtonBase}
                onClick={() => onToggle?.()}
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
                {iconNode}
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
                  {title}
                </Typography>
                {badge}
                {expanded && completeIcon}
              </Stack>
              {subtitle && <Box sx={{ ml: subtitleIndent }}>{subtitleNode}</Box>}
            </>
          ) : (
            // Header-only card (no expandable body): no chevron, no toggle —
            // the title/subtitle just label the headerAction.
            <>
              <Stack direction="row" alignItems="center" spacing={1}>
                {iconNode}
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
                  {title}
                </Typography>
                {badge}
                {completeIcon}
              </Stack>
              {icon ? <Box sx={{ ml: 3.5 }}>{subtitleNode}</Box> : subtitleNode}
            </>
          )}
        </Box>
        {headerAction}
      </Stack>

      {hasBody && (
        <Collapse in={expanded}>
          <Box sx={{ pt: 2.5 }}>{children}</Box>
        </Collapse>
      )}
    </Box>
  );
}

export function CollapsibleSectionBadge({ received, total }: { received: number; total: number }) {
  return <StatusBadge tone="neutral" label={`${received}/${total} on file`} />;
}
