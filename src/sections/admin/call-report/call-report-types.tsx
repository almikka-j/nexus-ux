import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';

import type {
  InteractionType,
  IdentityStatus,
  IdentityBasisItem,
  LoanFacilityType,
  LoanPurposeType,
  WorkingCapitalUse,
  RepaymentSourceType,
  EmploymentTenureRange,
  CollateralDeclarationType,
  YesNoVerify,
  PaymentHistoryDescriptor,
  UnderstandingLevel,
  LoanTermItem,
  ProposalInterestRateBasis,
  ProposalComputationType,
  RiskDriverItem,
  CallDispositionType,
} from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Every enum field in the NEXUS-KYC CallReport shape has its {value,label}
// option list here, so every card component imports labels from one place
// instead of repeating display strings inline. Rewritten from scratch to
// match the new PDF template's own field set — see
// docs/superpowers/specs/2026-08-24-call-report-nexus-kyc-design.md.
// ----------------------------------------------------------------------

export type Option<T extends string> = { value: T; label: string };

export const INTERACTION_TYPE_OPTIONS: Option<InteractionType>[] = [
  { value: 'in-person', label: 'In Person' },
  { value: 'phone', label: 'Phone Call' },
  { value: 'video', label: 'Video Call' },
];

export const IDENTITY_STATUS_OPTIONS: Option<IdentityStatus>[] = [
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'for-verification', label: 'For Verification' },
  { value: 'unable-to-confirm', label: 'Unable to Confirm' },
];

export const IDENTITY_BASIS_OPTIONS: Option<IdentityBasisItem>[] = [
  { value: 'app-data-matched', label: 'Application Data Matched' },
  { value: 'valid-government-id', label: 'Valid Government ID' },
  { value: 'verification-questions', label: 'Verification Questions' },
  { value: 'other', label: 'Other' },
];

export const LOAN_FACILITY_OPTIONS: Option<LoanFacilityType>[] = [
  { value: 'sme-business', label: 'SME/Business Loan' },
  { value: 'clean-loan', label: 'Clean Loan' },
  { value: 'sangla-titulo', label: 'Sangla Titulo' },
  { value: 'clubflex-direct', label: 'Clubflex Direct Loan' },
  { value: 'clubflex-financing', label: 'Clubflex Financing' },
];

export const LOAN_PURPOSE_OPTIONS: Option<LoanPurposeType>[] = [
  { value: 'additional-working-capital', label: 'Additional Working Capital' },
  { value: 'new-business-venture', label: 'New Business Venture' },
  { value: 'loan-take-out-refinancing', label: 'Loan Take-out / Refinancing' },
  { value: 'home-renovation-construction', label: 'Home Renovation / Construction' },
  { value: 'residential-property-acquisition', label: 'Residential Property Acquisition' },
  { value: 'commercial-property-acquisition', label: 'Commercial Property Acquisition' },
  { value: 'machinery-equipment-acquisition', label: 'Machinery / Equipment Acquisition' },
  { value: 'club-share-acquisition', label: 'Club Share Acquisition' },
  { value: 'raw-land-acquisition-development', label: 'Raw Land Acquisition / Development' },
  { value: 'bridge-financing', label: 'Bridge Financing' },
  { value: 'other', label: 'Other' },
];

export const WORKING_CAPITAL_USE_OPTIONS: Option<WorkingCapitalUse>[] = [
  { value: 'inventory-stock', label: 'Inventory / Stock Replenishment' },
  { value: 'raw-materials', label: 'Raw Materials' },
  { value: 'supplier-payments', label: 'Supplier Payments' },
  { value: 'payroll-employee-costs', label: 'Payroll / Employee Costs' },
  { value: 'operating-expenses', label: 'Operating Expenses' },
  { value: 'seasonal-working-capital', label: 'Seasonal Working Capital' },
  { value: 'contract-project-financing', label: 'Contract / Project Financing' },
  { value: 'cash-flow-support', label: 'Cash Flow Support' },
  { value: 'business-expansion', label: 'Business Expansion' },
  { value: 'other', label: 'Other' },
];

export const REPAYMENT_SOURCE_TYPE_OPTIONS: Option<RepaymentSourceType>[] = [
  { value: 'employment-salary', label: 'Employment / Salary' },
  { value: 'business-income', label: 'Business Income' },
  { value: 'rental-income', label: 'Rental Income' },
  { value: 'remittance', label: 'Remittance' },
  { value: 'pension', label: 'Pension' },
  { value: 'professional-fees', label: 'Professional Fees' },
  { value: 'commission-based', label: 'Commission-Based' },
  { value: 'dividend-investment-income', label: 'Dividend / Investment Income' },
  { value: 'other', label: 'Other' },
];

export const EMPLOYMENT_TENURE_RANGE_OPTIONS: Option<EmploymentTenureRange>[] = [
  { value: 'lt-1', label: 'Less than 1 year' },
  { value: '1-3', label: '1–3 years' },
  { value: '3-5', label: '3–5 years' },
  { value: 'gt-5', label: 'More than 5 years' },
];

export const COLLATERAL_DECLARATION_OPTIONS: Option<CollateralDeclarationType>[] = [
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'club-share', label: 'Club Share' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'receivables', label: 'Receivables' },
  { value: 'unsecured', label: 'Unsecured' },
  { value: 'corporate-guarantee', label: 'Corporate Guarantee' },
  { value: 'other', label: 'Other' },
];

export const YES_NO_VERIFY_OPTIONS: Option<YesNoVerify>[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'for-verification', label: 'For Verification' },
];

export const PAYMENT_HISTORY_DESCRIPTOR_OPTIONS: Option<PaymentHistoryDescriptor>[] = [
  { value: 'on-time', label: 'On Time' },
  { value: 'minor-delays', label: 'With Minor Delays' },
  { value: 'major-delays', label: 'With Major Delays' },
  { value: 'for-verification', label: 'For Verification' },
];

export const UNDERSTANDING_LEVEL_OPTIONS: Option<UnderstandingLevel>[] = [
  { value: 'fully-understood', label: 'Fully Understood' },
  { value: 'clarification-required', label: 'Clarification Required' },
  { value: 'not-yet-discussed', label: 'Not Yet Discussed' },
];

export const LOAN_TERM_ITEM_OPTIONS: Option<LoanTermItem>[] = [
  { value: 'interest-rate', label: 'Interest Rate' },
  { value: 'loan-amount', label: 'Loan Amount' },
  { value: 'loan-term', label: 'Loan Term' },
  { value: 'monthly-amortization', label: 'Monthly Amortization' },
  { value: 'processing-fees', label: 'Processing Fees' },
  { value: 'documentary-requirements', label: 'Documentary Requirements' },
  { value: 'collateral-requirements', label: 'Collateral Requirements' },
  { value: 'loan-release-process', label: 'Loan Release Process' },
  { value: 'pre-termination-prepayment-policy', label: 'Pre-termination / Prepayment Policy' },
];

export const PROPOSAL_INTEREST_RATE_BASIS_OPTIONS: Option<ProposalInterestRateBasis>[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
];

export const PROPOSAL_COMPUTATION_TYPE_OPTIONS: Option<ProposalComputationType>[] = [
  { value: 'diminishing-balance', label: 'Diminishing Balance' },
  { value: 'add-on', label: 'Add-on' },
  { value: 'other', label: 'Other' },
];

export const RISK_DRIVER_OPTIONS: Option<RiskDriverItem>[] = [
  { value: 'character', label: 'Character' },
  { value: 'capacity', label: 'Capacity' },
  { value: 'collateral', label: 'Collateral' },
  { value: 'kyc', label: 'KYC' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'information-consistency', label: 'Information Consistency' },
];

export const CALL_DISPOSITION_OPTIONS: Option<CallDispositionType>[] = [
  { value: 'proceed-to-next-process', label: 'Proceed to Next Process' },
  { value: 'proceed-subject-to-requirements', label: 'Proceed Subject to Requirements' },
  { value: 'additional-verification', label: 'Additional Verification' },
  { value: 'follow-up-call', label: 'Follow-up Call' },
  { value: 'sales-reject-decline', label: 'Sales Reject/Decline' },
];

// Shared MUI sx used by every text/select field across all Call Report cards.
export const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 },
};

// Shared card container sx, matching this app's standard rounded white card.
export { adminCardSx as cardSx } from 'src/components/admin-ui';

export function labelFor<T extends string>(options: Option<T>[], value: T | ''): string | null {
  if (!value) return null;
  return options.find((option) => option.value === value)?.label ?? null;
}

export function RadioRow<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: T | '';
  options: Option<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <FormControl disabled={disabled}>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 0.75 }}>
        {label}
      </Typography>
      <RadioGroup row value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            control={<Radio size="small" />}
            label={<Typography sx={{ fontSize: 13.5 }}>{option.label}</Typography>}
            disabled={disabled}
          />
        ))}
      </RadioGroup>
    </FormControl>
  );
}

export function ChipToggleGroup<T extends string>({
  options,
  selected,
  onToggle,
}: {
  options: Option<T>[];
  selected: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <Stack direction="row" flexWrap="wrap" gap={1}>
      {options.map((option) => {
        const isSelected = selected.includes(option.value);
        return (
          <Chip
            key={option.value}
            label={option.label}
            onClick={() => onToggle(option.value)}
            variant={isSelected ? 'filled' : 'outlined'}
            sx={{
              borderRadius: '8px',
              fontSize: 13,
              bgcolor: isSelected ? '#1C2A6E' : 'transparent',
              color: isSelected ? 'common.white' : '#3B4256',
              borderColor: '#D2D6E0',
              '&:hover': { bgcolor: isSelected ? '#14205A' : '#F5F7FE' },
            }}
          />
        );
      })}
    </Stack>
  );
}
