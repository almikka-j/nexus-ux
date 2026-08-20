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
