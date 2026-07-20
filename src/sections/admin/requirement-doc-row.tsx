'use client';

import { useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { Iconify } from 'src/components/iconify';

import type { RequirementDoc } from 'src/auth/admin-context';
import type { RequirementDocMeta } from './requirement-checklist-docs';

// ----------------------------------------------------------------------
// One row per document on the Requirement Checklist screen — modeled on
// BureauRow/SimpleBureauRow in bureau-reports-card.tsx, duplicated rather
// than shared since that component's upload semantics (BureauUpload shape,
// CIBI-specific branching) don't fit this screen's RequirementDoc shape.
// "View" (for verified/needs-review docs) opens a lightweight dialog with
// the filename + AI note — no real document viewer exists anywhere in this
// app. "Upload" (for missing docs) is a real file picker; picking a file
// deterministically assigns the document's meta.freshStatus/freshNote (see
// requirement-checklist-docs.ts) rather than anything read from the file.
// ----------------------------------------------------------------------

const STATUS_STYLES: Record<
  RequirementDoc['status'],
  { icon: string; iconColor: string; chipLabel: string; chipBg: string; chipColor: string }
> = {
  verified: {
    icon: 'solar:check-circle-bold',
    iconColor: '#12B76A',
    chipLabel: 'Verified',
    chipBg: '#E7F8F0',
    chipColor: '#0C8A4F',
  },
  'needs-review': {
    icon: 'solar:danger-triangle-bold',
    iconColor: '#B36A05',
    chipLabel: 'Needs review',
    chipBg: '#FEF0D6',
    chipColor: '#B36A05',
  },
  missing: {
    icon: 'solar:document-linear',
    iconColor: '#C7CCDA',
    chipLabel: 'Missing',
    chipBg: '#F5F6FA',
    chipColor: '#8891A6',
  },
};

type RequirementDocRowProps = {
  meta: RequirementDocMeta;
  doc: RequirementDoc;
  onUpload: (data: Partial<RequirementDoc>) => void;
};

export function RequirementDocRow({ meta, doc, onUpload }: RequirementDocRowProps) {
  const [viewOpen, setViewOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const style = STATUS_STYLES[doc.status];

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    onUpload({
      status: meta.freshStatus,
      aiNote: meta.freshNote,
      fileName: file.name,
      uploadedAt: new Date().toISOString(),
    });
    event.target.value = '';
  };

  return (
    <Box sx={{ borderRadius: '13px', border: '1px solid #EBEDF3', overflow: 'hidden' }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ p: 2 }}>
        <Iconify icon={style.icon} width={20} sx={{ color: style.iconColor, flexShrink: 0 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#14172A' }}>
            {meta.required && <Box component="span" sx={{ color: '#F04438' }}>* </Box>}
            {meta.label}
          </Typography>
          {doc.aiNote && (
            <Typography sx={{ fontSize: 12, color: '#8891A6', mt: 0.25 }}>{doc.aiNote}</Typography>
          )}
        </Box>
        <Chip
          size="small"
          label={style.chipLabel}
          sx={{ bgcolor: style.chipBg, color: style.chipColor, fontWeight: 700, fontSize: 11.5, flexShrink: 0 }}
        />
        {doc.status === 'missing' ? (
          <>
            <input ref={inputRef} type="file" accept="image/*,.pdf" hidden onChange={handleUpload} />
            <Button
              onClick={() => inputRef.current?.click()}
              variant="contained"
              size="small"
              sx={{ bgcolor: '#1C2A6E', borderRadius: '9px', px: 2, flexShrink: 0, '&:hover': { bgcolor: '#14205A' } }}
            >
              Upload
            </Button>
          </>
        ) : (
          <Button
            onClick={() => setViewOpen(true)}
            variant="outlined"
            size="small"
            sx={{ color: '#1C2A6E', borderColor: '#C7CEEA', borderRadius: '9px', px: 2, flexShrink: 0, '&:hover': { borderColor: '#1C2A6E', bgcolor: 'rgba(28,42,110,0.04)' } }}
          >
            View
          </Button>
        )}
      </Stack>

      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>{meta.label}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>
              {doc.fileName ?? 'No file on record'}
            </Typography>
            <Chip
              size="small"
              label={style.chipLabel}
              sx={{ bgcolor: style.chipBg, color: style.chipColor, fontWeight: 700, fontSize: 11.5, width: 'fit-content' }}
            />
            <Typography sx={{ fontSize: 14, color: '#3B4256', lineHeight: 1.6 }}>{doc.aiNote}</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
