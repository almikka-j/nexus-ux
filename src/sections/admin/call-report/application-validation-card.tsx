'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ButtonGroup from '@mui/material/ButtonGroup';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';
import type { ValidationItemKey, ValidationStatus } from 'src/auth/admin-context';

import {
  cardSx,
  fieldSx,
  RadioRow,
  ChipToggleGroup,
  LOAN_FACILITY_OPTIONS,
  LOAN_PURPOSE_OPTIONS,
  WORKING_CAPITAL_USE_OPTIONS,
  REPAYMENT_SOURCE_TYPE_OPTIONS,
  EMPLOYMENT_TENURE_RANGE_OPTIONS,
  COLLATERAL_DECLARATION_OPTIONS,
} from './call-report-types';

// ----------------------------------------------------------------------
// PDF section 2: Application Validation. One ValidationRow per fixed line
// item (9 total, per the PDF's own — inconsistently numbered — table).
// Each row shows the current application data read-only, a three-way
// status control, and — only when marked "Changed" — that row's own
// "Changed Information" detail panel inline beneath it. No literal MUI
// Table is used: several rows (Loan Purpose especially) have 2-3 levels
// of nested conditional fields that don't fit table cells, and no other
// page in this app nests expandable form content inside a table row.
// ----------------------------------------------------------------------

const STATUS_BUTTONS: { value: ValidationStatus; label: string }[] = [
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'changed', label: 'Changed' },
  { value: 'unable-to-verify', label: 'Unable to Verify' },
];

function StatusControl({
  value,
  onChange,
}: {
  value: ValidationStatus;
  onChange: (value: ValidationStatus) => void;
}) {
  return (
    <ButtonGroup size="small" sx={{ flexShrink: 0 }}>
      {STATUS_BUTTONS.map((option) => (
        <Button
          key={option.value}
          onClick={() => onChange(option.value)}
          variant={value === option.value ? 'contained' : 'outlined'}
          sx={
            value === option.value
              ? { bgcolor: '#1C2A6E', borderColor: '#1C2A6E', '&:hover': { bgcolor: '#14205A' } }
              : { color: '#5A6273', borderColor: '#D2D6E0' }
          }
        >
          {option.label}
        </Button>
      ))}
    </ButtonGroup>
  );
}

function ValidationRow({
  label,
  currentValue,
  status,
  onStatusChange,
  children,
}: {
  label: string;
  currentValue: string;
  status: ValidationStatus;
  onStatusChange: (value: ValidationStatus) => void;
  children?: React.ReactNode;
}) {
  return (
    <Box sx={{ py: 1.5, borderBottom: '1px solid #EEF0F5' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', sm: 'center' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#14172A' }}>{label}</Typography>
          {currentValue && (
            <Typography sx={{ fontSize: 12.5, color: '#8891A6', mt: 0.25 }} noWrap title={currentValue}>
              {currentValue}
            </Typography>
          )}
        </Box>
        <StatusControl value={status} onChange={onStatusChange} />
      </Stack>
      {status === 'changed' && children && (
        <Box sx={{ mt: 1.5, p: 1.75, borderRadius: '10px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
          {children}
        </Box>
      )}
    </Box>
  );
}

export function ApplicationValidationCard() {
  const { review, setCallReport, addExistingLoanRow, updateExistingLoanRow, removeExistingLoanRow, setCallReportComakerChange } =
    useAdmin();
  const { callReport } = review;
  const { application, signUpData } = useRegistration();

  const setStatus = (key: ValidationItemKey, value: ValidationStatus) =>
    setCallReport({ validation: { ...callReport.validation, [key]: value } });

  const currentIdentity = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : '';
  const currentLoanFacility = application.financialInfo?.loanPurpose ?? '';
  const currentLoanPurpose = application.financialInfo?.loanPurpose ?? '';
  const currentRepaymentSource = '';
  const currentBusinessEmployment = application.financialInfo?.employmentStatus ?? '';
  const currentResidenceAddress = application.personalInfo
    ? [application.personalInfo.address, application.personalInfo.city].filter(Boolean).join(', ')
    : '';

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        Application Validation — Confirm, Change or Verify
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Validate only relevant information discussed during the call.
      </Typography>

      <Stack>
        <ValidationRow
          label="1. Identity / Authorized Representative"
          currentValue={currentIdentity}
          status={callReport.validation.identityAuthorizedRep}
          onStatusChange={(value) => setStatus('identityAuthorizedRep', value)}
        >
          <Stack spacing={1.5}>
            <TextField
              fullWidth
              label="Changed Identity / Authorized Representative To"
              value={callReport.identityAuthorizedRepChangedTo}
              onChange={(event) => setCallReport({ identityAuthorizedRepChangedTo: event.target.value })}
              sx={fieldSx}
            />
            <TextField
              fullWidth
              label="Reason"
              value={callReport.identityAuthorizedRepChangeReason}
              onChange={(event) => setCallReport({ identityAuthorizedRepChangeReason: event.target.value })}
              sx={fieldSx}
            />
          </Stack>
        </ValidationRow>

        <ValidationRow
          label="2. Loan Facility"
          currentValue={currentLoanFacility}
          status={callReport.validation.loanFacility}
          onStatusChange={(value) => setStatus('loanFacility', value)}
        >
          <Stack spacing={1.5}>
            <RadioRow
              label="Loan Facility — Changed To"
              value={callReport.loanFacilityChangedTo}
              options={LOAN_FACILITY_OPTIONS}
              onChange={(value) => setCallReport({ loanFacilityChangedTo: value })}
            />
            <TextField
              fullWidth
              label="Reason for Change"
              value={callReport.loanFacilityChangeReason}
              onChange={(event) => setCallReport({ loanFacilityChangeReason: event.target.value })}
              sx={fieldSx}
            />
          </Stack>
        </ValidationRow>

        <ValidationRow
          label="3. Loan Purpose"
          currentValue={currentLoanPurpose}
          status={callReport.validation.loanPurpose}
          onStatusChange={(value) => setStatus('loanPurpose', value)}
        >
          <Stack spacing={1.5}>
            <RadioRow
              label="Purpose of Loan — Changed To"
              value={callReport.loanPurposeChangedTo}
              options={LOAN_PURPOSE_OPTIONS}
              onChange={(value) => setCallReport({ loanPurposeChangedTo: value })}
            />
            {callReport.loanPurposeChangedTo === 'other' && (
              <TextField
                fullWidth
                label="Other"
                value={callReport.loanPurposeOtherText}
                onChange={(event) => setCallReport({ loanPurposeOtherText: event.target.value })}
                sx={fieldSx}
              />
            )}
            {callReport.loanPurposeChangedTo === 'additional-working-capital' && (
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 0.75 }}>
                  Specific Use
                </Typography>
                <RadioRow
                  label=""
                  value={callReport.workingCapitalUse}
                  options={WORKING_CAPITAL_USE_OPTIONS}
                  onChange={(value) => setCallReport({ workingCapitalUse: value })}
                />
                {callReport.workingCapitalUse === 'other' && (
                  <TextField
                    fullWidth
                    label="Other"
                    value={callReport.workingCapitalUseOtherText}
                    onChange={(event) => setCallReport({ workingCapitalUseOtherText: event.target.value })}
                    sx={{ ...fieldSx, mt: 1 }}
                  />
                )}
              </Box>
            )}
            {callReport.loanPurposeChangedTo === 'loan-take-out-refinancing' && (
              <Stack spacing={1.5}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A' }}>
                  Loan Take-out Information
                </Typography>
                <Stack direction="row" spacing={1.5}>
                  <TextField
                    fullWidth
                    label="Current Lender"
                    value={callReport.loanTakeOutInfo.currentLender}
                    onChange={(event) =>
                      setCallReport({ loanTakeOutInfo: { ...callReport.loanTakeOutInfo, currentLender: event.target.value } })
                    }
                    sx={fieldSx}
                  />
                  <TextField
                    fullWidth
                    label="Outstanding Balance"
                    value={callReport.loanTakeOutInfo.outstandingBalance}
                    onChange={(event) =>
                      setCallReport({ loanTakeOutInfo: { ...callReport.loanTakeOutInfo, outstandingBalance: event.target.value } })
                    }
                    sx={fieldSx}
                  />
                </Stack>
                <Stack direction="row" spacing={1.5}>
                  <TextField
                    fullWidth
                    label="Estimated Payoff Amount"
                    value={callReport.loanTakeOutInfo.estimatedPayoffAmount}
                    onChange={(event) =>
                      setCallReport({
                        loanTakeOutInfo: { ...callReport.loanTakeOutInfo, estimatedPayoffAmount: event.target.value },
                      })
                    }
                    sx={fieldSx}
                  />
                  <TextField
                    fullWidth
                    label="Remaining Loan Term"
                    value={callReport.loanTakeOutInfo.remainingLoanTerm}
                    onChange={(event) =>
                      setCallReport({ loanTakeOutInfo: { ...callReport.loanTakeOutInfo, remainingLoanTerm: event.target.value } })
                    }
                    sx={fieldSx}
                  />
                </Stack>
                <Stack direction="row" spacing={1.5}>
                  <TextField
                    fullWidth
                    label="Reason for Take-Out"
                    value={callReport.loanTakeOutInfo.reasonForTakeOut}
                    onChange={(event) =>
                      setCallReport({ loanTakeOutInfo: { ...callReport.loanTakeOutInfo, reasonForTakeOut: event.target.value } })
                    }
                    sx={fieldSx}
                  />
                  <TextField
                    fullWidth
                    label="Status"
                    value={callReport.loanTakeOutInfo.status}
                    onChange={(event) =>
                      setCallReport({ loanTakeOutInfo: { ...callReport.loanTakeOutInfo, status: event.target.value } })
                    }
                    sx={fieldSx}
                  />
                </Stack>
              </Stack>
            )}
          </Stack>
        </ValidationRow>

        <ValidationRow
          label="4. Primary Source of Repayment"
          currentValue={currentRepaymentSource}
          status={callReport.validation.primaryRepaymentSource}
          onStatusChange={(value) => setStatus('primaryRepaymentSource', value)}
        >
          <Stack spacing={1.5}>
            <RadioRow
              label="Primary Source of Repayment — Changed To"
              value={callReport.primaryRepaymentSourceChangedTo}
              options={REPAYMENT_SOURCE_TYPE_OPTIONS}
              onChange={(value) => setCallReport({ primaryRepaymentSourceChangedTo: value })}
            />
            {callReport.primaryRepaymentSourceChangedTo === 'other' && (
              <TextField
                fullWidth
                label="Other"
                value={callReport.repaymentSourceOtherText}
                onChange={(event) => setCallReport({ repaymentSourceOtherText: event.target.value })}
                sx={fieldSx}
              />
            )}
          </Stack>
        </ValidationRow>

        <ValidationRow
          label="5. Business / Employment Information"
          currentValue={currentBusinessEmployment}
          status={callReport.validation.businessEmploymentInfo}
          onStatusChange={(value) => setStatus('businessEmploymentInfo', value)}
        >
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1.5}>
              <TextField
                fullWidth
                label="Employer / Business Name"
                value={callReport.employerBusinessNameChanged}
                onChange={(event) => setCallReport({ employerBusinessNameChanged: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                label="Employment / Business Address"
                value={callReport.employmentBusinessAddressChanged}
                onChange={(event) => setCallReport({ employmentBusinessAddressChanged: event.target.value })}
                sx={fieldSx}
              />
            </Stack>
            <TextField
              fullWidth
              label="Declared Monthly Income"
              value={callReport.declaredMonthlyIncomeChanged}
              onChange={(event) => setCallReport({ declaredMonthlyIncomeChanged: event.target.value })}
              sx={fieldSx}
            />
            <RadioRow
              label="Employment / Business Tenure"
              value={callReport.employmentBusinessTenureChanged}
              options={EMPLOYMENT_TENURE_RANGE_OPTIONS}
              onChange={(value) => setCallReport({ employmentBusinessTenureChanged: value })}
            />
            <TextField
              fullWidth
              label="Other Change"
              value={callReport.businessEmploymentOtherChange}
              onChange={(event) => setCallReport({ businessEmploymentOtherChange: event.target.value })}
              sx={fieldSx}
            />
          </Stack>
        </ValidationRow>

        <ValidationRow
          label="6. Existing Loans / Material Obligations"
          currentValue=""
          status={callReport.validation.existingLoansObligations}
          onStatusChange={(value) => setStatus('existingLoansObligations', value)}
        >
          <Stack spacing={1.5}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A' }}>
              Existing Loans with Banks / Financing Companies
            </Typography>
            {callReport.existingLoanRows.map((row) => (
              <Stack key={row.id} direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Lender"
                  value={row.lender}
                  onChange={(event) => updateExistingLoanRow(row.id, { lender: event.target.value })}
                  sx={fieldSx}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Loan Type"
                  value={row.loanType}
                  onChange={(event) => updateExistingLoanRow(row.id, { loanType: event.target.value })}
                  sx={fieldSx}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Outstanding Balance"
                  value={row.outstandingBalance}
                  onChange={(event) => updateExistingLoanRow(row.id, { outstandingBalance: event.target.value })}
                  sx={fieldSx}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Monthly Payment"
                  value={row.monthlyPayment}
                  onChange={(event) => updateExistingLoanRow(row.id, { monthlyPayment: event.target.value })}
                  sx={fieldSx}
                />
                <Button onClick={() => removeExistingLoanRow(row.id)} color="error" size="small" sx={{ flexShrink: 0 }}>
                  Remove
                </Button>
              </Stack>
            ))}
            <Button onClick={addExistingLoanRow} variant="outlined" size="small" sx={{ alignSelf: 'flex-start', borderRadius: '8px' }}>
              + Add Existing Loan
            </Button>
          </Stack>
        </ValidationRow>

        <ValidationRow
          label="7. Residence / Business Address"
          currentValue={currentResidenceAddress}
          status={callReport.validation.residenceBusinessAddress}
          onStatusChange={(value) => setStatus('residenceBusinessAddress', value)}
        >
          <Stack spacing={1.5}>
            <TextField
              fullWidth
              label="Changed Residence / Business Address To"
              value={callReport.residenceBusinessAddressChangedTo}
              onChange={(event) => setCallReport({ residenceBusinessAddressChangedTo: event.target.value })}
              sx={fieldSx}
            />
            <TextField
              fullWidth
              label="Reason"
              value={callReport.residenceBusinessAddressChangeReason}
              onChange={(event) => setCallReport({ residenceBusinessAddressChangeReason: event.target.value })}
              sx={fieldSx}
            />
          </Stack>
        </ValidationRow>

        <ValidationRow
          label="8. Collateral / Security Declaration"
          currentValue=""
          status={callReport.validation.collateralSecurityDeclaration}
          onStatusChange={(value) => setStatus('collateralSecurityDeclaration', value)}
        >
          <Stack spacing={1.5}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A' }}>
              Collateral / Security Declaration — Changed To
            </Typography>
            <ChipToggleGroup
              options={COLLATERAL_DECLARATION_OPTIONS}
              selected={callReport.collateralDeclarationChangedTo}
              onToggle={(value) => {
                const next = callReport.collateralDeclarationChangedTo.includes(value)
                  ? callReport.collateralDeclarationChangedTo.filter((entry) => entry !== value)
                  : [...callReport.collateralDeclarationChangedTo, value];
                setCallReport({ collateralDeclarationChangedTo: next });
              }}
            />
            {callReport.collateralDeclarationChangedTo.includes('other') && (
              <TextField
                fullWidth
                label="Other"
                value={callReport.collateralDeclarationOtherText}
                onChange={(event) => setCallReport({ collateralDeclarationOtherText: event.target.value })}
                sx={fieldSx}
              />
            )}
          </Stack>
        </ValidationRow>

        <ValidationRow
          label="9. Co-maker/Guarantee"
          currentValue={callReport.comakers[0]?.name ?? ''}
          status={callReport.validation.comakerGuarantee}
          onStatusChange={(value) => setStatus('comakerGuarantee', value)}
        >
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1.5}>
              <TextField
                fullWidth
                label="Co-maker Complete Name"
                value={callReport.comakerChange.completeName}
                onChange={(event) => setCallReportComakerChange({ completeName: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                label="Co-maker Complete Address"
                value={callReport.comakerChange.completeAddress}
                onChange={(event) => setCallReportComakerChange({ completeAddress: event.target.value })}
                sx={fieldSx}
              />
            </Stack>
            <Stack direction="row" spacing={1.5}>
              <TextField
                fullWidth
                label="Co-maker Contact Number"
                value={callReport.comakerChange.contactNumber}
                onChange={(event) => setCallReportComakerChange({ contactNumber: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                label="Relationship to Client/Borrower"
                value={callReport.comakerChange.relationshipToBorrower}
                onChange={(event) => setCallReportComakerChange({ relationshipToBorrower: event.target.value })}
                sx={fieldSx}
              />
            </Stack>
            <Stack direction="row" spacing={1.5}>
              <TextField
                fullWidth
                label="Occupation: Employer / Business Name"
                value={callReport.comakerChange.occupationEmployerName}
                onChange={(event) => setCallReportComakerChange({ occupationEmployerName: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                label="Years in Employment / Business"
                value={callReport.comakerChange.yearsInEmploymentBusiness}
                onChange={(event) => setCallReportComakerChange({ yearsInEmploymentBusiness: event.target.value })}
                sx={fieldSx}
              />
            </Stack>
            <Stack direction="row" spacing={1.5}>
              <TextField
                fullWidth
                label="Primary ID – Type & ID No."
                value={callReport.comakerChange.primaryIdTypeAndNumber}
                onChange={(event) => setCallReportComakerChange({ primaryIdTypeAndNumber: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                label="Secondary ID – Type & ID No."
                value={callReport.comakerChange.secondaryIdTypeAndNumber}
                onChange={(event) => setCallReportComakerChange({ secondaryIdTypeAndNumber: event.target.value })}
                sx={fieldSx}
              />
            </Stack>
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Co-maker Remarks / Others"
              value={callReport.comakerChange.remarks}
              onChange={(event) => setCallReportComakerChange({ remarks: event.target.value })}
              sx={fieldSx}
            />
          </Stack>
        </ValidationRow>
      </Stack>

      <Divider sx={{ my: 2.5, borderColor: '#EEF0F5' }} />

      <TextField
        fullWidth
        multiline
        minRows={3}
        label="Material Changes / Clarifications / Information Requiring Verification"
        value={callReport.materialChangesNotes}
        onChange={(event) => setCallReport({ materialChangesNotes: event.target.value })}
        sx={fieldSx}
      />
    </Box>
  );
}
