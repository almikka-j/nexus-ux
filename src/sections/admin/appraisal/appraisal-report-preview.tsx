'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';
import { FieldTable, FieldTableRow } from 'src/components/admin-ui';

import type { AppraisalReport, AppraisalReportLandTitle } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Plain, always-expanded read-only preview of the Real Estate report the
// appraiser is currently filling in — opened from AppraiserAssignmentCard's
// own "Preview Appraisal Report" button (Real Estate + in-house only),
// before the report is even submitted. Follows the app's read-only
// report-result standard (credit-checking-result-modal.tsx /
// call-report-result-modal.tsx / ci-report-preview.tsx): a pill-shaped
// NumberedSectionHeader per section, label/value fields in a FieldTable of
// FieldTableRows, and non-field content (free-text narratives, photo
// strips) kept in its own styling underneath the section header. The
// editable AppraiserAssignmentCard keeps its own form styling.
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

// One report section: pill header, then its content (FieldTables and/or
// non-field blocks) stacked underneath — no bordered wrapper box.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Stack spacing={1.25}>
      <NumberedSectionHeader>{title}</NumberedSectionHeader>
      {children}
    </Stack>
  );
}

// FieldTableRow renders its value as-is, so empty values get the same "—"
// placeholder the old FieldRow showed; free-text values keep their line
// breaks.
function display(value: string): React.ReactNode {
  return value ? (
    <Box component="span" sx={{ whiteSpace: 'pre-wrap' }}>
      {value}
    </Box>
  ) : (
    '—'
  );
}

// Free-text value in its own bordered box — same shape
// call-report-result-modal.tsx's own NarrativeBlock uses. Used for General
// Construction Features, Valuation Remarks, and Remarks/Additional
// Information. Renders nothing when empty.
function NarrativeBlock({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <Box sx={{ p: 2, borderRadius: '12px', border: '1px solid #EEF0F5' }}>
      <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#8891A6', mb: 0.75 }}>{label}</Typography>
      <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
        {value}
      </Typography>
    </Box>
  );
}

// One repeatable-entry block (Improvement 1, Comparable 2, …) — bordered
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

function LandTitlePreview({ title, tctNumber }: { title: AppraisalReportLandTitle; tctNumber: string }) {
  return (
    <Section title={`TCT No. ${tctNumber}`}>
      <FieldTable>
        <FieldTableRow
          pairs={[
            ['File Type', display(title.fileType)],
            ['Title No.', display(title.titleNo)],
          ]}
        />
        {/* Same field order as LandTitleFields: File Type, Title No.,
            Survey No., Book No. / Page No. → Registration Date / Place →
            Area Size, Lot No., Zonal Value → Lot Plotting → Boundaries,
            Technical Specification. */}
        <FieldTableRow
          pairs={[
            ['Survey No.', display(title.surveyNo)],
            ['Book No. / Page No.', display(title.bookPageNo)],
          ]}
        />
        <FieldTableRow
          pairs={[
            ['Title Registration Date', display(title.titleRegistrationDate)],
            ['Title Registration Place', display(title.titleRegistrationPlace)],
          ]}
        />
        <FieldTableRow
          pairs={[
            ['Area Size (sq.m.)', display(title.areaSize)],
            ['Lot No.', display(title.lotNo)],
          ]}
        />
        <FieldTableRow pairs={[['Zonal Value', display(title.zonalValue)]]} />
      </FieldTable>

      {(title.lotPlotLines.some(
        (line) => line.label || line.northSouth || line.degrees || line.eastWest || line.minutes || line.distanceM
      ) ||
        title.lotPlotPhotos.length > 0) && (
        <Box sx={{ p: 1.25, borderRadius: '10px', border: '1px solid #EBEDF3', bgcolor: '#F9FAFC' }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <Iconify icon="solar:map-point-bold-duotone" width={16} sx={{ color: '#5A6273' }} />
            <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5A6273' }}>
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
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5A6273', mb: 1 }}>
                Lot Plot Image
              </Typography>
              <Stack direction="row" spacing={1.25} flexWrap="wrap" rowGap={1.25}>
                {title.lotPlotPhotos.map((photo, index) => (
                  <Box
                    key={`${photo.fileUrl}-${index}`}
                    sx={{
                      width: 56,
                      height: 56,
                      flexShrink: 0,
                      borderRadius: '8px',
                      border: '1px solid #EBEDF3',
                      bgcolor: '#F5F6FA',
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      component="img"
                      src={photo.fileUrl}
                      alt={`Lot plot image ${index + 1} — TCT No. ${tctNumber}`}
                      sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                    />
                  </Box>
                ))}
              </Stack>
            </>
          )}
        </Box>
      )}

      {/* Boundaries / Technical Specification only appear when filled in,
          same as before — full-width rows since they're free text. Placed
          after Lot Plotting, matching LandTitleFields' own order. */}
      {(title.boundaries || title.technicalSpecification) && (
        <FieldTable>
          {title.boundaries && <FieldTableRow pairs={[['Boundaries', display(title.boundaries)]]} />}
          {title.technicalSpecification && (
            <FieldTableRow pairs={[['Technical Specification', display(title.technicalSpecification)]]} />
          )}
        </FieldTable>
      )}
    </Section>
  );
}

export function AppraisalReportPreview({
  report,
  titleGroups,
}: {
  report: AppraisalReport;
  titleGroups: { id: string; tctNumber: string }[];
}) {
  return (
    <Stack spacing={2.5}>
      {/* Was a FactChip strip — plain label/value pairs, so shown as a
          FieldTable under its own header (same as ci-report-preview.tsx's
          converted chip strips). */}
      <Section title="Report Details">
        <FieldTable>
          <FieldTableRow
            pairs={[
              ['Date Report', display(report.dateReport)],
              ['Date Inspected', display(report.dateInspected)],
            ]}
          />
          <FieldTableRow
            pairs={[
              ['Requesting Officer', display(report.requestingOfficer)],
              ['Branch', display(report.branch)],
            ]}
          />
          <FieldTableRow pairs={[['Account Name', display(report.accountName)]]} />
          <FieldTableRow pairs={[['Address', display(report.accountAddress)]]} />
        </FieldTable>
      </Section>

      <Section title="Land">
        <FieldTable>
          <FieldTableRow pairs={[['Registered Owner', display(report.registeredOwner)]]} />
          <FieldTableRow pairs={[['Location of Property', display(report.locationOfProperty)]]} />
        </FieldTable>

        {/* Per-title blocks, then Encumbrances / Remarks — same order as the
            editable form's Land section (owner/location → each
            LandTitleFields → Encumbrances / Remarks). Matched against
            titleGroups by tctGroupId so each block gets its real TCT
            number — but if a bundle's tctGroupIds no longer resolve to any
            current titleGroups entry (e.g. the Collateral table's groups
            were since regenerated), fall back to report.landTitles itself
            so a submitted/filled-in report still shows every title it
            actually has, instead of silently rendering none. */}
        {(() => {
          const matchedGroupIds = new Set(titleGroups.map((group) => group.id));
          const matched = titleGroups
            .map((group) => {
              const title = report.landTitles.find((entry) => entry.tctGroupId === group.id);
              return title ? { title, tctNumber: group.tctNumber, key: group.id } : null;
            })
            .filter((entry): entry is { title: AppraisalReportLandTitle; tctNumber: string; key: string } => !!entry);

          const unmatched = report.landTitles
            .filter((title) => !matchedGroupIds.has(title.tctGroupId))
            .map((title) => ({ title, tctNumber: title.fileType || 'Unlinked title', key: title.tctGroupId }));

          return [...matched, ...unmatched].map(({ title, tctNumber, key }) => (
            <LandTitlePreview key={key} title={title} tctNumber={tctNumber} />
          ));
        })()}

        {report.encumbrancesRemarks && (
          <FieldTable>
            <FieldTableRow pairs={[['Encumbrances / Remarks', display(report.encumbrancesRemarks)]]} />
          </FieldTable>
        )}
      </Section>

      <Section title="Technical Specification">
        <FieldTable>
          <FieldTableRow
            pairs={[
              ['Street Frontage (metres)', display(report.streetFrontage)],
              ['Street Width (metres)', display(report.streetWidth)],
            ]}
          />
          <FieldTableRow
            pairs={[
              ['Surfacing (Concrete/Asphalt)', display(report.surfacing)],
              ['Average Depth', display(report.averageDepth)],
            ]}
          />
          <FieldTableRow
            pairs={[
              ['Approx. Shape', display(report.approxShape)],
              ['Topography', display(report.topography)],
            ]}
          />
          <FieldTableRow
            pairs={[
              ["Neighborhood (Res'l/Comm'l/Ind'l.)", display(report.neighborhood)],
              ['Present Use', display(report.presentUse)],
            ]}
          />
        </FieldTable>
      </Section>

      <Section title="Source or Kind of Utilities">
        <FieldTable>
          <FieldTableRow
            pairs={[
              ['Public Conveyance Line', display(report.utilityPublicConveyance)],
              ['Electricity', display(report.utilityElectricity)],
            ]}
          />
          <FieldTableRow
            pairs={[
              ['Water', display(report.utilityWater)],
              ['Gas / Others', display(report.utilityGasOthers)],
            ]}
          />
        </FieldTable>
      </Section>

      <Section title="Improvement">
        {report.improvements.map((improvement, index) => (
          <EntryBlock key={improvement.id} title={`Improvement ${index + 1}`}>
            <FieldTable>
              <FieldTableRow
                pairs={[
                  ['Year Constructed', display(improvement.yearConstructed)],
                  ['Construction', display(improvement.construction)],
                ]}
              />
              <FieldTableRow
                pairs={[
                  ['Condition', display(improvement.condition)],
                  ['Est. Floor Area', display(improvement.estFloorArea)],
                ]}
              />
            </FieldTable>
          </EntryBlock>
        ))}
      </Section>

      {/* Standalone narrative — only rendered (header included) when filled
          in, same as the old bare NarrativeBlock. */}
      {report.generalConstructionFeatures && (
        <Section title="General Construction Features">
          <NarrativeBlock label="General Construction Features" value={report.generalConstructionFeatures} />
        </Section>
      )}

      <Section title="Particular Description">
        {report.particularDescriptions.map((particular, index) => (
          <EntryBlock key={particular.id} title={`Entry ${index + 1}`}>
            <FieldTable>
              <FieldTableRow
                pairs={[
                  ['Floor Level', display(particular.floorLevel)],
                  ['Interior Walls & Partitions', display(particular.interiorWallsPartitions)],
                ]}
              />
              <FieldTableRow
                pairs={[
                  ['Flooring', display(particular.flooring)],
                  ['Doors & Windows', display(particular.doorsWindows)],
                ]}
              />
              <FieldTableRow pairs={[['Ceiling & Roofing', display(particular.ceilingRoofing)]]} />
            </FieldTable>
          </EntryBlock>
        ))}
      </Section>

      <Section title="Basis of Valuation (Land)">
        {report.basisOfValuationComparables.map((comparable, index) => (
          <EntryBlock key={comparable.id} title={`Comparable ${index + 1}`}>
            <FieldTable>
              <FieldTableRow
                pairs={[
                  ['Source', display(comparable.source)],
                  ['Location', display(comparable.location)],
                ]}
              />
              <FieldTableRow
                pairs={[
                  ['Area Size', display(comparable.areaSize)],
                  ['Price Type', display(comparable.priceType)],
                ]}
              />
              <FieldTableRow
                pairs={[
                  ['Zonal Value', display(comparable.zonalValue)],
                  ['Value', display(comparable.value)],
                ]}
              />
            </FieldTable>
          </EntryBlock>
        ))}
        <FieldTable>
          <FieldTableRow
            pairs={[
              ['Fair Market Value Per Square Meter', display(report.fairMarketValuePerSqm)],
              ['Fair Market Value Total (PHP)', display(report.fairMarketValueTotal)],
            ]}
          />
        </FieldTable>
        <NarrativeBlock label="Valuation remarks" value={report.valuationRemarks} />
      </Section>

      {/* Standalone narrative — only rendered (header included) when filled
          in, same as the old bare NarrativeBlock. */}
      {report.remarksAdditionalInfo && (
        <Section title="Remarks / Additional Information">
          <NarrativeBlock label="Remarks / Additional Information" value={report.remarksAdditionalInfo} />
        </Section>
      )}

      <Section title="Conditions for Acceptance of Collateral">
        {report.conditionsForAcceptance.map((condition, index) => (
          <EntryBlock key={condition.id} title={`Item ${index + 1}`}>
            <FieldTable>
              <FieldTableRow
                pairs={[
                  ['Item of Property', display(condition.itemOfProperty)],
                  ['Ref', display(condition.ref)],
                ]}
              />
              <FieldTableRow
                pairs={[
                  ['Marketable', display(condition.marketable)],
                  ['Construction (%)', display(condition.constructionStatusPercent)],
                ]}
              />
              <FieldTableRow
                pairs={[
                  ['Depreciated Value', display(condition.depreciatedValue)],
                  ['Appraised Value', display(condition.appraisedValue)],
                ]}
              />
            </FieldTable>
          </EntryBlock>
        ))}
      </Section>

      <Section title="Appraisal Summary">
        <FieldTable>
          <FieldTableRow
            pairs={[
              ['Appraised Value (PHP)', display(report.appraisedValue)],
              ['Rounded Figures (PHP)', display(report.roundedFigures)],
            ]}
          />
          <FieldTableRow pairs={[['Amount in Words', display(report.amountInWords)]]} />
          <FieldTableRow
            pairs={[
              ['Leasable Percent (%)', display(report.leasablePercent)],
              ['Leasable Amount (PHP)', display(report.leasableAmount)],
            ]}
          />
        </FieldTable>
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
  );
}
