# Bank Statement card — Financial Evaluation

**Date:** 2026-09-07
**Status:** Implemented
**Area:** Admin → Financial Evaluation (`src/sections/admin/financial-evaluation-view.tsx`)

> **Revision (post-implementation):**
> 1. The add/edit surface is a **centered `Dialog`**
>    (`bank-statement-modal.tsx`, `<Dialog fullWidth maxWidth="md"
>    scroll="paper">` — the admin app's `CreditCheckingResultModal` / "Full
>    application" modal convention), **not** the right-anchored `Drawer` this
>    spec describes below. Read every "Drawer" / "right-anchored" reference
>    as "modal" / "centered `Dialog`", and `bank-statement-drawer.tsx` as
>    `bank-statement-modal.tsx` / `BankStatementDrawer` as
>    `BankStatementModal`.
> 2. The **Attachments** section was dropped as unused — there is no
>    `BankStatementFile` type, no `files` field on `BankStatement`, and no
>    `addBankStatementFiles` / `removeBankStatementFile` setters. Ignore
>    every attachment reference below. Nested setters number 6, not 10.
> Everything else (fields, inline Deposit/Daily-Balance rows, totals,
> delete-if-blank, "Done" footer, state slice, `updateOneBankStatement`
> helper) is as described.

## Problem

Financial Evaluation currently has no place to record the applicant's bank
statements. The legacy source system (screenshots provided by the user) does
this with a poor flow:

1. Add a bare **Bank Name** on a card.
2. Click an **edit** pencil, which navigates to a **separate full page**.
3. On that page, fill Depository Bank / Account Name / Account Number /
   Month Range, then add Deposit rows and Account Daily Balance rows using a
   "type into a staging row, click **+** to commit it to a list above"
   pattern.
4. A separate global **File Attachment** card.
5. Repeat per bank.

The officer wants this made **easy and consistent with this app's design
system**. The two concrete pains: the separate-page round trip, and the
two-step "name first, then edit" add.

## Goals

- Enter and edit a bank statement **without leaving the Financial Evaluation
  page** — use the admin app's existing right-anchored `Drawer` pattern
  (`RequestDocumentsDrawer`, `OfficerNotesDialog`).
- **One action** ("Add bank statement") opens the full form, not a bare name
  field behind an edit click.
- Deposit / Daily Balance rows use the app's **inline-editable-row** pattern
  (`CashFlowStatementCard`'s "Add Other Loan", `application-validation-card.tsx`'s
  existing-loan rows) — "Add" appends an empty editable row, ✕ removes it.
  No staging row, no "+" to commit.
- **At-a-glance summary** per bank on the card (deposit count + total,
  balance-row count) without opening each one.
- Per-bank **file attachments** (mirrors the legacy File Attachment card,
  scoped per bank).

## Non-goals

- **No decision gate.** Bank statements are supporting evidence; the
  "Endorse to Credit Scoring" / "Disapprove" buttons stay always-clickable,
  consistent with the recent Bureau Reports change on Initial Credit Checking.
- **No real file parsing, OCR, or AI** — attachments store `fileName` +
  data URL only, same as every other upload in this prototype.
- **No cross-statement roll-up into the Cash Flow Statement** — the two cards
  stay independent for now. (Possible follow-up.)
- **No validation blocking** — every field persists on keystroke; nothing is
  "required" before the officer can move on.

## Architecture

### New files

| File | Responsibility |
|---|---|
| `src/sections/admin/bank-statement-card.tsx` | The card on the Financial Evaluation page: list of banks (layout A rows), "Add bank statement" button, per-bank summary chips, edit/delete affordances, owns the `editingId` state that drives the drawer. |
| `src/sections/admin/bank-statement-drawer.tsx` | Right-anchored `Drawer` for adding/editing one bank statement: 4 header fields, inline-editable Deposits + Account Daily Balance sections, per-bank attachments, live totals, delete-if-blank-on-close. |
| `src/sections/admin/bank-statement.ts` | Pure helpers, nothing stored: `computeTotalDeposits`, `computeAvgDailyBalance`, `formatMonthRange`, `parseNumber` (or reuse cash-flow-statement.ts's). |

### Changed files

| File | Change |
|---|---|
| `src/auth/admin-context.tsx` | New state types (`BankStatement`, `BankStatementDeposit`, `BankStatementDailyBalance`, `BankStatementFile`), `bankStatements: BankStatement[]` on `ApplicationReview`, `createInitialReview()` seed `[]`, `readStoredState()` array-merge, and 12 setters (nested ones share one private `updateOneBankStatement` helper). |
| `src/sections/admin/financial-evaluation-view.tsx` | Render `<BankStatementCard />` in the `<Stack spacing={2.5}>` between the "AI review, summary & recommendation" `Box` and `<CashFlowStatementCard />`. |
| `docs/120-financial-evaluation.md` | Document the new card (maintenance-rule header already lists the FE files; add `bank-statement-card.tsx` / `bank-statement-drawer.tsx` / `bank-statement.ts`). |
| `docs/230-project-overview.md` | Add the card to the Financial Evaluation section summary. |
| `docs/240-tasks.md` | Day's entry (gitignored, local only). |

## State shape (`admin-context.tsx`)

```ts
export type BankStatementDeposit = {
  id: string;
  date: string;        // 'yyyy-mm-dd', free-text like every other input
  amount: string;      // numeric string
};

export type BankStatementDailyBalance = {
  id: string;
  periodFrom: string;  // 'yyyy-mm-dd'
  periodTo: string;    // 'yyyy-mm-dd'
  balance: string;     // numeric string
};

export type BankStatementFile = {
  id: string;
  fileName: string;
  fileData: string;    // data URL (prototype convention)
  uploadedAt: string;  // ISO
};

export type BankStatement = {
  id: string;
  depositoryBank: string;
  accountName: string;
  accountNumber: string;
  monthFrom: string;   // 'January'..'December', '' = unset
  monthTo: string;
  deposits: BankStatementDeposit[];
  dailyBalances: BankStatementDailyBalance[];
  files: BankStatementFile[];
};
```

- `ApplicationReview` gains `bankStatements: BankStatement[]`.
- `createInitialReview()` seeds `bankStatements: []`.
- `readStoredState()` merges:
  `bankStatements: Array.isArray(storedReview.bankStatements) ? storedReview.bankStatements : []`
  (same pattern as the bureau-files merge).

### Setters on `useAdmin()`

| Setter | Behavior |
|---|---|
| `addBankStatement(id)` | The **card** generates `id` (`crypto.randomUUID()`) and passes it in; setter appends `{ id, depositoryBank:'', accountName:'', accountNumber:'', monthFrom:'', monthTo:'', deposits:[], dailyBalances:[], files:[] }`. Keeps setters side-effect-only — the card sets its own `editingId` to the same id to open the drawer. |
| `updateBankStatement(id, data)` | `data: Partial<Omit<BankStatement, 'id' \| 'deposits' \| 'dailyBalances' \| 'files'>>` — merges the header fields. |
| `removeBankStatement(id)` | Filters the statement out. |
| `addBankStatementDeposit(id)` | Appends `{ id, date:'', amount:'' }` to that statement's `deposits`. |
| `updateBankStatementDeposit(id, depositId, data)` | `data: Partial<Omit<BankStatementDeposit,'id'>>`. |
| `removeBankStatementDeposit(id, depositId)` | Filters. |
| `addBankStatementDailyBalance(id)` | Appends `{ id, periodFrom:'', periodTo:'', balance:'' }`. |
| `updateBankStatementDailyBalance(id, balanceId, data)` | Merge. |
| `removeBankStatementDailyBalance(id, balanceId)` | Filters. |
| `addBankStatementFiles(id, files)` | `files: { fileName: string; fileData: string }[]` → each becomes `{ id, fileName, fileData, uploadedAt: new Date().toISOString() }`, appended. |
| `removeBankStatementFile(id, fileId)` | Filters. |

All nested mutations go through one private helper:

```ts
function updateOneBankStatement(
  review: ApplicationReview,
  id: string,
  updater: (s: BankStatement) => BankStatement
): ApplicationReview {
  return {
    ...review,
    bankStatements: review.bankStatements.map((s) => (s.id === id ? updater(s) : s)),
  };
}
```

(Mirrors `updateBureauFiles` from the bureau-reports multi-file work.)

## Card (`bank-statement-card.tsx`)

Shell: `<Box sx={adminCardSx}>` + `CollapsibleSection` titled **"Bank Statement"**, defaults expanded (`useState(true)`), same as `CashFlowStatementCard`.

- **Header**: title + primary **Add bank statement** button — navy `#1C2A6E`,
  `borderRadius: '10px'`, matching the Cash Flow "Save Record" button family.
  On click: `const id = crypto.randomUUID(); addBankStatement(id); setEditingId(id);`
- **Empty state** (no `bankStatements`): dashed-border `#E1E4ED` box,
  "No bank statements added yet."
- **Per-bank rows** (layout A) — bordered `#EBEDF3` white row, `borderRadius: '13px'`, `p: 2`:
  - **Left**: `#EEF1FB` rounded 34×34 avatar showing the bank's first 3
    letters uppercased (generic `solar:card-2-bold-duotone`-style icon when
    `depositoryBank` is blank). Then bank name (bold `#14172A`) + a muted
    `#A0A7B5` line: `Acct ••••{last4} · {formatMonthRange(monthFrom, monthTo)}`,
    with each piece omitted when its source is blank. When the row has **no**
    deposits, balances, files, **and** blank account number/name → the muted
    line reads "Details not entered yet".
  - **Right**: summary chips (bordered pill, `#E1E4ED`, `borderRadius: 20px`):
    `{n} deposits · {fCurrency(computeTotalDeposits(...))}` and `{n} balances`.
    A single muted "Empty" chip when the row has nothing entered.
  - Then an edit `IconButton` (`#1C2A6E`, opens drawer) and a delete
    `IconButton` (`#E23E3E`) → opens a small `ConfirmDialog`
    ("Remove this bank statement?", destructive Confirm).
  - Clicking the **row body** (not the icons) also opens the drawer
    (`cursor: pointer`).
- Card-local state: `const [editingId, setEditingId] = useState<string | null>(null)`.
  `<BankStatementDrawer open={editingId !== null} statementId={editingId} onClose={() => setEditingId(null)} />`.

## Drawer (`bank-statement-drawer.tsx`)

Props: `{ open: boolean; statementId: string | null; onClose: () => void }`.

- Reads `const statement = review.bankStatements.find((s) => s.id === statementId)`.
  If `open` and `!statement` (deleted elsewhere) → call `onClose()` in an
  effect and render nothing.
- Right-anchored `<Drawer anchor="right">`, paper width `{ xs: '100%', sm: 480 }`,
  three-part skeleton like `RequestDocumentsDrawer`:
  - **Sticky header**: "Bank Statement" title + close `IconButton`.
  - **Scrollable body** (`overflow-y: auto`, `p: 2.5`, `Stack spacing={3}`).
  - **Sticky footer**: single **Done** button (`onClose`), navy.

### Body sections

1. **Account details** — 2-col `Grid`:
   - Depository Bank — `TextField` → `updateBankStatement(id, { depositoryBank })`.
   - Account Name — `TextField`.
   - Account Number — `TextField`.
   - Month Range — two `TextField select` dropdowns (**From** / **To**),
     options `['January', ..., 'December']` plus a blank "Select…" first item
     → `updateBankStatement(id, { monthFrom })` / `{ monthTo }`.
   - All persist on change. Nothing required.

2. **Deposits** — `SubsectionLabel` "Deposits" + outlined **Add deposit**
   button (`outlinedNavyButtonSx`, `solar:add-circle-bold` icon).
   - `addBankStatementDeposit(id)` appends an empty editable row.
   - Each row (`Grid`, `alignItems: flex-end`): Date (`TextField type="date"`),
     Amount (₱-prefixed `NumericFormat` — copy `CurrencyField` from
     `cash-flow-statement-card.tsx`), trailing ✕ `IconButton`
     (`removeBankStatementDeposit`).
   - Under the list, right-aligned:
     `Total deposits: {fCurrency(computeTotalDeposits(statement.deposits))}`.

3. **Account Daily Balance** — same pattern: **Add balance** button; each row
   = Period From (`date`), Period To (`date`), Balance (₱ `NumericFormat`), ✕.
   - Under the list:
     `Average daily balance: {computeAvgDailyBalance(...) === null ? '—' : fCurrency(...)}`
     — simple arithmetic mean of the entered `balance` values.

4. **Attachments** — **Add files** button opens a hidden
   `<input type="file" accept="image/*,.pdf" multiple>`; on change,
   `Promise.all(files.map(fileToDataUrl))` → `addBankStatementFiles(id, [...])`.
   - Each file row: filename + `formatUploadedAt(uploadedAt)` muted line,
     **View** button (opens `fileData` in a new tab), ✕
     (`removeBankStatementFile`).

### Delete-if-blank on close

When the drawer closes: if the statement is **completely blank** — blank
`depositoryBank`, `accountName`, `accountNumber`, `monthFrom`, `monthTo`, and
empty `deposits`, `dailyBalances`, `files` — call `removeBankStatement(id)` so
"Add bank statement" then immediate close doesn't leave an empty ghost row.
Editing an existing populated row never auto-deletes. Implementation: the
drawer's `onClose` wrapper checks the blank condition against the current
`statement` snapshot before calling the parent `onClose`.

## Pure helpers (`bank-statement.ts`)

```ts
export function parseNumber(raw: string): number {
  const n = Number(String(raw).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function computeTotalDeposits(deposits: { amount: string }[]): number {
  return deposits.reduce((sum, d) => sum + parseNumber(d.amount), 0);
}

export function computeAvgDailyBalance(
  balances: { balance: string }[]
): number | null {
  if (balances.length === 0) return null;
  const total = balances.reduce((sum, b) => sum + parseNumber(b.balance), 0);
  return total / balances.length;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export function formatMonthRange(from: string, to: string): string {
  if (from && to) return `${from}–${to}`;
  return from || to || '';
}
```

(If `cash-flow-statement.ts` already exports a tolerant number parser, reuse
it instead of duplicating `parseNumber`.)

## Financial Evaluation page wiring

`financial-evaluation-view.tsx`, inside `<Stack spacing={2.5}>`:

```
<ApplicationDetailsCard ... />
<Box sx={adminCardSx}> {/* Document Checklist */} ... </Box>
<Box sx={adminCardSx}> {/* AI review, summary & recommendation */} ... </Box>
<BankStatementCard />              {/* NEW */}
<CashFlowStatementCard />
<Box sx={adminCardSx}> {/* Proceed application? */} ... </Box>
```

No change to the decision card.

## Error handling & edge cases

- `parseNumber` maps empty / non-numeric to `0`; totals never render `NaN`.
- `formatMonthRange('', '')` → `''`; one side set → just that month.
- Removing the last deposit / balance row is allowed — the section then shows
  only its "Add" button.
- Drawer opened with a `statementId` that no longer exists → effect calls
  `onClose()`, renders nothing.
- `localStorage` rehydrate of a session saved before this feature → the
  `Array.isArray` guard yields `[]`, card shows its empty state.

## Testing

No automated test suite in this repo (prototype). Verify:

1. `npm run lint` — no warnings.
2. `npm run build` — type-checks clean.
3. Manual, on `/admin/applications/[id]/financial-evaluation`:
   - "Add bank statement" → drawer opens → fill 4 header fields + 2 deposits
     + 1 daily balance + attach a file → **Done**.
   - Card row shows correct avatar, account line, "2 deposits · ₱…",
     "1 balance" chips.
   - Reopen → edit a field, remove one deposit → totals update.
   - "Add bank statement" then immediately **Done** with nothing entered →
     no ghost row left.
   - Delete a bank via the confirm dialog → row gone.
   - Reload the page → all bank statements + rows + attachments persist
     (localStorage).
   - Endorse / Disapprove buttons remain clickable throughout (no gate).

## Resolved decisions

- **New-statement id ownership**: the card generates `crypto.randomUUID()`,
  passes it to `addBankStatement(id)`, and sets its own `editingId` to the
  same id. Setters stay side-effect-only; the card owns its drawer state.
