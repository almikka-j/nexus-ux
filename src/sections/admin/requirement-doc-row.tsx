'use client';

import { useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { Iconify } from 'src/components/iconify';

import type { RequirementDoc } from 'src/auth/admin-context';
import type { RequirementDocMeta, AppraisalDocMeta } from './requirement-checklist-docs';

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
//
// The "Reviewed" checkbox is deliberately separate from `status` — status
// is the AI's own Verified/Needs Review/Missing read, assigned once at
// upload time and never changed by the officer directly; "Reviewed" is the
// officer's own record that they've looked at the document, toggled
// independently and freely in either direction.
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

function formatUploadedAt(uploadedAt: string | null) {
  if (!uploadedAt) return null;
  return new Date(uploadedAt).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

type RequirementDocRowProps = {
  meta: RequirementDocMeta | AppraisalDocMeta;
  doc: RequirementDoc;
  onUpload: (data: Partial<RequirementDoc>) => void;
  onRemove: () => void;
  onToggleReviewed: (reviewed: boolean) => void;
};

export function RequirementDocRow({
  meta,
  doc,
  onUpload,
  onRemove,
  onToggleReviewed,
}: RequirementDocRowProps) {
  const [viewOpen, setViewOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const style = STATUS_STYLES[doc.status];
  const uploadedDateLabel = formatUploadedAt(doc.uploadedAt);
  const isMissing = doc.status === 'missing';

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
        {isMissing ? (
          <Iconify icon={style.icon} width={20} sx={{ color: style.iconColor, flexShrink: 0 }} />
        ) : (
          <Checkbox
            checked={doc.reviewed}
            onChange={(event) => onToggleReviewed(event.target.checked)}
            size="small"
            sx={{ p: 0, flexShrink: 0, color: '#C7CCDA', '&.Mui-checked': { color: '#1C2A6E' } }}
          />
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#14172A' }}>
            {meta.required && <Box component="span" sx={{ color: '#F04438' }}>* </Box>}
            {meta.label}
          </Typography>
          {doc.aiNote && (
            <Typography sx={{ fontSize: 12, color: '#8891A6', mt: 0.25 }}>{doc.aiNote}</Typography>
          )}
          {!isMissing && (
            <Typography sx={{ fontSize: 11.5, color: '#B0B6C3', mt: 0.25 }}>
              Uploaded {uploadedDateLabel}
              {doc.uploadedBy && ` by ${doc.uploadedBy}`}
            </Typography>
          )}
        </Box>
        <Chip
          size="small"
          label={style.chipLabel}
          sx={{ bgcolor: style.chipBg, color: style.chipColor, fontWeight: 700, fontSize: 11.5, flexShrink: 0 }}
        />
        {doc.reviewed && !isMissing && (
          <Chip
            size="small"
            label="Reviewed"
            sx={{ bgcolor: '#EEF1FE', color: '#1C2A6E', fontWeight: 700, fontSize: 11.5, flexShrink: 0 }}
          />
        )}
        {isMissing ? (
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
          <>
            <Button
              onClick={() => setViewOpen(true)}
              variant="outlined"
              size="small"
              sx={{ color: '#1C2A6E', borderColor: '#C7CEEA', borderRadius: '9px', px: 2, flexShrink: 0, '&:hover': { borderColor: '#1C2A6E', bgcolor: 'rgba(28,42,110,0.04)' } }}
            >
              View
            </Button>
            <IconButton
              onClick={onRemove}
              aria-label={`Remove ${meta.label}`}
              size="small"
              sx={{ color: '#B0B6C3', flexShrink: 0, '&:hover': { color: '#F04438', bgcolor: 'rgba(240,68,56,0.06)' } }}
            >
              <Iconify icon="solar:trash-bin-trash-bold" width={18} />
            </IconButton>
          </>
        )}
      </Stack>

      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>{meta.label}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>
              {doc.fileName ?? 'No file on record'}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
              <Chip
                size="small"
                label={style.chipLabel}
                sx={{ bgcolor: style.chipBg, color: style.chipColor, fontWeight: 700, fontSize: 11.5, width: 'fit-content' }}
              />
              {doc.reviewed && (
                <Chip
                  size="small"
                  label="Reviewed"
                  sx={{ bgcolor: '#EEF1FE', color: '#1C2A6E', fontWeight: 700, fontSize: 11.5, width: 'fit-content' }}
                />
              )}
            </Stack>
            {uploadedDateLabel && (
              <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>
                Uploaded {uploadedDateLabel}
                {doc.uploadedBy && ` by ${doc.uploadedBy}`}
              </Typography>
            )}
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273' }}>AI Summary</Typography>
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
