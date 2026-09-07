'use client';

import { useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';

import { fileToDataUrl } from 'src/utils/file-to-data-url';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog, confirmDialogActionToneSx } from 'src/components/custom-dialog';
import { adminCardSx, outlinedNavyButtonSx, iconButtonBorderedSx } from 'src/components/admin-ui';
import { CollapsibleSection } from 'src/components/collapsible-section';

// ----------------------------------------------------------------------
// Financial Evaluation — Additional Financial Files card. Free-form
// supporting-document uploads beyond the fixed Document Checklist (e.g. a
// supplier contract, a lease, a bank certification). Multi-file, each row
// with a View action, an optional note, and Delete. Data URLs only, no
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
      >
        <input ref={inputRef} type="file" accept="image/*,.pdf" multiple hidden onChange={handleAdd} />

        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ fontSize: 13, color: '#8891A6' }}>
              Upload supporting financial documents beyond the checklist — supplier contracts, leases,
              bank certifications, etc.
            </Typography>
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
          </Stack>

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
                <Box
                  key={file.id}
                  sx={{
                    borderRadius: '13px',
                    border: '1px solid #EBEDF3',
                    bgcolor: 'common.white',
                    p: 2,
                  }}
                >
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    alignItems={{ sm: 'center' }}
                    spacing={1.5}
                  >
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
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Button
                        onClick={() =>
                          file.fileData &&
                          window.open(file.fileData, '_blank', 'noopener,noreferrer')
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
                        onClick={() => setPendingDeleteId(file.id)}
                        aria-label={`Remove ${file.fileName}`}
                        sx={{
                          ...iconButtonBorderedSx,
                          color: '#E23E3E',
                          '&:hover': { borderColor: '#E23E3E', bgcolor: 'rgba(226,62,62,0.06)' },
                        }}
                      >
                        <Iconify icon="solar:trash-bin-trash-bold" width={16} />
                      </IconButton>
                    </Stack>
                  </Stack>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Note (optional) — what this file is"
                    value={file.note}
                    onChange={(event) =>
                      updateAdditionalFinancialFile(file.id, { note: event.target.value })
                    }
                    sx={{
                      mt: 1.25,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '10px',
                        fontSize: 13,
                        bgcolor: '#FAFBFD',
                      },
                      '& input::placeholder': { color: '#98A2B3', opacity: 1 },
                    }}
                  />
                </Box>
              ))}
            </Stack>
          )}
        </Stack>
      </CollapsibleSection>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onClose={() => setPendingDeleteId(null)}
        title="Remove this file?"
        content="The uploaded file and its note will be removed."
        action={
          <Button variant="contained" onClick={confirmDelete} sx={confirmDialogActionToneSx.destructive}>
            Remove
          </Button>
        }
      />
    </Box>
  );
}
