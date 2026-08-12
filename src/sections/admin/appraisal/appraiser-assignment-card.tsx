'use client';

import { useDropzone } from 'react-dropzone';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ButtonGroup from '@mui/material/ButtonGroup';

import { useAdmin } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';
import { FileThumbnail } from 'src/components/file-thumbnail';
import { adminCardSx, outlinedNavyButtonSx } from 'src/components/admin-ui';

import type { AppraiserType } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// In-house vs external appraiser assignment. In-house fills out a
// structured report form inline; external just uploads the appraiser's
// finished report as a file. Switching type before Head Approval clears
// the other path's partial data — the two are mutually exclusive, same
// convention as CI Fee's amount reset on decline.
//
// The dashed note below the in-house form is verbatim from the source
// process diagram — real-time photo capture, lot plotting, and
// market-value lookup are flagged there as future integration work, not
// built here.
// ----------------------------------------------------------------------

function ReportFileDropzone({
  value,
  onChange,
  disabled,
}: {
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const { getRootProps, getInputProps } = useDropzone({
    multiple: false,
    accept: { 'image/*': [], 'application/pdf': [] },
    onDrop: (acceptedFiles) => onChange(acceptedFiles[0] ?? null),
    disabled,
  });

  const interactive = !value && !disabled;

  return (
    <Box
      {...(interactive ? getRootProps() : {})}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        minHeight: 44,
        px: 1.5,
        py: value ? 1 : 0,
        borderRadius: '10px',
        cursor: interactive ? 'pointer' : 'default',
        border: '1.5px dashed',
        borderColor: '#B0B8CC',
        bgcolor: 'common.white',
        '&:hover': interactive ? { borderColor: '#1C2A6E', bgcolor: '#F5F7FF' } : undefined,
      }}
    >
      {interactive && <input {...getInputProps()} />}
      {value ? (
        <>
          <FileThumbnail file={value} sx={{ width: 30, height: 30 }} />
          <Typography noWrap sx={{ fontSize: 13, fontWeight: 600, color: '#344054', flex: 1, minWidth: 0 }}>
            {value.name}
          </Typography>
          {!disabled && (
            <IconButton size="small" onClick={() => onChange(null)}>
              <Iconify icon="mingcute:close-line" width={16} />
            </IconButton>
          )}
        </>
      ) : (
        <>
          <Iconify icon="solar:upload-minimalistic-bold-duotone" width={20} sx={{ color: '#1C2A6E' }} />
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1C2A6E' }}>
            Choose a file — Appraisal Report
          </Typography>
        </>
      )}
    </Box>
  );
}

export function AppraiserAssignmentCard() {
  const { review, setAppraisal, setAppraisalReport } = useAdmin();
  const { appraiserType, report, headApprovalStatus } = review.appraisal;
  const locked = headApprovalStatus !== 'pending' || !!report.uploadedAt;
  const editable = !locked;

  const selectType = (type: AppraiserType) => {
    if (type === appraiserType) return;
    setAppraisal({ appraiserType: type });
    setAppraisalReport({
      propertyDetails: '',
      appraisedValue: '',
      remarks: '',
      recommendation: '',
      fileName: null,
      fileUrl: null,
      uploadedAt: null,
    });
  };

  const handleExternalFile = (file: File | null) => {
    if (!file) {
      setAppraisalReport({ fileName: null, fileUrl: null, uploadedAt: null });
      return;
    }
    setAppraisalReport({
      fileName: file.name,
      fileUrl: URL.createObjectURL(file),
      uploadedAt: new Date().toISOString(),
    });
  };

  const submitInhouseReport = () => {
    if (!report.propertyDetails.trim() || !report.appraisedValue.trim()) return;
    setAppraisalReport({ uploadedAt: new Date().toISOString() });
  };

  const externalFile = report.fileName
    ? new File([], report.fileName)
    : null;

  return (
    <Box sx={adminCardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        Appraiser Assignment
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2 }}>
        Assign an in-house appraiser or upload an external appraiser&apos;s finished report.
      </Typography>

      <ButtonGroup sx={{ mb: 2.5 }}>
        <Button
          onClick={() => selectType('inhouse')}
          variant={appraiserType === 'inhouse' ? 'contained' : 'outlined'}
          disabled={locked && appraiserType !== 'inhouse'}
          sx={appraiserType === 'inhouse' ? { bgcolor: '#1C2A6E', '&:hover': { bgcolor: '#14205A' } } : outlinedNavyButtonSx}
        >
          In-house
        </Button>
        <Button
          onClick={() => selectType('external')}
          variant={appraiserType === 'external' ? 'contained' : 'outlined'}
          disabled={locked && appraiserType !== 'external'}
          sx={appraiserType === 'external' ? { bgcolor: '#1C2A6E', '&:hover': { bgcolor: '#14205A' } } : outlinedNavyButtonSx}
        >
          External
        </Button>
      </ButtonGroup>

      {appraiserType === 'inhouse' && (
        <Stack spacing={1.5}>
          <TextField
            fullWidth
            label="Property Details"
            placeholder="Site description, lot area, improvements observed"
            multiline
            minRows={2}
            value={report.propertyDetails}
            disabled={!editable}
            onChange={(event) => setAppraisalReport({ propertyDetails: event.target.value })}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
          />
          <TextField
            fullWidth
            label="Appraised Value"
            placeholder="0.00"
            value={report.appraisedValue}
            disabled={!editable}
            onChange={(event) => setAppraisalReport({ appraisedValue: event.target.value })}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
          />
          <TextField
            fullWidth
            label="Remarks"
            multiline
            minRows={2}
            value={report.remarks}
            disabled={!editable}
            onChange={(event) => setAppraisalReport({ remarks: event.target.value })}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
          />
          <TextField
            fullWidth
            label="Recommendation"
            multiline
            minRows={2}
            value={report.recommendation}
            disabled={!editable}
            onChange={(event) => setAppraisalReport({ recommendation: event.target.value })}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
          />

          <Box
            sx={{
              p: 1.5,
              borderRadius: '10px',
              border: '1.5px dashed #C7CCDA',
              bgcolor: '#F9FAFC',
            }}
          >
            <Typography sx={{ fontSize: 12, fontStyle: 'italic', color: '#5A6273' }}>
              Note: Realtime taking picture, uploading of files anywhere in the system (integrate
              lot plotting and market value)
            </Typography>
          </Box>

          {editable && (
            <Button
              onClick={submitInhouseReport}
              variant="contained"
              disabled={!report.propertyDetails.trim() || !report.appraisedValue.trim()}
              sx={{ alignSelf: 'flex-start', bgcolor: '#1C2A6E', borderRadius: '10px', px: 2.5, boxShadow: 'none', '&:hover': { bgcolor: '#14205A', boxShadow: 'none' } }}
            >
              Create Appraisal Report
            </Button>
          )}
          {report.uploadedAt && (
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#0C8A4F' }}>
              Report created {new Date(report.uploadedAt).toLocaleString()}
            </Typography>
          )}
        </Stack>
      )}

      {appraiserType === 'external' && (
        <Stack spacing={1.5}>
          <ReportFileDropzone value={externalFile} onChange={handleExternalFile} disabled={!editable} />
          {report.uploadedAt && (
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#0C8A4F' }}>
              Uploaded {new Date(report.uploadedAt).toLocaleString()}
            </Typography>
          )}
        </Stack>
      )}
    </Box>
  );
}
