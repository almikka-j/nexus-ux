import type {
  AppraisalChattelReport,
  AppraisalMachineriesReport,
  AppraisalReport,
  AppraisalReportBundle,
} from 'src/auth/admin-context';
import {
  createAppraisalChattelReport,
  createAppraisalMachineriesReport,
  createAppraisalMachineryEntry,
  createAppraisalMarketSurveyEntry,
} from 'src/auth/admin-context';

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

// Simulated "AI-generated" lot plot diagram — same technique as
// SAMPLE_COLLATERAL_PHOTO above (inline SVG data URI, `#.jpg` fragment so
// FileThumbnail's extension sniff treats it as an image). No real
// mapping/AI service is called; see appraiser-assignment-card.tsx's
// buildLotPlotImage for the same generator the "Generate Lot Plot" button
// itself calls.
const SAMPLE_LOT_PLOT =
  `data:image/svg+xml;utf8,${encodeURIComponent(
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
      <text x="240" y="300" font-family="sans-serif" font-size="12" fill="#5A6273" text-anchor="middle">14.2569, 121.0583</text>
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

    accountName: applicantName,
    accountAddress: `${bundleTctNumbers.join(', ')}, Quezon City, Metro Manila`,

    registeredOwner: applicantName,
    locationOfProperty: `${bundleTctNumbers.join(', ')}, Quezon City, Metro Manila`,
    landTitles: bundle.realEstateReport.landTitles.map((title) => ({
      ...title,
      fileType: 'TCT',
      titleNo: 'TCT-2026-00001',
      surveyNo: 'Psu-123456',
      bookPageNo: 'Book 45 / Page 12',
      titleRegistrationDate: now.slice(0, 10),
      titleRegistrationPlace: 'Registry of Deeds, Quezon City',
      areaSize: '250',
      lotNo: 'Lot 7',
      zonalValue: '15,000',
      boundaries: 'N: Lot 6; S: Lot 8; E: Road Lot; W: Lot 5',
      technicalSpecification: 'Rectangular lot, level with road, residential zone',
      lotPlotLines: [
        { id: crypto.randomUUID(), label: 'P1-2', northSouth: 'N' as const, degrees: '16', eastWest: 'W' as const, minutes: '30', distanceM: '9' },
        { id: crypto.randomUUID(), label: 'P2-3', northSouth: 'N' as const, degrees: '73', eastWest: 'E' as const, minutes: '30', distanceM: '20' },
        { id: crypto.randomUUID(), label: 'P3-4', northSouth: 'S' as const, degrees: '16', eastWest: 'E' as const, minutes: '30', distanceM: '9' },
        { id: crypto.randomUUID(), label: 'P4-1', northSouth: 'S' as const, degrees: '73', eastWest: 'W' as const, minutes: '30', distanceM: '20' },
      ],
      lotPlotPhotos: [{ fileName: 'Lot-Plot-Sample.svg', fileUrl: SAMPLE_LOT_PLOT, uploadedAt: now }],
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

    utilityPublicConveyance: 'Available',
    utilityElectricity: 'Meralco',
    utilityWater: 'Maynilad',
    utilityGasOthers: 'PLDT',

    improvements: [
      {
        id: crypto.randomUUID(),
        yearConstructed: '2020',
        construction: 'Med',
        condition: 'Good',
        estFloorArea: '1.00',
      },
    ],

    generalConstructionFeatures: 'Single-detached, two-storey residential building',
    particularDescriptions: [
      {
        id: crypto.randomUUID(),
        floorLevel: 'Ground + 2nd floor',
        interiorWallsPartitions: 'Plain cement finish',
        flooring: 'Ceramic tiles',
        doorsWindows: 'Wood panel doors, aluminum sliding windows',
        ceilingRoofing: 'Long-span roofing, gypsum ceiling',
      },
    ],

    basisOfValuationComparables: [
      {
        id: crypto.randomUUID(),
        source: 'BIR RDO 59',
        location: 'Same barangay',
        areaSize: '250',
        priceType: 'Zonal Valuation',
        zonalValue: '15,000',
        value: '15,000',
      },
      {
        id: crypto.randomUUID(),
        source: 'Comparable sales within the vicinity',
        location: 'Same barangay',
        areaSize: '250',
        priceType: 'Selling Price',
        zonalValue: '15,000',
        value: '18,000',
      },
    ],
    fairMarketValuePerSqm: '15,000',
    fairMarketValueTotal: '3,750,000',
    valuationRemarks: 'Based on BIR zonal valuation and comparable sales within the vicinity.',

    conditionsForAcceptance: [
      {
        id: crypto.randomUUID(),
        itemOfProperty: 'Residential lot and improvement',
        ref: bundleTctNumbers[0] ?? '',
        marketable: 'Yes',
        constructionStatusPercent: '100',
        depreciatedValue: '2,500,000',
        appraisedValue: '2,500,000',
      },
    ],

    appraisedValue: '2500000',
    roundedFigures: '2,500,000',
    amountInWords: 'Two Million Five Hundred Thousand Pesos Only',
    leasablePercent: '70',
    leasableAmount: '1,750,000',

    feeAttachments: [
      { fileName: 'Fee-Attachment-Sample.svg', fileUrl: SAMPLE_COLLATERAL_PHOTO, uploadedAt: now },
    ],

    uploadedAt: submit ? now : null,
  };
}

// Chattel counterpart to buildSampleAppraisalReport above — same
// "Fill with Sample Data"/"Simulate: Fill Sample Report" entry points,
// gated by the bundle's own collateralType (see each call site's
// `titleGroups[0]?.collateralType === 'chattel'` check) so a Real Estate
// bundle's sample-fill never also populates this unused report. Builds on
// createAppraisalChattelReport()'s defaulted shape rather than duplicating
// its field list, then overlays realistic values — a plausible pledged
// vehicle (Toyota Hilux), a mix of checked/unchecked accessories and
// good/bad condition ratings (not all-true/all-good, matching this file's
// own "realistic, not placeholder" sample data above), and 2 Market Survey
// comparables.
export function buildSampleChattelReport(
  bundle: AppraisalReportBundle,
  bundleTctNumbers: string[],
  applicantName: string,
  // Same submit/fill distinction as buildSampleAppraisalReport: `true`
  // (Officer's "Simulate: Appraiser Submits Report") stamps `uploadedAt`;
  // `false` (Appraiser's "Simulate: Fill Sample Report") leaves it
  // editable/unsubmitted.
  submit: boolean = true
): AppraisalChattelReport {
  const now = new Date().toISOString();
  const base = createAppraisalChattelReport();

  return {
    ...base,
    accountName: applicantName,
    requestedBy: 'Ramon Cruz',
    purposeOfReport: 'Collateral appraisal for loan application',
    reportDate: now.slice(0, 10),
    eqptUnderApp: '2021 Toyota Hilux 4x2 G Diesel A/T Pickup',
    dateInspected: now.slice(0, 10),
    registeredOwner: applicantName,
    address: `${bundleTctNumbers.join(', ') || 'No. 25 Sampaguita Street'}, Quezon City, Metro Manila`,

    make: 'Toyota',
    mvfNo: 'MVF-2021-00458',
    series: 'Hilux 4x2 G',
    crNo: 'CR-0923847561',
    typeOfBodyDenomination: 'Pickup',
    registrationDate: '2021-03-15',
    yearModel: '2021',
    placeRegistered: 'LTO Quezon City',
    color: 'Silver Metallic',
    chassisNumber: 'MR0FZ8CD7M0123456',
    odometerReading: '42,500 km',
    engineNo: '2GD-0987654',
    plateNo: 'NFT 2456',
    fuel: 'Diesel',

    accessories: base.accessories.map((item, index) => ({
      ...item,
      // Mix of checked/unchecked — first 7 present, last 3 absent, not
      // an all-true placeholder list.
      checked: index < base.accessories.length - 3,
      comments: index < base.accessories.length - 3 ? 'Present, functioning' : 'Not installed',
    })),
    powerFeatures: base.powerFeatures.map((item, index) => ({
      ...item,
      checked: index !== base.powerFeatures.length - 1,
      comments: index !== base.powerFeatures.length - 1 ? 'Working normally' : 'Sticky, needs lubrication',
    })),
    generalCondition: base.generalCondition.map((item, index) => ({
      ...item,
      // One deliberately "Bad" item (Tire/Wheel) among mostly "Good" ones.
      rating: item.label === 'Tire/Wheel' ? ('bad' as const) : ('good' as const),
      comments:
        item.label === 'Tire/Wheel'
          ? 'Rear tires worn, recommend replacement soon'
          : index % 2 === 0
          ? 'Good condition, minor wear consistent with age'
          : 'No visible defects noted',
    })),
    instrumentPanelLighting: base.instrumentPanelLighting.map((item) => ({
      ...item,
      rating: item.label === 'Tail Light' ? ('not-functioning' as const) : ('functioning' as const),
    })),

    marketSurvey: [
      {
        ...createAppraisalMarketSurveyEntry(),
        source: 'Toyota Quezon Avenue (used unit listing)',
        date: now.slice(0, 10),
        type: '2021 Toyota Hilux 4x2 G A/T',
        generalCondition: 'Good, low mileage',
        sellingPrice: '1,150,000',
      },
      {
        ...createAppraisalMarketSurveyEntry(),
        source: 'AutoDeal classified listing',
        date: now.slice(0, 10),
        type: '2020-2021 Toyota Hilux 4x2 G',
        generalCondition: 'Fair to good',
        sellingPrice: '1,080,000',
      },
    ],

    appraisedValue: '1100000',
    loanablePercent: '70',
    appraisedValueRoundOff: '1,100,000',
    loanableAmount: '770,000',
    encumbrancesRemarks: 'Unit is free from any chattel mortgage at time of inspection.',

    fileAttachments: [
      { fileName: 'Chattel-Unit-Photo-Sample.svg', fileUrl: SAMPLE_COLLATERAL_PHOTO, uploadedAt: now },
    ],

    uploadedAt: submit ? now : null,
  };
}

// Machineries counterpart to buildSampleAppraisalReport above — same
// gating/entry-point conventions as buildSampleChattelReport. Builds on
// createAppraisalMachineriesReport()'s defaults (which already seed
// `to`/`from` with the standing memo routing), overlaying a believable
// set of 2-3 shop/production equipment line items with plausible
// acquisition prices and depreciation.
export function buildSampleMachineriesReport(
  bundle: AppraisalReportBundle,
  bundleTctNumbers: string[],
  applicantName: string,
  submit: boolean = true
): AppraisalMachineriesReport {
  const now = new Date().toISOString();
  const base = createAppraisalMachineriesReport();

  return {
    ...base,
    thru: 'Branch Credit Head',
    dateReport: now.slice(0, 10),
    dateInspected: now.slice(0, 10),
    subject: `Appraisal of Machineries and Equipment — ${applicantName}`,
    descriptionOfEquipments:
      `Machineries and shop equipment located at ${bundleTctNumbers.join(', ') || 'the borrower\'s business address'}, ` +
      'Quezon City, Metro Manila, used in the ordinary course of the business\' production/service operations. ' +
      'Units were physically inspected and found operational at the time of appraisal.',

    machineries: [
      {
        ...createAppraisalMachineryEntry(),
        units: '1 unit',
        description: 'Lincoln Electric Arc Welding Machine, 300A, Model SA-300',
        serialNo: 'LE-SA300-88213',
        acquisitionPricePhp: '185,000',
        dateOfProformaInvoice: '2022-06-10',
        appraisedValueLessDepreciation: '130,000',
      },
      {
        ...createAppraisalMachineryEntry(),
        units: '1 unit',
        description: 'Hyundai Diesel Generator Set, 50 kVA, Model DHY6000SE',
        serialNo: 'HY-DHY6000-45102',
        acquisitionPricePhp: '420,000',
        dateOfProformaInvoice: '2021-11-02',
        appraisedValueLessDepreciation: '260,000',
      },
      {
        ...createAppraisalMachineryEntry(),
        units: '2 units',
        description: 'Metal Lathe Machine, 1.5m bed length, bench-type',
        serialNo: 'ML-150-20394',
        acquisitionPricePhp: '96,000',
        dateOfProformaInvoice: '2020-09-18',
        appraisedValueLessDepreciation: '52,000',
      },
    ],

    totalAppraisedValueRoundOff: '442,000',
    loanablePercent: '60',
    loanableAmount: '265,200',
    qualificationRemarks:
      'Units are in good working condition and are suited for continued use in the business\' operations; ' +
      'appraised values reflect current physical condition and estimated remaining useful life.',

    fileAttachments: [
      { fileName: 'Machineries-Photo-Sample.svg', fileUrl: SAMPLE_COLLATERAL_PHOTO, uploadedAt: now },
    ],

    uploadedAt: submit ? now : null,
  };
}
