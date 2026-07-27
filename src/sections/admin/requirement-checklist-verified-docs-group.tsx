'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { RequirementDocRow } from './requirement-doc-row';

import type { RequirementDoc } from 'src/auth/admin-context';
import type { RequirementDocMeta, AppraisalDocMeta } from './requirement-checklist-docs';

// ----------------------------------------------------------------------

export type VerifiedDocsGroupEntry = {
  meta: RequirementDocMeta | AppraisalDocMeta;
  doc: RequirementDoc;
};

export type VerifiedDocsGroupProps = {
  entries: VerifiedDocsGroupEntry[];
  applicantName: string;
  onUpload: (key: string) => (data: Partial<RequirementDoc>) => void;
  onRemove: (key: string) => () => void;
  onToggleReviewed: (key: string) => (reviewed: boolean) => void;
  onRemarksChange: (key: string) => (remarks: string) => void;
  registerRowRef: (key: string, el: HTMLDivElement | null) => void;
  /** True when every doc in the owning section/subgroup is in this group
   * (nothing needs attention) — swaps the collapsed row's copy to "All N
   * verified" instead of "N verified documents". */
  allVerified?: boolean;
};

export function VerifiedDocsGroup({
  entries,
  applicantName,
  onUpload,
  onRemove,
  onToggleReviewed,
  onRemarksChange,
  registerRowRef,
  allVerified = false,
}: VerifiedDocsGroupProps) {
  const [expanded, setExpanded] = useState(false);

  if (entries.length === 0) return null;

  return (
    <Box>
      <Stack
        component={ButtonBase}
        onClick={() => setExpanded((prev) => !prev)}
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          width: '100%',
          px: 1.5,
          py: 1,
          borderRadius: '10px',
          bgcolor: '#F5F6FA',
          color: '#5A6273',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Iconify icon="solar:check-circle-bold" width={16} sx={{ color: '#0C8A4F' }} />
          <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
            {allVerified ? `All ${entries.length} verified` : `${entries.length} verified document${entries.length === 1 ? '' : 's'}`}
          </Typography>
        </Stack>
        <Iconify
          icon="eva:chevron-down-fill"
          width={18}
          sx={{
            transition: 'transform 0.15s ease',
            transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        />
      </Stack>

      {expanded && (
        <Stack spacing={1.25} sx={{ mt: 1.25 }}>
          {entries.map(({ meta, doc }) => (
            <Box key={meta.key} ref={(el: HTMLDivElement | null) => registerRowRef(meta.key, el)}>
              <RequirementDocRow
                meta={meta}
                doc={doc}
                applicantName={applicantName}
                onUpload={onUpload(meta.key)}
                onRemove={onRemove(meta.key)}
                onToggleReviewed={onToggleReviewed(meta.key)}
                onRemarksChange={onRemarksChange(meta.key)}
              />
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}
