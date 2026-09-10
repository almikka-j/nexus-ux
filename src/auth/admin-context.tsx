'use client';

import { useMemo, useState, useEffect, useContext, createContext } from 'react';

import {
  createInitialFinancialStatementDetails,
  hydrateFinancialStatementDetails,
  patchFinancialStatementDetails,
  type FinancialStatementDetails,
} from 'src/auth/financial-statement-details';
import type { RequirementDocStatus } from 'src/sections/admin/requirement-checklist-docs';
import { REQUIREMENT_DOC_META, APPRAISAL_DOC_META } from 'src/sections/admin/requirement-checklist-docs';

// ----------------------------------------------------------------------

export type AdminUser = {
  email: string;
  firstName: string;
  lastName: string;
};

export type CreditCheckDecision = 'pending' | 'approved' | 'rejected';

/**
 * Whether the (simulated) AI review of the uploaded bureau reports came back
 * clean or found a negative record. `'pending'` until all 5 bureau reports
 * are uploaded; computed exactly once per upload session (see
 * `simulateBureauFinding` in `src/sections/admin/simulate-bureau-finding.ts`)
 * and then sticky — both the Initial Credit Checking page (to decide whether
 * to show `NegativeCreditReportCard`) and `CreditCheckingResultModal` (to
 * decide which content to render) read this same stored value, so they can
 * never disagree.
 */
export type BureauFindingStatus = 'pending' | 'clean' | 'negative';

/** Which bureau's reason pool a negative finding was drawn from — see
 * `simulateBureauFinding` for the reason pools themselves (sourced from the
 * PGFC bureau acceptance/disposition policy table). `null` when
 * `bureauFindingStatus` is not `'negative'`. */
export type BureauFindingBureau = 'NFIS' | 'CMAP' | null;

export type CreditChecking = {
  documentUploaded: boolean;
  documentName: string | null;
  decision: CreditCheckDecision;
  bureauFindingStatus: BureauFindingStatus;
  /** The specific bureau whose reason pool produced the negative finding —
   * set alongside `bureauFindingStatus`/`bureauFindingReason` in the same
   * `simulateBureauFinding` call, sticky for the same reason. */
  bureauFindingBureau: BureauFindingBureau;
  /** The specific policy reason (e.g. "Court Case due to Estafa") that
   * produced the negative finding — see `bureauFindingBureau`. */
  bureauFindingReason: string | null;
  /**
   * Free-form notes the credit-checking officer types while reviewing —
   * carries forward and is shown read-only on later steps (starting with
   * Call Report, via ApplicationDetailsCard) so the next reviewer can see
   * what the officer who handled Initial Credit Checking observed.
   */
  notes: string;
  /**
   * The reason typed into the confirmation dialog when choosing "No" or
   * "For Reconsideration" — distinct from `notes` above (which is a general,
   * always-visible observation field), this is captured only at the moment
   * of that specific decision and shown on the Reconsideration screen as the
   * reason it was sent there.
   */
  decisionReason: string;
  /**
   * Unused — was the officer's own free-text recommendation, editable
   * directly in CreditCheckingResultModal's "Recommendation & Remarks"
   * section. That field was removed: remarks in the result modal now come
   * only from flows like "Proceed with Justification"
   * (justificationText/justificationDocument), not manual typing. Left in
   * place rather than deleted, matching this file's convention of not
   * tearing out state when only its UI is removed.
   */
  officerRecommendation: string;
  /**
   * Optional supporting document attached to the "Proceed with Justification"
   * modal (shown only when bureauFindingStatus === 'negative') — stored as a
   * base64 data URL, same reasoning as every other upload in this prototype
   * (no real file storage backend). Cleared alongside the rest of the
   * negative-finding/justification state by resetNegativeCreditReport-style
   * flows if the officer starts over.
   */
  justificationDocument: { fileName: string; fileData: string } | null;
  /**
   * The officer's typed justification text from that same "Proceed with
   * Justification" modal — previously only folded into the officer-notes
   * log entry (buildOfficerNoteEntry), with no field of its own, so
   * CreditCheckingResultModal's "Recommendation & Remarks" section had no
   * way to surface it next to justificationDocument.
   */
  justificationText: string;
  // The six per-bureau results tables are no longer stored here. Each bureau
  // now holds an array of uploaded report files (`cibiForm.reportFiles`,
  // `loandexFiles`, `cicFiles`, `cmapFiles`, `nfisBapFiles`,
  // `pgfcExposureFiles` on `ApplicationReview`), and each file carries its
  // own seeded sample rows. `useAdmin().bureauResultRows` exposes the
  // flattened-across-files arrays (`cmapCases`, `bapNfisRecords`, …) that the
  // risk engine and result modal consume, so those consumers didn't need to
  // learn the per-file shape.
};

export type CmapCase = {
  id: string;
  defendantSubject: string;
  plaintiff: string;
  natureOfCase: string;
  amountInvolved: string;
  caseNo: string;
  dateFiled: string;
  status: string;
  creditRiskRemarks: string;
};

export type BapNfisRecord = {
  id: string;
  lendingInstitution: string;
  facility: string;
  originalLoanAmount: string;
  dateGranted: string;
  maturityDate: string;
  outstandingBalance: string;
  paymentHistory: string;
  statusRemarks: string;
};

export type CibiResult = {
  id: string;
  provider: string;
  facilityType: string;
  originalAmount: string;
  outstandingBalance: string;
  overdueAmount: string;
  monthlyAmortization: string;
  paymentStatus: string;
  remarks: string;
};

export type CicContract = {
  id: string;
  contractCode: string;
  contractType: string;
  maturityDate: string;
  outstandingBalance: string;
  overdueAmount: string;
  monthlyAmortization: string;
  contractStatus: string;
  remarks: string;
};

export type LoandexRecord = {
  id: string;
  bankInstitution: string;
  loanFacility: string;
  maturityDate: string;
  outstandingBalance: string;
  overdueAmount: string;
  monthlyAmortization: string;
  accountStatus: string;
  remarks: string;
};

export type PgfcExposureRecord = {
  id: string;
  principalBalance: string;
  interestBalance: string;
  maturityDate: string;
  remainingTerm: string;
  lastPaymentDate: string;
  monthlyAmortization: string;
  paymentStatus: string;
  remarks: string;
};

export type CibiForm = {
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  contactType: string;
  contactNumber: string;
  addressRegion: string;
  addressProvince: string;
  addressCity: string;
  addressStreet: string;
  idType: string;
  idNumber: string;
  creditPurpose: string;
  creditType: string;
  financedAmount: string;
  terms: string;
  installment: string;
  submitted: boolean;
  /**
   * The returned CIBI report(s). The Create Report / Submit to CIBI intake
   * flow above is unchanged; only the returned document became multi-file —
   * an officer can attach more than one report file, each carrying its own
   * seeded `CibiResult` rows. Was `reportFile`/`reportFileName`/
   * `reportUploadedAt` (three scalars) before multi-file support.
   */
  reportFiles: BureauReportFile[];
};

// One uploaded bureau report file plus the sample results-table rows seeded
// for it. Every bureau (CIBI's returned report, LOANDEX, CIC, CMAP, NFIS/BAP,
// PGFC Existing Exposure) now holds an *array* of these — an officer can
// upload multiple files per bureau, and each file renders its own results
// table (see bureau-reports-card.tsx / bureau-results-tables.tsx). `rows`
// holds 2–3 canned rows of that bureau's row type, seeded when the file is
// added and re-seeded fresh when the file is replaced; there is still no
// officer-editable entry flow. Replaced the single `BureauUpload` object
// (`{fileName, fileData, uploadedAt}`) that each bureau held before.
export type BureauReportFile = {
  id: string;
  fileName: string;
  fileData: string;
  uploadedAt: string;
  rows: BureauResultRow[];
};

export type BureauResultRow =
  | CmapCase
  | BapNfisRecord
  | CibiResult
  | CicContract
  | LoandexRecord
  | PgfcExposureRecord;

/** Which bureau an `addBureauReportFiles`/`replaceBureauReportFile`/
 * `removeBureauReportFile` call targets. `'cibi'` maps to
 * `cibiForm.reportFiles`; the rest map to the same-named `*Files` array on
 * `ApplicationReview`. */
export type BureauFileKind = 'cibi' | 'loandex' | 'cic' | 'cmap' | 'nfisBap' | 'pgfcExposure';

// Retained (unused) alias — kept rather than deleted, matching this file's
// convention of not tearing out exported names other code may still import.
export type BureauUpload = {
  fileName: string | null;
  fileData: string | null;
  uploadedAt: string | null;
};

export type LoandexUpload = BureauUpload;

export type Reconsideration = {
  notes: string;
  decision: CreditCheckDecision;
};

// The four repeatable lists on the manual Negative Credit Checking Report
// share one entry shape — `label` is "Account Name" for `accountFindings`
// and the one free-text line for each of the three special sections.
export type NegativeReportEntryListKey =
  | 'accountFindings'
  | 'cancelledCreditCards'
  | 'adverseClassifiedLoans'
  | 'closedCurrentAccounts';

export type NegativeReportEntry = {
  id: string;
  label: string;
  findings: string;
};

/**
 * Filled out by the officer only when `CreditChecking.bureauFindingStatus`
 * comes back `'negative'` — see `NegativeCreditReportCard`. Every field is
 * optional except `recommendationRemarks`, which is required before
 * `submitted` can be set to `true`. `to`/`from`/`date`/`subject` are not
 * stored here — they're either fixed strings or trivially derived at render
 * time (see `NegativeCreditReportCard` and `CreditCheckingResultModal`).
 */
export type NegativeCreditReport = {
  thru: string;
  negativeRecordText: string;
  accountFindings: NegativeReportEntry[];
  cancelledCreditCards: NegativeReportEntry[];
  adverseClassifiedLoans: NegativeReportEntry[];
  closedCurrentAccounts: NegativeReportEntry[];
  recommendationRemarks: string;
  submitted: boolean;
};

export type InteractionType = 'in-person' | 'phone' | 'video';
export type IdentityStatus = 'confirmed' | 'for-verification' | 'unable-to-confirm';
export type IdentityBasisItem = 'app-data-matched' | 'valid-government-id' | 'verification-questions' | 'other';

export type ValidationStatus = 'confirmed' | 'changed' | 'unable-to-verify' | '';

export type LoanFacilityType = 'sme-business' | 'clean-loan' | 'sangla-titulo' | 'clubflex-direct' | 'clubflex-financing';

export type LoanPurposeType =
  | 'additional-working-capital'
  | 'new-business-venture'
  | 'loan-take-out-refinancing'
  | 'home-renovation-construction'
  | 'residential-property-acquisition'
  | 'commercial-property-acquisition'
  | 'machinery-equipment-acquisition'
  | 'club-share-acquisition'
  | 'raw-land-acquisition-development'
  | 'bridge-financing'
  | 'other';

export type WorkingCapitalUse =
  | 'inventory-stock'
  | 'raw-materials'
  | 'supplier-payments'
  | 'payroll-employee-costs'
  | 'operating-expenses'
  | 'seasonal-working-capital'
  | 'contract-project-financing'
  | 'cash-flow-support'
  | 'business-expansion'
  | 'other';

export type RepaymentSourceType =
  | 'employment-salary'
  | 'business-income'
  | 'rental-income'
  | 'remittance'
  | 'pension'
  | 'professional-fees'
  | 'commission-based'
  | 'dividend-investment-income'
  | 'other';

export type EmploymentTenureRange = 'lt-1' | '1-3' | '3-5' | 'gt-5';

export type CollateralDeclarationType =
  | 'real-estate'
  | 'club-share'
  | 'vehicle'
  | 'equipment'
  | 'inventory'
  | 'receivables'
  | 'unsecured'
  | 'corporate-guarantee'
  | 'other';

export type YesNoVerify = 'yes' | 'no' | 'for-verification';
export type PaymentHistoryDescriptor = 'on-time' | 'minor-delays' | 'major-delays' | 'for-verification';

export type UnderstandingLevel = 'fully-understood' | 'clarification-required' | 'not-yet-discussed';
export type LoanTermItem =
  | 'interest-rate'
  | 'loan-amount'
  | 'loan-term'
  | 'monthly-amortization'
  | 'processing-fees'
  | 'documentary-requirements'
  | 'collateral-requirements'
  | 'loan-release-process'
  | 'pre-termination-prepayment-policy';

export type ProposalInterestRateBasis = 'monthly' | 'annual';
export type ProposalComputationType = 'diminishing-balance' | 'add-on' | 'other';

export type AoPreliminaryRiskLevel = 'low' | 'moderate' | 'high' | 'unable-to-determine';
export type RiskDriverItem = 'character' | 'capacity' | 'collateral' | 'kyc' | 'documentation' | 'information-consistency';
export type CallDispositionType =
  | 'proceed-to-next-process'
  | 'proceed-subject-to-requirements'
  | 'additional-verification'
  | 'follow-up-call'
  | 'sales-reject-decline';

export type SystemVarianceStatus = 'none' | 'noted' | '';

export type ValidationItemKey =
  | 'identityAuthorizedRep'
  | 'loanFacility'
  | 'loanPurpose'
  | 'primaryRepaymentSource'
  | 'businessEmploymentInfo'
  | 'existingLoansObligations'
  | 'residenceBusinessAddress'
  | 'collateralSecurityDeclaration'
  | 'comakerGuarantee';

export type ExistingLoanRow = {
  id: string;
  lender: string;
  loanType: string;
  outstandingBalance: string;
  monthlyPayment: string;
};

export type LoanTakeOutInfo = {
  currentLender: string;
  outstandingBalance: string;
  estimatedPayoffAmount: string;
  remainingLoanTerm: string;
  reasonForTakeOut: string;
  status: string;
};

export type CallReportComakerChange = {
  completeName: string;
  completeAddress: string;
  contactNumber: string;
  relationshipToBorrower: string;
  occupationEmployerName: string;
  yearsInEmploymentBusiness: string;
  primaryIdTypeAndNumber: string;
  secondaryIdTypeAndNumber: string;
  remarks: string;
};

export type CiComakerEntry = {
  id: string;
  name: string;
  relationshipToBorrower: string;
  address: string;
  contactNumber: string;
  occupation: string;
  monthlyIncome: string;
};

export type CiChildEntry = {
  id: string;
  name: string;
  age: string;
  occupationOrSchool: string;
};

export type CiTradeEntry = {
  id: string;
  name: string;
  address: string;
  contactNumber: string;
  natureOfDealing: string;
  yearsOfDealing: string;
};

export type CiIncomeSourceEntry = {
  id: string;
  source: string;
  monthlyAmount: string;
  remarks: string;
};

export type CiBankAccountEntry = {
  id: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  averageMonthlyBalance: string;
};

export type NextStepItem =
  | 'submit-proof-of-income'
  | 'submit-bank-statements'
  | 'submit-business-documents'
  | 'submit-utility-bills'
  | 'submit-credit-card-statements'
  | 'verify-employment'
  | 'verify-business'
  | 'verify-residence'
  | 'conduct-site-visit'
  | 'submit-collateral-documents'
  | 'request-appraisal'
  | 'schedule-follow-up-call'
  | 'proceed-to-next-process'
  | 'other';

export type ResponsibleParty = 'borrower' | 'account-officer' | 'credit-officer' | 'other';

export type InterestRateBasis = 'monthly' | 'annual';
export type ComputationType = 'diminishing-balance' | 'add-on-rate' | 'other';
export type PaymentFrequency = 'monthly' | 'quarterly' | 'semi-annual' | 'other';

export type AdjustmentReason =
  | 'income-capacity'
  | 'existing-obligations'
  | 'collateral-value'
  | 'credit-risk'
  | 'exceeds-affordability'
  | 'borrower-requested'
  | 'officer-recommendation'
  | 'other';

export type RequiredDocItem =
  | 'latest-payslip'
  | 'itr'
  | 'bir-2316'
  | 'coe'
  | 'bank-statements'
  | 'business-registration'
  | 'financial-statements'
  | 'utility-bills'
  | 'credit-card-statements'
  | 'collateral-ownership-docs'
  | 'tax-declaration'
  | 'transfer-certificate-title'
  | 'vehicle-registration'
  | 'appraisal-report'
  | 'co-maker-documents'
  | 'guarantor-documents'
  | 'other';

export type ConditionItem =
  | 'income-verification'
  | 'employment-verification'
  | 'business-verification'
  | 'residence-verification'
  | 'satisfactory-bureau-checking'
  | 'collateral-appraisal'
  | 'complete-documents'
  | 'additional-collateral'
  | 'co-maker-or-guarantor'
  | 'reduction-of-amount'
  | 'adjustment-of-term'
  | 'other';

export type PreliminaryRecommendation =
  | 'proceed-as-requested'
  | 'proceed-with-revised-terms'
  | 'proceed-with-conditions'
  | 'needs-additional-verification'
  | 'schedule-follow-up'
  | 'hold'
  | 'do-not-proceed';

export type CallReportApprovalStatus = 'not-submitted' | 'pending-approval' | 'approved';

export type CallReport = {
  callReportApprovalStatus: CallReportApprovalStatus;
  callReportSubmittedAt: string | null;
  callReportApprovedAt: string | null;
  // The approver's typed name — there is no real second-officer login in
  // this prototype (same convention as Appraisal's/CI Fee's simulated
  // approvals), so this is how "who approved this Call Report" is
  // captured. Set only by the Call Report Approval screen's Approve
  // action; null until then.
  callReportApprovedBy: string | null;
  decisionReason: string;

  // 1. Interaction Record
  interactionType: InteractionType | '';
  callVisitDate: string;
  callTime: string;
  interviewedPerson: string;
  relationshipToBorrower: string;
  identityStatus: IdentityStatus | '';
  identityBasis: IdentityBasisItem[];
  identityBasisOther: string;

  // 2. Application Validation
  validation: Record<ValidationItemKey, ValidationStatus>;
  materialChangesNotes: string;

  identityAuthorizedRepChangedTo: string;
  identityAuthorizedRepChangeReason: string;

  loanFacilityChangedTo: LoanFacilityType | '';
  loanFacilityChangeReason: string;

  loanPurposeChangedTo: LoanPurposeType | '';
  loanPurposeOtherText: string;
  workingCapitalUse: WorkingCapitalUse | '';
  workingCapitalUseOtherText: string;
  loanTakeOutInfo: LoanTakeOutInfo;

  primaryRepaymentSourceChangedTo: RepaymentSourceType | '';
  repaymentSourceOtherText: string;

  employerBusinessNameChanged: string;
  employmentBusinessAddressChanged: string;
  declaredMonthlyIncomeChanged: string;
  employmentBusinessTenureChanged: EmploymentTenureRange | '';
  businessEmploymentOtherChange: string;

  existingLoanRows: ExistingLoanRow[];

  residenceBusinessAddressChangedTo: string;
  residenceBusinessAddressChangeReason: string;

  collateralDeclarationChangedTo: CollateralDeclarationType[];
  collateralDeclarationOtherText: string;

  comakerChange: CallReportComakerChange;
  comakers: CiComakerEntry[];

  // 3. AML / KYC Questions
  amlIsPep: YesNoVerify | '';
  amlIsPgfcRelatedParty: YesNoVerify | '';
  amlHasExistingLoans: YesNoVerify | '';
  amlPaymentHistory: PaymentHistoryDescriptor | '';
  amlHasReturnedChecks: YesNoVerify | '';
  amlHasPastDueObligations: YesNoVerify | '';

  // 4. Customer Understanding of Loan Terms & Requirements
  understandingLevel: UnderstandingLevel | '';
  termsUnderstood: LoanTermItem[];
  concernsClarifications: string;

  // 6. Proposed Loan Package (PDF's own section number — see source PDF)
  originalRequestedAmount: string;
  proposalInterestRate: string;
  proposalInterestRateBasis: ProposalInterestRateBasis | '';
  proposedFacilityProduct: string;
  proposalComputationType: ProposalComputationType | '';
  proposalComputationTypeOther: string;
  proposedLoanAmount: string;
  estimatedMonthlyAmortization: string;
  proposedLoanTermMonths: string;
  otherRequest: string;

  // 7. AO Preliminary Risk & Call Disposition
  /**
   * The officer's own preliminary risk rating for this application, based on
   * the call — distinct from primaryRiskDrivers (what drives the risk) and
   * callDisposition (what to do about it). Neither of those actually states
   * a risk level, which the card's own title promises.
   */
  preliminaryRiskLevel: AoPreliminaryRiskLevel | '';
  primaryRiskDrivers: RiskDriverItem[];
  callDisposition: CallDispositionType | '';
  reasonKeyCondition: string;

  // 8. NEXUS System Validation / Exception Handoff (rendered on-page as
  // "AI review, summary & recommendation"). aoVsSystemVariance/
  // varianceExplanation are computed by buildCallReportVariance()
  // (comparing preliminaryRiskLevel against the system's own AI
  // recommendation level) on "Refresh AI Review" — not officer-entered,
  // despite still being plain persisted fields like the rest of this shape.
  aiSummary: string;
  aiExceptions: string;
  aiRecommendation: string;
  aoVsSystemVariance: SystemVarianceStatus;
  varianceExplanation: string;

  // Account Officer Endorsement Declaration — unused. EndorsementDeclarationCard
  // and CallReportResultModal both show Account Officer / Date-Time read-only,
  // derived live from application.assignedOfficer and
  // review.stepTimestamps.callReport instead of these fields. Left in place
  // rather than deleted, matching this file's convention of not tearing out
  // state when only its UI is removed.
  accountOfficerName: string;
  accountOfficerDateTime: string;
};

export function createExistingLoanRow(): ExistingLoanRow {
  return { id: crypto.randomUUID(), lender: '', loanType: '', outstandingBalance: '', monthlyPayment: '' };
}

function createEmptyLoanTakeOutInfo(): LoanTakeOutInfo {
  return {
    currentLender: '',
    outstandingBalance: '',
    estimatedPayoffAmount: '',
    remainingLoanTerm: '',
    reasonForTakeOut: '',
    status: '',
  };
}

function createEmptyComakerChange(): CallReportComakerChange {
  return {
    completeName: '',
    completeAddress: '',
    contactNumber: '',
    relationshipToBorrower: '',
    occupationEmployerName: '',
    yearsInEmploymentBusiness: '',
    primaryIdTypeAndNumber: '',
    secondaryIdTypeAndNumber: '',
    remarks: '',
  };
}

function createEmptyValidation(): Record<ValidationItemKey, ValidationStatus> {
  return {
    identityAuthorizedRep: '',
    loanFacility: '',
    loanPurpose: '',
    primaryRepaymentSource: '',
    businessEmploymentInfo: '',
    existingLoansObligations: '',
    residenceBusinessAddress: '',
    collateralSecurityDeclaration: '',
    comakerGuarantee: '',
  };
}

export type RequirementDoc = {
  key: string;
  status: RequirementDocStatus;
  aiNote: string;
  fileName: string | null;
  fileUrl: string | null;
  uploadedAt: string | null;
  uploadedBy: string | null;
  remarks: string;
  // Separate from `status` (the AI-assigned Verified/Needs Review/Missing
  // read) — this is the officer's own confirmation that they've looked at
  // the document, toggled independently via "Mark as Reviewed" in
  // RequirementDocRow. A document can be AI-verified but not yet
  // officer-reviewed, or vice versa.
  reviewed: boolean;
};

// Real estate (TCT/CCT title) or chattel (no title document — e.g. a
// vehicle or equipment) — the Collateral table/Assign Appraiser flow works
// the same either way, but the label and appraisal approach differ enough
// to track explicitly per entry rather than assuming every pledged item is
// titled real property.
export type AppraisalCollateralType = 'real-estate' | 'chattel';

// One property/collateral pledged toward this application, identified by
// its collateral number (a TCT/CCT number for real estate; a plate/serial
// number for chattel — the field itself stays freeform text either way).
// Each carries its own full, independent copy of APPRAISAL_DOC_META's 8
// documents — a borrower with multiple pledged properties has one group
// per property, each tracked separately (see
// requirement-checklist-docs.ts's header comment for why these are NOT
// shared the way Working Visa/Statement of Account etc. are across Credit
// Investigation and Financial Evaluation).
export type AppraisalTctGroup = {
  id: string;
  tctNumber: string;
  collateralType: AppraisalCollateralType;
  documents: RequirementDoc[];
  // Points at the AppraisalReportBundle (below) this property has been
  // folded into, if any. null = not yet selected into any report — the
  // TCT table's checkbox is only selectable while this is null or while
  // it points at a bundle whose report is not yet submitted.
  reportId: string | null;
};

export type OutreachChannel = 'email' | 'whatsapp' | 'viber';

export type OutreachMessage = {
  id: string;
  channel: OutreachChannel;
  text: string;
  sentAt: string;
};

// A targeted "Request Document" send from the Collateral titles table —
// scoped to one TCT/CCT group and a specific subset of its APPRAISAL_DOC_META
// document keys, distinct from the page-level outreachMessages above (which
// send a single freeform message, not tied to a property or document list).
export type DocumentRequestMessage = {
  id: string;
  tctGroupId: string;
  documentKeys: string[];
  remarks: string;
  sentAt: string;
};

export type RequirementChecklist = {
  documents: RequirementDoc[];
  appraisalGroups: AppraisalTctGroup[];
  // Officer-declared "this application has no real-estate collateral" state
  // — when true, Appraisal's required documents are excluded entirely from
  // the header counter/Endorse gate/AI summary, instead of the default
  // assumption that every application has at least one pledged property.
  // Mutually exclusive with appraisalGroups in the UI (the toggle button is
  // blocked while any group exists) but not enforced at the type level.
  appraisalNotApplicable: boolean;
  collateralNotes: string;
  // Full history of "Request Documents" sends, shown in
  // RequestDocumentsDrawer's message list — a simulated outreach (no real
  // email/WhatsApp/Viber message is ever sent anywhere in this prototype).
  // The Requirement Checklist card's "Documents requested" banner derives
  // from this array's last entry rather than a separate snapshot field.
  outreachMessages: OutreachMessage[];
  // History of per-TCT "Request Document" sends from the Collateral titles
  // table (see DocumentRequestMessage above) — independent of
  // outreachMessages since each entry targets one property + a document list.
  documentRequests: DocumentRequestMessage[];
  endorsed: boolean;
  /**
   * Set by Sales Reject — same reason-dropdown + optional-remarks pattern as
   * `CreditChecking.decisionReason`/`CallReport.decisionReason`, combined
   * into one string. Was previously a "Return to Applicant" action
   * (`returnedToApplicant`/`returnReason`); renamed when that flow was
   * replaced to match Initial Credit Checking's Sales Reject.
   */
  rejected: boolean;
  decisionReason: string;
};

export type CiFeeStatus = 'not-requested' | 'pending-approval' | 'approved' | 'not-applicable';

export type CreditInvestigationDoc = RequirementDoc & {
  // Only set on ad-hoc officer-added rows (via "+ Add document"), which have
  // no fixed CreditInvestigationDocMeta entry to look up a label from.
  isCustom?: boolean;
  label?: string;
};

export type CiReport = {
  // Site visit
  visitDate: string;
  subjectAsOf: string; // rich text (HTML)

  // Spouse
  spouseNotes: string; // rich text (HTML)

  // Children
  children: CiChildEntry[];

  // Residence/Neighborhood
  residencePermanentAddress: string; // read-only display, sourced from personalInfo
  residenceLeasedType: 'owned' | 'leased' | 'rent-free' | '';
  residenceLengthOfStay: string;
  residenceLandmark: string;
  residenceRemarks: string;
  presentAddress: string;
  presentLeasedType: 'owned' | 'leased' | 'rent-free' | '';
  presentLengthOfStay: string;
  presentLandmark: string;
  presentRemarks: string;

  // Employment
  employmentStatus: string; // read-only display, sourced from financialInfo
  employmentType: 'direct' | 'agency' | 'self-employed' | '';
  employerName: string;
  position: string;
  employerAddress: string;
  employerTelNo: string;
  employerEmail: string;
  salary: string;
  annualIncome: string;
  lengthOfService: string;
  numberOfRegEmployees: string;
  numberOfContrEmployees: string;
  isUnionized: 'yes' | 'no' | '';
  secDtiRegNo: string;
  secDtiRegDate: string;
  secDtiExpDate: string;
  employmentRemarks: string;

  // Trade Checking
  suppliers: CiTradeEntry[];
  customers: CiTradeEntry[];

  // Assets
  assetsNotes: string; // rich text (HTML)

  // Other Source of Income
  otherIncomeSources: CiIncomeSourceEntry[];

  // Loan Purpose (required)
  loanPurposeNotes: string; // rich text (HTML)

  // Bank Verification
  bankAccounts: CiBankAccountEntry[];

  // Negative Record
  negativeRecordSourceNote: string;
  negativeRecordFinding: 'no-negative-findings-both-cmap-nfis' | 'negative-findings-found' | '';
  negativeRecordRemarks: string; // rich text (HTML)

  // Health and Habits
  healthAndHabitsNotes: string; // rich text (HTML)

  // Comments
  commentsNotes: string; // rich text (HTML)

  // Recommendation
  recommendation: 'proceed-as-requested' | 'proceed-with-conditions' | 'needs-additional-verification' | '';
  recommendationNotes: string;

  // Transcript
  transcriptFileName: string | null;
  transcriptUploadedAt: string | null;
};

// Whether a bundle needs an Appraisal Fee at all, and its proposed amount
// if so — decided per bundle, at assign time (the Assign Appraiser
// modal's Yes/No question), not as one app-wide decision. `null` means
// not yet decided (only reachable defensively; the modal always resolves
// this before the bundle can be created in the normal flow).
export type FeeNeeded = 'yes' | 'no' | null;

// The single whole-application "batch" a set of per-bundle proposed fees
// travels through together — every bundle's fee is drafted individually
// at assign time, but they're only ever sent to the Head/approver as one
// combined request via "Submit Fees for Approval" once every pledged
// property has an appraiser (and therefore a fee decision) assigned.
// Declining resets every bundle's fee draft back to undecided so the
// officer re-proposes for all of them, not just one.
export type FeeApprovalStatus = 'not-submitted' | 'pending-approval' | 'approved' | 'declined';

export type AppraiserType = 'inhouse' | 'external';

// Per-title (TCT/OCT) land details inside an in-house Appraisal Report,
// one entry per AppraisalTctGroup covered by the bundle — mirrors the
// "LAND" / "BOUNDARIES" / "TECHNICAL SPECIFICATION" tables in the printed
// Appraisal Report (REM) PDF, which repeat once per title.
export type AppraisalReportLandTitle = {
  tctGroupId: string;
  surveyNo: string;
  bookPageNo: string;
  titleRegistrationDate: string;
  titleRegistrationPlace: string;
  areaSize: string;
  lotNo: string;
  zonalValue: string;
  boundaries: string;
  technicalSpecification: string;
  // One photo of the collateral itself, per TCT/OCT — same
  // fileName/fileUrl/uploadedAt triplet every other single-file upload in
  // this app uses (RequirementDoc, the external-appraiser report file,
  // etc.), not an array, since exactly one photo per title is all this
  // needs.
  photoFileName: string | null;
  photoFileUrl: string | null;
  photoUploadedAt: string | null;
};

function createAppraisalReportLandTitle(tctGroupId: string): AppraisalReportLandTitle {
  return {
    tctGroupId,
    surveyNo: '',
    bookPageNo: '',
    titleRegistrationDate: '',
    titleRegistrationPlace: '',
    areaSize: '',
    lotNo: '',
    zonalValue: '',
    boundaries: '',
    technicalSpecification: '',
    photoFileName: null,
    photoFileUrl: null,
    photoUploadedAt: null,
  };
}

// Full in-house Appraisal Report — matches the printed "Appraisal Report
// (REM)" PDF section-by-section (LAND, ENCUMBRANCES/REMARKS, BOUNDARIES,
// TECHNICAL SPECIFICATION, SOURCE OR KIND OF UTILITIES, IMPROVEMENT /
// GENERAL CONSTRUCTION FEATURES, PARTICULAR DESCRIPTION, BASIS OF
// VALUATION (LAND), REMARKS/ADDITIONAL INFORMATION, the FMV/RCN valuation
// table, and the Prepared/Reviewed/Endorsed/Noted by signature chain).
// `landTitles` holds one entry per pledged property (AppraisalTctGroup)
// the bundle covers, since those sections repeat per TCT/OCT in the PDF —
// everything else is one shared set of fields for the whole report.
// External appraisers skip all of this and just upload a finished file
// (fileName/fileUrl/uploadedAt), same as before.
export type AppraisalReport = {
  dateReport: string;
  dateInspected: string;
  requestingOfficer: string;
  branch: string;

  registeredOwner: string;
  locationOfProperty: string;
  landTitles: AppraisalReportLandTitle[];
  encumbrancesRemarks: string;

  streetFrontage: string;
  streetWidth: string;
  surfacing: string;
  averageDepth: string;
  approxShape: string;
  topography: string;
  neighborhood: string;
  presentUse: string;
  highestAndBestUse: string;

  utilityPublicConveyance: string;
  utilityElectricity: string;
  utilityWater: string;
  utilityTelephone: string;

  generalConstructionFeatures: string;
  floorLevel: string;
  externalWalls: string;
  interiorWallsPartitions: string;
  flooring: string;
  doorsWindows: string;
  ceilingRoofing: string;

  basisSource: string;
  basisLocation: string;
  basisAreaSize: string;
  basisPriceType: string;
  basisSellingPrice: string;
  fairMarketValuePerSqm: string;

  remarksAdditionalInfo: string;

  itemOfProperty: string;
  fmvRcn: string;
  constructionStatusPercent: string;
  depreciatedValue: string;
  appraisedValueP: string;

  appraisedValue: string;
  roundedFigures: string;
  amountInWords: string;
  loanableAmount: string;

  preparedBy: string;
  reviewedBy: string;
  endorsedBy: string;
  notedBy: string;

  // Legacy free-text fields, kept for the officer-facing summary and the
  // Recommendation input the source process diagram calls for — distinct
  // from the structured PDF fields above.
  propertyDetails: string;
  remarks: string;
  recommendation: string;

  fileName: string | null;
  fileUrl: string | null;
  uploadedAt: string | null;
};

// One "Appraisal Report" the officer creates by selecting one or more
// pledged properties (AppraisalTctGroup) from the TCT table and assigning
// a single appraiser to that selection — tctGroupIds.length === 1 is a
// "single" report, 2+ is "consolidated", matching the source process
// diagram's "Prepare/upload document for Single/consolidated appraisal
// report" step. Replaces the old single whole-application
// Appraisal.appraiserType/Appraisal.report fields below.
export type AppraisalReportBundle = {
  id: string;
  tctGroupIds: string[];
  appraiserType: AppraiserType | null;
  // The specific person/company doing the appraisal, chosen from
  // APPRAISER_ROSTER — distinct from appraiserType (in-house/external),
  // which only says which path's form/dropzone renders below. null until
  // the officer picks one in the Assign Appraiser modal.
  appraiserName: string | null;
  targetCompletionDate: string | null;
  // Proposed at assign time (Assign Appraiser modal's Yes/No + fields) —
  // this bundle's own draft fee, independent of every other bundle's.
  // Locks once the whole batch is submitted (Appraisal.feeApprovalStatus
  // !== 'not-submitted'); a decline resets these back to undecided.
  feeNeeded: FeeNeeded;
  feeAmount: string;
  feeDescription: string;
  feeRemarks: string;
  report: AppraisalReport;
};

// Sample roster for the "Assign to" picker in the Assign Appraiser modal —
// deliberately separate from application-list-view.tsx's OFFICER_ROSTER
// (loan officers), since an appraiser is a different role entirely.
export const APPRAISER_ROSTER = [
  'Ramon Dela Cruz (In-house)',
  'Liza Fernandez (In-house)',
  'Norte Appraisal Services',
  'PhilValue Appraisers Inc.',
  'Metro Realty Appraisal Group',
];

export type HeadApprovalStatus = 'pending' | 'approved' | 'declined';

// ----------------------------------------------------------------------
// Shared by CI Fee and Appraisal Fee — the officer-entered internal
// record of how an *approved* fee was actually paid/deposited (method,
// account, OR number, proof of deposit). Distinct from
// Appraisal.paymentReceivedAt, which is a simulated timestamp for the
// *client* having paid the appraisal fee via Sendit — that's a separate
// concept this record doesn't read or write. See docs/210-request-payments.md.
// ----------------------------------------------------------------------

export type PaymentMethod = 'cash' | 'check' | 'bank-transfer' | 'gcash';

export const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'bank-transfer', label: 'Bank Transfer' },
  { value: 'gcash', label: 'GCash / E-wallet' },
];

// Fixed sample roster for the "Deposited To" picker — same convention as
// APPRAISER_ROSTER, no real bank/accounting integration in this prototype.
export const DEPOSITED_TO_ROSTER = ['BDO - Main Account', 'BPI - Main Account', 'Petty Cash'];

export type PaymentDetails = {
  paymentMethod: PaymentMethod | null;
  depositedTo: string | null;
  orNumber: string;
  orDate: string;
  attachmentFileName: string | null;
  attachmentFileUrl: string | null;
  remarks: string;
  // Stamped by "Mark as Paid"; null means still pending payment.
  paidAt: string | null;
};

export function createEmptyPaymentDetails(): PaymentDetails {
  return {
    paymentMethod: null,
    depositedTo: null,
    orNumber: '',
    orDate: '',
    attachmentFileName: null,
    attachmentFileUrl: null,
    remarks: '',
    paidAt: null,
  };
}

export type Appraisal = {
  // Whole-application batch state every bundle's individually-proposed
  // fee travels through together — see FeeApprovalStatus above.
  feeApprovalStatus: FeeApprovalStatus;
  feeDeclineReason: string;
  feeSubmittedAt: string | null;
  feeApprovedAt: string | null;
  clientNotifiedAt: string | null;
  sentToOdooAt: string | null;
  paymentReceivedAt: string | null;
  // The LMS's own internal payment record for the whole approved fee
  // batch (one record, not per bundle — see createEmptyPaymentDetails
  // above). Reset back to empty whenever the batch is declined or reset,
  // same as every other batch-level fee field.
  feePayment: PaymentDetails;
  reportBundles: AppraisalReportBundle[];
  headApprovalStatus: HeadApprovalStatus;
  headApprovalDeclineReason: string;
  passed: boolean | null;
  failReason: string;
};

export type CreditInvestigation = {
  documents: CreditInvestigationDoc[];
  // Independent outreach history from Requirement Checklist's — this page
  // has its own "Request Documents" drawer/history.
  outreachMessages: OutreachMessage[];
  ciFeeStatus: CiFeeStatus;
  ciFeeAmount: string;
  ciFeeAmountDescription: string;
  ciFeeRemarks: string;
  // Set when a pending CI Fee request is declined on the Credit
  // Investigation - Fee Approval screen (src/sections/admin/ci-fee-approval-view.tsx) — declining resets
  // ciFeeStatus back to 'not-requested' (same re-entry point as a fresh
  // application) but keeps this reason on record, same convention as
  // decisionReason below.
  ciFeeDeclineReason: string;
  // Stamped the moment ciFeeStatus becomes 'pending-approval' (a fresh
  // request or a re-submission after decline) — added alongside the
  // Payment page (docs/210-request-payments.md), which needs a "Requested On" date for
  // CI Fee rows the same way Appraisal Fee already has feeSubmittedAt.
  ciFeeSubmittedAt: string | null;
  // Stamped the moment ciFeeStatus becomes 'approved' — added alongside
  // the Payment page (docs/210-request-payments.md), which needs an "Approved On" date
  // for CI Fee rows the same way Appraisal Fee already has feeApprovedAt.
  ciFeeApprovedAt: string | null;
  // The LMS's own internal payment record for this CI Fee — see
  // Appraisal.feePayment above for the shared shape/rationale.
  ciFeePayment: PaymentDetails;
  report: CiReport;
  decision: CreditCheckDecision;
  decisionReason: string;
};

// One row of an "other loan" the borrower is already servicing, entered on
// the Financial Evaluation page's Cash Flow Statement — feeds into "Total of
// Other Loans," which reduces Income Available for Debt Service and adds to
// the Debt Service Ratio numerator. Deliberately just a lender name +
// monthly amortization per column, not a full loan detail (principal/rate/
// term) — this is an existing obligation being disclosed, not something
// this app computes an amortization schedule for.
export type CashFlowOtherLoan = {
  id: string;
  lender: string;
  monthlyAmortizationCombined: string;
  monthlyAmortizationBorrowerOnly: string;
};

export type CashFlowComputationType = 'add-on' | 'diminishing';

// Financial Evaluation's Cash Flow Statement — a Combined/Borrower Only
// two-column form computing Total Income, Total Expenses, Income Available
// for Debt Service, Monthly Amortization (on the Proposed Amount, via
// `computationType`), Net Income, and Debt Service Ratio. See
// src/sections/admin/cash-flow-statement.ts for the derivation formulas
// (kept as pure functions, not stored) and docs/ADMIN_FINANCIAL_EVALUATION.md.
export type CashFlowStatement = {
  computationType: CashFlowComputationType;
  fixedIncomeCombined: string;
  fixedIncomeBorrowerOnly: string;
  variableIncomeCombined: string;
  variableIncomeBorrowerOnly: string;
  otherIncomeCombined: string;
  otherIncomeBorrowerOnly: string;
  lessDeductionsCombined: string;
  lessDeductionsBorrowerOnly: string;
  fixedExpenseCombined: string;
  fixedExpenseBorrowerOnly: string;
  utilitiesCombined: string;
  utilitiesBorrowerOnly: string;
  transportCombined: string;
  transportBorrowerOnly: string;
  otherExpenseCombined: string;
  otherExpenseBorrowerOnly: string;
  miscExpensesCombined: string;
  miscExpensesBorrowerOnly: string;
  adjustedExpensePercentCombined: string;
  adjustedExpensePercentBorrowerOnly: string;
  otherLoans: CashFlowOtherLoan[];
  // Annual rate (%); Term in months — see cash-flow-statement.ts for the
  // monthly-amortization formula's unit conversion.
  principalCombined: string;
  principalBorrowerOnly: string;
  interestRateCombined: string;
  interestRateBorrowerOnly: string;
  termCombined: string;
  termBorrowerOnly: string;
  // Set by "Save Record" — null until the officer has saved at least once.
  savedAt: string | null;
  // Financial Evaluation's own Proceed/Disapprove decision — same shape as
  // creditInvestigation.decision/decisionReason. Proceed routes to Credit
  // Scoring (paths.admin.creditScoring, currently a "coming soon" stub, same
  // as Appraisal's own Passed branch); Disapprove routes back to
  // Reconsideration with a required reason, same destination every other
  // disapprove path in this pipeline uses.
  decision: CreditCheckDecision;
  decisionReason: string;
};

// ----------------------------------------------------------------------
// Financial Evaluation's Bank Statement card — the officer records each of
// the applicant's bank statements (depository bank, account, month range),
// with inline-editable Deposit and Account Daily Balance rows. All derived
// values (total deposits, average daily balance) are computed at render time
// in bank-statement.ts — nothing derived is stored. Data-entry only.
// ----------------------------------------------------------------------
export type BankStatementDeposit = {
  id: string;
  date: string; // 'yyyy-mm-dd', free-text like every other input in this app
  amount: string; // numeric string
};

export type BankStatementDailyBalance = {
  id: string;
  periodFrom: string; // 'yyyy-mm-dd'
  periodTo: string; // 'yyyy-mm-dd'
  balance: string; // numeric string
};

export type BankStatement = {
  id: string;
  depositoryBank: string;
  accountName: string;
  accountNumber: string;
  monthFrom: string; // 'January'..'December', '' = unset
  monthTo: string;
  deposits: BankStatementDeposit[];
  dailyBalances: BankStatementDailyBalance[];
};

// ----------------------------------------------------------------------
// Financial Evaluation's Financial Summary card — a workspace for the three
// legacy sub-tools (Financial Statement, Bank Loans, Financial Highlights).
// Each row opens a deep data-entry form (Manage) and an on-screen report
// view (View). All report figures are pure client-side arithmetic
// (financial-summary-calcs.ts) — nothing derived is stored. No XLS/PDF
// export. The card itself holds no state — the three sub-tool slots below do.
// ----------------------------------------------------------------------

// The fixed period set every Financial Summary sub-tool works across.
export const FINANCIAL_PERIODS = ['2023', '2024', '2025', 'interim', 'projected'] as const;
export type FinancialPeriod = (typeof FINANCIAL_PERIODS)[number];
export const FINANCIAL_PERIOD_LABELS: Record<FinancialPeriod, string> = {
  '2023': '2023',
  '2024': '2024',
  '2025': '2025',
  interim: 'Interim',
  projected: 'Projected',
};

// --- Financial Statement (sub-tool 1) — one record per period. Every value
// is a free-text numeric string (blank/garbage → 0 for arithmetic).
/** One Balance Sheet line item — a labelled amount inside a category. */
export type BalanceSheetLine = { id: string; label: string; value: string };

/** The five Balance Sheet categories, each a dynamic list of line items. */
export type BalanceSheetCategory =
  | 'currentAssets'
  | 'nonCurrentAssets'
  | 'currentLiabilities'
  | 'nonCurrentLiabilities'
  | 'equity';

export type FinancialStatementPeriod = {
  grossSales: string;
  salesReturns: string; // legacy has no separate field — kept for Net Sales math, defaults ''
  costOfGoodsSold: string;
  operatingExpenses: string;
  otherIncomeExpense: string; // signed — negatives allowed
  interestExpense: string;
  provisionForTaxes: string;
  depreciation: string; // feeds real EBITDA (operating income + depreciation)
  currentAssets: BalanceSheetLine[];
  nonCurrentAssets: BalanceSheetLine[];
  currentLiabilities: BalanceSheetLine[];
  nonCurrentLiabilities: BalanceSheetLine[];
  equity: BalanceSheetLine[];
  balanceSheetSaved: boolean; // Manage opens straight to Balance Sheet once true
};
export type FinancialStatement = Record<FinancialPeriod, FinancialStatementPeriod>;

/** Income-statement string fields only — the Balance Sheet is now line-item lists. */
export type FinancialStatementField =
  | 'grossSales'
  | 'salesReturns'
  | 'costOfGoodsSold'
  | 'operatingExpenses'
  | 'otherIncomeExpense'
  | 'interestExpense'
  | 'provisionForTaxes'
  | 'depreciation';

// --- Bank Loans (sub-tool 2)
export type BankLoanRow = {
  id: string;
  institution: string;
  facility: string;
  approvedAmount: string;
  amountPreviousYear: string;
  amountOutstanding: string;
  balanceAsOfDate: string; // 'yyyy-mm-dd'
  projectionAmount: string;
  security: string;
  dateGranted: string; // 'yyyy-mm-dd'
  expiry: string; // 'yyyy-mm-dd'
  term: string; // months
  interestRate: string; // %
  principalPaid: string;
  paymentHandling: string;
  principalAmortizationPerMonth: string;
  interestAmortizationPerMonth: string;
  principalPaymentAsOf: string; // "Payment as of Date" group
  interestPaymentAsOf: string; // "Payment as of Date" group
  projectedPrincipalPaymentDec: string; // "Payment Projected" group
  projectedInterestDec: string; // "Payment Projected" group
};
export type PgfcProposedLoan = {
  projectionAmount: string;
  interestRate: string; // %
  principalPaymentAsOfDate: string; // 'yyyy-mm-dd'
  interestPaymentAsOfDate: string; // 'yyyy-mm-dd'
  projectedPrincipalPaymentDec: string;
  projectedInterestDec: string;
};
export type BankLoans = {
  bankRows: BankLoanRow[];
  pgfcRows: BankLoanRow[];
  proposed: PgfcProposedLoan;
};
export type BankLoanKind = 'bank' | 'pgfc';

// --- Financial Highlights (sub-tool 3) — the officer-typed fields; the rest
// of the table is derived from FinancialStatement at render time.
export type FinancialHighlightsPeriod = {
  daysInventory: string;
  daysReceivable: string;
  daysPayable: string;
  ebitda: string;
  totalLoans: string;
  annualDebtService: string;
  rating: string; // free text
  adjustedRate: string; // %
};
export type FinancialHighlights = Record<FinancialPeriod, FinancialHighlightsPeriod>;
export type FinancialHighlightsField = keyof FinancialHighlightsPeriod;

// --- Additional Financial Files — free-form supporting documents the
// officer uploads on the Financial Evaluation page beyond the fixed
// Document Checklist (data URL, prototype convention — no parsing).
export type AdditionalFinancialFile = {
  id: string;
  fileName: string;
  fileData: string;
  remarks: string;
  uploadedAt: string; // ISO
};

export type ReviewStep =
  | 'creditChecking'
  | 'reconsideration'
  | 'callReport'
  | 'requirementChecklist'
  | 'creditInvestigation'
  | 'appraisal'
  | 'financialEvaluation';

export type StepTimestamps = Partial<Record<ReviewStep, string>>;

export type NegativeListEntry = {
  email: string;
  name: string;
  reason: string;
  recordedAt: string;
};

export type ApplicationReview = {
  creditChecking: CreditChecking;
  cibiForm: CibiForm;
  loandexFiles: BureauReportFile[];
  cicFiles: BureauReportFile[];
  cmapFiles: BureauReportFile[];
  nfisBapFiles: BureauReportFile[];
  pgfcExposureFiles: BureauReportFile[];
  reconsideration: Reconsideration;
  negativeCreditReport: NegativeCreditReport;
  callReport: CallReport;
  requirementChecklist: RequirementChecklist;
  creditInvestigation: CreditInvestigation;
  appraisal: Appraisal;
  cashFlowStatement: CashFlowStatement;
  bankStatements: BankStatement[];
  financialStatement: FinancialStatement;
  financialStatementDetails: FinancialStatementDetails;
  bankLoans: BankLoans;
  financialHighlights: FinancialHighlights;
  financialHighlightsRemarks: string; // Tiptap HTML
  additionalFinancialFiles: AdditionalFinancialFile[];
  stepTimestamps: StepTimestamps;
};

type AdminState = {
  adminUser: AdminUser | null;
  review: ApplicationReview;
  negativeList: NegativeListEntry[];
};

type AdminContextValue = AdminState & {
  hydrated: boolean;
  setAdminUser: (user: AdminUser) => void;
  setCreditChecking: (data: Partial<CreditChecking>) => void;
  setCibiForm: (data: Partial<CibiForm>) => void;
  /** Append one or more uploaded report files to a bureau; each new file is
   * seeded with 2–3 canned sample rows of that bureau's row type. */
  addBureauReportFiles: (kind: BureauFileKind, files: Array<{ fileName: string; fileData: string }>) => void;
  /** Swap a file's document, discarding its old sample rows and seeding fresh
   * ones (a replaced file is treated as a new document). */
  replaceBureauReportFile: (
    kind: BureauFileKind,
    id: string,
    file: { fileName: string; fileData: string }
  ) => void;
  /** Remove one uploaded file (and its seeded rows) from a bureau. */
  removeBureauReportFile: (kind: BureauFileKind, id: string) => void;
  /**
   * The six per-bureau results-table row arrays, flattened across every
   * uploaded file for that bureau. This is what `initial-credit-checking-risk.ts`
   * and `CreditCheckingResultModal` consume — they never see the per-file
   * shape. Recomputed (memoized) whenever any bureau's file array changes.
   */
  bureauResultRows: {
    cmapCases: CmapCase[];
    bapNfisRecords: BapNfisRecord[];
    cibiResults: CibiResult[];
    cicContracts: CicContract[];
    loandexRecords: LoandexRecord[];
    pgfcExposureRecords: PgfcExposureRecord[];
  };
  setReconsideration: (data: Partial<Reconsideration>) => void;
  setNegativeCreditReport: (
    data: Partial<Pick<NegativeCreditReport, 'thru' | 'negativeRecordText' | 'recommendationRemarks' | 'submitted'>>
  ) => void;
  addNegativeReportEntry: (listKey: NegativeReportEntryListKey, seedLabel?: string) => void;
  updateNegativeReportEntry: (
    listKey: NegativeReportEntryListKey,
    id: string,
    data: Partial<NegativeReportEntry>
  ) => void;
  removeNegativeReportEntry: (listKey: NegativeReportEntryListKey, id: string) => void;
  resetNegativeCreditReport: () => void;
  setCallReport: (data: Partial<CallReport>) => void;
  addExistingLoanRow: () => void;
  updateExistingLoanRow: (id: string, data: Partial<ExistingLoanRow>) => void;
  removeExistingLoanRow: (id: string) => void;
  setCallReportComakerChange: (data: Partial<CallReportComakerChange>) => void;
  setRequirementChecklist: (data: Partial<RequirementChecklist>) => void;
  addAppraisalGroup: (tctNumber: string, collateralType?: AppraisalCollateralType) => void;
  removeAppraisalGroup: (groupId: string) => void;
  updateAppraisalGroupDoc: (groupId: string, docKey: string, data: Partial<RequirementDoc>) => void;
  addOutreachMessage: (message: { channel: OutreachChannel; text: string }) => void;
  addDocumentRequestMessage: (message: { tctGroupId: string; documentKeys: string[]; remarks: string }) => void;
  setCreditInvestigation: (data: Partial<CreditInvestigation>) => void;
  setCiReport: (data: Partial<CiReport>) => void;
  setAppraisal: (data: Partial<Appraisal>) => void;
  setCashFlowStatement: (data: Partial<CashFlowStatement>) => void;
  addCashFlowOtherLoan: () => void;
  removeCashFlowOtherLoan: (id: string) => void;
  updateCashFlowOtherLoan: (id: string, data: Partial<CashFlowOtherLoan>) => void;
  // Financial Evaluation → Bank Statement card. The card generates the id
  // for a new statement (crypto.randomUUID()) and passes it in, so it can
  // open its drawer on that id without the setter returning anything.
  addBankStatement: (id: string) => void;
  updateBankStatement: (
    id: string,
    data: Partial<Omit<BankStatement, 'id' | 'deposits' | 'dailyBalances' | 'files'>>
  ) => void;
  removeBankStatement: (id: string) => void;
  addBankStatementDeposit: (id: string) => void;
  updateBankStatementDeposit: (
    id: string,
    depositId: string,
    data: Partial<Omit<BankStatementDeposit, 'id'>>
  ) => void;
  removeBankStatementDeposit: (id: string, depositId: string) => void;
  addBankStatementDailyBalance: (id: string) => void;
  updateBankStatementDailyBalance: (
    id: string,
    balanceId: string,
    data: Partial<Omit<BankStatementDailyBalance, 'id'>>
  ) => void;
  removeBankStatementDailyBalance: (id: string, balanceId: string) => void;
  /** Dev/QA: fill every Financial Evaluation workspace with sample data —
   * one bank statement, the Cash Flow Statement, the Financial Statement (all
   * 5 periods), Bank Loans, and Financial Highlights. */
  fillFinancialEvaluationSample: () => void;
  /** Dev/QA: reset all of the above to their empty defaults. */
  clearFinancialEvaluationSample: () => void;
  setFinancialStatementField: (
    period: FinancialPeriod,
    field: FinancialStatementField,
    value: string
  ) => void;
  markFinancialStatementBalanceSheetSaved: (period: FinancialPeriod) => void;
  addBalanceSheetLine: (period: FinancialPeriod, category: BalanceSheetCategory) => void;
  updateBalanceSheetLine: (
    period: FinancialPeriod,
    category: BalanceSheetCategory,
    id: string,
    patch: Partial<Omit<BalanceSheetLine, 'id'>>
  ) => void;
  removeBalanceSheetLine: (
    period: FinancialPeriod,
    category: BalanceSheetCategory,
    id: string
  ) => void;
  setFinancialStatementDetails: (data: Partial<FinancialStatementDetails>) => void;
  addBankLoanRow: (kind: BankLoanKind) => void;
  updateBankLoanRow: (kind: BankLoanKind, id: string, data: Partial<Omit<BankLoanRow, 'id'>>) => void;
  removeBankLoanRow: (kind: BankLoanKind, id: string) => void;
  setPgfcProposedLoan: (data: Partial<PgfcProposedLoan>) => void;
  setFinancialHighlightsField: (
    period: FinancialPeriod,
    field: FinancialHighlightsField,
    value: string
  ) => void;
  setFinancialHighlightsRemarks: (value: string) => void;
  addAdditionalFinancialFiles: (files: Array<{ fileName: string; fileData: string }>) => void;
  updateAdditionalFinancialFile: (id: string, data: Partial<Pick<AdditionalFinancialFile, 'remarks'>>) => void;
  removeAdditionalFinancialFile: (id: string) => void;
  createAppraisalReportBundle: (
    tctGroupIds: string[],
    appraiserType: AppraiserType,
    appraiserName: string | null,
    targetCompletionDate: string | null,
    fee?: { feeNeeded: FeeNeeded; feeAmount: string; feeDescription: string; feeRemarks: string }
  ) => void;
  setAppraisalBundleAppraiserType: (bundleId: string, appraiserType: AppraiserType) => void;
  setAppraisalBundleFee: (
    bundleId: string,
    data: Partial<Pick<AppraisalReportBundle, 'feeNeeded' | 'feeAmount' | 'feeDescription' | 'feeRemarks'>>
  ) => void;
  setAppraisalBundleReport: (bundleId: string, data: Partial<AppraisalReport>) => void;
  setAppraisalBundleLandTitle: (
    bundleId: string,
    tctGroupId: string,
    data: Partial<AppraisalReportLandTitle>
  ) => void;
  deleteAppraisalReportBundle: (bundleId: string) => void;
  clearAllAppraisalBundleReports: () => void;
  // The "one buong request" batch action — every bundle must already have
  // an appraiser AND a fee decision (feeNeeded !== null) before this can
  // fire; see appraisal-tct-table.tsx's gating logic.
  // Fires from `'not-submitted'` OR `'declined'` — a decline leaves every
  // bundle's Yes/No/amount/description/remarks exactly as they were (see
  // declineAppraisalFees below), so re-submitting after revising them is
  // the same call as the very first submission, just from a different
  // starting status.
  submitAppraisalFeesForApproval: () => void;
  approveAppraisalFees: () => void;
  declineAppraisalFees: (reason: string) => void;
  // Dev/testing shortcut — wipes the whole fee flow back to its very
  // first state: batch status back to 'not-submitted', every batch-level
  // date/reason field back to null/'', and every bundle's own
  // feeNeeded/feeAmount/feeDescription/feeRemarks back to
  // null/''/''/''. Does NOT touch reportBundles' appraiser
  // assignment/report content — only the fee decision fields — so a
  // tester can restart the fee request/approval/settlement cycle without
  // losing the bundle's assignment or an already-filled-in report.
  resetAppraisalFees: () => void;
  // Payment (docs/210-request-payments.md) — one shared shape, two independent fee
  // flows. setXPayment merges partial edits into the draft; markXAsPaid
  // stamps paidAt, same "one final action, no separate save-draft state"
  // convention the modal itself follows.
  setCiFeePayment: (data: Partial<PaymentDetails>) => void;
  markCiFeeAsPaid: () => void;
  setAppraisalFeePayment: (data: Partial<PaymentDetails>) => void;
  markAppraisalFeeAsPaid: () => void;
  addCreditInvestigationDocument: (
    label: string,
    uploadedBy: string,
    file: { fileName: string; fileUrl: string }
  ) => void;
  removeCreditInvestigationDocument: (key: string) => void;
  addCiOutreachMessage: (message: { channel: OutreachChannel; text: string }) => void;
  markStepEntered: (step: ReviewStep) => void;
  addToNegativeList: (entry: Omit<NegativeListEntry, 'recordedAt'>) => void;
  resetReview: () => void;
  logout: () => void;
};

const STORAGE_KEY = 'hhc-lms-admin-session';

// Exported so NegativeCreditReportCard can tell this generic boilerplate
// apart from officer-edited text before overwriting it with the finding's
// specific bureau + reason — see that component's narrative-default effect.
export const GENERIC_NEGATIVE_RECORD_TEXT =
  'Source of information: BAP Credit Bureau / CMAP report on accounts under watch lists, cancelled credit cards, adverse classified loan file, closed current account and court case file as of ';

// Same factory-not-constant rationale as createInitialReview below — also
// reused directly by resetNegativeCreditReport(), so "start the form over"
// and "start a whole new review" can never drift out of sync.
function createInitialNegativeCreditReport(): NegativeCreditReport {
  return {
    thru: '',
    negativeRecordText: GENERIC_NEGATIVE_RECORD_TEXT,
    accountFindings: [],
    cancelledCreditCards: [],
    adverseClassifiedLoans: [],
    closedCurrentAccounts: [],
    recommendationRemarks:
      'In view of the foregoing, Credit Department is hereby recommending the said loan application to proceed.',
    submitted: false,
  };
}

// Pre-populates every fixed document (Credit Investigation, Appraisal-group
// seeds, and Financial Evaluation alike) as already received, with a sample
// fileName and its metadata's freshStatus/freshNote already applied — none
// start 'missing'.
function createInitialRequirementDocuments(): RequirementDoc[] {
  return REQUIREMENT_DOC_META.map((meta) => ({
    key: meta.key,
    status: meta.freshStatus,
    aiNote: meta.freshNote,
    fileName: 'sample-local-pdf.pdf',
    fileUrl: '/assets/documents/sample-local-pdf.pdf',
    uploadedAt: new Date(0).toISOString(),
    uploadedBy: 'Ramon Cruz',
    remarks: '',
    reviewed: false,
  }));
}

// The Credit Investigation Document Checklist has no fixed documents of its
// own — it displays review.requirementChecklist.documents (the
// creditInvestigation tab) read-only, since those were already collected one
// step earlier. This array only ever holds ad-hoc custom rows an officer
// adds via addCreditInvestigationDocument.
function createInitialCreditInvestigationDocuments(): CreditInvestigationDoc[] {
  return [];
}

function createInitialCiReport(): CiReport {
  return {
    visitDate: '',
    subjectAsOf: '',
    spouseNotes: '',
    children: [],
    residencePermanentAddress: '',
    residenceLeasedType: '',
    residenceLengthOfStay: '',
    residenceLandmark: '',
    residenceRemarks: '',
    presentAddress: '',
    presentLeasedType: '',
    presentLengthOfStay: '',
    presentLandmark: '',
    presentRemarks: '',
    employmentStatus: '',
    employmentType: '',
    employerName: '',
    position: '',
    employerAddress: '',
    employerTelNo: '',
    employerEmail: '',
    salary: '',
    annualIncome: '',
    lengthOfService: '',
    numberOfRegEmployees: '',
    numberOfContrEmployees: '',
    isUnionized: '',
    secDtiRegNo: '',
    secDtiRegDate: '',
    secDtiExpDate: '',
    employmentRemarks: '',
    suppliers: [],
    customers: [],
    assetsNotes: '',
    otherIncomeSources: [],
    loanPurposeNotes: '',
    bankAccounts: [],
    negativeRecordSourceNote:
      'Source of information: BAP Credit Bureau / CMAP report on accounts under watch lists, cancelled credit cards, adverse classified loan file, closed current account and court case file as of ',
    negativeRecordFinding: '',
    negativeRecordRemarks: '',
    healthAndHabitsNotes: '',
    commentsNotes: '',
    recommendation: '',
    recommendationNotes: '',
    transcriptFileName: null,
    transcriptUploadedAt: null,
  };
}

function createInitialCreditInvestigation(): CreditInvestigation {
  return {
    documents: createInitialCreditInvestigationDocuments(),
    outreachMessages: [],
    ciFeeStatus: 'not-requested',
    ciFeeAmount: '',
    ciFeeAmountDescription: '',
    ciFeeRemarks: '',
    ciFeeDeclineReason: '',
    ciFeeSubmittedAt: null,
    ciFeeApprovedAt: null,
    ciFeePayment: createEmptyPaymentDetails(),
    report: createInitialCiReport(),
    decision: 'pending',
    decisionReason: '',
  };
}

function createInitialCashFlowStatement(): CashFlowStatement {
  return {
    computationType: 'add-on',
    fixedIncomeCombined: '',
    fixedIncomeBorrowerOnly: '',
    variableIncomeCombined: '',
    variableIncomeBorrowerOnly: '',
    otherIncomeCombined: '',
    otherIncomeBorrowerOnly: '',
    lessDeductionsCombined: '',
    lessDeductionsBorrowerOnly: '',
    fixedExpenseCombined: '',
    fixedExpenseBorrowerOnly: '',
    utilitiesCombined: '',
    utilitiesBorrowerOnly: '',
    transportCombined: '',
    transportBorrowerOnly: '',
    otherExpenseCombined: '',
    otherExpenseBorrowerOnly: '',
    miscExpensesCombined: '',
    miscExpensesBorrowerOnly: '',
    adjustedExpensePercentCombined: '',
    adjustedExpensePercentBorrowerOnly: '',
    otherLoans: [],
    principalCombined: '',
    principalBorrowerOnly: '',
    interestRateCombined: '',
    interestRateBorrowerOnly: '',
    termCombined: '',
    termBorrowerOnly: '',
    savedAt: null,
    decision: 'pending',
    decisionReason: '',
  };
}

// Routes a nested bank-statement mutation to the one statement it targets —
// every add/update/remove for deposits, daily balances, and files goes
// through here so the 10 nested setters don't each re-spread `bankStatements`.
// Mirrors `updateBureauFiles` from the bureau-reports multi-file work.
function updateOneBankStatement(
  review: ApplicationReview,
  id: string,
  updater: (statement: BankStatement) => BankStatement
): ApplicationReview {
  return {
    ...review,
    bankStatements: review.bankStatements.map((statement) =>
      statement.id === id ? updater(statement) : statement
    ),
  };
}

function createBankStatement(id: string): BankStatement {
  return {
    id,
    depositoryBank: '',
    accountName: '',
    accountNumber: '',
    monthFrom: '',
    monthTo: '',
    deposits: [],
    dailyBalances: [],
  };
}

// Dev/QA "Fill with Sample Data" — one realistic, fully-populated bank
// statement (6 monthly deposits, 3 quarterly average-balance rows).
function createSampleBankStatement(): BankStatement {
  return {
    id: crypto.randomUUID(),
    depositoryBank: 'BDO Unibank',
    accountName: 'Juan A. Dela Cruz',
    accountNumber: '0012-3456-7890',
    monthFrom: 'January',
    monthTo: 'June',
    deposits: [
      { id: crypto.randomUUID(), date: '2026-01-15', amount: '185000' },
      { id: crypto.randomUUID(), date: '2026-02-16', amount: '172500' },
      { id: crypto.randomUUID(), date: '2026-03-16', amount: '198000' },
      { id: crypto.randomUUID(), date: '2026-04-15', amount: '164000' },
      { id: crypto.randomUUID(), date: '2026-05-15', amount: '210000' },
      { id: crypto.randomUUID(), date: '2026-06-15', amount: '176000' },
    ],
    dailyBalances: [
      { id: crypto.randomUUID(), periodFrom: '2026-01-01', periodTo: '2026-02-28', balance: '312000' },
      { id: crypto.randomUUID(), periodFrom: '2026-03-01', periodTo: '2026-04-30', balance: '287500' },
      { id: crypto.randomUUID(), periodFrom: '2026-05-01', periodTo: '2026-06-30', balance: '341000' },
    ],
  };
}

// --- Sample data for the whole Financial Evaluation "Fill with Sample Data"
// page action (Cash Flow Statement + Financial Statement + Bank Loans +
// Financial Highlights + Additional Financial Files), seeded together so a
// demo pass has data everywhere.

function createSampleAdditionalFinancialFiles(): AdditionalFinancialFile[] {
  const uploadedAt = new Date().toISOString();
  return [
    {
      id: crypto.randomUUID(),
      fileName: 'supplier-contract-2026.pdf',
      fileData: '/assets/documents/sample-local-pdf.pdf',
      remarks: 'Signed 2-year supply agreement with primary distributor.',
      uploadedAt,
    },
    {
      id: crypto.randomUUID(),
      fileName: 'warehouse-lease.pdf',
      fileData: '/assets/documents/sample-local-pdf.pdf',
      remarks: '',
      uploadedAt,
    },
  ];
}

function createSampleCashFlowStatement(): CashFlowStatement {
  return {
    computationType: 'add-on',
    fixedIncomeCombined: '85000',
    fixedIncomeBorrowerOnly: '55000',
    variableIncomeCombined: '20000',
    variableIncomeBorrowerOnly: '12000',
    otherIncomeCombined: '15000',
    otherIncomeBorrowerOnly: '0',
    lessDeductionsCombined: '8000',
    lessDeductionsBorrowerOnly: '5000',
    fixedExpenseCombined: '30000',
    fixedExpenseBorrowerOnly: '20000',
    utilitiesCombined: '6000',
    utilitiesBorrowerOnly: '4000',
    transportCombined: '5000',
    transportBorrowerOnly: '3500',
    otherExpenseCombined: '4000',
    otherExpenseBorrowerOnly: '2500',
    miscExpensesCombined: '3000',
    miscExpensesBorrowerOnly: '2000',
    adjustedExpensePercentCombined: '10',
    adjustedExpensePercentBorrowerOnly: '10',
    otherLoans: [
      {
        id: crypto.randomUUID(),
        lender: 'BPI Auto Loan',
        monthlyAmortizationCombined: '9500',
        monthlyAmortizationBorrowerOnly: '9500',
      },
    ],
    principalCombined: '2500000',
    principalBorrowerOnly: '2500000',
    interestRateCombined: '18',
    interestRateBorrowerOnly: '18',
    termCombined: '36',
    termBorrowerOnly: '36',
    savedAt: new Date().toISOString(),
    decision: 'pending',
    decisionReason: '',
  };
}

function createSampleFinancialStatement(): FinancialStatement {
  const line = (label: string, value: string): BalanceSheetLine => ({
    id: crypto.randomUUID(),
    label,
    value,
  });

  // 2023 → 2025 growing actuals; Interim ≈ half-year; Projected ≈ 2025 + growth.
  // Balance Sheet: a few line items per category summing near the old totals.
  const base: Record<FinancialPeriod, Partial<FinancialStatementPeriod>> = {
    '2023': {
      grossSales: '18500000', costOfGoodsSold: '12200000', operatingExpenses: '3600000',
      otherIncomeExpense: '120000', interestExpense: '420000', provisionForTaxes: '480000',
      depreciation: '350000',
      currentAssets: [line('Cash', '2800000'), line('Account Receivable – Trade', '2600000'), line('Inventory', '1400000')],
      nonCurrentAssets: [line('Property, plant and equipment (net of depr.)', '9200000')],
      currentLiabilities: [line('Accounts Payable – Trade', '2500000'), line('Short-term Loans', '1600000')],
      nonCurrentLiabilities: [line('Long-term Loans', '5200000')],
      equity: [line('Capital', '3000000'), line('Retained Earnings', '3400000'), line('Net Income', '300000')],
    },
    '2024': {
      grossSales: '21300000', costOfGoodsSold: '13800000', operatingExpenses: '3950000',
      otherIncomeExpense: '150000', interestExpense: '390000', provisionForTaxes: '640000',
      depreciation: '380000',
      currentAssets: [line('Cash', '3200000'), line('Account Receivable – Trade', '2900000'), line('Inventory', '1500000')],
      nonCurrentAssets: [line('Property, plant and equipment (net of depr.)', '9600000')],
      currentLiabilities: [line('Accounts Payable – Trade', '2600000'), line('Short-term Loans', '1700000')],
      nonCurrentLiabilities: [line('Long-term Loans', '4800000')],
      equity: [line('Capital', '3000000'), line('Retained Earnings', '4700000'), line('Net Income', '400000')],
    },
    '2025': {
      grossSales: '24800000', costOfGoodsSold: '15600000', operatingExpenses: '4300000',
      otherIncomeExpense: '180000', interestExpense: '360000', provisionForTaxes: '850000',
      depreciation: '410000',
      currentAssets: [line('Cash', '3700000'), line('Account Receivable – Trade', '3300000'), line('Inventory', '1700000')],
      nonCurrentAssets: [line('Property, plant and equipment (net of depr.)', '10100000')],
      currentLiabilities: [line('Accounts Payable – Trade', '2800000'), line('Short-term Loans', '1700000')],
      nonCurrentLiabilities: [line('Long-term Loans', '4400000')],
      equity: [line('Capital', '3000000'), line('Retained Earnings', '6400000'), line('Net Income', '500000')],
    },
    interim: {
      grossSales: '13200000', costOfGoodsSold: '8300000', operatingExpenses: '2250000',
      otherIncomeExpense: '95000', interestExpense: '180000', provisionForTaxes: '460000',
      depreciation: '210000',
      currentAssets: [line('Cash', '4000000'), line('Account Receivable – Trade', '3400000'), line('Inventory', '1700000')],
      nonCurrentAssets: [line('Property, plant and equipment (net of depr.)', '10000000')],
      currentLiabilities: [line('Accounts Payable – Trade', '2700000'), line('Short-term Loans', '1700000')],
      nonCurrentLiabilities: [line('Long-term Loans', '4200000')],
      equity: [line('Capital', '3000000'), line('Retained Earnings', '7200000'), line('Net Income', '300000')],
    },
    projected: {
      grossSales: '27500000', costOfGoodsSold: '17100000', operatingExpenses: '4600000',
      otherIncomeExpense: '200000', interestExpense: '340000', provisionForTaxes: '980000',
      depreciation: '430000',
      currentAssets: [line('Cash', '4300000'), line('Account Receivable – Trade', '3500000'), line('Inventory', '1800000')],
      nonCurrentAssets: [line('Property, plant and equipment (net of depr.)', '10400000')],
      currentLiabilities: [line('Accounts Payable – Trade', '2900000'), line('Short-term Loans', '1700000')],
      nonCurrentLiabilities: [line('Long-term Loans', '4000000')],
      equity: [line('Capital', '3000000'), line('Retained Earnings', '7800000'), line('Net Income', '600000')],
    },
  };
  return FINANCIAL_PERIODS.reduce((acc, period) => {
    // Sample data already carries Balance Sheet figures — mark it saved so
    // Manage opens straight to the Balance Sheet step.
    acc[period] = { ...createBlankFinancialStatementPeriod(), ...base[period], balanceSheetSaved: true };
    return acc;
  }, {} as FinancialStatement);
}

function createSampleBankLoans(): BankLoans {
  return {
    bankRows: [
      {
        id: crypto.randomUUID(),
        institution: 'BDO Unibank',
        facility: 'Term Loan',
        approvedAmount: '8000000',
        amountPreviousYear: '6500000',
        amountOutstanding: '5200000',
        balanceAsOfDate: '2025-12-31',
        projectionAmount: '4800000',
        security: 'Real Estate Mortgage',
        dateGranted: '2022-03-15',
        expiry: '2027-03-15',
        term: '60',
        interestRate: '9.5',
        principalPaid: '2800000',
        paymentHandling: 'Post-dated checks',
        principalAmortizationPerMonth: '133333',
        interestAmortizationPerMonth: '41167',
        principalPaymentAsOf: '2800000',
        interestPaymentAsOf: '890000',
        projectedPrincipalPaymentDec: '1600000',
        projectedInterestDec: '494000',
      },
      {
        id: crypto.randomUUID(),
        institution: 'BPI',
        facility: 'Revolving Credit Line',
        approvedAmount: '3000000',
        amountPreviousYear: '2100000',
        amountOutstanding: '1500000',
        balanceAsOfDate: '2025-12-31',
        projectionAmount: '1200000',
        security: 'Chattel Mortgage',
        dateGranted: '2023-06-01',
        expiry: '2026-06-01',
        term: '36',
        interestRate: '10.25',
        principalPaid: '1500000',
        paymentHandling: 'Auto-debit arrangement',
        principalAmortizationPerMonth: '83333',
        interestAmortizationPerMonth: '12813',
        principalPaymentAsOf: '1500000',
        interestPaymentAsOf: '153750',
        projectedPrincipalPaymentDec: '1000000',
        projectedInterestDec: '102500',
      },
    ],
    pgfcRows: [
      {
        id: crypto.randomUUID(),
        institution: 'PGFC',
        facility: 'Existing Term Loan',
        approvedAmount: '5000000',
        amountPreviousYear: '3800000',
        amountOutstanding: '2900000',
        balanceAsOfDate: '2025-12-31',
        projectionAmount: '2400000',
        security: 'Real Estate Mortgage',
        dateGranted: '2021-09-10',
        expiry: '2026-09-10',
        term: '60',
        interestRate: '12',
        principalPaid: '2100000',
        paymentHandling: 'Post-dated checks',
        principalAmortizationPerMonth: '83333',
        interestAmortizationPerMonth: '29000',
        principalPaymentAsOf: '2100000',
        interestPaymentAsOf: '348000',
        projectedPrincipalPaymentDec: '1000000',
        projectedInterestDec: '288000',
      },
    ],
    proposed: {
      projectionAmount: '25000000',
      interestRate: '21',
      principalPaymentAsOfDate: '2026-01-31',
      interestPaymentAsOfDate: '2026-01-31',
      projectedPrincipalPaymentDec: '4200000',
      projectedInterestDec: '3900000',
    },
  };
}

function createSampleFinancialHighlights(): FinancialHighlights {
  const base: Record<FinancialPeriod, Partial<FinancialHighlightsPeriod>> = {
    '2023': { daysInventory: '58', daysReceivable: '42', daysPayable: '35', ebitda: '3100000', totalLoans: '11700000', annualDebtService: '2400000', rating: 'BB+', adjustedRate: '18' },
    '2024': { daysInventory: '54', daysReceivable: '39', daysPayable: '37', ebitda: '3650000', totalLoans: '10600000', annualDebtService: '2350000', rating: 'BBB-', adjustedRate: '17.5' },
    '2025': { daysInventory: '51', daysReceivable: '37', daysPayable: '38', ebitda: '4250000', totalLoans: '9600000', annualDebtService: '2300000', rating: 'BBB', adjustedRate: '17' },
    interim: { daysInventory: '50', daysReceivable: '36', daysPayable: '39', ebitda: '2400000', totalLoans: '9200000', annualDebtService: '1150000', rating: 'BBB', adjustedRate: '17' },
    projected: { daysInventory: '49', daysReceivable: '35', daysPayable: '40', ebitda: '4700000', totalLoans: '9000000', annualDebtService: '2250000', rating: 'BBB', adjustedRate: '16.5' },
  };
  return FINANCIAL_PERIODS.reduce((acc, period) => {
    acc[period] = { ...createBlankFinancialHighlightsPeriod(), ...base[period] };
    return acc;
  }, {} as FinancialHighlights);
}

function createBlankFinancialStatementPeriod(): FinancialStatementPeriod {
  return {
    grossSales: '',
    salesReturns: '',
    costOfGoodsSold: '',
    operatingExpenses: '',
    otherIncomeExpense: '',
    interestExpense: '',
    provisionForTaxes: '',
    depreciation: '',
    currentAssets: [],
    nonCurrentAssets: [],
    currentLiabilities: [],
    nonCurrentLiabilities: [],
    equity: [],
    balanceSheetSaved: false,
  };
}

function createInitialFinancialStatement(): FinancialStatement {
  return FINANCIAL_PERIODS.reduce((acc, period) => {
    acc[period] = createBlankFinancialStatementPeriod();
    return acc;
  }, {} as FinancialStatement);
}

function createInitialBankLoans(): BankLoans {
  return {
    bankRows: [],
    pgfcRows: [],
    proposed: {
      projectionAmount: '',
      interestRate: '',
      principalPaymentAsOfDate: '',
      interestPaymentAsOfDate: '',
      projectedPrincipalPaymentDec: '',
      projectedInterestDec: '',
    },
  };
}

function createBankLoanRow(): BankLoanRow {
  return {
    id: crypto.randomUUID(),
    institution: '',
    facility: '',
    approvedAmount: '',
    amountPreviousYear: '',
    amountOutstanding: '',
    balanceAsOfDate: '',
    projectionAmount: '',
    security: '',
    dateGranted: '',
    expiry: '',
    term: '',
    interestRate: '',
    principalPaid: '',
    paymentHandling: '',
    principalAmortizationPerMonth: '',
    interestAmortizationPerMonth: '',
    principalPaymentAsOf: '',
    interestPaymentAsOf: '',
    projectedPrincipalPaymentDec: '',
    projectedInterestDec: '',
  };
}

function createBlankFinancialHighlightsPeriod(): FinancialHighlightsPeriod {
  return {
    daysInventory: '',
    daysReceivable: '',
    daysPayable: '',
    ebitda: '',
    totalLoans: '',
    annualDebtService: '',
    rating: '',
    adjustedRate: '',
  };
}

function createInitialFinancialHighlights(): FinancialHighlights {
  return FINANCIAL_PERIODS.reduce((acc, period) => {
    acc[period] = createBlankFinancialHighlightsPeriod();
    return acc;
  }, {} as FinancialHighlights);
}

function createInitialAppraisal(): Appraisal {
  return {
    feeApprovalStatus: 'not-submitted',
    feeDeclineReason: '',
    feeSubmittedAt: null,
    feeApprovedAt: null,
    clientNotifiedAt: null,
    sentToOdooAt: null,
    paymentReceivedAt: null,
    feePayment: createEmptyPaymentDetails(),
    reportBundles: [],
    headApprovalStatus: 'pending',
    headApprovalDeclineReason: '',
    passed: null,
    failReason: '',
  };
}

// Documents a newly-added TCT/property group starts with — all missing by
// default, since a group is something the officer explicitly adds for a
// specific property they're now collecting paperwork for, not a pre-seeded
// demo state. `seeded: true` (used for the 5 starting groups in
// initialState below) instead pre-populates every document as already
// received AND verified — deliberately overriding
// `meta.freshStatus`/`meta.freshNote` (which can be `'needs-review'` for
// some doc keys, since that shared metadata also drives Requirement
// Checklist/CI's own less-complete "fresh" demo state) rather than reusing
// them here, since Appraisal now gates TCT-to-appraiser assignment on
// every one of a group's 8 documents being `'verified'` (see
// `docsIncomplete()` in appraisal-tct-table.tsx) — the 5 seeded groups
// need to actually be assignable out of the box, not stuck at 6/8 or 7/8
// forever.
function createAppraisalGroupDocuments(seeded = false): RequirementDoc[] {
  return APPRAISAL_DOC_META.map((meta) => {
    if (!seeded) {
      return {
        key: meta.key,
        status: 'missing',
        aiNote: '',
        fileName: null,
        fileUrl: null,
        uploadedAt: null,
        uploadedBy: null,
        remarks: '',
        reviewed: false,
      };
    }
    return {
      key: meta.key,
      status: 'verified',
      aiNote: meta.freshNote,
      fileName: 'sample-local-pdf.pdf',
      fileUrl: '/assets/documents/sample-local-pdf.pdf',
      uploadedAt: new Date(0).toISOString(),
      uploadedBy: 'Ramon Cruz',
      remarks: '',
      reviewed: false,
    };
  });
}

function createAppraisalGroup(
  tctNumber: string,
  collateralType: AppraisalCollateralType = 'real-estate',
  seeded = false
): AppraisalTctGroup {
  return {
    id: crypto.randomUUID(),
    tctNumber,
    collateralType,
    documents: createAppraisalGroupDocuments(seeded),
    reportId: null,
  };
}

function createAppraisalReportBundle(
  tctGroupIds: string[],
  appraiserType: AppraiserType,
  appraiserName: string | null,
  targetCompletionDate: string | null,
  fee?: { feeNeeded: FeeNeeded; feeAmount: string; feeDescription: string; feeRemarks: string }
): AppraisalReportBundle {
  return {
    id: crypto.randomUUID(),
    tctGroupIds,
    appraiserType,
    appraiserName,
    targetCompletionDate,
    feeNeeded: fee?.feeNeeded ?? null,
    feeAmount: fee?.feeAmount ?? '',
    feeDescription: fee?.feeDescription ?? '',
    feeRemarks: fee?.feeRemarks ?? '',
    report: {
      dateReport: '',
      dateInspected: '',
      requestingOfficer: '',
      branch: '',

      registeredOwner: '',
      locationOfProperty: '',
      landTitles: tctGroupIds.map((tctGroupId) => createAppraisalReportLandTitle(tctGroupId)),
      encumbrancesRemarks: '',

      streetFrontage: '',
      streetWidth: '',
      surfacing: '',
      averageDepth: '',
      approxShape: '',
      topography: '',
      neighborhood: '',
      presentUse: '',
      highestAndBestUse: '',

      utilityPublicConveyance: '',
      utilityElectricity: '',
      utilityWater: '',
      utilityTelephone: '',

      generalConstructionFeatures: '',
      floorLevel: '',
      externalWalls: '',
      interiorWallsPartitions: '',
      flooring: '',
      doorsWindows: '',
      ceilingRoofing: '',

      basisSource: '',
      basisLocation: '',
      basisAreaSize: '',
      basisPriceType: '',
      basisSellingPrice: '',
      fairMarketValuePerSqm: '',

      remarksAdditionalInfo: '',

      itemOfProperty: '',
      fmvRcn: '',
      constructionStatusPercent: '',
      depreciatedValue: '',
      appraisedValueP: '',

      appraisedValue: '',
      roundedFigures: '',
      amountInWords: '',
      loanableAmount: '',

      preparedBy: '',
      reviewedBy: '',
      endorsedBy: '',
      notedBy: '',

      propertyDetails: '',
      remarks: '',
      recommendation: '',

      fileName: null,
      fileUrl: null,
      uploadedAt: null,
    },
  };
}

// Canned sample rows for a bureau results table — 2–3 rows are seeded per
// uploaded report file (see `seedBureauRows` below and the
// `addBureauReportFiles`/`replaceBureauReportFile` setters), replacing the
// old officer-driven manual add/remove/edit flow. Fields carry
// realistic-looking dummy values (real
// bank/institution names, dates, case numbers, peso amounts) rather than a
// bare '—' or a "No ___ on record" placeholder phrase — a genuine "nothing
// wrong" bureau result for an existing credit facility still has a real
// account with real numbers, it's just in good standing, so the UI should
// look like an actual completed record rather than an empty/placeholder
// one. CMAP is the one exception: a clean court/legal-case check
// legitimately means no case exists at all (there's no such thing as a
// "court case in good standing"), so its case-detail fields stay
// descriptive rather than fabricating a nonexistent case number/date.
// `defendantSubject` can't use the applicant's real name — admin-context.tsx
// is registration-agnostic and has no access to signUpData anywhere else in
// this file either; threading it in would require a much larger refactor
// out of scope here. Every status/paymentStatus/contractStatus/accountStatus
// field (the ones initial-credit-checking-risk.ts's risk engine pattern-
// matches for "clean") is deliberately UNCHANGED by this — only the
// non-status descriptive fields carry the dummy values.
function createCmapSampleCase(): CmapCase {
  return {
    id: crypto.randomUUID(),
    defendantSubject: 'No court or legal case matched to applicant',
    plaintiff: 'None on record',
    natureOfCase: 'No matching record',
    amountInvolved: '₱0.00',
    caseNo: 'No case number on record',
    dateFiled: 'No filing date on record',
    status: 'No Record Found',
    creditRiskRemarks: 'No adverse court or legal record found.',
  };
}

function createBapNfisSampleRecord(): BapNfisRecord {
  return {
    id: crypto.randomUUID(),
    lendingInstitution: 'BPI Family Savings Bank',
    facility: 'Salary Loan',
    originalLoanAmount: '₱80,000.00',
    dateGranted: '2023-03-14',
    maturityDate: '2025-03-14',
    outstandingBalance: '₱15,400.00',
    paymentHistory: '24 of 24 monthly payments made on time',
    statusRemarks:
      'No cancelled credit card, adversely classified loan, or negative-file indicator found.',
  };
}

// CIBI's sample needs facilityType/originalAmount/monthlyAmortization
// sourced from the current cibiForm state (creditType/financedAmount/
// installment respectively) at the moment its report is uploaded — see
// setCibiForm below.
function createCibiSampleResult(
  facilityType: string,
  originalAmount: string,
  monthlyAmortization: string
): CibiResult {
  return {
    id: crypto.randomUUID(),
    provider: 'CIBI',
    facilityType,
    originalAmount,
    outstandingBalance: '₱0.00',
    overdueAmount: '₱0.00',
    monthlyAmortization,
    paymentStatus: 'Current — No Delinquency',
    remarks: 'CIBI Bureau Score 600. One active account, payments made as agreed.',
  };
}

function createCicSampleContract(): CicContract {
  return {
    id: crypto.randomUUID(),
    contractCode: 'CIC-2023-0417-6620',
    contractType: 'Auto Loan',
    maturityDate: '2026-08-01',
    outstandingBalance: '₱212,300.00',
    overdueAmount: '₱0.00',
    monthlyAmortization: '₱9,850.00',
    contractStatus: 'No Record Found',
    remarks: 'Consistent borrower and account information, no material discrepancy found.',
  };
}

function createLoandexSampleRecord(): LoandexRecord {
  return {
    id: crypto.randomUUID(),
    bankInstitution: 'BDO Unibank',
    loanFacility: 'Personal Loan',
    maturityDate: '2027-01-10',
    outstandingBalance: '₱48,750.00',
    overdueAmount: '₱0.00',
    monthlyAmortization: '₱3,250.00',
    accountStatus: 'Current — No Past-Due Exposure',
    remarks: 'Regular payment activity, no past-due exposure reported.',
  };
}

function createPgfcSampleExposureRecord(): PgfcExposureRecord {
  return {
    id: crypto.randomUUID(),
    principalBalance: '₱0.00',
    interestBalance: '₱0.00',
    maturityDate: 'No date on record',
    remainingTerm: 'No existing term on record',
    lastPaymentDate: 'No payment history on record',
    monthlyAmortization: '₱0.00',
    paymentStatus: 'No Existing Exposure',
    remarks: 'No prior or existing PGFC loan exposure on file.',
  };
}

// Small deterministic hash so the same filename always seeds the same row
// count (2 or 3) — keeps a QA pass reproducible, same rationale as
// simulate-bureau-finding.ts's hash-not-random choice.
function sampleRowCount(fileName: string): number {
  let h = 0;
  for (let i = 0; i < fileName.length; i += 1) h = (h * 31 + fileName.charCodeAt(i)) >>> 0;
  return 2 + (h % 2); // 2 or 3
}

// Alternate descriptive-field values for the 2nd/3rd seeded row of a file, so
// a multi-row table doesn't repeat one identical record. Every status /
// paymentStatus / contractStatus / accountStatus field (the ones the risk
// engine pattern-matches for "clean") is left exactly as the single-row
// factories set it — only non-status descriptive fields vary — so seeding
// sample files still produces a clean/Low read.
function decorateBureauRow(row: BureauResultRow, index: number): BureauResultRow {
  if (index === 0) return row;
  if ('defendantSubject' in row) return row; // CMAP: a clean check has no case to vary
  if ('lendingInstitution' in row) {
    const banks = ['Security Bank', 'RCBC', 'China Bank Savings'];
    const facilities = ['Auto Loan', 'Home Loan'];
    return {
      ...row,
      lendingInstitution: banks[index % banks.length],
      facility: facilities[(index - 1) % facilities.length],
      originalLoanAmount: index === 1 ? '₱250,000.00' : '₱1,200,000.00',
      outstandingBalance: index === 1 ? '₱62,000.00' : '₱410,000.00',
    };
  }
  if ('provider' in row) {
    return { ...row, facilityType: index === 1 ? 'Credit Card' : 'Salary Loan' };
  }
  if ('contractCode' in row) {
    return {
      ...row,
      contractCode: `CIC-2024-${1000 + index * 137}-${2200 + index * 31}`,
      contractType: index === 1 ? 'Personal Loan' : 'Credit Card',
    };
  }
  if ('bankInstitution' in row) {
    const banks = ['Metrobank', 'UnionBank', 'PNB'];
    return {
      ...row,
      bankInstitution: banks[index % banks.length],
      loanFacility: index === 1 ? 'Salary Loan' : 'Credit Line',
    };
  }
  return row; // PGFC: "no existing exposure" doesn't meaningfully vary
}

// The 2–3 sample rows for one uploaded file of a given bureau. CIBI's rows
// still pull facilityType/originalAmount/monthlyAmortization from the CIBI
// intake form (creditType/financedAmount/installment) at the moment the file
// is added.
function seedBureauRows(
  kind: BureauFileKind,
  fileName: string,
  cibi: { creditType: string; financedAmount: string; installment: string }
): BureauResultRow[] {
  const count = sampleRowCount(fileName);
  const make = (): BureauResultRow => {
    switch (kind) {
      case 'cmap':
        return createCmapSampleCase();
      case 'nfisBap':
        return createBapNfisSampleRecord();
      case 'cibi':
        return createCibiSampleResult(cibi.creditType, cibi.financedAmount, cibi.installment);
      case 'cic':
        return createCicSampleContract();
      case 'loandex':
        return createLoandexSampleRecord();
      case 'pgfcExposure':
        return createPgfcSampleExposureRecord();
      default:
        return createLoandexSampleRecord();
    }
  };
  // CMAP and PGFC clean checks are genuinely single-record ("no case",
  // "no exposure") — don't fabricate a second identical no-record row.
  const effectiveCount = kind === 'cmap' || kind === 'pgfcExposure' ? 1 : count;
  return Array.from({ length: effectiveCount }, (_, i) => decorateBureauRow(make(), i));
}

// Maps a BureauFileKind to a mutation of the file array it owns. `'cibi'`
// lives on `cibiForm.reportFiles`; the rest are top-level `*Files` arrays.
function updateBureauFiles(
  review: ApplicationReview,
  kind: BureauFileKind,
  updater: (files: BureauReportFile[]) => BureauReportFile[]
): ApplicationReview {
  if (kind === 'cibi') {
    return { ...review, cibiForm: { ...review.cibiForm, reportFiles: updater(review.cibiForm.reportFiles) } };
  }
  const key = (
    {
      loandex: 'loandexFiles',
      cic: 'cicFiles',
      cmap: 'cmapFiles',
      nfisBap: 'nfisBapFiles',
      pgfcExposure: 'pgfcExposureFiles',
    } as const
  )[kind];
  return { ...review, [key]: updater(review[key]) };
}

// Factory (not a shared constant) so `resetReview()` gets a fresh object each
// call — reusing one constant reference across resets risks accidental
// mutation-sharing bugs if any setter ever mutated in place instead of
// spreading.
function createInitialReview(): ApplicationReview {
  return {
    creditChecking: {
      documentUploaded: false,
      documentName: null,
      decision: 'pending',
      bureauFindingStatus: 'pending',
      bureauFindingBureau: null,
      bureauFindingReason: null,
      notes: '',
      decisionReason: '',
      officerRecommendation: '',
      justificationDocument: null,
      justificationText: '',
    },
    cibiForm: {
      firstName: '',
      middleName: '',
      lastName: '',
      dateOfBirth: '',
      gender: '',
      contactType: 'Mobile',
      contactNumber: '',
      addressRegion: '',
      addressProvince: '',
      addressCity: '',
      addressStreet: '',
      idType: '',
      idNumber: '',
      creditPurpose: '',
      creditType: '',
      financedAmount: '',
      terms: '',
      installment: '',
      submitted: false,
      reportFiles: [],
    },
    loandexFiles: [],
    cicFiles: [],
    cmapFiles: [],
    nfisBapFiles: [],
    pgfcExposureFiles: [],
    reconsideration: { notes: '', decision: 'pending' },
    negativeCreditReport: createInitialNegativeCreditReport(),
    callReport: {
      callReportApprovalStatus: 'not-submitted',
      callReportSubmittedAt: null,
      callReportApprovedAt: null,
      callReportApprovedBy: null,
      decisionReason: '',

      interactionType: '',
      callVisitDate: '',
      callTime: '',
      interviewedPerson: '',
      relationshipToBorrower: '',
      identityStatus: '',
      identityBasis: [],
      identityBasisOther: '',

      validation: createEmptyValidation(),
      materialChangesNotes: '',

      identityAuthorizedRepChangedTo: '',
      identityAuthorizedRepChangeReason: '',

      loanFacilityChangedTo: '',
      loanFacilityChangeReason: '',

      loanPurposeChangedTo: '',
      loanPurposeOtherText: '',
      workingCapitalUse: '',
      workingCapitalUseOtherText: '',
      loanTakeOutInfo: createEmptyLoanTakeOutInfo(),

      primaryRepaymentSourceChangedTo: '',
      repaymentSourceOtherText: '',

      employerBusinessNameChanged: '',
      employmentBusinessAddressChanged: '',
      declaredMonthlyIncomeChanged: '',
      employmentBusinessTenureChanged: '',
      businessEmploymentOtherChange: '',

      existingLoanRows: [],

      residenceBusinessAddressChangedTo: '',
      residenceBusinessAddressChangeReason: '',

      collateralDeclarationChangedTo: [],
      collateralDeclarationOtherText: '',

      comakerChange: createEmptyComakerChange(),
      comakers: [],

      amlIsPep: '',
      amlIsPgfcRelatedParty: '',
      amlHasExistingLoans: '',
      amlPaymentHistory: '',
      amlHasReturnedChecks: '',
      amlHasPastDueObligations: '',

      understandingLevel: '',
      termsUnderstood: [],
      concernsClarifications: '',

      originalRequestedAmount: '',
      proposalInterestRate: '',
      proposalInterestRateBasis: '',
      proposedFacilityProduct: '',
      proposalComputationType: '',
      proposalComputationTypeOther: '',
      proposedLoanAmount: '',
      estimatedMonthlyAmortization: '',
      proposedLoanTermMonths: '',
      otherRequest: '',

      preliminaryRiskLevel: '',
      primaryRiskDrivers: [],
      callDisposition: '',
      reasonKeyCondition: '',

      aiSummary: '',
      aiExceptions: '',
      aiRecommendation: '',
      aoVsSystemVariance: '',
      varianceExplanation: '',

      accountOfficerName: '',
      accountOfficerDateTime: '',
    },
    requirementChecklist: {
      documents: createInitialRequirementDocuments(),
      // Seeded with one starting property/TCT group (matching
      // createInitialRequirementDocuments()'s pre-populated sample data
      // pattern) rather than starting empty — an empty appraisalGroups
      // array is a valid "no real estate collateral yet" state the officer
      // can still reach via "Remove Property", but a fresh session
      // shouldn't start there.
      appraisalGroups: [
        createAppraisalGroup('TCT-2024-00981', 'real-estate', true),
        createAppraisalGroup('TCT-2024-00982', 'real-estate', true),
        createAppraisalGroup('TCT-2024-00983', 'real-estate', true),
        createAppraisalGroup('TCT-2024-00984', 'real-estate', true),
        createAppraisalGroup('TCT-2024-00985', 'real-estate', true),
      ],
      appraisalNotApplicable: false,
      collateralNotes: '',
      outreachMessages: [],
      documentRequests: [],
      endorsed: false,
      rejected: false,
      decisionReason: '',
    },
    creditInvestigation: createInitialCreditInvestigation(),
    appraisal: createInitialAppraisal(),
    cashFlowStatement: createInitialCashFlowStatement(),
    bankStatements: [],
    financialStatement: createInitialFinancialStatement(),
    financialStatementDetails: createInitialFinancialStatementDetails(),
    bankLoans: createInitialBankLoans(),
    financialHighlights: createInitialFinancialHighlights(),
    financialHighlightsRemarks: '',
    additionalFinancialFiles: [],
    stepTimestamps: {},
  };
}

const initialState: AdminState = {
  adminUser: null,
  review: createInitialReview(),
  negativeList: [],
};

const AdminContext = createContext<AdminContextValue | null>(null);

function readStoredState(): AdminState {
  if (typeof window === 'undefined') return initialState;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const stored = JSON.parse(raw);
    // Merge one level into `review` too — a shallow top-level spread alone
    // would drop any review sub-key (e.g. cicUpload) added after a session
    // was already saved to localStorage, since the stored `review` object
    // would fully replace initialState.review instead of filling gaps in it.
    const storedReview = stored.review ?? {};

    return {
      ...initialState,
      ...stored,
      review: {
        ...initialState.review,
        ...storedReview,
        creditChecking: {
          ...initialState.review.creditChecking,
          ...storedReview.creditChecking,
        },
        // Per-bureau file arrays: trust the stored array when present (it's a
        // list of user uploads, not a keyed default set), else the empty
        // initial. `reportFiles` lives inside cibiForm.
        cibiForm: {
          ...initialState.review.cibiForm,
          ...storedReview.cibiForm,
          reportFiles: Array.isArray(storedReview.cibiForm?.reportFiles)
            ? storedReview.cibiForm.reportFiles
            : [],
        },
        loandexFiles: Array.isArray(storedReview.loandexFiles) ? storedReview.loandexFiles : [],
        cicFiles: Array.isArray(storedReview.cicFiles) ? storedReview.cicFiles : [],
        cmapFiles: Array.isArray(storedReview.cmapFiles) ? storedReview.cmapFiles : [],
        nfisBapFiles: Array.isArray(storedReview.nfisBapFiles) ? storedReview.nfisBapFiles : [],
        pgfcExposureFiles: Array.isArray(storedReview.pgfcExposureFiles)
          ? storedReview.pgfcExposureFiles
          : [],
        callReport: {
          ...initialState.review.callReport,
          ...storedReview.callReport,
        },
        requirementChecklist: {
          ...initialState.review.requirementChecklist,
          ...storedReview.requirementChecklist,
          // Merge stored documents onto the fresh default set by `key`,
          // rather than trusting the stored array wholesale — a session
          // saved before a doc-list change (new keys added, or new fields
          // like uploadedBy/reviewed added to RequirementDoc) would
          // otherwise carry forward a stale/incomplete array missing them.
          documents: initialState.review.requirementChecklist.documents.map((defaultDoc) => {
            const storedDoc = storedReview.requirementChecklist?.documents?.find(
              (doc: RequirementDoc) => doc.key === defaultDoc.key
            );
            if (!storedDoc) return defaultDoc;
            const mergedDoc = { ...defaultDoc, ...storedDoc };
            const isSeededSample =
              mergedDoc.fileName === 'sample-local-pdf.pdf' ||
              mergedDoc.fileName?.endsWith('-sample.pdf');
            return isSeededSample
              ? {
                  ...mergedDoc,
                  fileName: 'sample-local-pdf.pdf',
                  fileUrl: '/assets/documents/sample-local-pdf.pdf',
                }
              : mergedDoc;
          }),
          appraisalGroups: (() => {
            const storedGroups: AppraisalTctGroup[] =
              storedReview.requirementChecklist?.appraisalGroups ?? initialState.review.requirementChecklist.appraisalGroups;
            // A session saved before more sample TCTs were added to the
            // default seed would otherwise be stuck at whatever smaller
            // count it started with forever — the plain ?? above only
            // covers "no appraisalGroups key at all", not "fewer groups
            // than today's default seed". Top up any seed TCT numbers
            // missing from the stored array (by tctNumber, so an officer's
            // own renamed/removed rows are left alone) rather than
            // discarding what's stored.
            const storedTctNumbers = new Set(storedGroups.map((group) => group.tctNumber));
            const missingSeedGroups = initialState.review.requirementChecklist.appraisalGroups.filter(
              (seedGroup) => !storedTctNumbers.has(seedGroup.tctNumber)
            );
            return [...storedGroups, ...missingSeedGroups].map((group: AppraisalTctGroup) => ({
              ...group,
              // Sessions stored before collateralType existed have no such
              // key at all — default them to 'real-estate' rather than
              // leaving it undefined, since every seed group before this
              // change was implicitly real estate.
              collateralType: group.collateralType ?? 'real-estate',
              documents: group.documents.map((doc) => {
                const isSeededSample =
                  doc.fileName === 'sample-local-pdf.pdf' || doc.fileName?.endsWith('-sample.pdf');
                return isSeededSample
                  ? {
                      ...doc,
                      fileName: 'sample-local-pdf.pdf',
                      fileUrl: '/assets/documents/sample-local-pdf.pdf',
                    }
                  : doc;
              }),
            }));
          })(),
        },
        creditInvestigation: {
          ...initialState.review.creditInvestigation,
          ...storedReview.creditInvestigation,
          // Only ad-hoc custom rows live in this array now (see
          // createInitialCreditInvestigationDocuments) — carry forward
          // whatever custom rows were stored, dropping anything else.
          documents: (storedReview.creditInvestigation?.documents ?? []).filter(
            (doc: CreditInvestigationDoc) => doc.isCustom
          ),
          report: {
            ...initialState.review.creditInvestigation.report,
            ...storedReview.creditInvestigation?.report,
          },
        },
        appraisal: {
          ...initialState.review.appraisal,
          ...storedReview.appraisal,
          reportBundles: (storedReview.appraisal?.reportBundles ?? []).map((bundle: Partial<AppraisalReportBundle>) => {
            const tctGroupIds = bundle.tctGroupIds ?? [];
            // Stored sessions from before the full Appraisal Report form
            // existed have no landTitles array at all (or one missing
            // entries for groups added since) — top it up by tctGroupId
            // the same way requirementChecklist.appraisalGroups is topped
            // up above, rather than trusting the stored array wholesale.
            const storedLandTitles = bundle.report?.landTitles ?? [];
            const landTitles = tctGroupIds.map((tctGroupId) => ({
              ...createAppraisalReportLandTitle(tctGroupId),
              ...storedLandTitles.find((title) => title.tctGroupId === tctGroupId),
            }));
            return {
              id: bundle.id,
              tctGroupIds,
              appraiserType: bundle.appraiserType ?? null,
              appraiserName: bundle.appraiserName ?? null,
              targetCompletionDate: bundle.targetCompletionDate ?? null,
              feeNeeded: bundle.feeNeeded ?? null,
              feeAmount: bundle.feeAmount ?? '',
              feeDescription: bundle.feeDescription ?? '',
              feeRemarks: bundle.feeRemarks ?? '',
              report: {
                dateReport: '',
                dateInspected: '',
                requestingOfficer: '',
                branch: '',
                registeredOwner: '',
                locationOfProperty: '',
                encumbrancesRemarks: '',
                streetFrontage: '',
                streetWidth: '',
                surfacing: '',
                averageDepth: '',
                approxShape: '',
                topography: '',
                neighborhood: '',
                presentUse: '',
                highestAndBestUse: '',
                utilityPublicConveyance: '',
                utilityElectricity: '',
                utilityWater: '',
                utilityTelephone: '',
                generalConstructionFeatures: '',
                floorLevel: '',
                externalWalls: '',
                interiorWallsPartitions: '',
                flooring: '',
                doorsWindows: '',
                ceilingRoofing: '',
                basisSource: '',
                basisLocation: '',
                basisAreaSize: '',
                basisPriceType: '',
                basisSellingPrice: '',
                fairMarketValuePerSqm: '',
                remarksAdditionalInfo: '',
                itemOfProperty: '',
                fmvRcn: '',
                constructionStatusPercent: '',
                depreciatedValue: '',
                appraisedValueP: '',
                appraisedValue: '',
                roundedFigures: '',
                amountInWords: '',
                loanableAmount: '',
                preparedBy: '',
                reviewedBy: '',
                endorsedBy: '',
                notedBy: '',
                propertyDetails: '',
                remarks: '',
                recommendation: '',
                fileName: null,
                fileUrl: null,
                uploadedAt: null,
                ...bundle.report,
                landTitles,
              },
            };
          }),
        },
        cashFlowStatement: {
          ...initialState.review.cashFlowStatement,
          ...storedReview.cashFlowStatement,
          otherLoans: storedReview.cashFlowStatement?.otherLoans ?? [],
        },
        // A list of officer-entered records — trust the stored array wholesale
        // (not a keyed default set), same as the bureau file arrays.
        bankStatements: Array.isArray(storedReview.bankStatements) ? storedReview.bankStatements : [],
        // Per-period deep merge so a session saved before a field was added
        // still fills the gap; guarantees all 5 period keys exist. The five
        // Balance Sheet categories became line-item arrays — an older
        // session may have stored a flat string total, which we wrap as a
        // single migrated line.
        financialStatement: FINANCIAL_PERIODS.reduce((acc, period) => {
          const merged = {
            ...initialState.review.financialStatement[period],
            ...storedReview.financialStatement?.[period],
          };
          (
            ['currentAssets', 'nonCurrentAssets', 'currentLiabilities', 'nonCurrentLiabilities', 'equity'] as const
          ).forEach((cat) => {
            const raw = (merged as Record<string, unknown>)[cat];
            if (Array.isArray(raw)) return;
            merged[cat] =
              typeof raw === 'string' && raw.trim()
                ? [{ id: crypto.randomUUID(), label: 'Opening balance', value: raw }]
                : [];
          });
          acc[period] = merged;
          return acc;
        }, {} as FinancialStatement),
        financialStatementDetails: hydrateFinancialStatementDetails(
          storedReview.financialStatementDetails
        ),
        bankLoans: {
          ...initialState.review.bankLoans,
          ...storedReview.bankLoans,
          // Deep-merge each row over a blank row so a session saved before a
          // BankLoanRow field was added still fills the gap.
          bankRows: Array.isArray(storedReview.bankLoans?.bankRows)
            ? storedReview.bankLoans.bankRows.map((row: Partial<BankLoanRow>) => ({ ...createBankLoanRow(), ...row }))
            : [],
          pgfcRows: Array.isArray(storedReview.bankLoans?.pgfcRows)
            ? storedReview.bankLoans.pgfcRows.map((row: Partial<BankLoanRow>) => ({ ...createBankLoanRow(), ...row }))
            : [],
          proposed: {
            ...initialState.review.bankLoans.proposed,
            ...storedReview.bankLoans?.proposed,
          },
        },
        financialHighlights: FINANCIAL_PERIODS.reduce((acc, period) => {
          acc[period] = {
            ...initialState.review.financialHighlights[period],
            ...storedReview.financialHighlights?.[period],
          };
          return acc;
        }, {} as FinancialHighlights),
        financialHighlightsRemarks:
          typeof storedReview.financialHighlightsRemarks === 'string'
            ? storedReview.financialHighlightsRemarks
            : '',
        additionalFinancialFiles: Array.isArray(storedReview.additionalFinancialFiles)
          ? storedReview.additionalFinancialFiles.map((file: AdditionalFinancialFile & { note?: string }) => ({
              ...file,
              // Migrate the pre-rename `note` field; default to '' so a stale
              // record without either key never yields `undefined`.
              remarks: file.remarks ?? file.note ?? '',
            }))
          : [],
      },
    };
  } catch {
    return initialState;
  }
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AdminState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(readStoredState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const value = useMemo<AdminContextValue>(
    () => ({
      ...state,
      hydrated,
      bureauResultRows: {
        cmapCases: state.review.cmapFiles.flatMap((f) => f.rows) as CmapCase[],
        bapNfisRecords: state.review.nfisBapFiles.flatMap((f) => f.rows) as BapNfisRecord[],
        cibiResults: state.review.cibiForm.reportFiles.flatMap((f) => f.rows) as CibiResult[],
        cicContracts: state.review.cicFiles.flatMap((f) => f.rows) as CicContract[],
        loandexRecords: state.review.loandexFiles.flatMap((f) => f.rows) as LoandexRecord[],
        pgfcExposureRecords: state.review.pgfcExposureFiles.flatMap((f) => f.rows) as PgfcExposureRecord[],
      },
      setAdminUser: (adminUser) => setState((prev) => ({ ...prev, adminUser })),
      setCreditChecking: (data) =>
        setState((prev) => ({
          ...prev,
          review: { ...prev.review, creditChecking: { ...prev.review.creditChecking, ...data } },
        })),
      setCibiForm: (data) =>
        setState((prev) => ({
          ...prev,
          review: { ...prev.review, cibiForm: { ...prev.review.cibiForm, ...data } },
        })),
      addBureauReportFiles: (kind, files) =>
        setState((prev) => {
          const cibi = {
            creditType: prev.review.cibiForm.creditType,
            financedAmount: prev.review.cibiForm.financedAmount,
            installment: prev.review.cibiForm.installment,
          };
          const uploadedAt = new Date().toISOString();
          const newEntries: BureauReportFile[] = files.map((f) => ({
            id: crypto.randomUUID(),
            fileName: f.fileName,
            fileData: f.fileData,
            uploadedAt,
            rows: seedBureauRows(kind, f.fileName, cibi),
          }));
          return {
            ...prev,
            review: updateBureauFiles(prev.review, kind, (existing) => [...existing, ...newEntries]),
          };
        }),
      replaceBureauReportFile: (kind, id, file) =>
        setState((prev) => {
          const cibi = {
            creditType: prev.review.cibiForm.creditType,
            financedAmount: prev.review.cibiForm.financedAmount,
            installment: prev.review.cibiForm.installment,
          };
          return {
            ...prev,
            review: updateBureauFiles(prev.review, kind, (existing) =>
              existing.map((entry) =>
                entry.id === id
                  ? {
                      ...entry,
                      fileName: file.fileName,
                      fileData: file.fileData,
                      uploadedAt: new Date().toISOString(),
                      // A replaced file is a new document — re-seed fresh rows.
                      rows: seedBureauRows(kind, file.fileName, cibi),
                    }
                  : entry
              )
            ),
          };
        }),
      removeBureauReportFile: (kind, id) =>
        setState((prev) => ({
          ...prev,
          review: updateBureauFiles(prev.review, kind, (existing) =>
            existing.filter((entry) => entry.id !== id)
          ),
        })),
      setReconsideration: (data) =>
        setState((prev) => ({
          ...prev,
          review: { ...prev.review, reconsideration: { ...prev.review.reconsideration, ...data } },
        })),
      setNegativeCreditReport: (data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            negativeCreditReport: { ...prev.review.negativeCreditReport, ...data },
          },
        })),
      addNegativeReportEntry: (listKey, seedLabel = '') =>
        setState((prev) => {
          const newEntry: NegativeReportEntry = { id: crypto.randomUUID(), label: seedLabel, findings: '' };
          return {
            ...prev,
            review: {
              ...prev.review,
              negativeCreditReport: {
                ...prev.review.negativeCreditReport,
                [listKey]: [...prev.review.negativeCreditReport[listKey], newEntry],
              },
            },
          };
        }),
      updateNegativeReportEntry: (listKey, id, data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            negativeCreditReport: {
              ...prev.review.negativeCreditReport,
              [listKey]: prev.review.negativeCreditReport[listKey].map((entry) =>
                entry.id === id ? { ...entry, ...data } : entry
              ),
            },
          },
        })),
      removeNegativeReportEntry: (listKey, id) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            negativeCreditReport: {
              ...prev.review.negativeCreditReport,
              [listKey]: prev.review.negativeCreditReport[listKey].filter((entry) => entry.id !== id),
            },
          },
        })),
      resetNegativeCreditReport: () =>
        setState((prev) => ({
          ...prev,
          review: { ...prev.review, negativeCreditReport: createInitialNegativeCreditReport() },
        })),
      setCallReport: (data) =>
        setState((prev) => ({
          ...prev,
          review: { ...prev.review, callReport: { ...prev.review.callReport, ...data } },
        })),
      addExistingLoanRow: () =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            callReport: {
              ...prev.review.callReport,
              existingLoanRows: [...prev.review.callReport.existingLoanRows, createExistingLoanRow()],
            },
          },
        })),
      updateExistingLoanRow: (id, data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            callReport: {
              ...prev.review.callReport,
              existingLoanRows: prev.review.callReport.existingLoanRows.map((row) =>
                row.id === id ? { ...row, ...data } : row
              ),
            },
          },
        })),
      removeExistingLoanRow: (id) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            callReport: {
              ...prev.review.callReport,
              existingLoanRows: prev.review.callReport.existingLoanRows.filter((row) => row.id !== id),
            },
          },
        })),
      setCallReportComakerChange: (data) =>
        setState((prev) => {
          const nextChange = { ...prev.review.callReport.comakerChange, ...data };
          // Keep the CiComakerEntry array CI's own pre-fill reads in sync —
          // one entry once a name exists, none before that. Only the fields
          // that have a direct PDF equivalent are mapped; monthlyIncome has
          // no equivalent in the new Co-maker/Guarantor block and stays ''.
          const nextComakers = nextChange.completeName.trim()
            ? [
                {
                  id: prev.review.callReport.comakers[0]?.id ?? crypto.randomUUID(),
                  name: nextChange.completeName,
                  relationshipToBorrower: nextChange.relationshipToBorrower,
                  address: nextChange.completeAddress,
                  contactNumber: nextChange.contactNumber,
                  occupation: nextChange.occupationEmployerName,
                  monthlyIncome: prev.review.callReport.comakers[0]?.monthlyIncome ?? '',
                },
              ]
            : [];
          return {
            ...prev,
            review: {
              ...prev.review,
              callReport: {
                ...prev.review.callReport,
                comakerChange: nextChange,
                comakers: nextComakers,
              },
            },
          };
        }),
      setRequirementChecklist: (data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            requirementChecklist: { ...prev.review.requirementChecklist, ...data },
          },
        })),
      addAppraisalGroup: (tctNumber, collateralType) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            requirementChecklist: {
              ...prev.review.requirementChecklist,
              appraisalGroups: [
                ...prev.review.requirementChecklist.appraisalGroups,
                createAppraisalGroup(tctNumber, collateralType),
              ],
            },
          },
        })),
      removeAppraisalGroup: (groupId) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            requirementChecklist: {
              ...prev.review.requirementChecklist,
              appraisalGroups: prev.review.requirementChecklist.appraisalGroups.filter(
                (group) => group.id !== groupId
              ),
            },
          },
        })),
      updateAppraisalGroupDoc: (groupId, docKey, data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            requirementChecklist: {
              ...prev.review.requirementChecklist,
              appraisalGroups: prev.review.requirementChecklist.appraisalGroups.map((group) =>
                group.id !== groupId
                  ? group
                  : {
                      ...group,
                      documents: group.documents.map((doc) =>
                        doc.key === docKey ? { ...doc, ...data } : doc
                      ),
                    }
              ),
            },
          },
        })),
      addOutreachMessage: (message) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            requirementChecklist: {
              ...prev.review.requirementChecklist,
              outreachMessages: [
                ...prev.review.requirementChecklist.outreachMessages,
                { id: crypto.randomUUID(), sentAt: new Date().toISOString(), ...message },
              ],
            },
          },
        })),
      addDocumentRequestMessage: (message) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            requirementChecklist: {
              ...prev.review.requirementChecklist,
              documentRequests: [
                ...prev.review.requirementChecklist.documentRequests,
                { id: crypto.randomUUID(), sentAt: new Date().toISOString(), ...message },
              ],
            },
          },
        })),
      setCreditInvestigation: (data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditInvestigation: { ...prev.review.creditInvestigation, ...data },
          },
        })),
      setCiReport: (data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditInvestigation: {
              ...prev.review.creditInvestigation,
              report: { ...prev.review.creditInvestigation.report, ...data },
            },
          },
        })),
      setAppraisal: (data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            appraisal: { ...prev.review.appraisal, ...data },
          },
        })),
      setCashFlowStatement: (data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            cashFlowStatement: { ...prev.review.cashFlowStatement, ...data },
          },
        })),
      addCashFlowOtherLoan: () =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            cashFlowStatement: {
              ...prev.review.cashFlowStatement,
              otherLoans: [
                ...prev.review.cashFlowStatement.otherLoans,
                { id: crypto.randomUUID(), lender: '', monthlyAmortizationCombined: '', monthlyAmortizationBorrowerOnly: '' },
              ],
            },
          },
        })),
      removeCashFlowOtherLoan: (id) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            cashFlowStatement: {
              ...prev.review.cashFlowStatement,
              otherLoans: prev.review.cashFlowStatement.otherLoans.filter((loan) => loan.id !== id),
            },
          },
        })),
      updateCashFlowOtherLoan: (id, data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            cashFlowStatement: {
              ...prev.review.cashFlowStatement,
              otherLoans: prev.review.cashFlowStatement.otherLoans.map((loan) =>
                loan.id === id ? { ...loan, ...data } : loan
              ),
            },
          },
        })),
      addBankStatement: (id) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            bankStatements: [...prev.review.bankStatements, createBankStatement(id)],
          },
        })),
      updateBankStatement: (id, data) =>
        setState((prev) => ({
          ...prev,
          review: updateOneBankStatement(prev.review, id, (statement) => ({ ...statement, ...data })),
        })),
      removeBankStatement: (id) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            bankStatements: prev.review.bankStatements.filter((statement) => statement.id !== id),
          },
        })),
      addBankStatementDeposit: (id) =>
        setState((prev) => ({
          ...prev,
          review: updateOneBankStatement(prev.review, id, (statement) => ({
            ...statement,
            deposits: [...statement.deposits, { id: crypto.randomUUID(), date: '', amount: '' }],
          })),
        })),
      updateBankStatementDeposit: (id, depositId, data) =>
        setState((prev) => ({
          ...prev,
          review: updateOneBankStatement(prev.review, id, (statement) => ({
            ...statement,
            deposits: statement.deposits.map((deposit) =>
              deposit.id === depositId ? { ...deposit, ...data } : deposit
            ),
          })),
        })),
      removeBankStatementDeposit: (id, depositId) =>
        setState((prev) => ({
          ...prev,
          review: updateOneBankStatement(prev.review, id, (statement) => ({
            ...statement,
            deposits: statement.deposits.filter((deposit) => deposit.id !== depositId),
          })),
        })),
      addBankStatementDailyBalance: (id) =>
        setState((prev) => ({
          ...prev,
          review: updateOneBankStatement(prev.review, id, (statement) => ({
            ...statement,
            dailyBalances: [
              ...statement.dailyBalances,
              { id: crypto.randomUUID(), periodFrom: '', periodTo: '', balance: '' },
            ],
          })),
        })),
      updateBankStatementDailyBalance: (id, balanceId, data) =>
        setState((prev) => ({
          ...prev,
          review: updateOneBankStatement(prev.review, id, (statement) => ({
            ...statement,
            dailyBalances: statement.dailyBalances.map((balance) =>
              balance.id === balanceId ? { ...balance, ...data } : balance
            ),
          })),
        })),
      removeBankStatementDailyBalance: (id, balanceId) =>
        setState((prev) => ({
          ...prev,
          review: updateOneBankStatement(prev.review, id, (statement) => ({
            ...statement,
            dailyBalances: statement.dailyBalances.filter((balance) => balance.id !== balanceId),
          })),
        })),
      fillFinancialEvaluationSample: () =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            bankStatements: [createSampleBankStatement()],
            cashFlowStatement: createSampleCashFlowStatement(),
            financialStatement: createSampleFinancialStatement(),
            financialStatementDetails: {
              productLine: 'Wholesale and Retail Trade',
              amd: '',
              remarks: '<p>Financial statements reviewed for the five reporting periods.</p>',
              submittedAt: new Date().toISOString(),
            },
            bankLoans: createSampleBankLoans(),
            financialHighlights: createSampleFinancialHighlights(),
            financialHighlightsRemarks: '<p>Ratios and coverage metrics reviewed for the five reporting periods.</p>',
            additionalFinancialFiles: createSampleAdditionalFinancialFiles(),
          },
        })),
      clearFinancialEvaluationSample: () =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            bankStatements: [],
            cashFlowStatement: createInitialCashFlowStatement(),
            financialStatement: createInitialFinancialStatement(),
            financialStatementDetails: createInitialFinancialStatementDetails(),
            bankLoans: createInitialBankLoans(),
            financialHighlights: createInitialFinancialHighlights(),
            financialHighlightsRemarks: '',
            additionalFinancialFiles: [],
          },
        })),
      setFinancialStatementField: (period, field, value) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            financialStatement: {
              ...prev.review.financialStatement,
              [period]: { ...prev.review.financialStatement[period], [field]: value },
            },
          },
        })),
      markFinancialStatementBalanceSheetSaved: (period) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            financialStatement: {
              ...prev.review.financialStatement,
              [period]: { ...prev.review.financialStatement[period], balanceSheetSaved: true },
            },
          },
        })),
      addBalanceSheetLine: (period, category) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            financialStatement: {
              ...prev.review.financialStatement,
              [period]: {
                ...prev.review.financialStatement[period],
                [category]: [
                  ...prev.review.financialStatement[period][category],
                  { id: crypto.randomUUID(), label: '', value: '' },
                ],
              },
            },
          },
        })),
      updateBalanceSheetLine: (period, category, id, patch) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            financialStatement: {
              ...prev.review.financialStatement,
              [period]: {
                ...prev.review.financialStatement[period],
                [category]: prev.review.financialStatement[period][category].map((row) =>
                  row.id === id ? { ...row, ...patch } : row
                ),
              },
            },
          },
        })),
      removeBalanceSheetLine: (period, category, id) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            financialStatement: {
              ...prev.review.financialStatement,
              [period]: {
                ...prev.review.financialStatement[period],
                [category]: prev.review.financialStatement[period][category].filter((row) => row.id !== id),
              },
            },
          },
        })),
      setFinancialStatementDetails: (data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            financialStatementDetails: patchFinancialStatementDetails(
              prev.review.financialStatementDetails,
              data
            ),
          },
        })),
      addBankLoanRow: (kind) =>
        setState((prev) => {
          const key = kind === 'bank' ? 'bankRows' : 'pgfcRows';
          return {
            ...prev,
            review: {
              ...prev.review,
              bankLoans: {
                ...prev.review.bankLoans,
                [key]: [...prev.review.bankLoans[key], createBankLoanRow()],
              },
            },
          };
        }),
      updateBankLoanRow: (kind, id, data) =>
        setState((prev) => {
          const key = kind === 'bank' ? 'bankRows' : 'pgfcRows';
          return {
            ...prev,
            review: {
              ...prev.review,
              bankLoans: {
                ...prev.review.bankLoans,
                [key]: prev.review.bankLoans[key].map((row) =>
                  row.id === id ? { ...row, ...data } : row
                ),
              },
            },
          };
        }),
      removeBankLoanRow: (kind, id) =>
        setState((prev) => {
          const key = kind === 'bank' ? 'bankRows' : 'pgfcRows';
          return {
            ...prev,
            review: {
              ...prev.review,
              bankLoans: {
                ...prev.review.bankLoans,
                [key]: prev.review.bankLoans[key].filter((row) => row.id !== id),
              },
            },
          };
        }),
      setPgfcProposedLoan: (data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            bankLoans: {
              ...prev.review.bankLoans,
              proposed: { ...prev.review.bankLoans.proposed, ...data },
            },
          },
        })),
      setFinancialHighlightsField: (period, field, value) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            financialHighlights: {
              ...prev.review.financialHighlights,
              [period]: { ...prev.review.financialHighlights[period], [field]: value },
            },
          },
        })),
      setFinancialHighlightsRemarks: (value) =>
        setState((prev) => ({
          ...prev,
          review: { ...prev.review, financialHighlightsRemarks: value },
        })),
      addAdditionalFinancialFiles: (files) =>
        setState((prev) => {
          const uploadedAt = new Date().toISOString();
          return {
            ...prev,
            review: {
              ...prev.review,
              additionalFinancialFiles: [
                ...prev.review.additionalFinancialFiles,
                ...files.map((file) => ({
                  id: crypto.randomUUID(),
                  fileName: file.fileName,
                  fileData: file.fileData,
                  remarks: '',
                  uploadedAt,
                })),
              ],
            },
          };
        }),
      updateAdditionalFinancialFile: (id, data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            additionalFinancialFiles: prev.review.additionalFinancialFiles.map((file) =>
              file.id === id ? { ...file, ...data } : file
            ),
          },
        })),
      removeAdditionalFinancialFile: (id) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            additionalFinancialFiles: prev.review.additionalFinancialFiles.filter(
              (file) => file.id !== id
            ),
          },
        })),
      createAppraisalReportBundle: (tctGroupIds, appraiserType, appraiserName, targetCompletionDate, fee) =>
        setState((prev) => {
          const bundle = createAppraisalReportBundle(
            tctGroupIds,
            appraiserType,
            appraiserName,
            targetCompletionDate,
            fee
          );
          return {
            ...prev,
            review: {
              ...prev.review,
              appraisal: {
                ...prev.review.appraisal,
                reportBundles: [...prev.review.appraisal.reportBundles, bundle],
              },
              requirementChecklist: {
                ...prev.review.requirementChecklist,
                appraisalGroups: prev.review.requirementChecklist.appraisalGroups.map((group) =>
                  tctGroupIds.includes(group.id) ? { ...group, reportId: bundle.id } : group
                ),
              },
            },
          };
        }),
      setAppraisalBundleAppraiserType: (bundleId, appraiserType) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            appraisal: {
              ...prev.review.appraisal,
              reportBundles: prev.review.appraisal.reportBundles.map((bundle) =>
                bundle.id !== bundleId
                  ? bundle
                  : {
                      ...bundle,
                      appraiserType,
                      report: createAppraisalReportBundle(bundle.tctGroupIds, appraiserType, null, null).report,
                    }
              ),
            },
          },
        })),
      setAppraisalBundleFee: (bundleId, data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            appraisal: {
              ...prev.review.appraisal,
              reportBundles: prev.review.appraisal.reportBundles.map((bundle) =>
                bundle.id !== bundleId ? bundle : { ...bundle, ...data }
              ),
            },
          },
        })),
      submitAppraisalFeesForApproval: () =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            appraisal: {
              ...prev.review.appraisal,
              feeApprovalStatus: 'pending-approval',
              feeDeclineReason: '',
              feeSubmittedAt: new Date().toISOString(),
              feeApprovedAt: null,
            },
          },
        })),
      approveAppraisalFees: () =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            appraisal: {
              ...prev.review.appraisal,
              feeApprovalStatus: 'approved',
              feeApprovedAt: new Date().toISOString(),
            },
          },
        })),
      declineAppraisalFees: (reason) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            appraisal: {
              ...prev.review.appraisal,
              feeApprovalStatus: 'declined',
              feeDeclineReason: reason,
              // A declined batch's payment record (if any was somehow
              // entered while pending) doesn't apply to whatever gets
              // resubmitted/approved next — same reset every other
              // batch-level fee field gets on decline/resubmit.
              feePayment: createEmptyPaymentDetails(),
            },
          },
        })),
      resetAppraisalFees: () =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            appraisal: {
              ...prev.review.appraisal,
              feeApprovalStatus: 'not-submitted',
              feeDeclineReason: '',
              feeSubmittedAt: null,
              feeApprovedAt: null,
              clientNotifiedAt: null,
              sentToOdooAt: null,
              paymentReceivedAt: null,
              feePayment: createEmptyPaymentDetails(),
              reportBundles: prev.review.appraisal.reportBundles.map((bundle) => ({
                ...bundle,
                feeNeeded: null,
                feeAmount: '',
                feeDescription: '',
                feeRemarks: '',
              })),
            },
          },
        })),
      setAppraisalFeePayment: (data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            appraisal: {
              ...prev.review.appraisal,
              feePayment: { ...prev.review.appraisal.feePayment, ...data },
            },
          },
        })),
      markAppraisalFeeAsPaid: () =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            appraisal: {
              ...prev.review.appraisal,
              feePayment: { ...prev.review.appraisal.feePayment, paidAt: new Date().toISOString() },
            },
          },
        })),
      setCiFeePayment: (data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditInvestigation: {
              ...prev.review.creditInvestigation,
              ciFeePayment: { ...prev.review.creditInvestigation.ciFeePayment, ...data },
            },
          },
        })),
      markCiFeeAsPaid: () =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditInvestigation: {
              ...prev.review.creditInvestigation,
              ciFeePayment: {
                ...prev.review.creditInvestigation.ciFeePayment,
                paidAt: new Date().toISOString(),
              },
            },
          },
        })),
      setAppraisalBundleReport: (bundleId, data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            appraisal: {
              ...prev.review.appraisal,
              reportBundles: prev.review.appraisal.reportBundles.map((bundle) =>
                bundle.id !== bundleId ? bundle : { ...bundle, report: { ...bundle.report, ...data } }
              ),
            },
          },
        })),
      setAppraisalBundleLandTitle: (bundleId, tctGroupId, data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            appraisal: {
              ...prev.review.appraisal,
              reportBundles: prev.review.appraisal.reportBundles.map((bundle) =>
                bundle.id !== bundleId
                  ? bundle
                  : {
                      ...bundle,
                      report: {
                        ...bundle.report,
                        landTitles: bundle.report.landTitles.map((title) =>
                          title.tctGroupId !== tctGroupId ? title : { ...title, ...data }
                        ),
                      },
                    }
              ),
            },
          },
        })),
      deleteAppraisalReportBundle: (bundleId) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            appraisal: {
              ...prev.review.appraisal,
              reportBundles: prev.review.appraisal.reportBundles.filter((bundle) => bundle.id !== bundleId),
            },
            requirementChecklist: {
              ...prev.review.requirementChecklist,
              appraisalGroups: prev.review.requirementChecklist.appraisalGroups.map((group) =>
                group.reportId === bundleId ? { ...group, reportId: null } : group
              ),
            },
          },
        })),
      clearAllAppraisalBundleReports: () =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            appraisal: {
              ...prev.review.appraisal,
              reportBundles: prev.review.appraisal.reportBundles.map((bundle) => ({
                ...bundle,
                report: { ...bundle.report, uploadedAt: null, fileName: null, fileUrl: null },
              })),
            },
          },
        })),
      addCreditInvestigationDocument: (label, uploadedBy, file) =>
        setState((prev) => {
          const newDoc: CreditInvestigationDoc = {
            key: crypto.randomUUID(),
            status: 'verified',
            aiNote: 'Reviewed, no issues found.',
            fileName: file.fileName,
            fileUrl: file.fileUrl,
            uploadedAt: new Date().toISOString(),
            uploadedBy,
            remarks: '',
            reviewed: false,
            isCustom: true,
            label,
          };
          return {
            ...prev,
            review: {
              ...prev.review,
              creditInvestigation: {
                ...prev.review.creditInvestigation,
                documents: [...prev.review.creditInvestigation.documents, newDoc],
              },
            },
          };
        }),
      removeCreditInvestigationDocument: (key) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditInvestigation: {
              ...prev.review.creditInvestigation,
              documents: prev.review.creditInvestigation.documents.filter((doc) => doc.key !== key),
            },
          },
        })),
      addCiOutreachMessage: (message) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditInvestigation: {
              ...prev.review.creditInvestigation,
              outreachMessages: [
                ...prev.review.creditInvestigation.outreachMessages,
                { id: crypto.randomUUID(), sentAt: new Date().toISOString(), ...message },
              ],
            },
          },
        })),
      markStepEntered: (step) =>
        setState((prev) => {
          if (prev.review.stepTimestamps[step]) return prev;
          return {
            ...prev,
            review: {
              ...prev.review,
              stepTimestamps: {
                ...prev.review.stepTimestamps,
                [step]: new Date().toISOString(),
              },
            },
          };
        }),
      addToNegativeList: (entry) =>
        setState((prev) => {
          if (prev.negativeList.some((item) => item.email === entry.email)) return prev;
          return {
            ...prev,
            negativeList: [...prev.negativeList, { ...entry, recordedAt: new Date().toISOString() }],
          };
        }),
      // Clears only the review state (CIBI form, bureau uploads, decisions,
      // step timestamps) back to a blank slate — used when the Application
      // List's "Clear Sample Data" resets the live applicant, since that used
      // to only clear RegistrationContext (who the applicant is) while
      // leaving all of their old review progress behind in AdminContext,
      // making every step look like it still had leftover filled-in data
      // from a previous test run instead of resetting to empty. Keeps
      // `adminUser` (stay logged in) and `negativeList` (a real historical
      // record, not per-applicant scratch state) untouched.
      resetReview: () => setState((prev) => ({ ...prev, review: createInitialReview() })),
      logout: () => {
        window.localStorage.removeItem(STORAGE_KEY);
        setState(initialState);
      },
    }),
    [state, hydrated]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const context = useContext(AdminContext);

  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider');
  }

  return context;
}
