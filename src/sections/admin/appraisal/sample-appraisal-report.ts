import type { AppraisalReport, AppraisalReportBundle } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Single source of truth for the sample Appraisal Report data every
// "Simulate: ..." fill-in shortcut across the admin app uses — the
// Officer's AppraisalTctTable ("Simulate: Appraiser Submits Report"), the
// Appraiser's own list and per-bundle detail pages. Previously this
// exact object was duplicated inline inside appraisal-tct-table.tsx;
// pulled out here so every "fill sample report" entry point produces the
// identical values instead of three near-copies drifting apart over
// time.
// ----------------------------------------------------------------------

// Inline SVG placeholder (data URI), same convention sample-application.ts
// uses for its own ID/selfie photos — stands in for a real captured
// Collateral Photo per TCT/OCT, so a sample-filled land title's
// `ReportFileDropzone` renders an actual photo preview instead of the
// empty "Choose a photo" uploader state once the report is submitted and
// locked (e.g. on the Head/Approver's read-only report review).
// `FileThumbnail` decides whether to render the image at all — versus an
// icon — by naively grepping a "file extension" off the tail of the URL
// (`fileTypeByUrl`: `url.split('.').pop()`), which fails on a raw
// `data:image/svg+xml` URI (the last `.` sits deep inside the encoded SVG
// markup, not before a real extension). A trailing `#.jpg` fragment is
// inert to the browser when resolving/rendering a `data:` URI, but gives
// that naive extension check something valid to find, so `FileThumbnail`
// correctly treats this as an image and actually renders it instead of
// falling back to a generic file icon.
const SAMPLE_COLLATERAL_PHOTO =
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#BFD9F2"/>
          <stop offset="1" stop-color="#E7F0FA"/>
        </linearGradient>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#E3C9A3"/>
          <stop offset="1" stop-color="#C9A876"/>
        </linearGradient>
        <linearGradient id="lawn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#8FBF7A"/>
          <stop offset="1" stop-color="#6FA35B"/>
        </linearGradient>
      </defs>
      <rect width="480" height="320" fill="url(#sky)"/>
      <rect x="0" y="235" width="480" height="85" fill="url(#lawn)"/>
      <rect x="0" y="225" width="480" height="14" fill="#B7C4DB" opacity="0.5"/>
      <rect x="120" y="110" width="240" height="130" fill="url(#wall)"/>
      <polygon points="105,110 240,40 375,110" fill="#7A5B44"/>
      <polygon points="120,110 240,52 360,110" fill="#8C6B52"/>
      <rect x="145" y="150" width="45" height="45" fill="#5C7A94"/>
      <rect x="145" y="150" width="45" height="45" fill="none" stroke="#3B4256" stroke-width="2"/>
      <rect x="290" y="150" width="45" height="45" fill="#5C7A94"/>
      <rect x="290" y="150" width="45" height="45" fill="none" stroke="#3B4256" stroke-width="2"/>
      <rect x="218" y="165" width="44" height="65" fill="#5C4630"/>
      <circle cx="252" cy="197" r="2.5" fill="#D8C29B"/>
      <rect x="30" y="200" width="55" height="35" rx="16" fill="#5B8A52"/>
      <rect x="395" y="190" width="50" height="45" rx="18" fill="#5B8A52"/>
      <rect x="0" y="300" width="480" height="20" fill="#000" opacity="0.28"/>
      <text x="14" y="314" font-family="sans-serif" font-size="12" fill="#F2F4F8">Sample photo — collateral inspection</text>
    </svg>`
  )}#.jpg`;

export function buildSampleAppraisalReport(
  bundle: AppraisalReportBundle,
  bundleTctNumbers: string[],
  applicantName: string,
  // The Officer's own "Simulate: Appraiser Submits Report"
  // (AppraisalTctTable) is meant to fast-forward straight to a
  // completed, submitted report — `submit: true` (the default) stamps
  // `uploadedAt` so the bundle immediately reads as "Reported." The
  // Appraiser's own "Simulate: Fill Sample Report" (list and per-bundle
  // detail pages) is meant to auto-fill the fields as a starting point
  // to review/edit, NOT to submit on the appraiser's behalf — those call
  // sites pass `submit: false` so `uploadedAt` stays unset and the form
  // (or external dropzone) remains editable/removable until the
  // appraiser actually submits it themselves.
  submit: boolean = true
): Partial<AppraisalReport> {
  const now = new Date().toISOString();

  if (bundle.appraiserType === 'external') {
    return {
      fileName: 'Appraisal-Report-Sample.pdf',
      fileUrl: '#',
      uploadedAt: submit ? now : null,
    };
  }

  return {
    dateReport: now.slice(0, 10),
    dateInspected: now.slice(0, 10),
    requestingOfficer: 'Ramon Cruz',
    branch: 'Head Office',

    registeredOwner: applicantName,
    locationOfProperty: `${bundleTctNumbers.join(', ')}, Quezon City, Metro Manila`,
    landTitles: bundle.report.landTitles.map((title) => ({
      ...title,
      surveyNo: 'Psu-123456',
      bookPageNo: 'Book 45 / Page 12',
      titleRegistrationDate: now.slice(0, 10),
      titleRegistrationPlace: 'Registry of Deeds, Quezon City',
      areaSize: '250',
      lotNo: 'Lot 7',
      zonalValue: '15,000',
      boundaries: 'N: Lot 6; S: Lot 8; E: Road Lot; W: Lot 5',
      technicalSpecification: 'Rectangular lot, level with road, residential zone',
      photoFileName: 'Collateral-Photo-Sample.svg',
      photoFileUrl: SAMPLE_COLLATERAL_PHOTO,
      photoUploadedAt: now,
    })),
    encumbrancesRemarks: 'None noted at time of inspection.',

    streetFrontage: '10',
    streetWidth: '8',
    surfacing: 'Concrete',
    averageDepth: '25',
    approxShape: 'Rectangular',
    topography: 'Level',
    neighborhood: "Res'l",
    presentUse: 'Residential',
    highestAndBestUse: 'Residential',

    utilityPublicConveyance: 'Available',
    utilityElectricity: 'Meralco',
    utilityWater: 'Maynilad',
    utilityTelephone: 'PLDT',

    generalConstructionFeatures: 'Single-detached, two-storey residential building',
    floorLevel: 'Ground + 2nd floor',
    externalWalls: 'CHB, painted',
    interiorWallsPartitions: 'Plain cement finish',
    flooring: 'Ceramic tiles',
    doorsWindows: 'Wood panel doors, aluminum sliding windows',
    ceilingRoofing: 'Long-span roofing, gypsum ceiling',

    basisSource: 'Comparable sales within the vicinity',
    basisLocation: 'Same barangay',
    basisAreaSize: '250',
    basisPriceType: 'Selling price',
    basisSellingPrice: '18,000',
    fairMarketValuePerSqm: '15,000',

    itemOfProperty: 'Residential lot and improvement',
    fmvRcn: '3,750,000',
    constructionStatusPercent: '100',
    depreciatedValue: '2,500,000',
    appraisedValueP: '2,500,000',

    appraisedValue: '2500000',
    roundedFigures: '2,500,000',
    amountInWords: 'Two Million Five Hundred Thousand Pesos Only',
    loanableAmount: '2,000,000',

    preparedBy: bundle.appraiserName ?? 'Appraiser',
    reviewedBy: 'Maria Santos',
    endorsedBy: 'Jose Reyes',
    notedBy: 'Ramon Cruz',

    uploadedAt: submit ? now : null,
  };
}
