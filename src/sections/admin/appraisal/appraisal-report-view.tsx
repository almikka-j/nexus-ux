'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';

import { useAdmin, getBundleUploadedAt, getBundleCollateralType } from 'src/auth/admin-context';
import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import {
  FieldTable,
  StatusBadge,
  adminCardSx,
  TONE_COLORS,
  FieldTableRow,
  outlinedNavyButtonSx,
} from 'src/components/admin-ui';

import { computeTotalAppraisedValue } from './appraisal-machineries-report-fields';

import type {
  CollateralPhoto,
  AppraisalReportBundle,
  AppraisalReportLandTitle,
  AppraisalCollateralType,
} from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Report-result presentation primitives — the app's read-only
// report-result standard (credit-checking-result-modal.tsx /
// call-report-result-modal.tsx / ci-report-preview.tsx): a pill-shaped
// NumberedSectionHeader per section, label/value fields in the shared
// FieldTable/FieldTableRow, and non-field content (narratives, rich text,
// photo strips, status-badge checklists) kept in its own styling under the
// header.
// ----------------------------------------------------------------------

// Same pill header credit-checking-result-modal.tsx defines locally.
function NumberedSectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <Stack
      direction="row"
      spacing={1.25}
      alignItems="center"
      sx={{ px: 2, py: 1.25, borderRadius: '10px', bgcolor: '#EEF1FE' }}
    >
      <Typography
        sx={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#1C2A6E' }}
      >
        {children}
      </Typography>
    </Stack>
  );
}

// One report section: pill header, then its content stacked underneath.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Stack spacing={1.25}>
      <NumberedSectionHeader>{title}</NumberedSectionHeader>
      {children}
    </Stack>
  );
}

// Same pill header, but as the toggle for an independently collapsible
// section (the Real Estate full report's Technical Specification,
// Utilities, Improvement, … sections) — chevron + Collapse, same open/close
// behavior CollapsibleSection gave these sections before.
function CollapsibleNumberedSection({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Box>
      <Stack
        component={ButtonBase}
        onClick={onToggle}
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ width: 1, px: 2, py: 1.25, borderRadius: '10px', bgcolor: '#EEF1FE', justifyContent: 'flex-start', textAlign: 'left' }}
      >
        <Iconify
          icon="eva:chevron-down-fill"
          width={18}
          sx={{
            color: '#1C2A6E',
            flexShrink: 0,
            transition: 'transform 0.15s ease',
            transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        />
        <Typography
          sx={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#1C2A6E' }}
        >
          {title}
        </Typography>
      </Stack>
      <Collapse in={expanded}>
        <Stack spacing={1.25} sx={{ pt: 1.25 }}>
          {children}
        </Stack>
      </Collapse>
    </Box>
  );
}

// One label/value pair; a row is 1–2 pairs, a table is a list of rows.
type FieldPair = [label: string, value: string];

// The old Field returned null for an empty value, so an all-empty grid
// collapsed to nothing — FieldRows keeps that exactly: empty pairs are
// dropped, a row left with no pairs is dropped, and a table left with no
// rows renders nothing. Free-text values keep their line breaks.
function visibleRows(rows: FieldPair[][]): FieldPair[][] {
  return rows.map((row) => row.filter(([, value]) => value)).filter((row) => row.length > 0);
}

function FieldRows({ rows }: { rows: FieldPair[][] }) {
  const visible = visibleRows(rows);
  if (visible.length === 0) return null;
  return (
    <FieldTable>
      {visible.map((row) => (
        <FieldTableRow
          key={row.map(([label]) => label).join('|')}
          pairs={row.map(([label, value]) => [
            label,
            <Box key={label} component="span" sx={{ whiteSpace: 'pre-wrap' }}>
              {value}
            </Box>,
          ])}
        />
      ))}
    </FieldTable>
  );
}

// A header + FieldRows for field groups that used to be an unlabeled
// FieldGrid — hidden entirely (header included) when every value is empty,
// same as the old all-empty grid.
function FieldSection({ title, rows }: { title: string; rows: FieldPair[][] }) {
  if (visibleRows(rows).length === 0) return null;
  return (
    <Section title={title}>
      <FieldRows rows={rows} />
    </Section>
  );
}

// One repeatable-entry block (Machinery 1, Comparable 2, …) — bordered
// inner box with an entry label, its fields in a FieldTable. Same shape
// ci-report-preview.tsx's EntryBlock uses.
function EntryBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #EEF0F5' }}>
      <Stack spacing={1}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#3448B0' }}>{title}</Typography>
        {children}
      </Stack>
    </Box>
  );
}

// Groups a flat checklist into rows of two for FieldTableRow.
function pairUp<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
}

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
        {/* Boundaries / Technical Specification are free text, so each gets
            a full-width row; FieldRows drops them when empty, same as the
            old conditional blocks. */}
        <FieldRows
          rows={[
            [
              ['File Type', title.fileType],
              ['Title No.', title.titleNo],
            ],
            [
              ['Area Size (sq.m.)', title.areaSize],
              ['Zonal Value', title.zonalValue],
            ],
            [
              ['Lot No.', title.lotNo],
              ['Survey No.', title.surveyNo],
            ],
            [
              ['Book No. / Page No.', title.bookPageNo],
              ['Title Registration Date', title.titleRegistrationDate],
            ],
            [['Title Registration Place', title.titleRegistrationPlace]],
            [['Boundaries', title.boundaries]],
            [['Technical Specification', title.technicalSpecification]],
          ]}
        />

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

        <FieldRows
          rows={[
            [['Registered Owner', report.registeredOwner]],
            [
              ['Make', report.make],
              ['Plate No.', report.plateNo],
            ],
          ]}
        />

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
          <FieldSection
            title="Report Details"
            rows={[
              [['Account Name', report.accountName]],
              [
                ['Requested By', report.requestedBy],
                ['Purpose of Report', report.purposeOfReport],
              ],
              [
                ['Report Date', report.reportDate],
                ['Eqpt. Under App.', report.eqptUnderApp],
              ],
              [['Date Inspected', report.dateInspected]],
              [['Registered Owner', report.registeredOwner]],
              [['Address', report.address]],
            ]}
          />

          <Section title="Description of Equipment">
            <FieldRows
              rows={[
                [
                  ['Make', report.make],
                  ['MVF No.', report.mvfNo],
                ],
                [
                  ['Series', report.series],
                  ['C.R No.', report.crNo],
                ],
                [
                  ['Type of Body / Denomination', report.typeOfBodyDenomination],
                  ['Registration Date', report.registrationDate],
                ],
                [
                  ['Year Model', report.yearModel],
                  ['Place Registered', report.placeRegistered],
                ],
                [
                  ['Color', report.color],
                  ['Chassis Number', report.chassisNumber],
                ],
                [
                  ['Odometer Reading', report.odometerReading],
                  ['Engine No.', report.engineNo],
                ],
                [
                  ['Plate No.', report.plateNo],
                  ['Fuel', report.fuel],
                ],
              ]}
            />
          </Section>

          {/* Checklists: every item's row always shows (as before), the
              value being "Yes"/"No" plus comments when checked — the muted
              color for an unchecked item is kept. */}
          <Section title="Accessories">
            {report.accessories.length > 0 && (
              <FieldTable>
                {pairUp(report.accessories).map((row) => (
                  <FieldTableRow
                    key={row.map((item) => item.id).join('|')}
                    pairs={row.map((item) => [
                      item.label,
                      <Box key={item.id} component="span" sx={{ color: item.checked ? '#14172A' : '#8891A6' }}>
                        {item.checked ? 'Yes' : 'No'}
                        {item.checked && item.comments ? ` — ${item.comments}` : ''}
                      </Box>,
                    ])}
                  />
                ))}
              </FieldTable>
            )}
          </Section>

          <Section title="Power Features">
            {report.powerFeatures.length > 0 && (
              <FieldTable>
                {pairUp(report.powerFeatures).map((row) => (
                  <FieldTableRow
                    key={row.map((item) => item.id).join('|')}
                    pairs={row.map((item) => [
                      item.label,
                      <Box key={item.id} component="span" sx={{ color: item.checked ? '#14172A' : '#8891A6' }}>
                        {item.checked ? 'Yes' : 'No'}
                        {item.checked && item.comments ? ` — ${item.comments}` : ''}
                      </Box>,
                    ])}
                  />
                ))}
              </FieldTable>
            )}
          </Section>

          {/* General Condition / Instrument Panel stay as their own rows: each
              value is a StatusBadge (a block element, which can't sit inside
              FieldTableRow's <p> value cell), so they're kept as non-field
              status content under the new section header. */}
          <Section title="General Condition">
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
          </Section>

          <Section title="Instrument Panel & Lighting">
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
          </Section>

          <Section title="Market Survey">
            {report.marketSurvey.length === 0 ? (
              <Typography sx={{ fontSize: 12.5, color: '#8891A6', fontStyle: 'italic' }}>
                No market survey entries recorded.
              </Typography>
            ) : (
              <Stack spacing={1.25}>
                {report.marketSurvey.map((entry, index) => (
                  <EntryBlock key={entry.id} title={`Survey ${index + 1}`}>
                    <FieldRows
                      rows={[
                        [
                          ['Source', entry.source],
                          ['Date', entry.date],
                        ],
                        [
                          ['Type', entry.type],
                          ['Gen. Condition', entry.generalCondition],
                        ],
                        [['Selling Price', entry.sellingPrice]],
                      ]}
                    />
                  </EntryBlock>
                ))}
              </Stack>
            )}
          </Section>

          {report.encumbrancesRemarks && (
            <Section title="Encumbrances / Remarks">
              {/* Stored as HTML from the editable form's RichTextField — rendered
                  as plain read-only HTML here, no editable control. */}
              <Box
                sx={{ fontSize: 13.5, color: '#3B4256', '& p': { m: 0, mb: 1 } }}
                dangerouslySetInnerHTML={{ __html: report.encumbrancesRemarks }}
              />
            </Section>
          )}

          <FieldSection
            title="Loanable Value"
            rows={[
              [
                ['Loanable Percent', report.loanablePercent],
                ['Appraised Value (Round Off)', report.appraisedValueRoundOff],
              ],
              [['Loanable Amount', report.loanableAmount]],
            ]}
          />

          {report.fileAttachments.length > 0 && (
            <Section title="File Attachment">
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
            </Section>
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

        <FieldRows
          rows={[
            [
              ['Machineries', `${report.machineries.length} machineries`],
              ['Subject', report.subject],
            ],
          ]}
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
          <FieldSection
            title="Memorandum"
            rows={[
              [
                ['To', report.to],
                ['Thru', report.thru],
              ],
              [['From', report.from]],
              [
                ['Date Report', report.dateReport],
                ['Date Inspected', report.dateInspected],
              ],
              [['Subject', report.subject]],
            ]}
          />

          {report.descriptionOfEquipments && (
            <Section title="I. Description of Equipments">
              <Typography sx={{ fontSize: 13.5, color: '#3B4256', whiteSpace: 'pre-wrap' }}>
                {report.descriptionOfEquipments}
              </Typography>
            </Section>
          )}

          <Section title="Machineries">
            {report.machineries.length === 0 ? (
              <Typography sx={{ fontSize: 12.5, color: '#8891A6', fontStyle: 'italic' }}>
                No machineries recorded.
              </Typography>
            ) : (
              <Stack spacing={1.25}>
                {report.machineries.map((entry, index) => (
                  <EntryBlock key={entry.id} title={`Machinery ${index + 1}`}>
                    <FieldRows
                      rows={[
                        [
                          ['Unit(s)', entry.units],
                          ['Serial No.', entry.serialNo],
                        ],
                        [['Description', entry.description]],
                        [
                          ['Acquisition Price(s) in PHP', entry.acquisitionPricePhp],
                          ['Date of Proforma Invoice', entry.dateOfProformaInvoice],
                        ],
                        [['Appraised Value (Less Depreciation)', entry.appraisedValueLessDepreciation]],
                      ]}
                    />
                  </EntryBlock>
                ))}
              </Stack>
            )}
          </Section>

          <FieldSection
            title="Appraised Value Summary"
            rows={[
              [
                ['Total Appraised Value', fCurrency(totalAppraisedValue)],
                ['Total Appraised Value (Round Off)', report.totalAppraisedValueRoundOff],
              ],
              [
                ['Loanable Percent', report.loanablePercent],
                ['Loanable Amount', report.loanableAmount],
              ],
            ]}
          />

          {report.qualificationRemarks && (
            <Section title="II. Qualification & Remarks">
              {/* Stored as HTML from the editable form's RichTextField — rendered
                  as plain read-only HTML here, no editable control. */}
              <Box
                sx={{ fontSize: 13.5, color: '#3B4256', '& p': { m: 0, mb: 1 } }}
                dangerouslySetInnerHTML={{ __html: report.qualificationRemarks }}
              />
            </Section>
          )}

          {report.fileAttachments.length > 0 && (
            <Section title="File Attachment">
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
            </Section>
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
  const realCollateralType: AppraisalCollateralType = getBundleCollateralType(
    bundle,
    review.requirementChecklist.appraisalGroups
  );

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

        <FieldRows
          rows={[
            [['Registered Owner', report.registeredOwner]],
            [['Location of Property', report.locationOfProperty]],
            [['Properties Covered', String(propertyCount)]],
          ]}
        />

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
          <FieldSection
            title="Report Details"
            rows={[
              [
                ['Date Report', report.dateReport],
                ['Date Inspected', report.dateInspected],
              ],
              [
                ['Requesting Officer', report.requestingOfficer],
                ['Branch', report.branch],
              ],
              [['Account Name', report.accountName]],
              [['Address', report.accountAddress]],
            ]}
          />

          <Section title="Land">
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
            <FieldRows rows={[[['Encumbrances / Remarks', report.encumbrancesRemarks]]]} />
          </Section>

          <CollapsibleNumberedSection
            title="Technical Specification"
            expanded={!!expanded.technical}
            onToggle={() => toggle('technical')}
          >
            <FieldRows
              rows={[
                [['Present Use', report.presentUse]],
                [
                  ['Street Frontage (metres)', report.streetFrontage],
                  ['Street Width (metres)', report.streetWidth],
                ],
                [
                  ['Surfacing (Concrete/Asphalt)', report.surfacing],
                  ['Average Depth', report.averageDepth],
                ],
                [
                  ['Approx. Shape', report.approxShape],
                  ['Topography', report.topography],
                ],
                [["Neighborhood (Res'l/Comm'l/Ind'l.)", report.neighborhood]],
              ]}
            />
          </CollapsibleNumberedSection>

          <CollapsibleNumberedSection
            title="Source or Kind of Utilities"
            expanded={!!expanded.utilities}
            onToggle={() => toggle('utilities')}
          >
            <FieldRows
              rows={[
                [
                  ['Public Conveyance Line', report.utilityPublicConveyance],
                  ['Electricity', report.utilityElectricity],
                ],
                [
                  ['Water', report.utilityWater],
                  ['Gas / Others', report.utilityGasOthers],
                ],
              ]}
            />
          </CollapsibleNumberedSection>

          {/* Improvement, General Construction Features and Particular
              Description share the one 'construction' expand key, exactly as
              before — toggling any of them opens/closes all three. */}
          <CollapsibleNumberedSection
            title="Improvement"
            expanded={!!expanded.construction}
            onToggle={() => toggle('construction')}
          >
            {report.improvements.map((improvement, index) => (
              <EntryBlock key={improvement.id} title={`Improvement ${index + 1}`}>
                <FieldRows
                  rows={[
                    [
                      ['Year Constructed', improvement.yearConstructed],
                      ['Construction', improvement.construction],
                    ],
                    [
                      ['Condition', improvement.condition],
                      ['Est. Floor Area (sq.m.)', improvement.estFloorArea],
                    ],
                  ]}
                />
              </EntryBlock>
            ))}
          </CollapsibleNumberedSection>

          <CollapsibleNumberedSection
            title="General Construction Features"
            expanded={!!expanded.construction}
            onToggle={() => toggle('construction')}
          >
            <FieldRows rows={[[['General Construction Features', report.generalConstructionFeatures]]]} />
          </CollapsibleNumberedSection>

          <CollapsibleNumberedSection
            title="Particular Description"
            expanded={!!expanded.construction}
            onToggle={() => toggle('construction')}
          >
            {report.particularDescriptions.map((particular, index) => (
              <EntryBlock key={particular.id} title={`Description ${index + 1}`}>
                <FieldRows
                  rows={[
                    [
                      ['Floor Level', particular.floorLevel],
                      ['Interior Walls & Partitions', particular.interiorWallsPartitions],
                    ],
                    [
                      ['Flooring', particular.flooring],
                      ['Doors & Windows', particular.doorsWindows],
                    ],
                    [['Ceiling & Roofing', particular.ceilingRoofing]],
                  ]}
                />
              </EntryBlock>
            ))}
          </CollapsibleNumberedSection>

          <CollapsibleNumberedSection
            title="Basis of Valuation (Land)"
            expanded={!!expanded.basis}
            onToggle={() => toggle('basis')}
          >
            {report.basisOfValuationComparables.map((comparable, index) => (
              <EntryBlock key={comparable.id} title={`Comparable ${index + 1}`}>
                <FieldRows
                  rows={[
                    [
                      ['Source', comparable.source],
                      ['Location', comparable.location],
                    ],
                    [
                      ['Area Size', comparable.areaSize],
                      ['Price Type', comparable.priceType],
                    ],
                    [
                      ['Zonal Value', comparable.zonalValue],
                      ['Value', comparable.value],
                    ],
                  ]}
                />
              </EntryBlock>
            ))}
            <FieldRows
              rows={[
                [
                  ['Fair Market Value Per Square Meter', report.fairMarketValuePerSqm],
                  ['Fair Market Value Total (PHP)', report.fairMarketValueTotal],
                ],
                [['Valuation Remarks', report.valuationRemarks]],
              ]}
            />
          </CollapsibleNumberedSection>

          {report.remarksAdditionalInfo && (
            <Section title="Remarks / Additional Information">
              <Typography sx={{ fontSize: 13.5, color: '#3B4256', whiteSpace: 'pre-wrap' }}>
                {report.remarksAdditionalInfo}
              </Typography>
            </Section>
          )}

          {report.conditionsForAcceptance.length > 0 && (
            <Section title="Conditions for Acceptance of Collateral">
              {report.conditionsForAcceptance.map((condition, index) => (
                <EntryBlock key={condition.id} title={`Condition ${index + 1}`}>
                  <FieldRows
                    rows={[
                      [
                        ['Item of Property', condition.itemOfProperty],
                        ['Ref', condition.ref],
                      ],
                      [
                        ['Marketable', condition.marketable],
                        ['Construction (%)', condition.constructionStatusPercent],
                      ],
                      [
                        ['Depreciated Value', condition.depreciatedValue],
                        ['Appraised Value', condition.appraisedValue],
                      ],
                    ]}
                  />
                </EntryBlock>
              ))}
            </Section>
          )}

          <Section title="Appraisal Summary">
            <FieldRows
              rows={[
                [['Rounded Figures', report.roundedFigures]],
                [
                  ['Leasable Percent (%)', report.leasablePercent],
                  ['Leasable Amount (PHP)', report.leasableAmount],
                ],
              ]}
            />
          </Section>

          {report.feeAttachments.length > 0 && (
            <Section title="Fee Attachment">
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
            </Section>
          )}
        </Stack>
      </Collapse>
    </Box>
  );
}
