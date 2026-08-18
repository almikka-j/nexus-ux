'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, outlinedNavyButtonSx } from 'src/components/admin-ui';

import type { AppraisalReportLandTitle } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Read-only rendering of a submitted in-house Appraisal Report
// (AppraiserAssignmentCard's form) for the Appraisal Officer — the
// officer assigns the appraiser and requests the fee, the appraiser fills
// in the report on the Appraisal Appraiser page, and once submitted the
// officer needs to actually see what was filled in before Head Approval,
// not just a "submitted" boolean. Sectioned to match the printed
// Appraisal Report (REM) PDF (Land, Boundaries, Technical Specification,
// Utilities, Construction Features, Basis of Valuation, valuation table,
// signature chain) using this app's own card/table conventions rather
// than literally reproducing the PDF's dark-blue section bars.
// External appraiser bundles instead show the uploaded file for download.
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

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: 11.5, color: '#8891A6' }}>{label}</Typography>
      <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#14172A', wordBreak: 'break-word' }}>
        {value}
      </Typography>
    </Box>
  );
}

function LandTitleSummary({ title, tctNumber }: { title: AppraisalReportLandTitle; tctNumber: string }) {
  return (
    <Box sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #EBEDF3' }}>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 1.25 }}>
        TCT No. {tctNumber}
      </Typography>
      <Stack direction="row" flexWrap="wrap" sx={{ gap: 2, mb: title.boundaries || title.technicalSpecification ? 1.5 : 0 }}>
        <Field label="Survey No." value={title.surveyNo} />
        <Field label="Book No. / Page No." value={title.bookPageNo} />
        <Field label="Title Registration Date" value={title.titleRegistrationDate} />
        <Field label="Title Registration Place" value={title.titleRegistrationPlace} />
        <Field label="Area Size (sq.m.)" value={title.areaSize} />
        <Field label="Lot No." value={title.lotNo} />
        <Field label="Zonal Value" value={title.zonalValue} />
      </Stack>
      {title.boundaries && (
        <Box sx={{ mb: 1 }}>
          <Typography sx={{ fontSize: 11.5, color: '#8891A6' }}>Boundaries</Typography>
          <Typography sx={{ fontSize: 13, color: '#3B4256', whiteSpace: 'pre-wrap' }}>{title.boundaries}</Typography>
        </Box>
      )}
      {title.technicalSpecification && (
        <Box>
          <Typography sx={{ fontSize: 11.5, color: '#8891A6' }}>Technical Specification</Typography>
          <Typography sx={{ fontSize: 13, color: '#3B4256', whiteSpace: 'pre-wrap' }}>
            {title.technicalSpecification}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export function AppraisalReportView({ bundleId, tctNumbers }: { bundleId: string; tctNumbers: string[] }) {
  const { review } = useAdmin();
  const bundle = review.appraisal.reportBundles.find((entry) => entry.id === bundleId);
  if (!bundle || !bundle.report.uploadedAt) return null;
  const { appraiserType, appraiserName, report } = bundle;
  const uploadedAt = bundle.report.uploadedAt;

  const titleGroups = review.requirementChecklist.appraisalGroups.filter((group) =>
    bundle.tctGroupIds.includes(group.id)
  );

  if (appraiserType === 'external') {
    return (
      <Box sx={adminCardSx}>
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
          Appraisal Report
        </Typography>
        <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2 }}>
          Covers {tctNumbers.join(', ')}. Submitted by {appraiserName ?? 'the assigned appraiser'} on{' '}
          {new Date(uploadedAt).toLocaleString()}.
        </Typography>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.25}
          sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #EBEDF3' }}
        >
          <Iconify icon="solar:file-check-bold-duotone" width={22} sx={{ color: '#1C2A6E' }} />
          <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#344054', flex: 1, minWidth: 0 }} noWrap>
            {report.fileName}
          </Typography>
          {report.fileUrl && (
            <Box
              component="a"
              href={report.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                ...outlinedNavyButtonSx,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1.5,
                py: 0.75,
                borderRadius: '9px',
                border: '1px solid',
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'none',
                flexShrink: 0,
              }}
            >
              <Iconify icon="solar:eye-bold" width={16} />
              View
            </Box>
          )}
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={adminCardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        Appraisal Report
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2 }}>
        Covers {tctNumbers.join(', ')}. Submitted by {appraiserName ?? 'the assigned appraiser'} on{' '}
        {new Date(uploadedAt).toLocaleString()}.
      </Typography>

      <Stack spacing={2.5}>
        <Stack direction="row" flexWrap="wrap" sx={{ gap: 2 }}>
          <Field label="Date Report" value={report.dateReport} />
          <Field label="Date Inspected" value={report.dateInspected} />
          <Field label="Requesting Officer" value={report.requestingOfficer} />
          <Field label="Branch" value={report.branch} />
        </Stack>

        <Divider sx={{ borderColor: '#EEF0F5' }} />

        <Stack spacing={1.5}>
          <SectionLabel>Land</SectionLabel>
          <Stack direction="row" flexWrap="wrap" sx={{ gap: 2 }}>
            <Field label="Registered Owner" value={report.registeredOwner} />
            <Field label="Location of Property" value={report.locationOfProperty} />
          </Stack>
          {titleGroups.map((group) => {
            const title = report.landTitles.find((entry) => entry.tctGroupId === group.id);
            if (!title) return null;
            return <LandTitleSummary key={group.id} title={title} tctNumber={group.tctNumber} />;
          })}
          <Field label="Encumbrances / Remarks" value={report.encumbrancesRemarks} />
        </Stack>

        <Divider sx={{ borderColor: '#EEF0F5' }} />

        <Stack spacing={1.5}>
          <SectionLabel>Technical specification</SectionLabel>
          <Stack direction="row" flexWrap="wrap" sx={{ gap: 2 }}>
            <Field label="Street Frontage (metres)" value={report.streetFrontage} />
            <Field label="Street Width (metres)" value={report.streetWidth} />
            <Field label="Surfacing (Concrete/Asphalt)" value={report.surfacing} />
            <Field label="Average Depth" value={report.averageDepth} />
            <Field label="Approx. Shape" value={report.approxShape} />
            <Field label="Topography" value={report.topography} />
            <Field label="Neighborhood (Res'l/Comm'l/Ind'l.)" value={report.neighborhood} />
            <Field label="Present Use" value={report.presentUse} />
            <Field label="Highest and Best Use" value={report.highestAndBestUse} />
          </Stack>
        </Stack>

        <Divider sx={{ borderColor: '#EEF0F5' }} />

        <Stack spacing={1.5}>
          <SectionLabel>Source or kind of utilities</SectionLabel>
          <Stack direction="row" flexWrap="wrap" sx={{ gap: 2 }}>
            <Field label="Public Conveyance Line" value={report.utilityPublicConveyance} />
            <Field label="Electricity" value={report.utilityElectricity} />
            <Field label="Water" value={report.utilityWater} />
            <Field label="Telephone" value={report.utilityTelephone} />
          </Stack>
        </Stack>

        <Divider sx={{ borderColor: '#EEF0F5' }} />

        <Stack spacing={1.5}>
          <SectionLabel>Improvement — general construction features</SectionLabel>
          <Field label="General Construction Features" value={report.generalConstructionFeatures} />
          <Stack direction="row" flexWrap="wrap" sx={{ gap: 2 }}>
            <Field label="Floor Level" value={report.floorLevel} />
            <Field label="External Walls" value={report.externalWalls} />
            <Field label="Interior Walls & Partitions" value={report.interiorWallsPartitions} />
            <Field label="Flooring" value={report.flooring} />
            <Field label="Doors & Windows" value={report.doorsWindows} />
            <Field label="Ceiling & Roofing" value={report.ceilingRoofing} />
          </Stack>
        </Stack>

        <Divider sx={{ borderColor: '#EEF0F5' }} />

        <Stack spacing={1.5}>
          <SectionLabel>Basis of valuation (land)</SectionLabel>
          <Stack direction="row" flexWrap="wrap" sx={{ gap: 2 }}>
            <Field label="Source" value={report.basisSource} />
            <Field label="Location" value={report.basisLocation} />
            <Field label="Area Size" value={report.basisAreaSize} />
            <Field label="Price Type" value={report.basisPriceType} />
            <Field label="Selling Price" value={report.basisSellingPrice} />
            <Field label="Fair Market Value as per square meter" value={report.fairMarketValuePerSqm} />
          </Stack>
        </Stack>

        {report.remarksAdditionalInfo && (
          <>
            <Divider sx={{ borderColor: '#EEF0F5' }} />
            <Stack spacing={1.5}>
              <SectionLabel>Remarks / additional information</SectionLabel>
              <Typography sx={{ fontSize: 13.5, color: '#3B4256', whiteSpace: 'pre-wrap' }}>
                {report.remarksAdditionalInfo}
              </Typography>
            </Stack>
          </>
        )}

        <Divider sx={{ borderColor: '#EEF0F5' }} />

        <Stack spacing={1.5}>
          <SectionLabel>Valuation</SectionLabel>
          <Stack direction="row" flexWrap="wrap" sx={{ gap: 2 }}>
            <Field label="Item of Property" value={report.itemOfProperty} />
            <Field label="FMV / RCN (PHP)" value={report.fmvRcn} />
            <Field label="Construction Status %" value={report.constructionStatusPercent} />
            <Field label="Depreciated Value" value={report.depreciatedValue} />
            <Field label="Appraised Value (P)" value={report.appraisedValueP} />
          </Stack>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            spacing={1.5}
            sx={{ p: 2, borderRadius: '12px', bgcolor: '#EEF1FE' }}
          >
            <Box
              sx={{ width: 44, height: 44, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '10px', bgcolor: '#1C2A6E' }}
            >
              <Iconify icon="solar:banknote-2-bold-duotone" width={24} sx={{ color: 'common.white' }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#8891A6' }}>APPRAISED VALUE</Typography>
              <Typography sx={{ mt: 0.25, fontSize: 21, fontWeight: 800, color: '#1C2A6E' }}>
                {fCurrency(report.appraisedValue)}
              </Typography>
              {report.amountInWords && (
                <Typography sx={{ fontSize: 12, color: '#5A6273', mt: 0.25 }}>{report.amountInWords}</Typography>
              )}
            </Box>
          </Stack>

          <Stack direction="row" flexWrap="wrap" sx={{ gap: 2 }}>
            <Field label="Rounded Figures" value={report.roundedFigures} />
            <Field label="Loanable Amount" value={report.loanableAmount} />
          </Stack>
        </Stack>

        <Divider sx={{ borderColor: '#EEF0F5' }} />

        <Stack spacing={1.5}>
          <SectionLabel>Prepared / reviewed / endorsed / noted by</SectionLabel>
          <Stack direction="row" flexWrap="wrap" sx={{ gap: 2 }}>
            <Field label="Prepared by" value={report.preparedBy} />
            <Field label="Reviewed by" value={report.reviewedBy} />
            <Field label="Endorsed by" value={report.endorsedBy} />
            <Field label="Noted by" value={report.notedBy} />
          </Stack>
        </Stack>

        {report.recommendation && (
          <>
            <Divider sx={{ borderColor: '#EEF0F5' }} />
            <Stack spacing={1.5}>
              <SectionLabel>Recommendation</SectionLabel>
              <Typography sx={{ fontSize: 13.5, color: '#3B4256', whiteSpace: 'pre-wrap' }}>
                {report.recommendation}
              </Typography>
            </Stack>
          </>
        )}
      </Stack>
    </Box>
  );
}
