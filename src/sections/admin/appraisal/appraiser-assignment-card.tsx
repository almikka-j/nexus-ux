'use client';

import { useDropzone } from 'react-dropzone';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ButtonGroup from '@mui/material/ButtonGroup';

import { useAdmin } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';
import { FileThumbnail } from 'src/components/file-thumbnail';
import { adminCardSx, outlinedNavyButtonSx } from 'src/components/admin-ui';

import type { AppraiserType, AppraisalReportLandTitle } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// In-house vs external appraiser assignment. In-house fills out the full
// Appraisal Report (REM) form — Land/title details per pledged property,
// Boundaries, Technical Specification, Utilities, General Construction
// Features, Particular Description, Basis of Valuation, the FMV/RCN
// valuation table, and the Prepared/Reviewed/Endorsed/Noted by signature
// chain — matching the printed Appraisal Report (REM) PDF section by
// section. External just uploads the appraiser's finished report as a
// file. Switching type before Head Approval clears the other path's
// partial data — the two are mutually exclusive, same convention as CI
// Fee's amount reset on decline.
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

function LandTitleFields({
  title,
  tctNumber,
  editable,
  onChange,
}: {
  title: AppraisalReportLandTitle;
  tctNumber: string;
  editable: boolean;
  onChange: (data: Partial<AppraisalReportLandTitle>) => void;
}) {
  const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } };

  return (
    <Box sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #EBEDF3' }}>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 1.25 }}>
        TCT No. {tctNumber}
      </Typography>
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
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
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
      </Stack>
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
    setAppraisalBundleAppraiserType,
    setAppraisalBundleReport,
    setAppraisalBundleLandTitle,
  } = useAdmin();
  const { headApprovalStatus } = review.appraisal;
  const bundle = review.appraisal.reportBundles.find((entry) => entry.id === bundleId);
  if (!bundle) return null;
  const { appraiserType, report } = bundle;
  const locked = headApprovalStatus !== 'pending' || !!report.uploadedAt;
  const editable = !locked;
  const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } };

  const titleGroups = review.requirementChecklist.appraisalGroups.filter((group) =>
    bundle.tctGroupIds.includes(group.id)
  );

  const selectType = (type: AppraiserType) => {
    if (type === appraiserType) return;
    setAppraisalBundleAppraiserType(bundleId, type);
  };

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

  const submitInhouseReport = () => {
    if (!report.appraisedValue.trim()) return;
    setAppraisalBundleReport(bundleId, { uploadedAt: new Date().toISOString() });
  };

  const externalFile = report.fileName
    ? new File([], report.fileName)
    : null;

  return (
    <Box sx={adminCardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        Appraisal Report
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2 }}>
        Covers {tctNumbers.join(', ')}. Assign an in-house appraiser or upload an external
        appraiser&apos;s finished report.
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
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
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
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
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
              <TextField
                fullWidth
                size="small"
                label="Approx. Shape"
                value={report.approxShape}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { approxShape: event.target.value })}
                sx={fieldSx}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
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
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
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
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                label="Interior Walls & Partitions"
                value={report.interiorWallsPartitions}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { interiorWallsPartitions: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Flooring"
                value={report.flooring}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { flooring: event.target.value })}
                sx={fieldSx}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
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
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                label="Source"
                value={report.basisSource}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { basisSource: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Location"
                value={report.basisLocation}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { basisLocation: event.target.value })}
                sx={fieldSx}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                label="Area Size"
                value={report.basisAreaSize}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { basisAreaSize: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Price Type"
                value={report.basisPriceType}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { basisPriceType: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Selling Price"
                value={report.basisSellingPrice}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { basisSellingPrice: event.target.value })}
                sx={fieldSx}
              />
            </Stack>
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
                size="small"
                label="Item of Property"
                value={report.itemOfProperty}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { itemOfProperty: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="FMV / RCN (PHP)"
                value={report.fmvRcn}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { fmvRcn: event.target.value })}
                sx={fieldSx}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                label="Construction Status %"
                value={report.constructionStatusPercent}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { constructionStatusPercent: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Depreciated Value"
                value={report.depreciatedValue}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { depreciatedValue: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Appraised Value (P)"
                value={report.appraisedValueP}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { appraisedValueP: event.target.value })}
                sx={fieldSx}
              />
            </Stack>

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

          <Divider sx={{ borderColor: '#EEF0F5' }} />

          <Stack spacing={1.5}>
            <SectionLabel>Prepared / reviewed / endorsed / noted by</SectionLabel>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                label="Prepared by"
                value={report.preparedBy}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { preparedBy: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Reviewed by"
                value={report.reviewedBy}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { reviewedBy: event.target.value })}
                sx={fieldSx}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                label="Endorsed by"
                value={report.endorsedBy}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { endorsedBy: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Noted by"
                value={report.notedBy}
                disabled={!editable}
                onChange={(event) => setAppraisalBundleReport(bundleId, { notedBy: event.target.value })}
                sx={fieldSx}
              />
            </Stack>
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
              disabled={!report.appraisedValue.trim()}
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
