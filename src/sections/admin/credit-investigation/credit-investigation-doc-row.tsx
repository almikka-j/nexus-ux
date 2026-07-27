'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import type { RequirementDoc } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Read-only row for the Bureau & Verification Checks group (CIC/CMAP/
// NFIS-BAP). These documents are required earlier, during Requirement
// Checklist — by the time an application reaches Credit Investigation they
// must already be on file. This row re-displays that existing status/file
// for the officer to re-check as part of the investigation; it has no
// Upload/Remove/Mark-as-reviewed controls since this page does not own
// that data (see requirement-checklist-view.tsx for the source of truth).
// ----------------------------------------------------------------------

const STATUS_LABEL: Record<RequirementDoc['status'], string> = {
  verified: 'Verified',
  'needs-review': 'Needs review',
  missing: 'Missing',
};

const STATUS_COLOR: Record<RequirementDoc['status'], { bg: string; color: string }> = {
  verified: { bg: '#E7F8F0', color: '#0C8A4F' },
  'needs-review': { bg: '#FEF0D6', color: '#B36A05' },
  missing: { bg: '#F5F6FA', color: '#8891A6' },
};

export function ReadOnlyBureauCheckRow({
  label,
  doc,
}: {
  label: string;
  doc: RequirementDoc | undefined;
}) {
  const status = doc?.status ?? 'missing';
  const style = STATUS_COLOR[status];

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
            sx={{ color: style.color, flexShrink: 0 }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#14172A' }}>
              {label}
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: '#A0A7B5', mt: 0.35 }}>
              {doc?.fileName ? `${doc.fileName} · from Requirement Checklist` : 'Not yet uploaded in Requirement Checklist'}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1}>
          <Chip
            size="small"
            label={STATUS_LABEL[status]}
            sx={{ bgcolor: style.bg, color: style.color, fontWeight: 700, fontSize: 11.5 }}
          />
          <Tooltip title={doc?.fileUrl ? 'Open uploaded file' : 'No file on record yet'}>
            <span>
              <Button
                onClick={handleView}
                disabled={!doc?.fileUrl}
                variant="outlined"
                size="small"
                startIcon={<Iconify icon="solar:eye-bold-duotone" width={16} />}
                sx={{ color: '#1C2A6E', borderColor: '#C7CEEA', borderRadius: '9px', px: 1.5 }}
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
