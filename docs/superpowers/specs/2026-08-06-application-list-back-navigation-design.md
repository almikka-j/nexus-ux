# Application List Back Navigation Design

## Problem

Controls labeled “Application List,” “Back to Application List,” “Go to Application List,” or “View Application List” currently use `paths.admin.applications`. That route intentionally resolves to `/admin/credit-checking`, which is the Initial Credit Checking queue, rather than the unfiltered application list.

The actual application list now lives on Account Solicitation at `/admin/account-solicitation`.

## Design

Use `paths.admin.accountSolicitation` for every user-facing control whose label or purpose is navigation to the Application List. This includes review-page headers, completion-state back buttons, empty-state actions, the applicant profile back link, and the dashboard list action.

Keep `paths.admin.applications` and `paths.admin.applicationsByStep(...)` unchanged because they represent the Initial Credit Checking and filtered review queues. This preserves existing queue navigation and avoids changing unrelated administrative routing behavior.

## Affected Workflows

- Initial Credit Checking
- Call Report
- Requirement Checklist, including its completion state
- Reconsideration
- Credit Investigation
- CI Fee Approval list actions
- Applicant Profile
- Admin Dashboard

## Testing

Add a regression check that scans user-facing Application List controls and fails while any of them still references `paths.admin.applications`. Then update only those controls to use `paths.admin.accountSolicitation` and run the project’s available static verification and production build.

## Success Criteria

- Every user-facing Application List control resolves to `/admin/account-solicitation`.
- Filtered queue links continue to use `/admin/credit-checking` or `/admin/credit-checking?step=...`.
- No unrelated routes or user changes are modified.
