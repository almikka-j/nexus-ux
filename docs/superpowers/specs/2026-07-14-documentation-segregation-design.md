# Documentation Segregation — Design

## What this is

`PROJECT_OVERVIEW.md` (1083 lines) currently documents the entire app — tech
stack, data models, auth, borrower flow, and the full admin review flow
(Initial Credit Checking, Call Report, Negative Credit Report,
Reconsideration, Transaction Type, Requirement Checklist, Application
List/Samples, Aging, Negative List) — as one monolithic file. This spec
splits that content into individual Markdown files under `documentation/`,
one per process/topic, including the business logic embedded in each
section.

## Scope

- Pure reorganization: content is redistributed verbatim (or lightly
  re-flowed where a section needs to be split across two files), not
  rewritten, trimmed, or fact-checked against current code.
- `PROJECT_OVERVIEW.md` is left untouched — no note added, no content
  removed. It and `documentation/` will be maintained in parallel going
  forward (explicit user decision, accepting the duplication/drift
  maintenance cost).
- No changes to actual application code.

## File breakdown

All files live under `documentation/`.

**Core / cross-cutting**
| File | Source section(s) |
|---|---|
| `README.md` | New — index linking to all files below, plus "What this is" + one-paragraph tech stack summary |
| `tech-stack.md` | "Tech stack" |
| `directory-map.md` | "Directory map" |
| `data-model.md` | "Data model (client-side only)" — both Borrower and Admin data shapes |
| `auth.md` | "Auth (all mocked, no backend)" |
| `theming.md` | "Theming" |
| `known-issues.md` | "Known issues / caveats" |
| `where-to-look.md` | "Where to look for X" table |

**Borrower process**
| File | Source section(s) |
|---|---|
| `borrower-flow.md` | "Borrower flow" (sign-up → onboarding → selfie verification → dashboard) |

**Admin processes**
| File | Source section(s) |
|---|---|
| `admin-flow-overview.md` | "Admin flow" route tree, sidebar structure (two collapsible sections), step-filtering logic, page heading/tab title sync |
| `initial-credit-checking.md` | Bureau Reports card, Initial AI Recommendation, "1. Upload document" removal note, Officer notes carry-forward, Approved?/No/For Reconsideration decision flow, Uploaded Documents, floating Fill/Remove Sample Data + 1-/2-column layout toggle |
| `negative-credit-report.md` | "Negative Credit Report" section in full (simulated determination, QA override, card behavior, data model, modal branching) |
| `call-report.md` | "Call Report" section in full (file split, all 9+ sections, computations, summary generation, sample-fill, proceed gate) |
| `reconsideration.md` | Reconsideration branch behavior (from route tree + Officer Notes cross-references + Negative List trigger) |
| `transaction-type-and-requirement-checklist.md` | Both steps merged — route tree entries + lookup-table references (currently thin content) |
| `application-list-and-samples.md` | "Multi-application list & read-only samples" |
| `application-aging.md` | "Application aging" |
| `negative-list.md` | "Negative List" |

~20 files total. Each file keeps the original wording and level of detail
for its section — this is a cut-and-paste reorganization, not a content
rewrite.

## Cross-references between files

The source doc frequently cross-references other sections (e.g. Call
Report's `OfficerNotesCard` referencing "Officer notes carry forward" in
Initial Credit Checking; `CreditCheckingResultModal` referenced from both
Call Report and Initial Credit Checking). These become relative Markdown
links between the new files (e.g. `[Officer notes carry forward](./initial-credit-checking.md#officer-notes)`)
instead of same-document anchors, so navigation still works once split.

## Process for splitting

1. Create `documentation/README.md` as the index (list of files with a
   one-line description each, grouped by Core / Borrower / Admin).
2. Create each file above, copying the relevant content verbatim from
   `PROJECT_OVERVIEW.md`, adjusting only:
   - Internal anchor links → relative file links per the cross-reference
     rule above.
   - Adding a one-line context header where a section's original heading
     was terse (e.g. `## Negative Credit Report` → keep as top `#` heading
     of its own file with a short "part of the admin review flow" note).
3. No deletions from `PROJECT_OVERVIEW.md`.

## Out of scope

- Verifying the content against current source code (this is a docs
  reorg, not an audit).
- Adding new documentation content not already present in
  `PROJECT_OVERVIEW.md`.
- Automation/tooling to keep the two doc sets in sync.
