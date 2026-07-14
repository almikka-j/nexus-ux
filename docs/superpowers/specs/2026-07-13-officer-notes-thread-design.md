# Officer Notes Thread — Design

## Problem

"Officer notes" (`CreditChecking.notes`) is currently a single free-text
string, editable via one `TextField` on Initial Credit Checking and displayed
read-only in three places (Application Details card, Call Report's
`OfficerNotesCard`, Reconsideration). Editing it overwrites the previous
content — there's no history of what was added when, so a running log of
observations added over the course of handling an application isn't
possible. The user described the intended behavior as "parang chat" (like a
chat) — a threaded log of entries, not a single overwritable block.

## Decisions

1. **Entries, not one string.** `CreditChecking.notes` changes from `string`
   to `OfficerNoteEntry[]`. Each entry is permanent once added — no edit or
   delete, consistent with a chat/log semantic. Field name `notes` is kept
   (not renamed to e.g. `notesThread`) to minimize the diff; the type change
   alone makes the new shape clear at every call site.

2. **Each entry carries an author name and timestamp.** There's no real
   multi-user login in this app (one `AdminUser` session per browser), but
   `authorName` is still captured from the currently logged-in
   `adminUser` at the moment the note is posted — useful if account/credit
   officer assignment ever varies per application, and matches the "chat"
   framing (each message shows who sent it).

   ```ts
   export type OfficerNoteEntry = {
     id: string;
     text: string;
     authorName: string;
     createdAt: string; // ISO timestamp
   };
   ```

3. **New entries are only created on Initial Credit Checking.** The single
   bound `TextField` is replaced with: a scrollable thread of existing
   entries (chat-bubble style: author + short timestamp above each note),
   plus a separate draft `TextField` and an "Add Note" button below it.
   Typing does not mutate stored state until "Add Note" is clicked — this
   appends a new entry (via a new `addOfficerNote(text)` setter) and clears
   the draft. The button is disabled when the draft is empty.

4. **All three existing read-only locations upgrade to show the full
   thread**, not just the latest entry: Application Details card (on
   Initial Credit Checking, non-collapsible mode), Call Report's
   `OfficerNotesCard`, and Reconsideration's notes block. All three reuse one
   shared thread-rendering component to avoid triplicating bubble markup.

## Out of scope

- `Reconsideration.notes` (the officer-editable textarea on the
  Reconsideration screen itself) is a distinct field for a distinct purpose
  and is not touched by this change.
- No edit or delete of existing entries — append-only.
- No real multi-user distinction — `authorName` is cosmetic/future-proofing,
  not access control.

## New setter

```ts
addOfficerNote: (text: string) => void;
```

Appends `{ id: crypto.randomUUID(), text, authorName: <from adminUser>, createdAt: new Date().toISOString() }`
to `review.creditChecking.notes`.

## Sample data

`handleFillSampleData` on Initial Credit Checking adds one sample entry;
`handleClearSampleData` resets the array to `[]`.
