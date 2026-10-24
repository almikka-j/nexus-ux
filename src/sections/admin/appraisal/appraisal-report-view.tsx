'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';

import { useAdmin, getBundleUploadedAt } from 'src/auth/admin-context';
import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { Field, FieldGrid, SectionLabel, StatusBadge, adminCardSx, TONE_COLORS, outlinedNavyButtonSx } from 'src/components/admin-ui';
import { CollapsibleSection } from 'src/components/collapsible-section';

import { computeTotalAppraisedValue } from './appraisal-machineries-report-fields';

import type {
  CollateralPhoto,
  AppraisalReportBundle,
  AppraisalReportLandTitle,
  AppraisalCollateralType,
} from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Read-only rendering of a submitted in-house Appraisal Report
// (AppraiserAssignmentCard's form) — rendered inline by the Appraisal
// Officer's `AssignedAppraiserCard` (a collapsible panel per reported
// bundle) and by the Head/Approver's "My Approvals" detail page
// (appraisal-approver-bundle-view.tsx), both of which need to see what the
// appraiser actually submitted, not just a "submitted" boolean.
//
// Restructured around an "At a Glance" summary instead of a scroll-through
// document. Earlier passes fixed the document's internal problems (dead
// space beside photos, broken-looking muted text, per-section collapse)
// but the information architecture itself was still "one long form read
// top to bottom, with pieces individually tucked away" — a reviewer still
// had to open several separate CollapsibleSections just to build a full
// picture, one field at a time. This version inverts that: everything a
// reviewer actually needs to decide (owner, location, appraised value,
// loanable amount, highest & best use, every property's own photo) sits
// in one always-visible summary at the top, and the ENTIRE itemized
// report — every section this file used to open individually — sits
// behind a single "View Full Report" toggle below it. No tabs or
// multi-column layout was introduced for this — this app has neither
// anywhere else, so a single expand/collapse toggle (the same
// chevron+Collapse shell `CollapsibleSection` already standardizes) was
// the restructure that stayed inside the existing pattern language
// instead of importing one.
// ----------------------------------------------------------------------

// The hero — the one number this whole document exists to produce, first
// thing in the At a Glance summary.
function AppraisedValueHero({ appraisedValue, amountInWords }: { appraisedValue: string; amountInWords: string }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      spacing={1.5}
      sx={{ p: 2.25, borderRadius: '12px', bgcolor: TONE_COLORS.info.bg }}
    >
      <Box sx={{ width: 48, height: 48, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '10px', bgcolor: '#1C2A6E' }}>
        <Iconify icon="solar:banknote-2-bold-duotone" width={26} sx={{ color: 'common.white' }} />
      </Box>
      <Box>
        <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', color: '#8891A6' }}>
          APPRAISED VALUE
        </Typography>
        <Typography sx={{ mt: 0.25, fontSize: 26, fontWeight: 800, color: '#1C2A6E', lineHeight: 1.1 }}>
          {fCurrency(appraisedValue)}
        </Typography>
        {amountInWords && (
          <Typography sx={{ fontSize: 12.5, color: '#5A6273', mt: 0.25 }}>{amountInWords}</Typography>
        )}
      </Box>
    </Stack>
  );
}

// A row of small photo chips, one per pledged property, in the At a
// Glance summary — the fastest way to see every property's own Lot
// Plot Image without opening the full report. Purely a preview:
// clicking opens the full photo. A title with multiple Lot Plot photos
// shows its first one here.
function PhotoChipRow({ titles }: { titles: { tctNumber: string; photoFileUrl: string | null }[] }) {
  const withPhotos = titles.filter((title) => title.photoFileUrl);
  if (withPhotos.length === 0) return null;
  return (
    <Stack direction="row" spacing={1.25} flexWrap="wrap" rowGap={1.25}>
      {withPhotos.map((title) => (
        <Box
          key={title.tctNumber}
          component="a"
          href={title.photoFileUrl!}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            display: 'block',
            width: 72,
            flexShrink: 0,
            position: 'relative',
            '&:hover .chip-zoom': { opacity: 1 },
          }}
        >
          <Box
            sx={{
              width: 72,
              height: 54,
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid #EBEDF3',
              position: 'relative',
            }}
          >
            <Box
              component="img"
              src={title.photoFileUrl!}
              alt={`Lot plot image — TCT No. ${title.tctNumber}`}
              sx={{ width: 1, height: 1, objectFit: 'cover', display: 'block' }}
            />
            <Box
              className="chip-zoom"
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'rgba(20,23,42,0.35)',
                opacity: 0,
                transition: 'opacity 0.15s ease',
              }}
            >
              <Iconify icon="solar:magnifer-bold" width={14} sx={{ color: 'common.white' }} />
            </Box>
          </Box>
          <Typography sx={{ fontSize: 10.5, color: '#8891A6', mt: 0.4, textAlign: 'center' }} noWrap>
            {title.tctNumber}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}

// Inside the full report, a bundle covering several pledged properties
// still collapses each title to a compact row by default (photo
// thumbnail + TCT No. + Zonal Value), expandable to the full detail —
// same fix appraisal-appraiser-bundle-view.tsx applies to its own per-TCT
// document lists. A bundle covering only one title skips the toggle
// entirely and renders the full detail directly.
function LandTitleSummary({
  title,
  tctNumber,
  expanded,
  onToggle,
  showToggle,
}: {
  title: AppraisalReportLandTitle;
  tctNumber: string;
  expanded: boolean;
  onToggle: () => void;
  showToggle: boolean;
}) {
  const detail = (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: showToggle ? 2 : 0 }}>
      <Stack spacing={1.75} sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', columnGap: 2.5, rowGap: 1.75 }}>
          <Field label="File Type" value={title.fileType} />
          <Field label="Title No." value={title.titleNo} />
          <Field label="Area Size (sq.m.)" value={title.areaSize} />
          <Field label="Zonal Value" value={title.zonalValue} />
          <Field label="Lot No." value={title.lotNo} />
          <Field label="Survey No." value={title.surveyNo} />
          <Field label="Book No. / Page No." value={title.bookPageNo} />
          <Field label="Title Registration Date" value={title.titleRegistrationDate} />
          <Field label="Title Registration Place" value={title.titleRegistrationPlace} span={2} />
        </Box>

        {(title.boundaries || title.technicalSpecification) && (
          <Stack spacing={1.25}>
            {title.boundaries && (
              <Box>
                <Typography sx={{ fontSize: 11.5, color: '#8891A6' }}>Boundaries</Typography>
                <Typography sx={{ fontSize: 13, color: '#3B4256', whiteSpace: 'pre-wrap', mt: 0.25 }}>
                  {title.boundaries}
                </Typography>
              </Box>
            )}
            {title.technicalSpecification && (
              <Box>
                <Typography sx={{ fontSize: 11.5, color: '#8891A6' }}>Technical Specification</Typography>
                <Typography sx={{ fontSize: 13, color: '#3B4256', whiteSpace: 'pre-wrap', mt: 0.25 }}>
                  {title.technicalSpecification}
                </Typography>
              </Box>
            )}
          </Stack>
        )}

        {title.lotPlotPhotos.length > 0 && (
          <Box sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #E3E7F5', bgcolor: '#F7F8FE' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
              <Iconify icon="solar:map-point-bold-duotone" width={16} sx={{ color: '#1C2A6E' }} />
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#1C2A6E' }}>
                Lot Plot Image
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={1.5}>
              {title.lotPlotPhotos.map((photo, index) => (
                <Box key={`${photo.fileUrl}-${index}`} sx={{ width: { xs: '100%', sm: 200 }, flexShrink: 0 }}>
                  <Box
                    component="img"
                    src={photo.fileUrl}
                    alt={`Lot plot image ${index + 1} — TCT No. ${tctNumber}`}
                    sx={{ width: '100%', aspectRatio: '3 / 2', objectFit: 'contain', bgcolor: '#EEF1FE', borderRadius: '10px', border: '1px solid #DDE3F5', display: 'block' }}
                  />
                </Box>
              ))}
            </Stack>
          </Box>
        )}
      </Stack>
    </Stack>
  );

  if (!showToggle) {
    return (
      <Box sx={{ p: 2, borderRadius: '10px', border: '1px solid #EBEDF3', bgcolor: '#FAFBFD' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 1.5 }}>
          TCT No. {tctNumber}
        </Typography>
        {detail}
      </Box>
    );
  }

  return (
    <Box sx={{ borderRadius: '10px', border: '1px solid #EBEDF3', bgcolor: '#FAFBFD', overflow: 'hidden' }}>
      <Stack
        component={ButtonBase}
        onClick={onToggle}
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ width: 1, p: 1.5, justifyContent: 'flex-start', textAlign: 'left' }}
      >
        <Iconify
          icon="eva:chevron-down-fill"
          width={18}
          sx={{ color: '#8891A6', flexShrink: 0, transition: 'transform 0.15s ease', transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A' }} noWrap>
            TCT No. {tctNumber}
          </Typography>
        </Box>
        {title.zonalValue && (
          <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
            <Typography sx={{ fontSize: 10.5, color: '#8891A6' }}>Zonal Value</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A' }}>{title.zonalValue}</Typography>
          </Box>
        )}
      </Stack>
      <Collapse in={expanded}>
        <Box sx={{ px: 2, pb: 2 }}>
          {detail}
        </Box>
      </Collapse>
    </Box>
  );
}

// ----------------------------------------------------------------------
// Chattel (vehicle/equipment) read-only summary — same At a
// Glance/Full-Report shell as the Real Estate view above, but reading
// bundle.chattelReport and following ChattelReportFields' own section
// groupings (Task 4) for the full report: header fields, Description of
// Equipment, the 4 checklists as read-only label/value rows, Market
// Survey as a read-only table, Encumbrances/Remarks, file attachments.
// ----------------------------------------------------------------------
function ChattelReportSummary({ bundle, tctNumbers }: { bundle: AppraisalReportBundle; tctNumbers: string[] }) {
  const [fullReportOpen, setFullReportOpen] = useState(false);
  const { appraiserName } = bundle;
  const report = bundle.chattelReport;
  const uploadedAt = report.uploadedAt;
  const badRatedCount = report.generalCondition.filter((item) => item.rating === 'bad').length;

  return (
    <Box sx={adminCardSx}>
      <Stack alignItems="center" spacing={0.5} sx={{ textAlign: 'center', mb: 3 }}>
        <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#14172A' }}>Appraisal Report</Typography>
        <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>Covers {tctNumbers.join(', ')}</Typography>
        {uploadedAt && (
          <Typography sx={{ fontSize: 12, color: '#8891A6' }}>
            Submitted by {appraiserName ?? 'the assigned appraiser'} on {new Date(uploadedAt).toLocaleString()}
          </Typography>
        )}
      </Stack>
      <Divider sx={{ borderColor: '#EEF0F5', mb: 3 }} />

      {/* At a Glance */}
      <Stack spacing={2.5}>
        <AppraisedValueHero appraisedValue={report.appraisedValue} amountInWords="" />

        <FieldGrid>
          <Field label="Registered Owner" value={report.registeredOwner} span={2} />
          <Field label="Make" value={report.make} />
          <Field label="Plate No." value={report.plateNo} />
        </FieldGrid>

        {badRatedCount > 0 && (
          <Box>
            <StatusBadge tone="error" label={`${badRatedCount} bad-rated item${badRatedCount === 1 ? '' : 's'}`} />
          </Box>
        )}
      </Stack>

      <Divider sx={{ borderColor: '#EEF0F5', my: 2.5 }} />

      <Button
        onClick={() => setFullReportOpen((prev) => !prev)}
        fullWidth
        variant="outlined"
        endIcon={
          <Iconify
            icon="eva:chevron-down-fill"
            width={18}
            sx={{ transition: 'transform 0.15s ease', transform: fullReportOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        }
        sx={{ ...outlinedNavyButtonSx, borderRadius: '10px', py: 1.1 }}
      >
        {fullReportOpen ? 'Hide Full Report' : 'View Full Report'}
      </Button>

      <Collapse in={fullReportOpen}>
        <Stack spacing={3} sx={{ mt: 3 }}>
          <FieldGrid>
            <Field label="Account Name" value={report.accountName} span={2} />
            <Field label="Requested By" value={report.requestedBy} span={2} />
            <Field label="Purpose of Report" value={report.purposeOfReport} span={2} />
            <Field label="Report Date" value={report.reportDate} />
            <Field label="Eqpt. Under App." value={report.eqptUnderApp} />
            <Field label="Date Inspected" value={report.dateInspected} />
            <Field label="Registered Owner" value={report.registeredOwner} span={2} />
            <Field label="Address" value={report.address} span={2} />
          </FieldGrid>

          <Stack spacing={1.5}>
            <SectionLabel>Description of Equipment</SectionLabel>
            <FieldGrid>
              <Field label="Make" value={report.make} />
              <Field label="MVF No." value={report.mvfNo} />
              <Field label="Series" value={report.series} />
              <Field label="C.R No." value={report.crNo} />
              <Field label="Type of Body / Denomination" value={report.typeOfBodyDenomination} />
              <Field label="Registration Date" value={report.registrationDate} />
              <Field label="Year Model" value={report.yearModel} />
              <Field label="Place Registered" value={report.placeRegistered} />
              <Field label="Color" value={report.color} />
              <Field label="Chassis Number" value={report.chassisNumber} />
              <Field label="Odometer Reading" value={report.odometerReading} />
              <Field label="Engine No." value={report.engineNo} />
              <Field label="Plate No." value={report.plateNo} />
              <Field label="Fuel" value={report.fuel} />
            </FieldGrid>
          </Stack>

          <Stack spacing={1.5}>
            <SectionLabel>Accessories</SectionLabel>
            <Stack spacing={1}>
              {report.accessories.map((item) => (
                <Stack
                  key={item.id}
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  sx={{ p: 1, borderRadius: '8px', border: '1px solid #EBEDF3' }}
                >
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#14172A', width: 220, flexShrink: 0 }}>
                    {item.label}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: item.checked ? '#14172A' : '#8891A6' }}>
                    {item.checked ? 'Yes' : 'No'}
                    {item.checked && item.comments ? ` — ${item.comments}` : ''}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Stack>

          <Stack spacing={1.5}>
            <SectionLabel>Power Features</SectionLabel>
            <Stack spacing={1}>
              {report.powerFeatures.map((item) => (
                <Stack
                  key={item.id}
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  sx={{ p: 1, borderRadius: '8px', border: '1px solid #EBEDF3' }}
                >
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#14172A', width: 220, flexShrink: 0 }}>
                    {item.label}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: item.checked ? '#14172A' : '#8891A6' }}>
                    {item.checked ? 'Yes' : 'No'}
                    {item.checked && item.comments ? ` — ${item.comments}` : ''}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Stack>

          <Stack spacing={1.5}>
            <SectionLabel>General Condition</SectionLabel>
            <Stack spacing={1}>
              {report.generalCondition.map((item) => (
                <Stack
                  key={item.id}
                  direction={{ xs: 'column', sm: 'row' }}
                  alignItems={{ sm: 'center' }}
                  spacing={1.5}
                  sx={{ p: 1, borderRadius: '8px', border: '1px solid #EBEDF3' }}
                >
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#14172A', width: 140, flexShrink: 0 }}>
                    {item.label}
                  </Typography>
                  {item.rating && (
                    <StatusBadge
                      tone={item.rating === 'bad' ? 'error' : 'success'}
                      label={item.rating === 'bad' ? 'Bad' : 'Good'}
                    />
                  )}
                  {item.comments && (
                    <Typography sx={{ fontSize: 13, color: '#3B4256' }}>{item.comments}</Typography>
                  )}
                </Stack>
              ))}
            </Stack>
          </Stack>

          <Stack spacing={1.5}>
            <SectionLabel>Instrument Panel &amp; Lighting</SectionLabel>
            <Stack spacing={1}>
              {report.instrumentPanelLighting.map((item) => (
                <Stack
                  key={item.id}
                  direction={{ xs: 'column', sm: 'row' }}
                  alignItems={{ sm: 'center' }}
                  spacing={1.5}
                  sx={{ p: 1, borderRadius: '8px', border: '1px solid #EBEDF3' }}
                >
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#14172A', width: 140, flexShrink: 0 }}>
                    {item.label}
                  </Typography>
                  {item.rating && (
                    <StatusBadge
                      tone={item.rating === 'functioning' ? 'success' : 'error'}
                      label={item.rating === 'functioning' ? 'Functioning Well' : 'Not Functioning Well'}
                    />
                  )}
                </Stack>
              ))}
            </Stack>
          </Stack>

          <Stack spacing={1.5}>
            <SectionLabel>Market Survey</SectionLabel>
            {report.marketSurvey.length === 0 ? (
              <Typography sx={{ fontSize: 12.5, color: '#8891A6', fontStyle: 'italic' }}>
                No market survey entries recorded.
              </Typography>
            ) : (
              <Stack spacing={1.25}>
                {report.marketSurvey.map((entry) => (
                  <Box key={entry.id} sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #EBEDF3', bgcolor: '#FAFBFD' }}>
                    <FieldGrid>
                      <Field label="Source" value={entry.source} />
                      <Field label="Date" value={entry.date} />
                      <Field label="Type" value={entry.type} />
                      <Field label="Gen. Condition" value={entry.generalCondition} />
                      <Field label="Selling Price" value={entry.sellingPrice} />
                    </FieldGrid>
                  </Box>
                ))}
              </Stack>
            )}
          </Stack>

          {report.encumbrancesRemarks && (
            <Stack spacing={1.5}>
              <SectionLabel>Encumbrances / Remarks</SectionLabel>
              {/* Stored as HTML from the editable form's RichTextField — rendered
                  as plain read-only HTML here, no editable control. */}
              <Box
                sx={{ fontSize: 13.5, color: '#3B4256', '& p': { m: 0, mb: 1 } }}
                dangerouslySetInnerHTML={{ __html: report.encumbrancesRemarks }}
              />
            </Stack>
          )}

          <FieldGrid>
            <Field label="Loanable Percent" value={report.loanablePercent} />
            <Field label="Appraised Value (Round Off)" value={report.appraisedValueRoundOff} />
            <Field label="Loanable Amount" value={report.loanableAmount} />
          </FieldGrid>

          {report.fileAttachments.length > 0 && (
            <Stack spacing={1.5}>
              <SectionLabel>File Attachment</SectionLabel>
              <Stack direction="row" flexWrap="wrap" gap={1.5}>
                {report.fileAttachments.map((photo, index) => (
                  <Box
                    key={`${photo.fileUrl}-${index}`}
                    component="img"
                    src={photo.fileUrl}
                    alt={photo.fileName}
                    sx={{ width: 88, height: 66, objectFit: 'cover', borderRadius: '8px', border: '1px solid #EEF0F5' }}
                  />
                ))}
              </Stack>
            </Stack>
          )}
        </Stack>
      </Collapse>
    </Box>
  );
}

// ----------------------------------------------------------------------
// Machineries read-only summary — same At a Glance/Full-Report shell,
// reading bundle.machineriesReport and following MachineriesReportFields'
// own section groupings (Task 5): memo header fields, Description of
// Equipments, the machineries list as read-only label/value rows (no
// pencil, no collapse — every entry's fields always shown), Qualification
// & Remarks, file attachments.
// ----------------------------------------------------------------------
function MachineriesReportSummary({ bundle, tctNumbers }: { bundle: AppraisalReportBundle; tctNumbers: string[] }) {
  const [fullReportOpen, setFullReportOpen] = useState(false);
  const { appraiserName } = bundle;
  const report = bundle.machineriesReport;
  const uploadedAt = report.uploadedAt;
  const totalAppraisedValue = computeTotalAppraisedValue(report.machineries);

  return (
    <Box sx={adminCardSx}>
      <Stack alignItems="center" spacing={0.5} sx={{ textAlign: 'center', mb: 3 }}>
        <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#14172A' }}>Appraisal Report</Typography>
        <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>Covers {tctNumbers.join(', ')}</Typography>
        {uploadedAt && (
          <Typography sx={{ fontSize: 12, color: '#8891A6' }}>
            Submitted by {appraiserName ?? 'the assigned appraiser'} on {new Date(uploadedAt).toLocaleString()}
          </Typography>
        )}
      </Stack>
      <Divider sx={{ borderColor: '#EEF0F5', mb: 3 }} />

      {/* At a Glance */}
      <Stack spacing={2.5}>
        <AppraisedValueHero appraisedValue={String(totalAppraisedValue)} amountInWords="" />

        <FieldGrid>
          <Field label="Machineries" value={`${report.machineries.length} machineries`} />
          <Field label="Subject" value={report.subject} span={3} />
        </FieldGrid>
      </Stack>

      <Divider sx={{ borderColor: '#EEF0F5', my: 2.5 }} />

      <Button
        onClick={() => setFullReportOpen((prev) => !prev)}
        fullWidth
        variant="outlined"
        endIcon={
          <Iconify
            icon="eva:chevron-down-fill"
            width={18}
            sx={{ transition: 'transform 0.15s ease', transform: fullReportOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        }
        sx={{ ...outlinedNavyButtonSx, borderRadius: '10px', py: 1.1 }}
      >
        {fullReportOpen ? 'Hide Full Report' : 'View Full Report'}
      </Button>

      <Collapse in={fullReportOpen}>
        <Stack spacing={3} sx={{ mt: 3 }}>
          <FieldGrid>
            <Field label="To" value={report.to} />
            <Field label="Thru" value={report.thru} />
            <Field label="From" value={report.from} />
            <Field label="Date Report" value={report.dateReport} />
            <Field label="Date Inspected" value={report.dateInspected} />
            <Field label="Subject" value={report.subject} />
          </FieldGrid>

          {report.descriptionOfEquipments && (
            <Stack spacing={1.5}>
              <SectionLabel>I. Description of Equipments</SectionLabel>
              <Typography sx={{ fontSize: 13.5, color: '#3B4256', whiteSpace: 'pre-wrap' }}>
                {report.descriptionOfEquipments}
              </Typography>
            </Stack>
          )}

          <Stack spacing={1.5}>
            <SectionLabel>Machineries</SectionLabel>
            {report.machineries.length === 0 ? (
              <Typography sx={{ fontSize: 12.5, color: '#8891A6', fontStyle: 'italic' }}>
                No machineries recorded.
              </Typography>
            ) : (
              <Stack spacing={1.25}>
                {report.machineries.map((entry) => (
                  <Box key={entry.id} sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #EBEDF3', bgcolor: '#FAFBFD' }}>
                    <FieldGrid>
                      <Field label="Unit(s)" value={entry.units} />
                      <Field label="Description" value={entry.description} />
                      <Field label="Serial No." value={entry.serialNo} />
                      <Field label="Acquisition Price(s) in PHP" value={entry.acquisitionPricePhp} />
                      <Field label="Date of Proforma Invoice" value={entry.dateOfProformaInvoice} />
                      <Field label="Appraised Value (Less Depreciation)" value={entry.appraisedValueLessDepreciation} />
                    </FieldGrid>
                  </Box>
                ))}
              </Stack>
            )}
          </Stack>

          <FieldGrid>
            <Field label="Total Appraised Value" value={fCurrency(totalAppraisedValue)} />
            <Field label="Total Appraised Value (Round Off)" value={report.totalAppraisedValueRoundOff} />
            <Field label="Loanable Percent" value={report.loanablePercent} />
            <Field label="Loanable Amount" value={report.loanableAmount} />
          </FieldGrid>

          {report.qualificationRemarks && (
            <Stack spacing={1.5}>
              <SectionLabel>II. Qualification &amp; Remarks</SectionLabel>
              {/* Stored as HTML from the editable form's RichTextField — rendered
                  as plain read-only HTML here, no editable control. */}
              <Box
                sx={{ fontSize: 13.5, color: '#3B4256', '& p': { m: 0, mb: 1 } }}
                dangerouslySetInnerHTML={{ __html: report.qualificationRemarks }}
              />
            </Stack>
          )}

          {report.fileAttachments.length > 0 && (
            <Stack spacing={1.5}>
              <SectionLabel>File Attachment</SectionLabel>
              <Stack direction="row" flexWrap="wrap" gap={1.5}>
                {report.fileAttachments.map((photo, index) => (
                  <Box
                    key={`${photo.fileUrl}-${index}`}
                    component="img"
                    src={photo.fileUrl}
                    alt={photo.fileName}
                    sx={{ width: 88, height: 66, objectFit: 'cover', borderRadius: '8px', border: '1px solid #EEF0F5' }}
                  />
                ))}
              </Stack>
            </Stack>
          )}
        </Stack>
      </Collapse>
    </Box>
  );
}

export function AppraisalReportView({ bundleId, tctNumbers }: { bundleId: string; tctNumbers: string[] }) {
  const { review } = useAdmin();
  const bundle = review.appraisal.reportBundles.find((entry) => entry.id === bundleId);

  // The entire itemized report sits behind this one toggle, collapsed by
  // default — the At a Glance summary above it is meant to answer most
  // reviews on its own.
  const [fullReportOpen, setFullReportOpen] = useState(false);

  // Every section inside the full report still collapses independently
  // once it's open — one shared expand state per section, keyed by name.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  // Per-title expand state for a multi-property bundle's collapsed rows
  // inside the full report — same "present in the set means expanded"
  // convention appraisal-appraiser-bundle-view.tsx uses for its own
  // per-TCT document lists.
  const [expandedTitleIds, setExpandedTitleIds] = useState<Set<string>>(new Set());
  const toggleTitle = (groupId: string) =>
    setExpandedTitleIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });

  const uploadedAt = bundle ? getBundleUploadedAt(bundle) : null;
  if (!bundle || !uploadedAt) return null;
  const { appraiserType, appraiserName } = bundle;

  const titleGroups = review.requirementChecklist.appraisalGroups.filter((group) =>
    bundle.tctGroupIds.includes(group.id)
  );

  // The bundle's real, assigned collateral kind — drives which report
  // field (realEstateReport/chattelReport/machineriesReport) and which
  // summary component below actually renders. Falls back to 'real-estate'
  // only if the title groups somehow can't be resolved (shouldn't happen
  // for a submitted bundle).
  const realCollateralType: AppraisalCollateralType =
    titleGroups[0]?.collateralType ?? 'real-estate';

  if (appraiserType === 'external') {
    // External appraisers always upload a single finished file regardless
    // of collateral kind — that upload is only ever stored on
    // realEstateReport (the only one of the three report types with
    // fileName/fileUrl fields; see getBundleUploadedAt/clearAllAppraisalBundleReports).
    const externalReport = bundle.realEstateReport;
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
            {externalReport.fileName}
          </Typography>
          {externalReport.fileUrl && (
            <Box
              component="a"
              href={externalReport.fileUrl}
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

  if (realCollateralType === 'chattel') {
    return <ChattelReportSummary bundle={bundle} tctNumbers={tctNumbers} />;
  }
  if (realCollateralType === 'machineries') {
    return <MachineriesReportSummary bundle={bundle} tctNumbers={tctNumbers} />;
  }

  const report = bundle.realEstateReport;
  const propertyCount = titleGroups.length;

  return (
    <Box sx={adminCardSx}>
      <Stack alignItems="center" spacing={0.5} sx={{ textAlign: 'center', mb: 3 }}>
        <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#14172A' }}>Appraisal Report</Typography>
        <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>Covers {tctNumbers.join(', ')}</Typography>
        <Typography sx={{ fontSize: 12, color: '#8891A6' }}>
          Submitted by {appraiserName ?? 'the assigned appraiser'} on {new Date(uploadedAt).toLocaleString()}
        </Typography>
      </Stack>
      <Divider sx={{ borderColor: '#EEF0F5', mb: 3 }} />

      {/* At a Glance — everything a reviewer needs, with nothing to expand */}
      <Stack spacing={2.5}>
        <AppraisedValueHero appraisedValue={report.appraisedValue} amountInWords={report.amountInWords} />

        <FieldGrid>
          <Field label="Registered Owner" value={report.registeredOwner} span={2} />
          <Field label="Location of Property" value={report.locationOfProperty} span={2} />
          <Field label="Properties Covered" value={String(propertyCount)} />
        </FieldGrid>

        <PhotoChipRow
          titles={titleGroups.map((group) => ({
            tctNumber: group.tctNumber,
            photoFileUrl: report.landTitles.find((entry) => entry.tctGroupId === group.id)?.lotPlotPhotos[0]?.fileUrl ?? null,
          }))}
        />
      </Stack>

      <Divider sx={{ borderColor: '#EEF0F5', my: 2.5 }} />

      <Button
        onClick={() => setFullReportOpen((prev) => !prev)}
        fullWidth
        variant="outlined"
        endIcon={
          <Iconify
            icon="eva:chevron-down-fill"
            width={18}
            sx={{ transition: 'transform 0.15s ease', transform: fullReportOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        }
        sx={{ ...outlinedNavyButtonSx, borderRadius: '10px', py: 1.1 }}
      >
        {fullReportOpen ? 'Hide Full Report' : 'View Full Report'}
      </Button>

      <Collapse in={fullReportOpen}>
        <Stack spacing={3} sx={{ mt: 3 }}>
          <FieldGrid>
            <Field label="Date Report" value={report.dateReport} />
            <Field label="Date Inspected" value={report.dateInspected} />
            <Field label="Requesting Officer" value={report.requestingOfficer} />
            <Field label="Branch" value={report.branch} />
            <Field label="Account Name" value={report.accountName} span={2} />
            <Field label="Address" value={report.accountAddress} span={2} />
          </FieldGrid>

          <Stack spacing={1.5}>
            <SectionLabel>Land</SectionLabel>
            <Stack spacing={1.5}>
              {titleGroups.map((group) => {
                const title = report.landTitles.find((entry) => entry.tctGroupId === group.id);
                if (!title) return null;
                return (
                  <LandTitleSummary
                    key={group.id}
                    title={title}
                    tctNumber={group.tctNumber}
                    showToggle={titleGroups.length > 1}
                    expanded={expandedTitleIds.has(group.id)}
                    onToggle={() => toggleTitle(group.id)}
                  />
                );
              })}
            </Stack>
            <Field label="Encumbrances / Remarks" value={report.encumbrancesRemarks} span={4} />
          </Stack>

          <Box sx={{ p: 2, borderRadius: '10px', border: '1px solid #EBEDF3' }}>
            <CollapsibleSection
              title="Technical Specification"
              expanded={!!expanded.technical}
              onToggle={() => toggle('technical')}
            >
              <FieldGrid>
                <Field label="Present Use" value={report.presentUse} span={2} />
                <Field label="Street Frontage (metres)" value={report.streetFrontage} />
                <Field label="Street Width (metres)" value={report.streetWidth} />
                <Field label="Surfacing (Concrete/Asphalt)" value={report.surfacing} />
                <Field label="Average Depth" value={report.averageDepth} />
                <Field label="Approx. Shape" value={report.approxShape} />
                <Field label="Topography" value={report.topography} />
                <Field label="Neighborhood (Res'l/Comm'l/Ind'l.)" value={report.neighborhood} />
              </FieldGrid>
            </CollapsibleSection>
          </Box>

          <Box sx={{ p: 2, borderRadius: '10px', border: '1px solid #EBEDF3' }}>
            <CollapsibleSection
              title="Source or Kind of Utilities"
              expanded={!!expanded.utilities}
              onToggle={() => toggle('utilities')}
            >
              <FieldGrid>
                <Field label="Public Conveyance Line" value={report.utilityPublicConveyance} />
                <Field label="Electricity" value={report.utilityElectricity} />
                <Field label="Water" value={report.utilityWater} />
                <Field label="Gas / Others" value={report.utilityGasOthers} />
              </FieldGrid>
            </CollapsibleSection>
          </Box>

          <Box sx={{ p: 2, borderRadius: '10px', border: '1px solid #EBEDF3' }}>
            <CollapsibleSection
              title="Improvement"
              expanded={!!expanded.construction}
              onToggle={() => toggle('construction')}
            >
              <Stack spacing={1.5}>
                {report.improvements.map((improvement) => (
                  <Box key={improvement.id} sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #EBEDF3', bgcolor: '#FAFBFD' }}>
                    <FieldGrid>
                      <Field label="Year Constructed" value={improvement.yearConstructed} />
                      <Field label="Construction" value={improvement.construction} />
                      <Field label="Condition" value={improvement.condition} />
                      <Field label="Est. Floor Area (sq.m.)" value={improvement.estFloorArea} />
                    </FieldGrid>
                  </Box>
                ))}
              </Stack>
            </CollapsibleSection>
          </Box>

          <Box sx={{ p: 2, borderRadius: '10px', border: '1px solid #EBEDF3' }}>
            <CollapsibleSection
              title="General Construction Features"
              expanded={!!expanded.construction}
              onToggle={() => toggle('construction')}
            >
              <Field label="General Construction Features" value={report.generalConstructionFeatures} span={4} />
            </CollapsibleSection>
          </Box>

          <Box sx={{ p: 2, borderRadius: '10px', border: '1px solid #EBEDF3' }}>
            <CollapsibleSection
              title="Particular Description"
              expanded={!!expanded.construction}
              onToggle={() => toggle('construction')}
            >
              <Stack spacing={1.5}>
                {report.particularDescriptions.map((particular) => (
                  <Box key={particular.id} sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #EBEDF3', bgcolor: '#FAFBFD' }}>
                    <FieldGrid>
                      <Field label="Floor Level" value={particular.floorLevel} />
                      <Field label="Interior Walls & Partitions" value={particular.interiorWallsPartitions} />
                      <Field label="Flooring" value={particular.flooring} />
                      <Field label="Doors & Windows" value={particular.doorsWindows} />
                      <Field label="Ceiling & Roofing" value={particular.ceilingRoofing} />
                    </FieldGrid>
                  </Box>
                ))}
              </Stack>
            </CollapsibleSection>
          </Box>

          <Box sx={{ p: 2, borderRadius: '10px', border: '1px solid #EBEDF3' }}>
            <CollapsibleSection
              title="Basis of Valuation (Land)"
              expanded={!!expanded.basis}
              onToggle={() => toggle('basis')}
            >
              <Stack spacing={1.5}>
                {report.basisOfValuationComparables.map((comparable) => (
                  <Box key={comparable.id} sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #EBEDF3', bgcolor: '#FAFBFD' }}>
                    <FieldGrid>
                      <Field label="Source" value={comparable.source} />
                      <Field label="Location" value={comparable.location} />
                      <Field label="Area Size" value={comparable.areaSize} />
                      <Field label="Price Type" value={comparable.priceType} />
                      <Field label="Zonal Value" value={comparable.zonalValue} />
                      <Field label="Value" value={comparable.value} />
                    </FieldGrid>
                  </Box>
                ))}
                <Field label="Fair Market Value Per Square Meter" value={report.fairMarketValuePerSqm} span={2} />
                <Field label="Fair Market Value Total (PHP)" value={report.fairMarketValueTotal} span={2} />
                {report.valuationRemarks && (
                  <Field label="Valuation Remarks" value={report.valuationRemarks} span={4} />
                )}
              </Stack>
            </CollapsibleSection>
          </Box>

          {report.remarksAdditionalInfo && (
            <Stack spacing={1.5}>
              <SectionLabel>Remarks / additional information</SectionLabel>
              <Typography sx={{ fontSize: 13.5, color: '#3B4256', whiteSpace: 'pre-wrap' }}>
                {report.remarksAdditionalInfo}
              </Typography>
            </Stack>
          )}

          {report.conditionsForAcceptance.length > 0 && (
            <Stack spacing={1.5}>
              <SectionLabel>Conditions for acceptance of collateral</SectionLabel>
              <Stack spacing={1.5}>
                {report.conditionsForAcceptance.map((condition) => (
                  <Box key={condition.id} sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #EBEDF3', bgcolor: '#FAFBFD' }}>
                    <FieldGrid>
                      <Field label="Item of Property" value={condition.itemOfProperty} />
                      <Field label="Ref" value={condition.ref} />
                      <Field label="Marketable" value={condition.marketable} />
                      <Field label="Construction (%)" value={condition.constructionStatusPercent} />
                      <Field label="Depreciated Value" value={condition.depreciatedValue} />
                      <Field label="Appraised Value" value={condition.appraisedValue} />
                    </FieldGrid>
                  </Box>
                ))}
              </Stack>
            </Stack>
          )}

          <Stack spacing={1.5}>
            <SectionLabel>Appraisal summary</SectionLabel>
            <FieldGrid>
              <Field label="Rounded Figures" value={report.roundedFigures} span={2} />
              <Field label="Leasable Percent (%)" value={report.leasablePercent} span={2} />
              <Field label="Leasable Amount (PHP)" value={report.leasableAmount} span={2} />
            </FieldGrid>
          </Stack>

          {report.feeAttachments.length > 0 && (
            <Stack spacing={1.5}>
              <SectionLabel>Fee attachment</SectionLabel>
              <Stack direction="row" flexWrap="wrap" gap={1.5}>
                {report.feeAttachments.map((photo, index) => (
                  <Box
                    key={`${photo.fileUrl}-${index}`}
                    component="img"
                    src={photo.fileUrl}
                    alt={photo.fileName}
                    sx={{ width: 88, height: 66, objectFit: 'cover', borderRadius: '8px', border: '1px solid #EEF0F5' }}
                  />
                ))}
              </Stack>
            </Stack>
          )}
        </Stack>
      </Collapse>
    </Box>
  );
}
