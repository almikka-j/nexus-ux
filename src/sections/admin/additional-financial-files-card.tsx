'use client';

import { useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { useAdmin, type AdditionalFinancialFile } from 'src/auth/admin-context';

import { fileToDataUrl } from 'src/utils/file-to-data-url';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog, confirmDialogActionToneSx } from 'src/components/custom-dialog';
import { adminCardSx, outlinedNavyButtonSx, iconButtonBorderedSx } from 'src/components/admin-ui';
import { CollapsibleSection } from 'src/components/collapsible-section';

// ----------------------------------------------------------------------
// Financial Evaluation — Additional Financial Files card. Free-form
// supporting-document uploads beyond the fixed Document Checklist (e.g. a
// supplier contract, a lease, a bank certification). Multi-file, each row
// with a View action, optional remarks, and Delete. Data URLs only, no
// parsing — same prototype convention as every other upload in this app.
// Informational: does not gate the Endorse decision.
// ----------------------------------------------------------------------

function formatUploadedAt(iso: string) {
  return new Date(iso).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function FileRow({
  file,
  onRemarksChange,
  onDelete,
}: {
  file: AdditionalFinancialFile;
  onRemarksChange: (remarks: string) => void;
  onDelete: () => void;
}) {
  const remarks = file.remarks ?? '';
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [remarksOpen, setRemarksOpen] = useState(false);
  const [remarksDraft, setRemarksDraft] = useState(remarks);

  const openRemarks = () => {
    setMenuAnchor(null);
    setRemarksDraft(remarks);
    setRemarksOpen(true);
  };

  const saveRemarks = () => {
    onRemarksChange(remarksDraft.trim());
    setRemarksOpen(false);
  };

  return (
    <Box
      sx={{
        borderRadius: '13px',
        border: '1px solid #EBEDF3',
        bgcolor: 'common.white',
        p: 2,
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={1.5}>
        <Iconify
          icon="solar:file-text-bold-duotone"
          width={20}
          sx={{ color: '#8891A6', flexShrink: 0 }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 13.5, fontWeight: 700, color: '#14172A' }}>
            {file.fileName}
          </Typography>
          <Typography sx={{ fontSize: 11, color: '#A0A7B5', mt: 0.25 }}>
            Uploaded {formatUploadedAt(file.uploadedAt)}
          </Typography>
          {remarks && (
            <Typography noWrap sx={{ fontSize: 11.5, color: '#5A6273', mt: 0.5, maxWidth: 520 }}>
              Remarks: {remarks}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            onClick={() =>
              file.fileData && window.open(file.fileData, '_blank', 'noopener,noreferrer')
            }
            disabled={!file.fileData}
            variant="outlined"
            size="small"
            startIcon={<Iconify icon="solar:eye-bold-duotone" width={15} />}
            sx={{ ...outlinedNavyButtonSx, px: 1.5 }}
          >
            View
          </Button>
          <IconButton
            size="small"
            onClick={(event) => setMenuAnchor(event.currentTarget)}
            aria-label={`More actions for ${file.fileName}`}
            sx={iconButtonBorderedSx}
          >
            <Iconify icon="eva:more-vertical-fill" width={18} />
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
            slotProps={{ paper: { sx: { mt: 0.5, minWidth: 190, borderRadius: '10px' } } }}
          >
            <MenuItem onClick={openRemarks} sx={{ fontSize: 13.5 }}>
              <Iconify
                icon="solar:pen-new-square-bold-duotone"
                width={17}
                sx={{ mr: 1.25, color: '#5A6273' }}
              />
              {remarks ? 'Edit remarks' : 'Add remarks'}
            </MenuItem>
            <MenuItem
              onClick={() => {
                setMenuAnchor(null);
                onDelete();
              }}
              sx={{
                fontSize: 13.5,
                color: '#B32C22',
                '&:hover': { bgcolor: 'rgba(226,62,62,0.06)' },
              }}
            >
              <Iconify icon="solar:trash-bin-trash-bold-duotone" width={17} sx={{ mr: 1.25 }} />
              Delete file
            </MenuItem>
          </Menu>
        </Stack>
      </Stack>

      <Dialog open={remarksOpen} onClose={() => setRemarksOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>
          {remarks ? 'Edit remarks' : 'Add remarks'}
        </DialogTitle>
        <DialogContent>
          <Typography noWrap sx={{ fontSize: 12.5, color: '#8891A6', mb: 1.5 }}>
            {file.fileName}
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={4}
            value={remarksDraft}
            onChange={(event) => setRemarksDraft(event.target.value)}
            placeholder="What this file is, or review findings"
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

export function AdditionalFinancialFilesCard() {
  const { review, addAdditionalFinancialFiles, updateAdditionalFinancialFile, removeAdditionalFinancialFile } =
    useAdmin();
  const files = review.additionalFinancialFiles;

  const [expanded, setExpanded] = useState(true);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    if (picked.length === 0) return;
    const entries = await Promise.all(
      picked.map(async (file) => ({ fileName: file.name, fileData: await fileToDataUrl(file) }))
    );
    addAdditionalFinancialFiles(entries);
    event.target.value = '';
  };

  const confirmDelete = () => {
    if (pendingDeleteId) removeAdditionalFinancialFile(pendingDeleteId);
    setPendingDeleteId(null);
  };

  return (
    <Box sx={adminCardSx}>
      <CollapsibleSection
        title="Additional Financial Files"
        subtitle="Upload supporting financial documents beyond the checklist — supplier contracts, leases, bank certifications, etc."
        expanded={expanded}
        onToggle={() => setExpanded((prev) => !prev)}
        badge={
          files.length > 0 ? (
            <Box
              component="span"
              sx={{
                fontSize: 11,
                fontWeight: 700,
                color: '#5A6273',
                bgcolor: '#F1F3F8',
                borderRadius: 20,
                px: 1,
                py: 0.25,
              }}
            >
              {files.length}
            </Box>
          ) : undefined
        }
        headerAction={
          <Button
            onClick={() => inputRef.current?.click()}
            variant="contained"
            size="small"
            startIcon={<Iconify icon="solar:upload-bold-duotone" width={16} />}
            sx={{
              flexShrink: 0,
              bgcolor: '#1C2A6E',
              borderRadius: '10px',
              px: 2,
              boxShadow: 'none',
              fontWeight: 700,
              '&:hover': { bgcolor: '#14205A', boxShadow: 'none' },
            }}
          >
            Upload files
          </Button>
        }
      >
        <input ref={inputRef} type="file" accept="image/*,.pdf" multiple hidden onChange={handleAdd} />

        <Stack spacing={1.5}>
          {files.length === 0 ? (
            <Box
              sx={{
                py: 3,
                px: 2,
                textAlign: 'center',
                borderRadius: '11px',
                border: '1px dashed #E1E4ED',
              }}
            >
              <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>No files uploaded yet.</Typography>
            </Box>
          ) : (
            <Stack spacing={1.25}>
              {files.map((file) => (
                <FileRow
                  key={file.id}
                  file={file}
                  onRemarksChange={(remarks) =>
                    updateAdditionalFinancialFile(file.id, { remarks })
                  }
                  onDelete={() => setPendingDeleteId(file.id)}
                />
              ))}
            </Stack>
          )}
        </Stack>
      </CollapsibleSection>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onClose={() => setPendingDeleteId(null)}
        title="Remove this file?"
        content="The uploaded file and its remarks will be removed."
        action={
          <Button variant="contained" onClick={confirmDelete} sx={confirmDialogActionToneSx.destructive}>
            Remove
          </Button>
        }
      />
    </Box>
  );
}
