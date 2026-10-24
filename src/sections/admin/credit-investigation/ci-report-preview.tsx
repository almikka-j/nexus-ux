'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';
import { SectionLabel, FieldTable, FieldTableRow } from 'src/components/admin-ui';
import { FileThumbnail } from 'src/components/file-thumbnail';

import { COMMERCIAL_SAMPLE_INFO } from './ci-report-card';
import { resolveCommercialBusinessType } from './ci-report-commercial-sections';

import type { FinancialInfo } from 'src/auth/registration-context';
import type {
  CiReport,
  CiComakerEntry,
  CiStockholderType,
  CiStockholderEntry,
  CiCommercialTradeEntry,
  CiConsumerDocumentEntry,
  CiCommercialDocumentEntry,
} from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Plain, always-expanded read-only preview of the CI Report the officer
// is currently filling in — opened from Credit Investigation's own
// "Preview Report" button. Follows the app's read-only report-result
// standard (credit-checking-result-modal.tsx / call-report-result-modal.tsx):
// a pill-shaped NumberedSectionHeader per section, label/value fields in a
// FieldTable of FieldTableRows, and non-field content (rich-text
// narratives, repeatable entry blocks, transcript/document lists) kept in
// its own styling underneath the section header. Not the editable
// CiReportCard's own styling — editable forms keep their own convention.
//
// Branches on report.type exactly the way CiReportCard does, and covers
// the same sections in the same order as COMMERCIAL_SECTION_NAV_ITEMS /
// CONSUMER_SECTION_NAV_ITEMS (plus each type's info header, which sits
// above the nav'd sections in the live form). Fields CiReport carries but
// the live form never renders (negativeRecord*, recommendation*, the
// Consumer-shape suppliers/customers) are intentionally not shown here
// either — this previews the form, not the whole data shape.
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
// placeholder the old FieldRow showed, and free-text values keep their
// line breaks (old FieldRow's whiteSpace: 'pre-wrap').
function display(value: string): React.ReactNode {
  return value ? (
    <Box component="span" sx={{ whiteSpace: 'pre-wrap' }}>
      {value}
    </Box>
  ) : (
    '—'
  );
}

// Sub-heading inside a section (e.g. "Customers" / "Suppliers" under
// Trade Checking) — same 14px/700 weight the live form uses for these.
function SubHeading({ children }: { children: React.ReactNode }) {
  return <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>{children}</Typography>;
}

// A rich-text field may be stored as an "empty" editor document (e.g.
// "<p></p>" or "<p><br></p>") — treat anything with no visible text as
// empty so it shows the same "—" placeholder as an empty field.
function isEmptyHtml(html: string): boolean {
  return !html || html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() === '';
}

// RichTextField-authored HTML, rendered read-only — same
// dangerouslySetInnerHTML convention appraisal-report-view.tsx and
// financial-statement-report.tsx already use for internally-stored
// RichTextField content (never external input). Bordered narrative box,
// same shape as call-report-result-modal.tsx's NarrativeBlock.
function RichTextBlock({ label, html }: { label: string; html: string }) {
  return (
    <Box sx={{ p: 2, borderRadius: '12px', border: '1px solid #EEF0F5' }}>
      <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#8891A6', mb: 0.75 }}>{label}</Typography>
      {isEmptyHtml(html) ? (
        <Typography sx={{ fontSize: 13.5, color: '#A0A7B5' }}>—</Typography>
      ) : (
        <Box
          sx={{
            fontSize: 13.5,
            color: '#3B4256',
            lineHeight: 1.65,
            wordBreak: 'break-word',
            '& p': { m: 0, mb: 1 },
            '& p:last-of-type': { mb: 0 },
            '& ul, & ol': { pl: 2.5, my: 0.5 },
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </Box>
  );
}

// One repeatable-entry block (Manager 1, Customer 2, …) — bordered inner
// box with the live form's own entry label, its fields in a FieldTable.
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

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <Typography sx={{ fontSize: 13, color: '#8891A6', fontStyle: 'italic' }}>{children}</Typography>;
}

// ----------------------------------------------------------------------
// Value formatting
// ----------------------------------------------------------------------

function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  // Date-only 'YYYY-MM-DD' (from <input type="date">) is parsed as local
  // midnight so it never shifts a day in a UTC+8 browser.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatPeso(value: string): string {
  if (!value) return '';
  const amount = Number(String(value).replace(/,/g, ''));
  if (Number.isNaN(amount)) return value;
  return `₱ ${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercent(value: string): string {
  return value ? `${value}%` : '';
}

const ADDRESS_TYPE_LABELS: Record<Exclude<CiReport['residenceAddressType'], ''>, string> = {
  own: 'Own',
  rent: 'Rent',
  'rent-free': 'Rent-free',
};

const EMPLOYMENT_TYPE_LABELS: Record<Exclude<CiReport['employmentType'], ''>, string> = {
  direct: 'Direct',
  agency: 'Agency',
  'self-employed': 'Self-Employed',
};

const YES_NO_LABELS: Record<Exclude<CiReport['isUnionized'], ''>, string> = { yes: 'Yes', no: 'No' };

const LOCATION_OWNED_LABELS: Record<Exclude<CiReport['locationOwned'], ''>, string> = {
  owned: 'Owned',
  rented: 'Rented',
};

const EQUIPMENT_OWNED_LABELS: Record<Exclude<CiReport['equipmentOwned'], ''>, string> = {
  owned: 'Owned',
  leased: 'Leased',
};

const STOCKHOLDER_TYPE_LABELS: Record<Exclude<CiStockholderType, ''>, string> = {
  individual: 'Individual',
  corporation: 'Corporation',
};

function labelOf<K extends string>(labels: Record<K, string>, value: K | ''): string {
  return value ? labels[value] : '';
}

// Same Name/Company Name swap the live form's stockholderNameLabel()
// does, without the required-asterisk suffix.
function stockholderNameLabel(stockholderType: CiStockholderType): string {
  if (stockholderType === 'corporation') return 'Company Name';
  if (stockholderType === 'individual') return 'Name';
  return 'Name / Company Name';
}

// ----------------------------------------------------------------------
// Shared pieces
// ----------------------------------------------------------------------

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];

function isImageFile(fileName: string): boolean {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTENSIONS.includes(extension);
}

function TranscriptLine({ report, aiSummary }: { report: CiReport; aiSummary: string | null }) {
  return (
    <Section title="Site-Visit Transcript">
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Iconify icon="solar:mic-bold-duotone" width={20} sx={{ color: '#5A6273', flexShrink: 0 }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', wordBreak: 'break-word' }}>
            {report.transcriptFileName ?? 'No transcript uploaded'}
          </Typography>
          {report.transcriptFileName && report.transcriptUploadedAt && (
            <Typography sx={{ fontSize: 11.5, color: '#A0A7B5' }}>
              Uploaded {formatDate(report.transcriptUploadedAt)}
            </Typography>
          )}
        </Box>
      </Stack>
      {aiSummary && (
        <Box sx={{ p: 2, borderRadius: '11px', bgcolor: '#EEF1FE', border: '1px solid #DCE1F7' }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#3448B0', mb: 0.75 }}>AI Summary</Typography>
          <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6 }}>{aiSummary}</Typography>
        </Box>
      )}
    </Section>
  );
}

function DocumentList({ entries }: { entries: (CiCommercialDocumentEntry | CiConsumerDocumentEntry)[] }) {
  if (entries.length === 0) return <EmptyNote>No additional documents attached.</EmptyNote>;
  return (
    <Stack spacing={1.25}>
      {entries.map((entry) => (
        <Stack
          key={entry.id}
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ p: 1.25, borderRadius: '10px', border: '1px solid #EEF0F5' }}
        >
          {isImageFile(entry.fileName) ? (
            <Box
              component="img"
              src={entry.fileUrl}
              alt={entry.fileName}
              sx={{ width: 40, height: 40, flexShrink: 0, objectFit: 'cover', borderRadius: '8px', border: '1px solid #EEF0F5' }}
            />
          ) : (
            <FileThumbnail file={entry.fileName} sx={{ width: 40, height: 40, flexShrink: 0 }} />
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', wordBreak: 'break-word' }}>
              {entry.label || entry.fileName}
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: '#A0A7B5', wordBreak: 'break-word' }}>
              {entry.label ? `${entry.fileName} · ` : ''}Uploaded {formatDate(entry.uploadedAt)}
            </Typography>
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}

// ----------------------------------------------------------------------
// Commercial
// ----------------------------------------------------------------------

function CommercialTradeList({ title, entries }: { title: 'Customers' | 'Suppliers'; entries: CiCommercialTradeEntry[] }) {
  const singular = title.slice(0, -1);
  return (
    <Stack spacing={1.25}>
      <SubHeading>{title}</SubHeading>
      {entries.length === 0 ? (
        <EmptyNote>No {title.toLowerCase()} recorded.</EmptyNote>
      ) : (
        entries.map((entry, index) => (
          <EntryBlock key={entry.id} title={`${singular} ${index + 1}`}>
            <FieldTable>
              <FieldTableRow pairs={[['Company Name', display(entry.companyName)]]} />
              <FieldTableRow
                pairs={[
                  ["Representative's Name", display(entry.contactPerson)],
                  ["Representative's Position", display(entry.position)],
                ]}
              />
              <FieldTableRow
                pairs={[
                  ["Company's Tel No.", display(entry.telephoneNo)],
                  ['Local No', display(entry.localExtension)],
                ]}
              />
              <FieldTableRow
                pairs={[
                  ["Representative's Mobile No.", display(entry.mobileNumber)],
                  ['Email Address', display(entry.email)],
                ]}
              />
              <FieldTableRow pairs={[['Transaction Details', display(entry.transactionDetails)]]} />
              <FieldTableRow
                pairs={[
                  ['Payment Terms', display(entry.paymentTerms)],
                  ['Years of Business Contract', display(entry.yearsOfContract)],
                ]}
              />
              <FieldTableRow pairs={[['Remarks', display(entry.remarks)]]} />
            </FieldTable>
          </EntryBlock>
        ))
      )}
    </Stack>
  );
}

function StockholderList({ entries }: { entries: CiStockholderEntry[] }) {
  return (
    <Stack spacing={1.25}>
      <SubHeading>Stockholders</SubHeading>
      {entries.length === 0 ? (
        <EmptyNote>No stockholders recorded.</EmptyNote>
      ) : (
        entries.map((entry, index) => (
          <EntryBlock key={entry.id} title={`Stockholder ${index + 1}`}>
            <FieldTable>
              <FieldTableRow
                pairs={[
                  ['Stockholder Type', display(labelOf(STOCKHOLDER_TYPE_LABELS, entry.stockholderType))],
                  [stockholderNameLabel(entry.stockholderType), display(entry.name)],
                ]}
              />
              <FieldTableRow
                pairs={[
                  ['Amount Subscribed', display(formatPeso(entry.amountSubscribed))],
                  ['Amount Paid', display(formatPeso(entry.amountPaidUp))],
                ]}
              />
              <FieldTableRow pairs={[['Percentage Share', display(formatPercent(entry.percentageShare))]]} />
            </FieldTable>
            {entry.stockholderType === 'corporation' && (
              <Box sx={{ ml: { sm: 2 }, p: 1.25, borderRadius: '10px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
                <Stack spacing={1}>
                  <SectionLabel>Sub-stockholders</SectionLabel>
                  {entry.subStockholders.length === 0 ? (
                    <EmptyNote>No sub-stockholders recorded.</EmptyNote>
                  ) : (
                    entry.subStockholders.map((sub, subIndex) => (
                      <EntryBlock key={sub.id} title={`Sub ${subIndex + 1}`}>
                        <FieldTable>
                          <FieldTableRow
                            pairs={[
                              ['Stockholder Type', display(labelOf(STOCKHOLDER_TYPE_LABELS, sub.stockholderType))],
                              [stockholderNameLabel(sub.stockholderType), display(sub.name)],
                            ]}
                          />
                          <FieldTableRow
                            pairs={[
                              ['Amount Subscribed', display(formatPeso(sub.amountSubscribed))],
                              ['Amount Paid', display(formatPeso(sub.amountPaidUp))],
                            ]}
                          />
                          <FieldTableRow
                            pairs={[['Percentage Share', display(formatPercent(sub.percentageShare))]]}
                          />
                        </FieldTable>
                      </EntryBlock>
                    ))
                  )}
                </Stack>
              </Box>
            )}
          </EntryBlock>
        ))
      )}
    </Stack>
  );
}

function CommercialPreview({
  report,
  financialInfo,
  loanType,
}: {
  report: CiReport;
  financialInfo: FinancialInfo | null;
  loanType: 'personal' | 'business' | null;
}) {
  // Same derivations CiReportCard's CommercialInfoChips uses for its
  // read-only header values.
  const loanTypeLabel = loanType === 'personal' ? 'Personal Loan' : 'Business Loan';
  const amountAppliedLabel = financialInfo?.desiredLoanAmount
    ? `Php ${Number(financialInfo.desiredLoanAmount).toLocaleString()}.00`
    : 'Php 7,000,000.00';
  const loanPurposeLabel = financialInfo?.loanPurpose || COMMERCIAL_SAMPLE_INFO.loanPurpose;
  const effectiveBusinessType = resolveCommercialBusinessType(report.businessTypeOverride, financialInfo?.businessType);

  return (
    <>
      {/* The live form's header chip strip (CommercialInfoChips) — plain
          label/value pairs, so shown as a FieldTable under its own header. */}
      <Section title="Company Information">
        <FieldTable>
          <FieldTableRow pairs={[['Company Name', display(COMMERCIAL_SAMPLE_INFO.companyName)]]} />
          <FieldTableRow pairs={[['Business Address', display(COMMERCIAL_SAMPLE_INFO.businessAddress)]]} />
          <FieldTableRow
            pairs={[
              ['Contact No.', display(COMMERCIAL_SAMPLE_INFO.contactNo)],
              ['Email Address', display(COMMERCIAL_SAMPLE_INFO.emailAddress)],
            ]}
          />
          <FieldTableRow
            pairs={[
              ['Website', display(COMMERCIAL_SAMPLE_INFO.website)],
              ['TIN No.', display(COMMERCIAL_SAMPLE_INFO.tinNo)],
            ]}
          />
          <FieldTableRow
            pairs={[
              ['Loan Type', display(loanTypeLabel)],
              ['Amount Applied', display(amountAppliedLabel)],
            ]}
          />
          <FieldTableRow pairs={[['Loan Purpose', display(loanPurposeLabel)]]} />
          <FieldTableRow
            pairs={[
              ['Organization Type', display(COMMERCIAL_SAMPLE_INFO.organizationType)],
              ['Registration Number', display(COMMERCIAL_SAMPLE_INFO.registrationNumber)],
            ]}
          />
          <FieldTableRow
            pairs={[
              ['Registration Date', display(COMMERCIAL_SAMPLE_INFO.registrationDate)],
              ['Line of Business', display(report.businessLineOfBusiness || 'Transportation and Storage')],
            ]}
          />
        </FieldTable>
      </Section>

      <Section title="Business Profile">
        <FieldTable>
          <FieldTableRow
            pairs={[
              ['Authorized Capital Stock', display(report.businessAuthorizedCapitalStock)],
              ['Territory', display(report.businessTerritory)],
            ]}
          />
          <FieldTableRow
            pairs={[
              ['Regular Employees', display(report.businessRegularEmployees)],
              ['Contractual Employees', display(report.businessContractualEmployees)],
            ]}
          />
          <FieldTableRow
            pairs={[
              ['Owner', display(report.businessOwner)],
              ['Date Inspected', display(formatDate(report.visitDate))],
            ]}
          />
        </FieldTable>
      </Section>

      <Section title="Management and Ownership">
        <Stack spacing={1.25}>
          <SubHeading>Management</SubHeading>
          {report.management.length === 0 ? (
            <EmptyNote>No management recorded.</EmptyNote>
          ) : (
            report.management.map((entry, index) => (
              <EntryBlock key={entry.id} title={`Manager ${index + 1}`}>
                <FieldTable>
                  <FieldTableRow
                    pairs={[
                      ['Name', display(entry.fullName)],
                      ['Current Title', display(entry.jobTitle)],
                    ]}
                  />
                  <FieldTableRow
                    pairs={[
                      ['Nationality', display(entry.nationality)],
                      ['Educational Attainment', display(entry.education)],
                    ]}
                  />
                  <FieldTableRow pairs={[['Other Business Affiliations', display(entry.otherBusiness)]]} />
                  <FieldTableRow pairs={[['Residence Address', display(entry.homeAddress)]]} />
                  <FieldTableRow
                    pairs={[
                      ['Spouse / Partner', display(entry.spousePartner)],
                      ['Birthday', display(formatDate(entry.birthdate))],
                    ]}
                  />
                  <FieldTableRow
                    pairs={[
                      ['Place of Birth', display(entry.birthPlace)],
                      ['Mobile Number', display(entry.mobileNumber)],
                    ]}
                  />
                  <FieldTableRow pairs={[['Tax Identification Number', display(entry.tin)]]} />
                </FieldTable>
              </EntryBlock>
            ))
          )}
        </Stack>

        {effectiveBusinessType === 'cooperative' && (
          <Stack spacing={1.25}>
            <SubHeading>Board of Trustees</SubHeading>
            {report.trustees.length === 0 ? (
              <EmptyNote>No trustees recorded.</EmptyNote>
            ) : (
              report.trustees.map((entry, index) => (
                <EntryBlock key={entry.id} title={`Trustee ${index + 1}`}>
                  <FieldTable>
                    <FieldTableRow
                      pairs={[
                        ['Full Name', display(entry.fullName)],
                        ['Position', display(entry.position)],
                      ]}
                    />
                    <FieldTableRow pairs={[['Birthdate', display(formatDate(entry.birthdate))]]} />
                  </FieldTable>
                </EntryBlock>
              ))
            )}
          </Stack>
        )}
        {(effectiveBusinessType === 'corporation' || effectiveBusinessType === 'partnership') && (
          <StockholderList entries={report.stockholders} />
        )}
        {effectiveBusinessType === '' && (
          <EmptyNote>No business type selected — Board of Trustees / Stockholders not applicable.</EmptyNote>
        )}
      </Section>

      <Section title="Location / Facilities">
        <FieldTable>
          <FieldTableRow
            pairs={[['Type of Construction / Description', display(report.premisesConstructionDescription)]]}
          />
          <FieldTableRow pairs={[['Area Description', display(report.premisesAreaDescription)]]} />
          <FieldTableRow
            pairs={[
              ['Location Owned or Rented', display(labelOf(LOCATION_OWNED_LABELS, report.locationOwned))],
              ['Equipment Owned or Leased', display(labelOf(EQUIPMENT_OWNED_LABELS, report.equipmentOwned))],
            ]}
          />
        </FieldTable>
        <RichTextBlock label="Description" html={report.facilitiesDescription} />
      </Section>

      <Section title="Trade Checking">
        <CommercialTradeList title="Customers" entries={report.commercialCustomers} />
        <CommercialTradeList title="Suppliers" entries={report.commercialSuppliers} />
      </Section>

      <Section title="Bank Verification">
        {report.commercialBankAccounts.length === 0 ? (
          <EmptyNote>No bank accounts recorded.</EmptyNote>
        ) : (
          report.commercialBankAccounts.map((entry, index) => (
            <EntryBlock key={entry.id} title={`Bank ${index + 1}`}>
              <FieldTable>
                <FieldTableRow
                  pairs={[
                    ['Bank Name', display(entry.bankName)],
                    ['Branch', display(entry.branch)],
                  ]}
                />
                <FieldTableRow
                  pairs={[
                    ['Account No.', display(entry.accountNumber)],
                    ['Account Type', display(entry.accountType)],
                  ]}
                />
                <FieldTableRow
                  pairs={[
                    ['Ave. Daily Balance', display(formatPeso(entry.averageDailyBalance))],
                    ['Date Verified', display(formatDate(entry.dateVerified))],
                  ]}
                />
                <FieldTableRow pairs={[['Experience', display(entry.experience)]]} />
                <FieldTableRow
                  pairs={[
                    ['Contact Person', display(entry.contactPerson)],
                    ['Contact No.', display(entry.contactNumber)],
                  ]}
                />
              </FieldTable>
            </EntryBlock>
          ))
        )}
      </Section>

      <Section title="Comments">
        <RichTextBlock label="Comments" html={report.commentsNotes} />
      </Section>

      <Section title="Additional Documents">
        <DocumentList entries={report.commercialDocuments} />
      </Section>
    </>
  );
}

// ----------------------------------------------------------------------
// Consumer
// ----------------------------------------------------------------------

function AddressRows({
  province,
  city,
  barangay,
  streetAddress,
  addressType,
  lengthOfStay,
  landmark,
  remarks,
}: {
  province: string;
  city: string;
  barangay: string;
  streetAddress: string;
  addressType: CiReport['residenceAddressType'];
  lengthOfStay: string;
  landmark: string;
  remarks: string;
}) {
  return (
    <FieldTable>
      <FieldTableRow
        pairs={[
          ['Province', display(province)],
          ['City', display(city)],
        ]}
      />
      <FieldTableRow pairs={[['Barangay', display(barangay)]]} />
      <FieldTableRow pairs={[['Street Address', display(streetAddress)]]} />
      <FieldTableRow
        pairs={[
          ['Address Type', display(labelOf(ADDRESS_TYPE_LABELS, addressType))],
          ['Length of Stay', display(lengthOfStay)],
        ]}
      />
      <FieldTableRow pairs={[['Landmark', display(landmark)]]} />
      <FieldTableRow pairs={[['Remarks', display(remarks)]]} />
    </FieldTable>
  );
}

function ConsumerPreview({
  report,
  applicantName,
  comakers,
  isBusinessOwner,
}: {
  report: CiReport;
  applicantName: string;
  comakers: CiComakerEntry[];
  isBusinessOwner: boolean;
}) {
  return (
    <>
      {/* The live form's header chip strip (ConsumerInfoHeader) — plain
          label/value pairs, so shown as a FieldTable under its own header. */}
      <Section title="Applicant Information">
        <FieldTable>
          <FieldTableRow
            pairs={[
              ['Applicant Name', display(applicantName)],
              ['Date Inspected', display(formatDate(report.visitDate))],
            ]}
          />
          <FieldTableRow pairs={[['Residence Address', display(report.residencePermanentAddress || 'Not on file')]]} />
          <FieldTableRow
            pairs={[
              [
                'Business/Work Address',
                display(isBusinessOwner ? report.employerAddress || 'Not yet entered' : 'Not applicable'),
              ],
            ]}
          />
        </FieldTable>
        <RichTextBlock label="Subject As Of" html={report.subjectAsOf} />
      </Section>

      <Section title="Family">
        <RichTextBlock label="Spouse" html={report.spouseNotes} />
        <Stack spacing={1.25}>
          <SubHeading>Children</SubHeading>
          {report.children.length === 0 ? (
            <EmptyNote>No children recorded.</EmptyNote>
          ) : (
            report.children.map((entry, index) => (
              <EntryBlock key={entry.id} title={`Child ${index + 1}`}>
                <FieldTable>
                  <FieldTableRow
                    pairs={[
                      ['Name', display(entry.name)],
                      ['Age', display(entry.age)],
                    ]}
                  />
                  <FieldTableRow pairs={[['Occupation/School', display(entry.occupationOrSchool)]]} />
                </FieldTable>
              </EntryBlock>
            ))
          )}
        </Stack>
      </Section>

      <Section title="Residence/Neighborhood">
        <SubHeading>Permanent Address</SubHeading>
        <AddressRows
          province={report.residenceProvince}
          city={report.residenceCity}
          barangay={report.residenceBarangay}
          streetAddress={report.residenceStreetAddress}
          addressType={report.residenceAddressType}
          lengthOfStay={report.residenceLengthOfStay}
          landmark={report.residenceLandmark}
          remarks={report.residenceRemarks}
        />
        <Box sx={{ pt: 1.5, borderTop: '1px solid #EEF0F5' }}>
          <SubHeading>Present Address</SubHeading>
        </Box>
        {report.presentSameAsPermanent ? (
          <EmptyNote>Same as Permanent Address.</EmptyNote>
        ) : (
          <AddressRows
            province={report.presentProvince}
            city={report.presentCity}
            barangay={report.presentBarangay}
            streetAddress={report.presentStreetAddress}
            addressType={report.presentAddressType}
            lengthOfStay={report.presentLengthOfStay}
            landmark={report.presentLandmark}
            remarks={report.presentRemarks}
          />
        )}
      </Section>

      <Section title="Employment">
        <FieldTable>
          <FieldTableRow
            pairs={[
              ['Employment Status', display(report.employmentStatus)],
              ['Employment Type', display(labelOf(EMPLOYMENT_TYPE_LABELS, report.employmentType))],
            ]}
          />
          <FieldTableRow
            pairs={[
              [isBusinessOwner ? 'Business Name' : 'Employer Name', display(report.employerName)],
              ['Position', display(report.position)],
            ]}
          />
          <FieldTableRow
            pairs={[[isBusinessOwner ? 'Business Address' : 'Employer Address', display(report.employerAddress)]]}
          />
          <FieldTableRow
            pairs={[
              ['Tel. No.', display(report.employerTelNo)],
              ['Email Address', display(report.employerEmail)],
            ]}
          />
          <FieldTableRow
            pairs={[
              ['Salary', display(formatPeso(report.salary))],
              ['Annual Income', display(formatPeso(report.annualIncome))],
            ]}
          />
          <FieldTableRow pairs={[['Length of Service', display(report.lengthOfService)]]} />
          <FieldTableRow
            pairs={[
              ['No. Reg. Employees', display(report.numberOfRegEmployees)],
              ['No. Contr. Employees', display(report.numberOfContrEmployees)],
            ]}
          />
          <FieldTableRow
            pairs={[
              ['Unionized?', display(labelOf(YES_NO_LABELS, report.isUnionized))],
              ['SEC/DTI Reg. No.', display(report.secDtiRegNo)],
            ]}
          />
          <FieldTableRow
            pairs={[
              ['SEC/DTI Reg. Date', display(formatDate(report.secDtiRegDate))],
              ['SEC/DTI Exp. Date', display(formatDate(report.secDtiExpDate))],
            ]}
          />
          <FieldTableRow pairs={[['Remarks', display(report.employmentRemarks)]]} />
        </FieldTable>
      </Section>

      <Section title="Financial Information">
        <RichTextBlock label="Assets" html={report.assetsNotes} />
        <Stack spacing={1.25}>
          <SubHeading>Other Source of Income</SubHeading>
          {report.otherIncomeSources.length === 0 ? (
            <EmptyNote>No other sources of income recorded.</EmptyNote>
          ) : (
            report.otherIncomeSources.map((entry, index) => (
              <EntryBlock key={entry.id} title={`Source ${index + 1}`}>
                <FieldTable>
                  <FieldTableRow
                    pairs={[
                      ['Income Type', display(entry.incomeType)],
                      ['Company Name', display(entry.companyName)],
                    ]}
                  />
                  <FieldTableRow
                    pairs={[
                      ['Owner', display(entry.owner)],
                      ['Percent Of Share', display(formatPercent(entry.percentOfShare))],
                    ]}
                  />
                  <FieldTableRow pairs={[['Remarks', display(entry.remarks)]]} />
                </FieldTable>
              </EntryBlock>
            ))
          )}
        </Stack>
      </Section>

      <Section title="Loan Purpose">
        <RichTextBlock label="Loan Purpose" html={report.loanPurposeNotes} />
      </Section>

      <Section title="Bank Verification">
        {report.bankAccounts.length === 0 ? (
          <EmptyNote>No bank accounts recorded.</EmptyNote>
        ) : (
          report.bankAccounts.map((entry, index) => (
            <EntryBlock key={entry.id} title={`Account ${index + 1}`}>
              <FieldTable>
                <FieldTableRow
                  pairs={[
                    ['Bank Name', display(entry.bankName)],
                    ['Account Type', display(entry.accountType)],
                  ]}
                />
                <FieldTableRow
                  pairs={[
                    ['Account Number', display(entry.accountNumber)],
                    ['Average Monthly Balance', display(formatPeso(entry.averageMonthlyBalance))],
                  ]}
                />
              </FieldTable>
            </EntryBlock>
          ))
        )}
      </Section>

      <Section title="Comaker">
        {comakers.length === 0 ? (
          <EmptyNote>No comaker on file (comakers are added on the Call Report).</EmptyNote>
        ) : (
          comakers.map((comaker, index) => (
            <EntryBlock key={comaker.id} title={`Comaker ${index + 1}`}>
              <FieldTable>
                <FieldTableRow
                  pairs={[
                    ['Name', display(comaker.name)],
                    ['Relationship to Borrower', display(comaker.relationshipToBorrower)],
                  ]}
                />
                <FieldTableRow pairs={[['Address', display(comaker.address)]]} />
                <FieldTableRow pairs={[['Contact Number', display(comaker.contactNumber)]]} />
              </FieldTable>
            </EntryBlock>
          ))
        )}
      </Section>

      <Section title="Health and Habits">
        <RichTextBlock label="Health and Habits" html={report.healthAndHabitsNotes} />
      </Section>

      <Section title="Comments">
        <RichTextBlock label="Comments" html={report.commentsNotes} />
      </Section>

      <Section title="Additional Documents">
        <DocumentList entries={report.consumerDocuments} />
      </Section>
    </>
  );
}

// ----------------------------------------------------------------------

export function CiReportPreview({
  report,
  applicantName,
  financialInfo,
  loanType,
  comakers,
  aiSummary,
}: {
  report: CiReport;
  applicantName: string;
  financialInfo: FinancialInfo | null;
  loanType: 'personal' | 'business' | null;
  comakers: CiComakerEntry[];
  // Pre-computed by the caller with the same buildTranscriptAutoFill()
  // call CiReportCard uses, so this component stays a pure renderer.
  aiSummary: string | null;
}) {
  if (!report.type) {
    return <EmptyNote>Select a report type in the CI Report above to preview it.</EmptyNote>;
  }

  const isBusinessOwner = financialInfo?.employmentStatus === 'Business Owner';

  return (
    <Stack spacing={2.5}>
      <TranscriptLine report={report} aiSummary={aiSummary} />
      {report.type === 'commercial' && (
        <CommercialPreview report={report} financialInfo={financialInfo} loanType={loanType} />
      )}
      {report.type === 'consumer' && (
        <ConsumerPreview
          report={report}
          applicantName={applicantName}
          comakers={comakers}
          isBusinessOwner={isBusinessOwner}
        />
      )}
    </Stack>
  );
}
