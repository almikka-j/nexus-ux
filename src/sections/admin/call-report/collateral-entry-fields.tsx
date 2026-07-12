'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

import type { CollateralEntry } from 'src/auth/admin-context';

import { RadioRow } from './call-details-card';
import {
  fieldSx,
  COLLATERAL_TYPE_OPTIONS,
  DOCS_AVAILABLE_OPTIONS,
  EXISTING_LIEN_OPTIONS,
  REQUIRES_APPRAISAL_OPTIONS,
} from './call-report-types';

// ----------------------------------------------------------------------
// Used twice: editable in Collateral Information (section 9, where entries
// are first entered) and read-only in Loan Package Proposal (section 11,
// which reuses the same entries rather than asking the officer to re-enter
// collateral details a second time).
// ----------------------------------------------------------------------

export function CollateralEntryFields({
  entry,
  onChange,
  readOnly = false,
}: {
  entry: CollateralEntry;
  onChange: (data: Partial<CollateralEntry>) => void;
  readOnly?: boolean;
}) {
  return (
    <Stack spacing={2}>
      <RadioRow
        label="Collateral Type"
        value={entry.type}
        options={COLLATERAL_TYPE_OPTIONS}
        onChange={(value) => onChange({ type: value })}
        disabled={readOnly}
      />

      <Stack direction="row" spacing={2}>
        <TextField
          label="Description"
          value={entry.description}
          onChange={(event) => onChange({ description: event.target.value })}
          disabled={readOnly}
          sx={{ ...fieldSx, flex: 2 }}
        />
        <TextField
          label="Quantity"
          type="number"
          value={entry.quantity}
          onChange={(event) => onChange({ quantity: event.target.value })}
          disabled={readOnly}
          sx={{ ...fieldSx, flex: 1 }}
        />
      </Stack>

      <Stack direction="row" spacing={2}>
        <TextField
          label="Registered Owner"
          value={entry.registeredOwner}
          onChange={(event) => onChange({ registeredOwner: event.target.value })}
          disabled={readOnly}
          sx={{ ...fieldSx, flex: 1 }}
        />
        <TextField
          label="Relationship of Owner to Borrower"
          value={entry.ownerRelationship}
          onChange={(event) => onChange({ ownerRelationship: event.target.value })}
          disabled={readOnly}
          sx={{ ...fieldSx, flex: 1 }}
        />
      </Stack>

      <Stack direction="row" spacing={2}>
        <TextField
          label="Location"
          value={entry.location}
          onChange={(event) => onChange({ location: event.target.value })}
          disabled={readOnly}
          sx={{ ...fieldSx, flex: 1 }}
        />
        <TextField
          label="Estimated Value"
          type="number"
          value={entry.estimatedValue}
          onChange={(event) => onChange({ estimatedValue: event.target.value })}
          disabled={readOnly}
          sx={{ ...fieldSx, flex: 1 }}
        />
      </Stack>

      <RadioRow
        label="Ownership Documents Available"
        value={entry.ownershipDocsAvailable}
        options={DOCS_AVAILABLE_OPTIONS}
        onChange={(value) => onChange({ ownershipDocsAvailable: value })}
        disabled={readOnly}
      />

      <RadioRow
        label="Existing Lien or Mortgage"
        value={entry.existingLien}
        options={EXISTING_LIEN_OPTIONS}
        onChange={(value) => onChange({ existingLien: value })}
        disabled={readOnly}
      />

      <RadioRow
        label="Requires Appraisal"
        value={entry.requiresAppraisal}
        options={REQUIRES_APPRAISAL_OPTIONS}
        onChange={(value) => onChange({ requiresAppraisal: value })}
        disabled={readOnly}
      />
    </Stack>
  );
}
