# Requirement Checklist Endorse Label

## Goal

Make the Requirement Checklist's primary endorsement action explicitly name
its destination by changing the visible button label from `Endorse` to
`Endorse to Comprehensive Credit Checking`.

## Scope

- Change only the primary endorsement button text in
  `src/sections/admin/requirement-checklist-view.tsx`.
- Preserve the existing enabled/disabled gate, click handler, state update,
  success screen, styling, and navigation behavior.
- Update the Requirement Checklist documentation where it describes that
  button label.

## Verification

- Add or update the narrowest suitable automated assertion for the new visible
  label, if the current test setup supports this view.
- Run the relevant test or static checks and confirm the old standalone button
  label no longer appears in the Requirement Checklist action area.

## Non-goals

- Renaming endorsement-related headings, state fields, handlers, or success
  messages.
- Changing the destination route or any workflow behavior.
