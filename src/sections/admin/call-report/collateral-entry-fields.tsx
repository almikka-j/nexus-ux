'use client';

import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

import type { CollateralEntry } from 'src/auth/admin-context';

import { RadioRow } from './call-details-card';
import { fieldSx, COLLATERAL_TYPE_OPTIONS, REQUIRES_APPRAISAL_OPTIONS } from './call-report-types';

// ----------------------------------------------------------------------
// Used twice: editable in Collateral Information (section 7, where entries
// are first entered) and read-only in Loan Package Proposal (section 8,
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

      <TextField
        label="Description"
        value={entry.description}
        onChange={(event) => onChange({ description: event.target.value })}
        disabled={readOnly}
        sx={fieldSx}
      />

      <Stack direction="row" spacing={2}>
        <TextField
          label="Registered Owner"
          value={entry.registeredOwner}
          onChange={(event) => onChange({ registeredOwner: event.target.value })}
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
        label="Requires Appraisal"
        value={entry.requiresAppraisal}
        options={REQUIRES_APPRAISAL_OPTIONS}
        onChange={(value) => onChange({ requiresAppraisal: value })}
        disabled={readOnly}
      />
    </Stack>
  );
}
