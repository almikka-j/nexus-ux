'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogContent from '@mui/material/DialogContent';

import { useAdmin } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';
import { FileThumbnail } from 'src/components/file-thumbnail';
import { adminCardSx, outlinedNavyButtonSx } from 'src/components/admin-ui';
import { CollapsibleSection } from 'src/components/collapsible-section';

import { AppraisalReportPreview } from './appraisal-report-preview';

import type { CollateralPhoto, AppraisalReportLandTitle } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// In-house vs external appraiser report. In-house fills out the full
// Appraisal Report (REM) form — Land/title details per pledged property
// (now including per-TCT Collateral Photo uploads, multiple per title —
// see MultiPhotoDropzone/LandTitleFields below), Boundaries, Technical
// Specification, Utilities, General Construction Features, Particular
// Description, Basis of Valuation, the FMV/RCN valuation table, and the
// Prepared/Reviewed/Endorsed/Noted by signature chain — matching the
// printed Appraisal Report (REM) PDF section by section. External just
// uploads the appraiser's finished report as a file. Which of the two
// applies (`bundle.appraiserType`) is decided once, by the Officer, in
// the Assign Appraiser modal — this page no longer lets the appraiser
// switch it (an earlier version had an In-house/External `ButtonGroup`
// toggle right here that called `setAppraisalBundleAppraiserType`; it
// was removed since the appraiser already knows which type they were
// assigned as, and re-deciding it from inside the report form was both
// redundant and a way to second-guess the Officer's own assignment).
//
// Locked (disabled) fields, once a report is submitted, still render
// dark/readable text — see the `fieldSx` `.Mui-disabled` override below.
// MUI's default disabled style washes text out to a light gray
// regardless of whether the field is genuinely empty or holds real
// content, which made a fully filled-in, submitted report look barely
// legible; a light gray background is what signals "locked" instead now.
// ----------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      sx={{
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: '#8891A6',
      }}
    >
      {children}
    </Typography>
  );
}

// One step of the sequential Prepared -> Reviewed -> Endorsed -> Noted
// sign-off chain — a name field plus a "Simulate: Approve as {Role}"
// stamp button, disabled until the prior step in the chain has already
// been stamped (gateMet). Stamping is a distinct action from typing the
// name (this is an approval workflow, not just an attribution field), so
// editing the name after stamping does not clear the existing stamp —
// the button has to be clicked again to re-stamp.
function SignatoryField({
  label,
  name,
  stampedAt,
  editable,
  gateMet,
  fieldSx,
  onNameChange,
  onStamp,
}: {
  label: string;
  name: string;
  stampedAt: string | null;
  editable: boolean;
  gateMet: boolean;
  fieldSx: object;
  onNameChange: (value: string) => void;
  onStamp: () => void;
}) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
      <TextField
        fullWidth
        size="small"
        label={label}
        value={name}
        disabled={!editable}
        onChange={(event) => onNameChange(event.target.value)}
        sx={fieldSx}
      />
      {editable && (
        <Button
          onClick={onStamp}
          variant="outlined"
          disabled={!gateMet || !name.trim()}
          sx={{ ...outlinedNavyButtonSx, flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          Simulate: Approve
        </Button>
      )}
      {stampedAt && (
        <Typography sx={{ fontSize: 11.5, color: '#0C8A4F', flexShrink: 0, whiteSpace: 'nowrap' }}>
          Stamped {new Date(stampedAt).toLocaleString()}
        </Typography>
      )}
    </Stack>
  );
}

// Simulated "AI-generated" lot plot diagram — a canned inline SVG data URI
// stamped with the title's own latitude/longitude, same technique
// sample-appraisal-report.ts's SAMPLE_COLLATERAL_PHOTO uses. No real
// mapping/AI service is called; the trailing `#.jpg` fragment is the same
// workaround that lets FileThumbnail's naive extension sniff (`url.split
// ('.').pop()`) treat a data:image/svg+xml URI as an image instead of
// falling back to a generic file icon.
function buildLotPlotImage(latitude: string, longitude: string): string {
  const coordsLabel = `${latitude}, ${longitude}`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320">
      <rect width="480" height="320" fill="#EEF1FE"/>
      <rect x="20" y="20" width="440" height="280" fill="none" stroke="#1C2A6E" stroke-width="2" stroke-dasharray="6 4"/>
      <polygon points="90,250 90,90 300,60 390,180 260,260" fill="#C9D3F5" stroke="#1C2A6E" stroke-width="2"/>
      <circle cx="90" cy="90" r="4" fill="#1C2A6E"/>
      <circle cx="300" cy="60" r="4" fill="#1C2A6E"/>
      <circle cx="390" cy="180" r="4" fill="#1C2A6E"/>
      <circle cx="260" cy="260" r="4" fill="#1C2A6E"/>
      <circle cx="90" cy="250" r="4" fill="#1C2A6E"/>
      <text x="240" y="160" font-family="sans-serif" font-size="13" font-weight="700" fill="#1C2A6E" text-anchor="middle">LOT PLOT</text>
      <text x="240" y="300" font-family="sans-serif" font-size="12" fill="#5A6273" text-anchor="middle">${coordsLabel}</text>
    </svg>`
  )}#.jpg`;
}

function ReportFileDropzone({
  value,
  fileName,
  onChange,
  disabled,
  label = 'Choose a file — Appraisal Report',
  accept = { 'image/*': [], 'application/pdf': [] },
  imageView = false,
}: {
  // A freshly-dropped File shows its real bytes; a previously-uploaded
  // one only has its blob/object URL left (the File itself never
  // persists across reloads) — passing that URL string straight to
  // FileThumbnail still renders a real image preview when `imageView` is
  // on, unlike reconstructing a fake empty File from just the filename.
  value: File | string | null;
  // Only needed when `value` is a URL string, since FileThumbnail can't
  // derive a display name from an opaque blob: URL.
  fileName?: string | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  label?: string;
  accept?: Record<string, string[]>;
  imageView?: boolean;
}) {
  const { getRootProps, getInputProps } = useDropzone({
    multiple: false,
    accept,
    onDrop: (acceptedFiles) => onChange(acceptedFiles[0] ?? null),
    disabled,
  });

  const interactive = !value && !disabled;
  const displayName = typeof value === 'string' ? fileName ?? '' : value?.name ?? '';

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
          <FileThumbnail file={value} imageView={imageView} sx={{ width: 30, height: 30 }} />
          <Typography noWrap sx={{ fontSize: 13, fontWeight: 600, color: '#344054', flex: 1, minWidth: 0 }}>
            {displayName}
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
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1C2A6E' }}>{label}</Typography>
        </>
      )}
    </Box>
  );
}

// Multiple Collateral Photo uploads per TCT/OCT — an always-open dropzone
// (never shows a "selected" state, since it isn't bound to a single file)
// plus a thumbnail grid of every photo uploaded so far, each with its own
// delete (×) button. Every drop APPENDS to the array rather than
// replacing it, unlike ReportFileDropzone's single-value contract.
function MultiPhotoDropzone({
  photos,
  onChange,
  disabled,
}: {
  photos: CollateralPhoto[];
  onChange: (photos: CollateralPhoto[]) => void;
  disabled?: boolean;
}) {
  const { getRootProps, getInputProps } = useDropzone({
    multiple: true,
    accept: { 'image/*': [] },
    disabled,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;
      const newPhotos: CollateralPhoto[] = acceptedFiles.map((file) => ({
        fileName: file.name,
        fileUrl: URL.createObjectURL(file),
        uploadedAt: new Date().toISOString(),
      }));
      onChange([...photos, ...newPhotos]);
    },
  });

  const removePhoto = (index: number) => {
    onChange(photos.filter((_, i) => i !== index));
  };

  return (
    <Stack spacing={1.25}>
      {!disabled && (
        <Box
          {...getRootProps()}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            minHeight: 44,
            px: 1.5,
            borderRadius: '10px',
            cursor: 'pointer',
            border: '1.5px dashed',
            borderColor: '#B0B8CC',
            bgcolor: 'common.white',
            '&:hover': { borderColor: '#1C2A6E', bgcolor: '#F5F7FF' },
          }}
        >
          <input {...getInputProps()} />
          <Iconify icon="solar:upload-minimalistic-bold-duotone" width={20} sx={{ color: '#1C2A6E' }} />
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1C2A6E' }}>
            Choose photos — Collateral Photo
          </Typography>
        </Box>
      )}
      {photos.length > 0 && (
        <Stack direction="row" spacing={1.25} flexWrap="wrap" rowGap={1.25}>
          {photos.map((photo, index) => (
            <Box key={`${photo.fileUrl}-${index}`} sx={{ position: 'relative', width: 88, flexShrink: 0 }}>
              <Box
                component="img"
                src={photo.fileUrl}
                alt={photo.fileName}
                sx={{ width: 88, height: 66, objectFit: 'cover', borderRadius: '8px', border: '1px solid #EBEDF3', display: 'block' }}
              />
              {!disabled && (
                <IconButton
                  size="small"
                  onClick={() => removePhoto(index)}
                  sx={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    width: 22,
                    height: 22,
                    bgcolor: 'common.white',
                    border: '1px solid #EBEDF3',
                    '&:hover': { bgcolor: '#F5F6FA' },
                  }}
                >
                  <Iconify icon="mingcute:close-line" width={14} />
                </IconButton>
              )}
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function LandTitleFields({
  title,
  tctNumber,
  editable,
  onChange,
  showToggle,
  expanded,
  onToggle,
}: {
  title: AppraisalReportLandTitle;
  tctNumber: string;
  editable: boolean;
  onChange: (data: Partial<AppraisalReportLandTitle>) => void;
  showToggle: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  // Locked (disabled) fields still need to read clearly once a report is
  // submitted — MUI's default disabled state washes the text out to a
  // light gray (#919EAB) regardless of whether it's actually empty or
  // holds real content, which made a fully filled-in, submitted report
  // look barely legible. Overriding `.Mui-disabled` keeps the text dark
  // and readable; the light gray background is what signals "locked" now
  // instead.
  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '10px',
      fontSize: 14,
      '&.Mui-disabled': {
        bgcolor: '#F5F6FA',
        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E1E4ED' },
      },
    },
    '& .MuiInputBase-input.Mui-disabled': {
      WebkitTextFillColor: '#14172A',
      color: '#14172A',
    },
  };

  const handleGenerateLotPlot = () => {
    onChange({
      lotPlotFileName: `Lot-Plot-${tctNumber}.svg`,
      lotPlotFileUrl: buildLotPlotImage(title.latitude ?? '', title.longitude ?? ''),
      lotPlotGeneratedAt: new Date().toISOString(),
    });
  };

  const fields = (
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            size="small"
            label="Survey No."
            value={title.surveyNo}
            disabled={!editable}
            onChange={(event) => onChange({ surveyNo: event.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            size="small"
            label="Book No. / Page No."
            value={title.bookPageNo}
            disabled={!editable}
            onChange={(event) => onChange({ bookPageNo: event.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            size="small"
            type="date"
            label="Title Registration Date"
            value={title.titleRegistrationDate}
            disabled={!editable}
            onChange={(event) => onChange({ titleRegistrationDate: event.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            size="small"
            label="Title Registration Place"
            value={title.titleRegistrationPlace}
            disabled={!editable}
            onChange={(event) => onChange({ titleRegistrationPlace: event.target.value })}
            sx={fieldSx}
          />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            size="small"
            label="Area Size (sq.m.)"
            value={title.areaSize}
            disabled={!editable}
            onChange={(event) => onChange({ areaSize: event.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            size="small"
            label="Lot No."
            value={title.lotNo}
            disabled={!editable}
            onChange={(event) => onChange({ lotNo: event.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            size="small"
            label="Zonal Value"
            value={title.zonalValue}
            disabled={!editable}
            onChange={(event) => onChange({ zonalValue: event.target.value })}
            sx={fieldSx}
          />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            size="small"
            label="FMV / RCN (PHP)"
            value={title.fmvRcn}
            disabled={!editable}
            onChange={(event) => onChange({ fmvRcn: event.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            size="small"
            label="Construction Status %"
            value={title.constructionStatusPercent}
            disabled={!editable}
            onChange={(event) => onChange({ constructionStatusPercent: event.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            size="small"
            label="Depreciated Value"
            value={title.depreciatedValue}
            disabled={!editable}
            onChange={(event) => onChange({ depreciatedValue: event.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            size="small"
            label="Appraised Value (P)"
            value={title.appraisedValueP}
            disabled={!editable}
            onChange={(event) => onChange({ appraisedValueP: event.target.value })}
            sx={fieldSx}
          />
        </Stack>
        <Box
          sx={{
            p: 2,
            borderRadius: '13px',
            bgcolor: '#F8F9FC',
            border: '1px solid #E3E7F0',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.75 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                flexShrink: 0,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#EEF1FE',
              }}
            >
              <Iconify icon="solar:map-point-bold-duotone" width={19} sx={{ color: '#1C2A6E' }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>Lot Plotting</Typography>
              <Typography sx={{ fontSize: 12.5, color: '#8891A6', mt: 0.25 }}>
                Enter coordinates, then generate a plot diagram for this title.
              </Typography>
            </Box>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'flex-start' }} spacing={{ xs: 1, sm: 1.25 }}>
            <TextField
              fullWidth
              size="small"
              label="Latitude"
              placeholder="14.2569"
              value={title.latitude ?? ''}
              disabled={!editable}
              onChange={(event) => onChange({ latitude: event.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { minHeight: 42, borderRadius: '10px', bgcolor: 'common.white', fontSize: 14 } }}
            />
            <TextField
              fullWidth
              size="small"
              label="Longitude"
              placeholder="121.0583"
              value={title.longitude ?? ''}
              disabled={!editable}
              onChange={(event) => onChange({ longitude: event.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { minHeight: 42, borderRadius: '10px', bgcolor: 'common.white', fontSize: 14 } }}
            />
            <Button
              onClick={handleGenerateLotPlot}
              variant="contained"
              disabled={!editable || !(title.latitude ?? '').trim() || !(title.longitude ?? '').trim()}
              startIcon={<Iconify icon="solar:map-point-bold-duotone" width={18} />}
              sx={{
                minHeight: 42,
                minWidth: { sm: 148 },
                borderRadius: '10px',
                px: 2.25,
                flexShrink: 0,
                bgcolor: '#1C2A6E',
                boxShadow: 'none',
                fontWeight: 700,
                '&:hover': { bgcolor: '#14205A', boxShadow: 'none' },
              }}
            >
              {title.lotPlotFileUrl ? 'Regenerate' : 'Generate Lot Plot'}
            </Button>
          </Stack>
          {title.lotPlotFileUrl && (
            <Box sx={{ mt: 1.75 }}>
              <Box
                component="img"
                src={title.lotPlotFileUrl}
                alt={`Lot plot — TCT No. ${tctNumber}`}
                sx={{ width: { xs: '100%', sm: 200 }, aspectRatio: '3 / 2', objectFit: 'contain', bgcolor: '#EEF1FE', borderRadius: '10px', border: '1px solid #DDE3F5', display: 'block' }}
              />
              <Typography sx={{ fontSize: 10.5, color: '#8891A6', mt: 0.75 }}>
                Simulated preview
              </Typography>
            </Box>
          )}
        </Box>
        <TextField
          fullWidth
          multiline
          minRows={2}
          label="Boundaries"
          placeholder="North, South, East, West boundaries of this title"
          value={title.boundaries}
          disabled={!editable}
          onChange={(event) => onChange({ boundaries: event.target.value })}
          sx={fieldSx}
        />
        <TextField
          fullWidth
          multiline
          minRows={2}
          label="Technical Specification"
          value={title.technicalSpecification}
          disabled={!editable}
          onChange={(event) => onChange({ technicalSpecification: event.target.value })}
          sx={fieldSx}
        />
        <MultiPhotoDropzone
          photos={title.collateralPhotos}
          onChange={(photos) => onChange({ collateralPhotos: photos })}
          disabled={!editable}
        />
      </Stack>
  );

  if (!showToggle) {
    return (
      <Box sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #EBEDF3' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 1.25 }}>
          TCT No. {tctNumber}
        </Typography>
        {fields}
      </Box>
    );
  }

  return (
    <Box sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #EBEDF3' }}>
      <CollapsibleSection title={`TCT No. ${tctNumber}`} expanded={expanded} onToggle={onToggle}>
        {fields}
      </CollapsibleSection>
    </Box>
  );
}

export function AppraiserAssignmentCard({
  bundleId,
  tctNumbers,
}: {
  bundleId: string;
  tctNumbers: string[];
}) {
  const {
    review,
    setAppraisalBundleReport,
    setAppraisalBundleLandTitle,
    addAppraisalBundleComparable,
    updateAppraisalBundleComparable,
    removeAppraisalBundleComparable,
    stampAppraisalBundleSignatory,
  } = useAdmin();
  const { headApprovalStatus } = review.appraisal;
  const bundle = review.appraisal.reportBundles.find((entry) => entry.id === bundleId);
  const [previewOpen, setPreviewOpen] = useState(false);
  // Per-TCT expand state for a multi-property bundle's LandTitleFields.
  // Tracks COLLAPSED ids (inverse of the "present means expanded"
  // convention this app's other per-TCT expand/collapse UIs use) so that
  // any id absent from the set — including one not yet known when this
  // component first mounts, before `bundle` has hydrated from localStorage
  // — defaults to expanded with no seeding required. (An earlier version
  // tracked EXPANDED ids, lazily initialized from `bundle?.tctGroupIds` at
  // mount; if `bundle` was still undefined at that exact moment — a real
  // race with this app's async localStorage hydrate — the set locked in
  // empty forever, since a useState initializer runs only once, and every
  // title stayed collapsed for the rest of the session. Tracking collapsed
  // ids instead makes "unknown id" and "expanded" the same default state,
  // so the race can't produce a stuck-collapsed title any more.)
  const [collapsedTitleIds, setCollapsedTitleIds] = useState<Set<string>>(new Set());
  const toggleTitle = (groupId: string) =>
    setCollapsedTitleIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  if (!bundle) return null;
  const { appraiserType, report } = bundle;
  const locked = headApprovalStatus !== 'pending' || !!report.uploadedAt;
  const editable = !locked;
  // Locked (disabled) fields still need to read clearly once a report is
  // submitted — MUI's default disabled state washes the text out to a
  // light gray (#919EAB) regardless of whether it's actually empty or
  // holds real content, which made a fully filled-in, submitted report
  // look barely legible. Overriding `.Mui-disabled` keeps the text dark
  // and readable; the light gray background is what signals "locked" now
  // instead.
  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '10px',
      fontSize: 14,
      '&.Mui-disabled': {
        bgcolor: '#F5F6FA',
        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E1E4ED' },
      },
    },
    '& .MuiInputBase-input.Mui-disabled': {
      WebkitTextFillColor: '#14172A',
      color: '#14172A',
    },
  };

  const titleGroups = review.requirementChecklist.appraisalGroups.filter((group) =>
    bundle.tctGroupIds.includes(group.id)
  );

  const handleExternalFile = (file: File | null) => {
    if (!file) {
      setAppraisalBundleReport(bundleId, { fileName: null, fileUrl: null, uploadedAt: null });
      return;
    }
    setAppraisalBundleReport(bundleId, {
      fileName: file.name,
      fileUrl: URL.createObjectURL(file),
      uploadedAt: new Date().toISOString(),
    });
  };

  const handleSubdivisionPlanFile = (file: File | null) => {
    if (!file) {
      setAppraisalBundleReport(bundleId, {
        subdivisionPlanFileName: null,
        subdivisionPlanFileUrl: null,
        subdivisionPlanUploadedAt: null,
      });
      return;
    }
    setAppraisalBundleReport(bundleId, {
      subdivisionPlanFileName: file.name,
      subdivisionPlanFileUrl: URL.createObjectURL(file),
      subdivisionPlanUploadedAt: new Date().toISOString(),
    });
  };

  const handleTaxMapFile = (file: File | null) => {
    if (!file) {
      setAppraisalBundleReport(bundleId, { taxMapFileName: null, taxMapFileUrl: null, taxMapUploadedAt: null });
      return;
    }
    setAppraisalBundleReport(bundleId, {
      taxMapFileName: file.name,
      taxMapFileUrl: URL.createObjectURL(file),
      taxMapUploadedAt: new Date().toISOString(),
    });
  };

  const submitInhouseReport = () => {
    if (!report.appraisedValue.trim()) return;
    setAppraisalBundleReport(bundleId, { uploadedAt: new Date().toISOString() });
  };

  const externalFile = report.fileName
    ? new File([], report.fileName)
    : null;
  const subdivisionPlanFile = report.subdivisionPlanFileUrl;
  const taxMapFile = report.taxMapFileUrl;

  return (
    <Box sx={adminCardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        Appraisal Report
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2 }}>
        Covers {tctNumbers.join(', ')}.
      </Typography>

      {appraiserType === 'inhouse' && (
        <Stack spacing={2.5}>
          <Stack spacing={1.5}>
            <SectionLabel>Report details</SectionLabel>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Date Report"
                value={report.dateReport}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { dateReport: event.target.value })}
                InputLabelProps={{ shrink: true }}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Date Inspected"
                value={report.dateInspected}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { dateInspected: event.target.value })}
                InputLabelProps={{ shrink: true }}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Requesting Officer"
                value={report.requestingOfficer}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { requestingOfficer: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Branch"
                value={report.branch}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { branch: event.target.value })}
                sx={fieldSx}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                label="Account Name"
                value={report.accountName}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { accountName: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Address"
                value={report.accountAddress}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { accountAddress: event.target.value })}
                sx={fieldSx}
              />
            </Stack>
          </Stack>

          <Divider sx={{ borderColor: '#EEF0F5' }} />

          <Stack spacing={1.5}>
            <SectionLabel>Land</SectionLabel>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                label="Registered Owner"
                value={report.registeredOwner}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { registeredOwner: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Location of Property"
                value={report.locationOfProperty}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { locationOfProperty: event.target.value })}
                sx={fieldSx}
              />
            </Stack>

            {titleGroups.map((group) => {
              const title = report.landTitles.find((entry) => entry.tctGroupId === group.id);
              if (!title) return null;
              return (
                <LandTitleFields
                  key={group.id}
                  title={title}
                  tctNumber={group.tctNumber}
                  editable={editable}
                  onChange={(data) => setAppraisalBundleLandTitle(bundleId, group.id, data)}
                  showToggle={titleGroups.length > 1}
                  expanded={!collapsedTitleIds.has(group.id)}
                  onToggle={() => toggleTitle(group.id)}
                />
              );
            })}

            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Encumbrances / Remarks"
              value={report.encumbrancesRemarks}
              disabled={!editable}
              onChange={(event) => setAppraisalBundleReport(bundleId, { encumbrancesRemarks: event.target.value })}
              sx={fieldSx}
            />
          </Stack>

          <Divider sx={{ borderColor: '#EEF0F5' }} />

          <Stack spacing={1.5}>
            <SectionLabel>Technical specification</SectionLabel>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                label="Street Frontage (metres)"
                value={report.streetFrontage}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { streetFrontage: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Street Width (metres)"
                value={report.streetWidth}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { streetWidth: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Surfacing (Concrete/Asphalt)"
                value={report.surfacing}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { surfacing: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Average Depth"
                value={report.averageDepth}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { averageDepth: event.target.value })}
                sx={fieldSx}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                label="Approx. Shape"
                value={report.approxShape}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { approxShape: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Topography"
                value={report.topography}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { topography: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Neighborhood (Res'l/Comm'l/Ind'l.)"
                value={report.neighborhood}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { neighborhood: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Present Use"
                value={report.presentUse}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { presentUse: event.target.value })}
                sx={fieldSx}
              />
            </Stack>
            <TextField
              fullWidth
              size="small"
              label="Highest and Best Use"
              value={report.highestAndBestUse}
              disabled={!editable}
              onChange={(event) => setAppraisalBundleReport(bundleId, { highestAndBestUse: event.target.value })}
              sx={fieldSx}
            />
          </Stack>

          <Divider sx={{ borderColor: '#EEF0F5' }} />

          <Stack spacing={1.5}>
            <SectionLabel>Source or kind of utilities</SectionLabel>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                label="Public Conveyance Line"
                value={report.utilityPublicConveyance}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { utilityPublicConveyance: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Electricity"
                value={report.utilityElectricity}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { utilityElectricity: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Water"
                value={report.utilityWater}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { utilityWater: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Telephone"
                value={report.utilityTelephone}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { utilityTelephone: event.target.value })}
                sx={fieldSx}
              />
            </Stack>
          </Stack>

          <Divider sx={{ borderColor: '#EEF0F5' }} />

          <Stack spacing={1.5}>
            <SectionLabel>Improvement — general construction features</SectionLabel>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                label="Year Constructed"
                value={report.buildingYearConstructed}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { buildingYearConstructed: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Condition (good/fair/poor)"
                value={report.buildingCondition}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { buildingCondition: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Construction (exp/s-exp/med/cheap)"
                value={report.buildingConstruction}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { buildingConstruction: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Est. Floor Area (sq.m.)"
                value={report.buildingEstFloorArea}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { buildingEstFloorArea: event.target.value })}
                sx={fieldSx}
              />
            </Stack>
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="General Construction Features"
              value={report.generalConstructionFeatures}
              disabled={!editable}
              onChange={(event) => setAppraisalBundleReport(bundleId, { generalConstructionFeatures: event.target.value })}
              sx={fieldSx}
            />
            <SectionLabel>Particular description</SectionLabel>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                label="Floor Level"
                value={report.floorLevel}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { floorLevel: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="External Walls"
                value={report.externalWalls}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { externalWalls: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Interior Walls & Partitions"
                value={report.interiorWallsPartitions}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { interiorWallsPartitions: event.target.value })}
                sx={fieldSx}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                label="Flooring"
                value={report.flooring}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { flooring: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Doors & Windows"
                value={report.doorsWindows}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { doorsWindows: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Ceiling & Roofing"
                value={report.ceilingRoofing}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { ceilingRoofing: event.target.value })}
                sx={fieldSx}
              />
            </Stack>
          </Stack>

          <Divider sx={{ borderColor: '#EEF0F5' }} />

          <Stack spacing={1.5}>
            <SectionLabel>Basis of valuation (land)</SectionLabel>
            <Stack spacing={1.25}>
              {report.basisOfValuationComparables.map((comparable) => (
                <Box key={comparable.id} sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #EBEDF3' }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'flex-start' }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Source"
                      value={comparable.source}
                      disabled={!editable}
                      onChange={(event) =>
                        updateAppraisalBundleComparable(bundleId, comparable.id, { source: event.target.value })
                      }
                      sx={fieldSx}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      label="Location"
                      value={comparable.location}
                      disabled={!editable}
                      onChange={(event) =>
                        updateAppraisalBundleComparable(bundleId, comparable.id, { location: event.target.value })
                      }
                      sx={fieldSx}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      label="Area Size"
                      value={comparable.areaSize}
                      disabled={!editable}
                      onChange={(event) =>
                        updateAppraisalBundleComparable(bundleId, comparable.id, { areaSize: event.target.value })
                      }
                      sx={fieldSx}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      label="Price Type"
                      value={comparable.priceType}
                      disabled={!editable}
                      onChange={(event) =>
                        updateAppraisalBundleComparable(bundleId, comparable.id, { priceType: event.target.value })
                      }
                      sx={fieldSx}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      label="Value"
                      value={comparable.value}
                      disabled={!editable}
                      onChange={(event) =>
                        updateAppraisalBundleComparable(bundleId, comparable.id, { value: event.target.value })
                      }
                      sx={fieldSx}
                    />
                    {editable && (
                      <IconButton
                        size="small"
                        onClick={() => removeAppraisalBundleComparable(bundleId, comparable.id)}
                        sx={{ mt: { xs: 0, sm: 0.5 }, flexShrink: 0 }}
                      >
                        <Iconify icon="mingcute:close-line" width={16} />
                      </IconButton>
                    )}
                  </Stack>
                </Box>
              ))}
            </Stack>
            {editable && (
              <Button
                onClick={() => addAppraisalBundleComparable(bundleId)}
                variant="outlined"
                startIcon={<Iconify icon="solar:add-circle-bold" width={18} />}
                sx={{ ...outlinedNavyButtonSx, alignSelf: 'flex-start' }}
              >
                Add Comparable
              </Button>
            )}
            <TextField
              fullWidth
              size="small"
              label="Fair Market Value as per square meter"
              placeholder="Php 1,000 per square meter"
              value={report.fairMarketValuePerSqm}
              disabled={!editable}
              onChange={(event) => setAppraisalBundleReport(bundleId, { fairMarketValuePerSqm: event.target.value })}
              sx={fieldSx}
            />
          </Stack>

          <Divider sx={{ borderColor: '#EEF0F5' }} />

          <Stack spacing={1.5}>
            <SectionLabel>Remarks / additional information</SectionLabel>
            <TextField
              fullWidth
              multiline
              minRows={2}
              value={report.remarksAdditionalInfo}
              disabled={!editable}
              onChange={(event) => setAppraisalBundleReport(bundleId, { remarksAdditionalInfo: event.target.value })}
              sx={fieldSx}
            />
          </Stack>

          <Divider sx={{ borderColor: '#EEF0F5' }} />

          <Stack spacing={1.5}>
            <SectionLabel>Valuation</SectionLabel>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                fullWidth
                required
                size="small"
                label="Appraised Value"
                placeholder="0.00"
                value={report.appraisedValue}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { appraisedValue: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Rounded Figures"
                value={report.roundedFigures}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { roundedFigures: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Loanable Amount"
                placeholder="70%"
                value={report.loanableAmount}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { loanableAmount: event.target.value })}
                sx={fieldSx}
              />
            </Stack>
            <TextField
              fullWidth
              size="small"
              label="Amount in Words"
              value={report.amountInWords}
              disabled={!editable}
              onChange={(event) => setAppraisalBundleReport(bundleId, { amountInWords: event.target.value })}
              sx={fieldSx}
            />
          </Stack>

          <Divider sx={{ borderColor: '#EEF0F5' }} />

          <Stack spacing={1.5}>
            <SectionLabel>Prepared / reviewed / endorsed / noted by</SectionLabel>
            <Typography sx={{ fontSize: 12, color: '#8891A6' }}>
              Each step unlocks once the one before it is stamped — Prepared, then Reviewed, then
              Endorsed, then Noted. Stamping simulates another person approving; it does not gate
              Submit Appraisal Report or Head Approval.
            </Typography>
            <SignatoryField
              label="Prepared by"
              name={report.preparedBy}
              stampedAt={report.preparedAt}
              editable={editable}
              gateMet
              fieldSx={fieldSx}
              onNameChange={(value) => setAppraisalBundleReport(bundleId, { preparedBy: value })}
              onStamp={() => stampAppraisalBundleSignatory(bundleId, 'prepared', report.preparedBy)}
            />
            <SignatoryField
              label="Reviewed by"
              name={report.reviewedBy}
              stampedAt={report.reviewedAt}
              editable={editable}
              gateMet={!!report.preparedAt}
              fieldSx={fieldSx}
              onNameChange={(value) => setAppraisalBundleReport(bundleId, { reviewedBy: value })}
              onStamp={() => stampAppraisalBundleSignatory(bundleId, 'reviewed', report.reviewedBy)}
            />
            <SignatoryField
              label="Endorsed by"
              name={report.endorsedBy}
              stampedAt={report.endorsedAt}
              editable={editable}
              gateMet={!!report.reviewedAt}
              fieldSx={fieldSx}
              onNameChange={(value) => setAppraisalBundleReport(bundleId, { endorsedBy: value })}
              onStamp={() => stampAppraisalBundleSignatory(bundleId, 'endorsed', report.endorsedBy)}
            />
            <SignatoryField
              label="Noted by"
              name={report.notedBy}
              stampedAt={report.notedAt}
              editable={editable}
              gateMet={!!report.endorsedAt}
              fieldSx={fieldSx}
              onNameChange={(value) => setAppraisalBundleReport(bundleId, { notedBy: value })}
              onStamp={() => stampAppraisalBundleSignatory(bundleId, 'noted', report.notedBy)}
            />
          </Stack>

          <Divider sx={{ borderColor: '#EEF0F5' }} />

          <Stack spacing={1.5}>
            <SectionLabel>Recommendation</SectionLabel>
            <TextField
              fullWidth
              multiline
              minRows={2}
              value={report.recommendation}
              disabled={!editable}
              onChange={(event) => setAppraisalBundleReport(bundleId, { recommendation: event.target.value })}
              sx={fieldSx}
            />
          </Stack>

          <Divider sx={{ borderColor: '#EEF0F5' }} />

          <Stack spacing={1.5}>
            <SectionLabel>File attachment</SectionLabel>
            <ReportFileDropzone
              value={subdivisionPlanFile}
              fileName={report.subdivisionPlanFileName}
              onChange={handleSubdivisionPlanFile}
              disabled={!editable}
              label="Choose a file — Subdivision Plan"
              accept={{ 'image/*': [] }}
              imageView
            />
            <ReportFileDropzone
              value={taxMapFile}
              fileName={report.taxMapFileName}
              onChange={handleTaxMapFile}
              disabled={!editable}
              label="Choose a file — Tax Map"
              accept={{ 'image/*': [] }}
              imageView
            />
          </Stack>

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
              market value)
            </Typography>
          </Box>

          <Divider sx={{ borderColor: '#EEF0F5' }} />
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            justifyContent="space-between"
            spacing={1.5}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Iconify icon="solar:document-text-bold-duotone" width={18} sx={{ color: '#5A6273' }} />
              <Typography sx={{ fontSize: 13, color: '#5A6273' }}>
                Preview the full formatted report generated from everything above.
              </Typography>
            </Stack>
            <Button
              onClick={() => setPreviewOpen(true)}
              variant="outlined"
              startIcon={<Iconify icon="solar:document-text-bold-duotone" width={18} />}
              sx={{ ...outlinedNavyButtonSx, px: 2, flexShrink: 0 }}
            >
              Preview Appraisal Report
            </Button>
          </Stack>
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

      {appraiserType === 'inhouse' && (
        <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} fullWidth maxWidth="md">
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', p: 3, pb: 2 }}>
            <Box>
              <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#14172A' }}>Appraisal Report</Typography>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" rowGap={0.75} sx={{ mt: 0.75 }}>
                {tctNumbers.map((tctNumber) => (
                  <Box
                    key={tctNumber}
                    sx={{
                      px: 1.25,
                      py: 0.4,
                      borderRadius: '999px',
                      border: '1px solid #E3E7F5',
                      bgcolor: '#F7F8FE',
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#1C2A6E',
                    }}
                  >
                    {tctNumber}
                  </Box>
                ))}
              </Stack>
            </Box>
            <IconButton
              onClick={() => setPreviewOpen(false)}
              aria-label="Close preview"
              sx={{ border: '1px solid #E1E4ED', borderRadius: '10px' }}
            >
              <Iconify icon="solar:close-circle-bold" width={18} sx={{ color: '#8891A6' }} />
            </IconButton>
          </Box>
          <DialogContent sx={{ px: 3, pb: 3 }}>
            <AppraisalReportPreview report={report} titleGroups={titleGroups} />
          </DialogContent>
        </Dialog>
      )}
    </Box>
  );
}

// ----------------------------------------------------------------------
// Separate card, rendered right after AppraiserAssignmentCard, holding
// only the in-house form's "submit" action — pulled out of the form
// itself so submitting reads as its own deliberate step, the same way
// Appraisal Fee's request/submit action lives in its own card rather than
// inline in Documents. ("Preview Appraisal Report" stays inside the form
// itself, AppraiserAssignmentCard, right below its dashed integration
// note — not here.)
// ----------------------------------------------------------------------

export function AppraisalReportSubmitCard({ bundleId }: { bundleId: string }) {
  const { review, setAppraisalBundleReport } = useAdmin();
  const { headApprovalStatus } = review.appraisal;
  const bundle = review.appraisal.reportBundles.find((entry) => entry.id === bundleId);
  if (!bundle || bundle.appraiserType !== 'inhouse') return null;
  const { report } = bundle;
  const editable = headApprovalStatus === 'pending' && !report.uploadedAt;

  const submitInhouseReport = () => {
    if (!report.appraisedValue.trim()) return;
    setAppraisalBundleReport(bundleId, { uploadedAt: new Date().toISOString() });
  };

  return (
    <Box sx={adminCardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        Submit Appraisal Report
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2 }}>
        {report.uploadedAt
          ? 'This report has been submitted and is now read-only.'
          : 'Submit the report once ready.'}
      </Typography>

      {editable && (
        <Button
          onClick={submitInhouseReport}
          variant="contained"
          disabled={!report.appraisedValue.trim()}
          sx={{ alignSelf: 'flex-start', bgcolor: '#1C2A6E', borderRadius: '10px', px: 2.5, boxShadow: 'none', '&:hover': { bgcolor: '#14205A', boxShadow: 'none' } }}
        >
          Submit Appraisal Report
        </Button>
      )}

      {report.uploadedAt && (
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#0C8A4F', mt: 1.5 }}>
          Report submitted {new Date(report.uploadedAt).toLocaleString()}
        </Typography>
      )}
    </Box>
  );
}
