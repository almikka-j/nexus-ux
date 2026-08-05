'use client';

import { useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { Iconify } from 'src/components/iconify';
import { StatusBadge, iconButtonBorderedSx, outlinedNavyButtonSx, type SemanticTone } from 'src/components/admin-ui';

import type { RequirementDoc } from 'src/auth/admin-context';
import type { RequirementDocMeta, AppraisalDocMeta } from './requirement-checklist-docs';

// The component only ever reads these 4 fields (never `tabs`/`subgroup`),
// so any caller's meta object — including ad-hoc custom-document objects —
// can be passed as long as it has this shape, without needing to be one of
// the two named checklist types.
export type RequirementDocRowMeta = {
  label: string;
  required: boolean;
  freshStatus: 'verified' | 'needs-review';
  freshNote: string;
};

// ----------------------------------------------------------------------

const STATUS_STYLES: Record<
  RequirementDoc['status'],
  {
    icon: string;
    iconColor: string;
    chipLabel: string;
    tone: SemanticTone;
    explanation: string;
  }
> = {
  verified: {
    icon: 'solar:check-circle-bold',
    iconColor: '#12B76A',
    chipLabel: 'Verified',
    tone: 'success',
    explanation:
      'Automated checks found no issue in the uploaded file. Officer review and acceptance are still required.',
  },
  'needs-review': {
    icon: 'solar:danger-triangle-bold',
    iconColor: '#B36A05',
    chipLabel: 'Needs review',
    tone: 'warning',
    explanation:
      'Automated checks found an item that needs officer attention before the document can be accepted.',
  },
  missing: {
    icon: 'solar:document-linear',
    iconColor: '#C7CCDA',
    chipLabel: 'Missing',
    tone: 'neutral',
    explanation: 'No document has been uploaded.',
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
  meta: RequirementDocMeta | AppraisalDocMeta | RequirementDocRowMeta;
  doc: RequirementDoc;
  applicantName: string;
  onUpload: (data: Partial<RequirementDoc>) => void;
  onRemove: () => void;
  onToggleReviewed: (reviewed: boolean) => void;
  onRemarksChange: (remarks: string) => void;
  hideReviewedCheckbox?: boolean;
  /** True when onRemove resets the row back to "missing" rather than deleting it entirely (i.e. every row except ad-hoc custom documents). Only changes the menu item's label/icon. */
  removeMeansMissing?: boolean;
};

export function RequirementDocRow({
  meta,
  doc,
  applicantName,
  onUpload,
  onRemove,
  onToggleReviewed,
  onRemarksChange,
  hideReviewedCheckbox = false,
  removeMeansMissing = false,
}: RequirementDocRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [remarksOpen, setRemarksOpen] = useState(false);
  const [remarksDraft, setRemarksDraft] = useState(doc.remarks);
  const style = STATUS_STYLES[doc.status];
  const uploadedDateLabel = formatUploadedAt(doc.uploadedAt);
  const isMissing = doc.status === 'missing';

  const openRemarks = () => {
    setMenuAnchor(null);
    setRemarksDraft(doc.remarks);
    setRemarksOpen(true);
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    onUpload({
      status: meta.freshStatus,
      aiNote: meta.freshNote,
      fileName: file.name,
      fileUrl: URL.createObjectURL(file),
      uploadedAt: new Date().toISOString(),
      remarks: '',
      reviewed: false,
    });
    event.target.value = '';
  };

  const handleViewFile = () => {
    if (!doc.fileUrl) return;
    window.open(doc.fileUrl, '_blank', 'noopener,noreferrer');
  };

  const saveRemarks = () => {
    const remarks = remarksDraft.trim();
    onRemarksChange(remarks);
    setRemarksOpen(false);
  };

  const deleteDocument = () => {
    setMenuAnchor(null);
    if (doc.fileUrl?.startsWith('blob:')) URL.revokeObjectURL(doc.fileUrl);
    onRemove();
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
          {isMissing || hideReviewedCheckbox ? (
            <Iconify icon={style.icon} width={20} sx={{ color: style.iconColor, flexShrink: 0 }} />
          ) : (
            <Checkbox
              checked={doc.reviewed}
              onChange={(event) => onToggleReviewed(event.target.checked)}
              inputProps={{ 'aria-label': `Mark ${meta.label} as reviewed and accepted` }}
              size="small"
              sx={{ p: 0, flexShrink: 0, color: '#AEB5C5', '&.Mui-checked': { color: '#1C2A6E' } }}
            />
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#14172A' }}>
              {meta.label}
            </Typography>
            {!isMissing && doc.aiNote && (
              <Typography sx={{ fontSize: 12, color: '#667085', lineHeight: 1.45, mt: 0.35 }}>
                {hideReviewedCheckbox ? doc.aiNote : `The ${meta.label} for ${applicantName} was reviewed. ${doc.aiNote}`}
              </Typography>
            )}
            {!isMissing && (
              <Typography sx={{ fontSize: 11.5, color: '#A0A7B5', mt: 0.5 }}>
                {doc.fileName} · Uploaded {uploadedDateLabel}
                {doc.uploadedBy && ` by ${doc.uploadedBy}`}
              </Typography>
            )}
            {doc.remarks && (
              <Typography
                noWrap
                sx={{ fontSize: 11.5, color: '#5A6273', mt: 0.5, maxWidth: 520 }}
              >
                Remarks: {doc.remarks}
              </Typography>
            )}
          </Box>
        </Stack>

        <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={1}>
          {doc.status !== 'verified' && (
            <Tooltip title={style.explanation} arrow>
              <span>
                <StatusBadge
                  tone={style.tone}
                  label={style.chipLabel}
                  icon="solar:info-circle-linear"
                />
              </span>
            </Tooltip>
          )}
          {doc.reviewed && !isMissing && <StatusBadge tone="success" label="Reviewed" />}
          {isMissing ? (
            <>
              <input ref={inputRef} type="file" accept="image/*,.pdf" hidden onChange={handleUpload} />
              <Button
                onClick={() => inputRef.current?.click()}
                variant="contained"
                size="small"
                sx={{ bgcolor: '#1C2A6E', borderRadius: '9px', px: 2, '&:hover': { bgcolor: '#14205A' } }}
              >
                Upload
              </Button>
            </>
          ) : (
            <>
              <Tooltip title={doc.fileUrl ? 'Open uploaded file' : 'File preview is unavailable for sample data'}>
                <span>
                  <Button
                    onClick={handleViewFile}
                    disabled={!doc.fileUrl}
                    variant="outlined"
                    size="small"
                    startIcon={<Iconify icon="solar:eye-bold-duotone" width={16} />}
                    sx={{ ...outlinedNavyButtonSx, px: 1.5 }}
                  >
                    View
                  </Button>
                </span>
              </Tooltip>
              <IconButton
                onClick={(event) => setMenuAnchor(event.currentTarget)}
                aria-label={`More actions for ${meta.label}`}
                size="small"
                sx={iconButtonBorderedSx}
              >
                <Iconify icon="eva:more-vertical-fill" width={18} />
              </IconButton>
            </>
          )}
        </Stack>
      </Stack>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        slotProps={{ paper: { sx: { mt: 0.5, minWidth: 190, borderRadius: '10px' } } }}
      >
        <MenuItem onClick={openRemarks} sx={{ fontSize: 13.5 }}>
          <Iconify icon="solar:pen-new-square-bold-duotone" width={17} sx={{ mr: 1.25, color: '#5A6273' }} />
          {doc.remarks ? 'Edit remarks' : 'Add remarks'}
        </MenuItem>
        <MenuItem onClick={deleteDocument} sx={{ fontSize: 13.5, color: removeMeansMissing ? '#B36A05' : '#B32C22' }}>
          <Iconify
            icon={removeMeansMissing ? 'solar:undo-left-round-bold-duotone' : 'solar:trash-bin-trash-bold-duotone'}
            width={17}
            sx={{ mr: 1.25 }}
          />
          {removeMeansMissing ? 'Mark as missing' : 'Delete document'}
        </MenuItem>
      </Menu>

      <Dialog open={remarksOpen} onClose={() => setRemarksOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>
          {doc.remarks ? 'Edit remarks' : 'Add remarks'}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 12.5, color: '#8891A6', mb: 1.5 }}>
            {meta.label}
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={4}
            value={remarksDraft}
            onChange={(event) => setRemarksDraft(event.target.value)}
            placeholder="Record review findings or acceptance notes"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 13.5 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemarksOpen(false)} sx={{ color: '#5A6273' }}>
            Cancel
          </Button>
          <Button
            onClick={saveRemarks}
            variant="contained"
            disabled={!remarksDraft.trim()}
            sx={{ bgcolor: '#1C2A6E', '&:hover': { bgcolor: '#14205A' } }}
          >
            Save Remarks
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
