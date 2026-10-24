'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
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
// Each collateral kind leads with a short summary block (the Appraised
// Value hero plus a few headline items not otherwise shown in the report
// body), followed immediately by the full itemized report — always
// visible, no "View Full Report" toggle, matching the other read-only
// report-result views (initial-credit-checking-view.tsx's
// CreditCheckingResultContent, ci-report-preview.tsx).
// ----------------------------------------------------------------------

// The hero — the one number this whole document exists to produce, first
// thing in each collateral kind's lead-in summary.
function AppraisedValueHero({
  appraisedValue,
  amountInWords,
  label = 'APPRAISED VALUE',
}: {
  appraisedValue: string;
  amountInWords: string;
  label?: string;
}) {
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
          {label}
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

// A row of small photo chips, one per pledged property, in the Real
// Estate lead-in summary — the fastest way to see every property's own
// Lot Plot Image without expanding each title below. Purely a preview:
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

// One land title's full detail, always visible — TCT No. label, then its
// field table and lot plot photos. Every title in the bundle renders this
// way, whether the bundle covers one property or several.
function LandTitleSummary({
  title,
  tctNumber,
}: {
  title: AppraisalReportLandTitle;
  tctNumber: string;
}) {
  const detail = (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <Stack spacing={1.75} sx={{ flex: 1, minWidth: 0 }}>
        {/* Same field order as LandTitleFields (appraiser-assignment-card.tsx):
            File Type / Title No. / Survey No. / Book No. / Page No., then
            Title Registration Date / Place, then Area Size / Lot No. /
            Zonal Value, then the Lot Plotting box, then Boundaries and
            Technical Specification (free text, full-width rows) last. */}
        <FieldRows
          rows={[
            [
              ['File Type', title.fileType],
              ['Title No.', title.titleNo],
            ],
            [
              ['Survey No.', title.surveyNo],
              ['Book No. / Page No.', title.bookPageNo],
            ],
            [
              ['Title Registration Date', title.titleRegistrationDate],
              ['Title Registration Place', title.titleRegistrationPlace],
            ],
            [
              ['Area Size (sq.m.)', title.areaSize],
              ['Lot No.', title.lotNo],
            ],
            [['Zonal Value', title.zonalValue]],
          ]}
        />

        {(title.lotPlotLines.some(
          (line) => line.label || line.northSouth || line.degrees || line.eastWest || line.minutes || line.distanceM
        ) ||
          title.lotPlotPhotos.length > 0) && (
          <Box sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #E3E7F5', bgcolor: '#F7F8FE' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
              <Iconify icon="solar:map-point-bold-duotone" width={16} sx={{ color: '#1C2A6E' }} />
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#1C2A6E' }}>
                Lot Plotting
              </Typography>
            </Stack>

            {title.lotPlotLines.some(
              (line) => line.label || line.northSouth || line.degrees || line.eastWest || line.minutes || line.distanceM
            ) && (
              <Stack spacing={1} sx={{ mb: title.lotPlotPhotos.length > 0 ? 1.5 : 0 }}>
                {title.lotPlotLines
                  .filter(
                    (line) =>
                      line.label || line.northSouth || line.degrees || line.eastWest || line.minutes || line.distanceM
                  )
                  .map((line, index) => (
                    <Stack
                      key={line.id}
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{ p: 1, borderRadius: '8px', bgcolor: 'common.white', border: '1px solid #E3E7F0' }}
                    >
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#8891A6', width: 20, flexShrink: 0 }}>
                        {index + 1}
                      </Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#14172A' }}>
                        {line.label || '—'}
                      </Typography>
                      <Typography sx={{ fontSize: 13, color: '#5A6273' }}>
                        {[line.northSouth, line.degrees && `${line.degrees}°`, line.eastWest, line.minutes && `${line.minutes}'`]
                          .filter(Boolean)
                          .join(' ') || '—'}
                      </Typography>
                      <Typography sx={{ fontSize: 13, color: '#5A6273', ml: 'auto' }}>
                        {line.distanceM ? `${line.distanceM} m` : '—'}
                      </Typography>
                    </Stack>
                  ))}
              </Stack>
            )}

            {title.lotPlotPhotos.length > 0 && (
              <>
                <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#1C2A6E', mb: 1 }}>
                  Lot Plot Image
                </Typography>
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
              </>
            )}
          </Box>
        )}

        <FieldRows
          rows={[
            [['Boundaries', title.boundaries]],
            [['Technical Specification', title.technicalSpecification]],
          ]}
        />
      </Stack>
    </Stack>
  );

  return (
    <Box sx={{ p: 2, borderRadius: '10px', border: '1px solid #EBEDF3', bgcolor: '#FAFBFD' }}>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 1.5 }}>
        TCT No. {tctNumber}
      </Typography>
      {detail}
    </Box>
  );
}

// ----------------------------------------------------------------------
// Chattel (vehicle/equipment) read-only summary — same lead-in summary +
// always-visible report shell as the Real Estate view below, but reading
// bundle.chattelReport and following ChattelReportFields' own section
// groupings (Task 4) for the report: header fields, Description of
// Equipment, the 4 checklists as read-only label/value rows, Market
// Survey as a read-only table, Encumbrances/Remarks, file attachments.
// ----------------------------------------------------------------------
// No outer adminCardSx wrapper — this is a bare, card-less report body
// like appraisal-report-preview.tsx's AppraisalReportPreview, so it reads
// consistently whether the caller places it directly (where it needs its
// own card — see below) or inside a Dialog's own DialogContent (which
// already provides its own padding/chrome — see appraiser-assignment-card.tsx's
// "Preview Appraisal Report" dialogs for Chattel/Machineries).
export function ChattelReportSummary({ bundle, tctNumbers }: { bundle: AppraisalReportBundle; tctNumbers: string[] }) {
  const { appraiserName } = bundle;
  const report = bundle.chattelReport;
  const uploadedAt = report.uploadedAt;

  return (
    <Stack spacing={2.5}>
      {/* Lead-in summary: the Appraised Value hero. Registered Owner /
          Make / Plate No. used to repeat here too, but the always-visible
          report below already shows them, so they live there only. */}
      <AppraisedValueHero appraisedValue={report.appraisedValue} amountInWords="" />

      <FieldSection
        title="Report Details"
        rows={[
          [
            ['Account Name', report.accountName],
            ['Requested By', report.requestedBy],
          ],
          [
            ['Purpose of Report', report.purposeOfReport],
            ['Report Date', report.reportDate],
          ],
          [
            ['Eqpt. Under App.', report.eqptUnderApp],
            ['Date Inspected', report.dateInspected],
          ],
          [
            ['Registered Owner', report.registeredOwner],
            ['Address', report.address],
          ],
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

      {/* Same 4 fields, same order, as ChattelReportFields' "Appraised
          Value" step (Appraised Value, Loanable Percent, Appraised Value
          (Round Off), Loanable Amount), followed by its Encumbrances /
          Remarks rich text — the editable form places that rich text
          inside the same step, after the 4 value fields. */}
      <FieldSection
        title="Appraised Value"
        rows={[
          [
            ['Appraised Value', report.appraisedValue],
            ['Loanable Percent', report.loanablePercent],
          ],
          [
            ['Appraised Value (Round Off)', report.appraisedValueRoundOff],
            ['Loanable Amount', report.loanableAmount],
          ],
        ]}
      />

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
  );
}

// ----------------------------------------------------------------------
// Machineries read-only summary — same lead-in summary + report shell,
// reading bundle.machineriesReport and following MachineriesReportFields'
// own section groupings (Task 5): memo header fields, Description of
// Equipments, the machineries list as read-only label/value rows (no
// pencil, no collapse — every entry's fields always shown), Qualification
// & Remarks, file attachments. No outer adminCardSx wrapper — same "bare"
// convention as ChattelReportSummary above.
// ----------------------------------------------------------------------
export function MachineriesReportSummary({ bundle, tctNumbers }: { bundle: AppraisalReportBundle; tctNumbers: string[] }) {
  const { appraiserName } = bundle;
  const report = bundle.machineriesReport;
  const uploadedAt = report.uploadedAt;
  const totalAppraisedValue = computeTotalAppraisedValue(report.machineries);

  return (
    <Stack spacing={2.5}>
      {/* Lead-in summary: the Total Appraised Value hero (kept as the
          headline number, consistent with the other two collateral kinds)
          and the machinery count (derived, not a field). Subject used to
          repeat here too, but the always-visible Report Details section below
          already shows it, so it lives there only. */}
      <AppraisedValueHero
        appraisedValue={String(totalAppraisedValue)}
        amountInWords=""
        label="TOTAL APPRAISED VALUE"
      />

      <FieldRows rows={[[['Machineries', `${report.machineries.length} machineries`]]]} />

      <FieldSection
        title="Report Details"
        rows={[
          [
            ['To', report.to],
            ['Thru', report.thru],
          ],
          [
            ['From', report.from],
            ['Date Report', report.dateReport],
          ],
          [
            ['Date Inspected', report.dateInspected],
            ['Subject', report.subject],
          ],
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
                      ['Description', entry.description],
                    ],
                    [
                      ['Serial No.', entry.serialNo],
                      ['Acquisition Price(s) in PHP', entry.acquisitionPricePhp],
                    ],
                    [
                      ['Date of Proforma Invoice', entry.dateOfProformaInvoice],
                      ['Appraised Value (Less % Depreciation of 10% per year)', entry.appraisedValueLessDepreciation],
                    ],
                  ]}
                />
              </EntryBlock>
            ))}
          </Stack>
        )}
      </Section>

      <FieldSection
        title="Appraised Value"
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
  );
}

export function AppraisalReportView({ bundleId, tctNumbers }: { bundleId: string; tctNumbers: string[] }) {
  const { review } = useAdmin();
  const bundle = review.appraisal.reportBundles.find((entry) => entry.id === bundleId);

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
    return (
      <Box sx={adminCardSx}>
        <ChattelReportSummary bundle={bundle} tctNumbers={tctNumbers} />
      </Box>
    );
  }
  if (realCollateralType === 'machineries') {
    return (
      <Box sx={adminCardSx}>
        <MachineriesReportSummary bundle={bundle} tctNumbers={tctNumbers} />
      </Box>
    );
  }

  const report = bundle.realEstateReport;
  const propertyCount = titleGroups.length;

  return (
    <Box sx={adminCardSx}>
      {/* Lead-in summary — Appraised Value + amount in words, owner,
          location, property count and per-property photo chips. Appraised
          Value / Amount in Words / Registered Owner / Location of Property
          are also itemized in the report body below (Land and Appraisal
          Summary sections), exactly where the editable form has them. */}
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
          {/* The editable form's Land step opens with these two fields
              before the per-title blocks — shown here too (in addition to
              the lead-in summary) so the Land section reads the same. */}
          <FieldRows
            rows={[
              [
                ['Registered Owner', report.registeredOwner],
                ['Location of Property', report.locationOfProperty],
              ],
            ]}
          />
          <Stack spacing={1.5}>
            {titleGroups.map((group) => {
              const title = report.landTitles.find((entry) => entry.tctGroupId === group.id);
              if (!title) return null;
              return (
                <LandTitleSummary
                  key={group.id}
                  title={title}
                  tctNumber={group.tctNumber}
                />
              );
            })}
          </Stack>
          <FieldRows rows={[[['Encumbrances / Remarks', report.encumbrancesRemarks]]]} />
        </Section>

        <Section title="Technical Specification">
          <FieldRows
            rows={[
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
              [
                ["Neighborhood (Res'l/Comm'l/Ind'l.)", report.neighborhood],
                ['Present Use', report.presentUse],
              ],
            ]}
          />
        </Section>

        <Section title="Source or Kind of Utilities">
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
        </Section>

        <Section title="Improvement">
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
                    ['Est. Floor Area', improvement.estFloorArea],
                  ],
                ]}
              />
            </EntryBlock>
          ))}
        </Section>

        <Section title="General Construction Features">
          <FieldRows rows={[[['General Construction Features', report.generalConstructionFeatures]]]} />
        </Section>

        <Section title="Particular Description">
          {report.particularDescriptions.map((particular, index) => (
            <EntryBlock key={particular.id} title={`Entry ${index + 1}`}>
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
        </Section>

        <Section title="Basis of Valuation (Land)">
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
              [['Valuation remarks', report.valuationRemarks]],
            ]}
          />
        </Section>

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
              <EntryBlock key={condition.id} title={`Item ${index + 1}`}>
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
              [
                ['Appraised Value (PHP)', report.appraisedValue],
                ['Rounded Figures (PHP)', report.roundedFigures],
              ],
              [['Amount in Words', report.amountInWords]],
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
    </Box>
  );
}
