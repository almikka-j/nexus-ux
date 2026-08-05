'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';
import { StatusBadge, outlinedNavyButtonSx, type SemanticTone } from 'src/components/admin-ui';

import type { RequirementDoc } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Read-only row for the Credit Investigation Document Checklist. Every
// fixed document on this page (not just the 3 bureau checks) is collected
// one step earlier, during Requirement Checklist — this page only
// re-displays that existing status/file for the officer to re-check as
// part of the investigation. It has no Upload/Remove/Mark-as-reviewed
// controls since this page does not own that data (see
// requirement-checklist-view.tsx for the source of truth).
//
// Status chip mirrors requirement-doc-row.tsx's STATUS_STYLES (same
// palette via admin-tokens, same leading icon convention) so this row
// reads as part of the same Document Checklist list instead of a
// different visual system.
// ----------------------------------------------------------------------

const STATUS_LABEL: Record<RequirementDoc['status'], string> = {
  verified: 'Verified',
  'needs-review': 'Needs review',
  missing: 'Missing',
};

const STATUS_TONE: Record<RequirementDoc['status'], SemanticTone> = {
  verified: 'success',
  'needs-review': 'warning',
  missing: 'neutral',
};

const STATUS_ICON_COLOR: Record<RequirementDoc['status'], string> = {
  verified: '#12B76A',
  'needs-review': '#B36A05',
  missing: '#C7CCDA',
};

export function ReadOnlyRequirementDocRow({
  label,
  doc,
  applicantName,
}: {
  label: string;
  doc: RequirementDoc | undefined;
  applicantName: string;
}) {
  const status = doc?.status ?? 'missing';
  const tone = STATUS_TONE[status];

  const handleView = () => {
    if (!doc?.fileUrl) return;
    window.open(doc.fileUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Box sx={{ borderRadius: '13px', border: '1px solid #EBEDF3', bgcolor: 'common.white' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={1.5}
        sx={{ p: 2 }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
          <Iconify
            icon="solar:shield-check-bold-duotone"
            width={20}
            sx={{ color: STATUS_ICON_COLOR[status], flexShrink: 0 }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#14172A' }}>
              {label}
            </Typography>
            {status !== 'missing' && doc?.aiNote && (
              <Typography sx={{ fontSize: 12, color: '#667085', lineHeight: 1.45, mt: 0.35 }}>
                {`The ${label} for ${applicantName} was reviewed. ${doc.aiNote}`}
              </Typography>
            )}
            <Typography sx={{ fontSize: 11.5, color: '#A0A7B5', mt: 0.35 }}>
              {doc?.fileName ? `${doc.fileName} · from Requirement Checklist` : 'Not yet uploaded in Requirement Checklist'}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1}>
          {status !== 'verified' && (
            <StatusBadge tone={tone} label={STATUS_LABEL[status]} icon="solar:info-circle-linear" />
          )}
          <Tooltip title={doc?.fileUrl ? 'Open uploaded file' : 'No file on record yet'}>
            <span>
              <Button
                onClick={handleView}
                disabled={!doc?.fileUrl}
                variant="outlined"
                size="small"
                startIcon={<Iconify icon="solar:eye-bold-duotone" width={16} />}
                sx={{ ...outlinedNavyButtonSx, px: 1.5 }}
              >
                View
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Stack>
    </Box>
  );
}
