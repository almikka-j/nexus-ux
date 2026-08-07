# Application List Back Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every user-facing Application List navigation control open `/admin/account-solicitation`.

**Architecture:** Keep filtered queue routing unchanged and update only user-facing list links to consume the existing `paths.admin.accountSolicitation` route. The shared review header covers Initial Credit Checking, Call Report, Requirement Checklist, Reconsideration, and Credit Investigation; direct links cover completion, profile, CI Fee Approval, and dashboard states.

**Tech Stack:** Next.js 14 App Router, TypeScript, React, Material UI

## Global Constraints

- Application List controls resolve to `/admin/account-solicitation`.
- Filtered review queues remain on `/admin/credit-checking` and `/admin/credit-checking?step=...`.
- Preserve existing unrelated working-tree changes.

---

### Task 1: Correct Application List destinations

**Files:**
- Modify: `src/sections/admin/application-review-header.tsx:69`
- Modify: `src/sections/admin/reconsideration-view.tsx:86`
- Modify: `src/sections/admin/requirement-checklist-view.tsx:167`
- Modify: `src/sections/admin/ci-fee-approval-view.tsx:115,299`
- Modify: `src/sections/admin/applicant-profile-view.tsx:413`
- Modify: `src/sections/admin/admin-dashboard-view.tsx:128`
- Verify: `src/routes/paths.ts:53-69`

**Interfaces:**
- Consumes: `paths.admin.accountSolicitation: string`
- Produces: MUI/Next links whose `href` is `/admin/account-solicitation`

- [ ] **Step 1: Run the pre-change route audit and verify it fails**

```bash
if rg -n -U 'href=\{paths\.admin\.applications\}[\s\S]{0,500}(Application List|Back to Application List|Go to Application List|View Application List)' src/sections/admin; then exit 1; fi
```

Expected: exit 1 and output listing controls that still use `paths.admin.applications`.

- [ ] **Step 2: Apply the minimal implementation**

Replace `href={paths.admin.applications}` with:

```tsx
href={paths.admin.accountSolicitation}
```

Only replace instances associated with controls labeled or described as Application List navigation. Do not change `paths.admin.applications`, `paths.admin.applicationsByStep(...)`, row workflow routing, or admin navigation filters.

- [ ] **Step 3: Run the route audit and verify it passes**

Run the Step 1 command again.

Expected: exit 0 with no matches.

- [ ] **Step 4: Run static and production verification**

```bash
npx tsc --noEmit
npm run build
```

Expected: both commands exit 0.

- [ ] **Step 5: Inspect the focused diff**

```bash
git diff --check
git diff -- src/sections/admin/application-review-header.tsx src/sections/admin/reconsideration-view.tsx src/sections/admin/requirement-checklist-view.tsx src/sections/admin/ci-fee-approval-view.tsx src/sections/admin/applicant-profile-view.tsx src/sections/admin/admin-dashboard-view.tsx
```

Expected: no whitespace errors and only intended `href` substitutions among pre-existing user changes.
