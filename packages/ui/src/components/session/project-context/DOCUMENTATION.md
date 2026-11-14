# Project Context Panel

Notes, todos, saved plans, and agent memory for the active project. Rendered by
the `notes` surface in the desktop context rail and by the mobile workspace
drawer.

## Files

| File | Owns |
|---|---|
| `ProjectNotesTodoPanel.tsx` | container: store subscription, visible-owner observation, failure toast, header tabs and search toggle, open entry, the todo write |
| `KnowledgeSearchBar.tsx` | the floating search bar |
| `NotesSection.tsx` | note list, per-note title/preview, the open note, pin, delete |
| `NoteEditor.tsx` | the note editor: Markdown that reads formatted while you type |
| `TodosSection.tsx` | todo list, add/toggle/delete/clear, drag reorder |
| `PlansSection.tsx` | plan list, create, import, pin, share, delete, open |
| `KnowledgeCard.tsx` | the list card for notes and memory: fixed height, opens on click |
| `KnowledgeSplit.tsx` | the wide layout: list column and open entry side by side |
| `KnowledgeEntryView.tsx` | the shell an opened note or memory renders in, in place of the list |
| `KnowledgeComposer.tsx` | the add field every section except memory uses |
| `KnowledgeActions.tsx` | the row actions: pin toggle, the ⋯ menu, the row's right-click menu, hover reveal |
| `pendingKnowledgeDeletes.ts` | deletes that wait out an undo window |
| `knowledgeFormat.ts` | note title from the first line, entry dates |
| `useProjectTodoSend.ts` | sending a todo to a current/new/worktree session |

## Layout

The section tabs are the context panel's header, with a search button at their
end, beside the panel's own expand and close buttons. Under them the active
section takes the whole panel. In the mobile drawer, which has no panel header,
the same row sits at the top of the panel. The sections were a resizable column
on the right until four short entries were taking a quarter of the panel's
width from the notes they navigate, then a strip under a search field, which
cost two rows for what one header holds.

When the labelled tabs do not fit, the active tab keeps its label and the
others show an icon and their count; the mobile drawer always does this. When
even that does not fit, the active tab drops its label too, so every tab stays
in view. The row compares its width with invisible copies of itself in the
first two forms. A
fixed width threshold it replaced went stale as tabs, counts and translations
grew, and the row scrolled sideways between the threshold and the real width.

Search is a toggle. The button opens a bar floating over the top of the list,
the way the chat's search floats over the conversation; opening it moves
nothing underneath. An earlier version pushed the list down to make room, and
the whole panel jumped each time search opened. Escape or the close button closes
it and clears the query, so a list never stays filtered by text nobody can see.
The bar hides while an entry is open and comes back with the list.

The project has no title row. The search names it ("Search openchamber",
"Search Chats") in the button's tooltip and the bar's placeholder, which is
where the panel says whose knowledge it shows.

One search covers every section. Sections divide, and search is the one thing
that division would hurt — you do not always remember whether something was
written as a note or lives in a plan — so each tab carries its own match count,
and the bar says so when no section has a match. Memory counts both of its
scopes, so when a search only matches the scope that is not selected, the
memory tab switches to it. Memory also shows how many entries are new or
changed since the user last looked, as a separate `+N` next to the total.

## Wide panel: list and entry side by side

From 900px of panel width (measured on the panel itself, so an expanded panel
and a dragged-wide one behave the same) notes, plans and memory switch to
`KnowledgeSplit`: the list in a 380px column on the start side, the open entry
beside it, the selected card marked. Nothing replaces the list, so there is no
back control and no position to restore; Escape closes the entry and leaves a
quiet hint ("Select a note…"). Nothing opens on its own: a panel that has just
opened must not put a caret in someone's note. The search bar floats over the
list column there, so it never covers the entry's toolbar.

Opened notes and memories keep a readable line length (`max-w-3xl`) at any
width. Todos open nothing, so a wide panel shows them as one centred column of
the same width. Touch layouts always stack.

The single column stretched to an expanded panel ran note lines 1500px long and
still swapped the whole list away to open one entry.

## Adding entries

Notes, todos and plans add through the same `KnowledgeComposer`: one line that
grows with its text, Enter to add, the add button at its end. Notes follow the
chat composer: Shift+Enter starts a new line on desktop, and on a phone, whose
keyboard has no Shift+Enter, Return starts a new line and the add button adds.
Todos and plan titles are one line, and pasted line breaks become spaces. The length counter appears
only near the limit. An empty, always-open 3000-character box used to take a
third of the panel above notes that are read far more often than written.

The field clears as soon as an entry is sent and stays enabled while it saves,
so the next entry can be typed right away; a failed add puts the text back if
nothing new was typed. Disabling the field during the save dropped its focus,
and an entry typed straight after the first one went nowhere.

With no notes yet, the notes tab shows only the field: its placeholder already
says what goes there, and a second line repeating it was noise.

A plan is created from its title and opens straight away in the editor. Import
from a file is a button inside the same field.

## Row actions

Every row has the same actions in the same place: at most one direct control
(pin for notes and plans, send for todos), then a menu with the rest (share,
delete). With a mouse the menu is the row's right click (Shift+F10 from the
keyboard, `KnowledgeRowContextMenu`), and the direct control appears on hover
or keyboard focus; touch screens show it always, with a ⋯ button for the menu.
An opened entry keeps its ⋯ in the toolbar. A pinned entry keeps its filled
pin visible.

The pin attaches a note or plan to the current session's context, and a pinned
note says so in its footer. The icon alone read as "pin to the top of the
list".

## Delete with undo

Deleting a note, plan or memory hides it at once and shows a toast with Undo.
The delete is sent only when the undo window ends (`pendingKnowledgeDeletes`).
The window is a timer, not the toast: Sonner pauses a hovered toast and never
closes one without a mounted Toaster. When the delete goes out the toast is
dismissed, so Undo never outlives it. A project memory delete carries the
project it was asked in, because the panel may have moved to another project
before it runs.
Waiting beats re-creating on undo: a re-created note or plan gets a new id and
loses its pins and its origin. The pending set is module state, so the delete
still goes out if the panel unmounts; if the app closes inside the window the
delete is never sent and the entry stays. A failed delete brings the entry back
with an error toast.

## Lists never move; entries open in place

Every section works the same way: the list shows fixed-height cards, and in a
narrow panel a click opens the entry in place of the list, with the back control at the start
of the entry's own toolbar, so the tabs above never shift. Plans open
`PlanView`, which takes the control as `leading` in its title row; notes and
memories open in `KnowledgeEntryView`. The panel owns which entry is open
(`openEntry`); leaving the section or the project closes it.
Escape goes back too.

Notes and memories used to expand inside the list instead. Every open and close
pushed every card below it down and back up, and an expanded 3000-character note
turned the list into a wall of text. Nothing in a list changes height now.

A note card has a header line with the title and the row actions, a rendered
Markdown preview of the rest that fades out where it is cut, and a footer with
the source ("From chat" links to the message the note came from), the date and
the pin state. A note's title is its first non-empty line with Markdown markers
dropped. A link in a preview opens the link.

An open note is `NoteEditor`, a CodeMirror editor that is always editable and
always reads as formatted text: headings, emphasis, code and links keep their
look while you type, and Markdown markers (`#`, `**`, backticks, link targets)
are hidden except on the lines the cursor is on. List markers show as bullets.
Without focus every line is formatted. An earlier version opened the note
rendered and swapped it for a plain textarea on click, so the same note looked
like two different things depending on whether you were touching it. Escape
leaves the note; the toolbar carries the source, date, pin and menu. The stored
text is plain Markdown either way. The editor loads lazily, since it brings
CodeMirror and most visits never open a note.

An open memory has its title and text as plain fields that save on blur and
when the entry is left. The toolbar shows the new/changed badge, the scope and
the type. `MemorySection` stays mounted while one is open, so the "last looked"
mark is not advanced by opening a single entry.

An entry deleted elsewhere while open (an agent, another window) closes, and a
delete from the open entry's menu closes it before the undo toast appears.

## Plans open in place

Clicking a plan replaces the list with its editor, and the back control starts
PlanView's own title row, as for every entry. A plan belongs to the project this
panel is about, and sending the reader to another tab to read it made them leave
the surface they were browsing.

The editor is `PlanView`, lazily imported — it is a large view and most panel
visits never open one. It scrolls itself, so the content column stops scrolling
while a plan is open; two scrollbars for one document is what nesting them gives.
Leaving the section or the project closes it, so its editor never sits over a
list it no longer matches. Hosts that own a fullscreen plan surface (mobile)
still pass `onOpenPlan` and keep theirs.

A plan an agent shows (`knowledge.show`) opens the same way. The desktop layout
turns the request into `useUIStore.openProjectKnowledgePlan`, which switches the
panel to Plans, opens the Project knowledge surface and leaves a
`projectKnowledgePlanRequest`. The panel of that plan's project takes the
request and opens the plan in place; a panel showing another project leaves it
waiting until that project is on screen.

Agents change saved plans too, through the knowledge tool or by editing the
plan's file directly. An open, visible plan with no unsaved edits takes the
new text: at once for a save through the API, which announces itself, and
within two seconds for a file edit, which `PlanView` finds with the same
`fileContentPoller` the file panel uses. Unsaved typing is never replaced; the
next save writes it over the agent's version. The editor ignores its own echo
of text it was handed, so opening a plan no longer writes it back.

### Progress and the session working on a plan

A plan row shows how many steps of its `## Steps` checklist are ticked ("2/4"),
and Done once all are; the server counts them (`project-context`, *Plan
progress*). Done is a label only: finished plans are deleted from the row menu,
not archived. Agents tick steps with their own file tools, which announce
nothing, so `PlansSection` re-reads the list every 10 seconds while it is
mounted and the window is visible. The answer carries counts, never plan text.

Implement and Improve in `PlanView` record the session they create on the plan
(`linkPlanSession`), and the row gets a button that opens that session. A
failed link costs only the button and never holds up the send. A plan an agent
picked up on its own has no session to show.

The panel owns the only source of truth for which project a plan belongs to,
and it never lets the editor guess. `PlanView` receives the owner as
`savedProjectPlan={{ projectRef, planId }}` — load and autosave both go to that
exact project. An earlier version let the editor re-derive the project from the
current directory, which silently opened an empty document for plans stored
under the managed Chats owner (`openchamber:chats`), for plans opened from a
worktree the directory lookup missed, and for plan tabs restored after a
reload. The context panel has no plan surface anymore: OpenCode 2.x dropped
plan mode, and saved plans open here. Persisted `plan` tabs from older builds
are dropped on rehydrate as an unknown mode.

## Pins belong to one session

Notes and plans are project data, but attaching one writes its id to the current
session metadata. Other sessions in the project do not inherit it. A pin made
while a new-session draft is open lives on that draft and transfers only to the
session created by its first message. Work status lists and detaches draft pins
before that first message, then reads them from the created session metadata.

## Agent memory is owned natively by OMP

Agent memory is owned by OMP's `memory.backend` (local, mnemopi, hindsight) and
native memory tools (`retain`, `recall`, `reflect`, `learn`, `memory_edit`),
managed in Settings → Memory. The legacy host-owned store, client store, and
panel tab were retired.
## Data flow

Storage is server-owned; see
`packages/web/server/lib/project-context/DOCUMENTATION.md`. The panel never
touches `/api/fs/*` and never handles a plan path — plans are addressed by id.

```
useProjectContextStore  ->  ProjectNotesTodoPanel  ->  sections
      (server cache)          (load + shared write)
```

There is deliberately no cross-panel event. An earlier version broadcast
`openchamber:project-notes-updated` / `openchamber:project-plan-saved` on the
window and every mounted panel re-read the whole config in response. Writers now
mutate the store and readers re-render from it.

Changes from another client reach the panel through `lib/projectContextSync.ts`. It listens on the existing control stream for the panel's owner only and requests an authoritative store refresh. Reopening the panel, returning to the foreground or online, and reconnecting the stream also refresh that owner. Bursts coalesce, with one trailing refresh when a change arrives during a read. Hidden or offline documents admit no new reads.

The desktop context panel and the mobile keep-alive drawer pass `visible` through `ProjectContextPanel`. Passing `visible: false` stops observation without unmounting the panel's local note drafts. An open note with unsaved typing still keeps its own body when a fresh server snapshot arrives.

## Where writes live

Notes, todos, and plans each have their own routes, so each section owns its
writes end to end and no section has to persist a neighbour's state alongside
its own. `NotesSection` and `PlansSection` call the store directly. Todos still
route through the container only because the container already holds the list it
sorts for display.

Adding, checking, unchecking and deleting a todo send that one item
(`ProjectTodoChange`), while the panel shows the whole next list at once. Agents
add todos through their own tool, and a whole-list write from a panel that has
not refreshed yet would erase what an agent just added. Reordering and "clear
completed" still send the whole list.

An earlier version wrote notes and todos together in one request. That forced
the container to own the notes draft, because otherwise a todo toggle would
persist whatever notes were last committed and discard unsaved typing. Splitting
the routes removed the coupling rather than managing it.

## One scroller

The sections are tabs, not one stacked column. Stacking gave each list its own
scroller inside the panel's scroller, and it only got worse as lists grew. With
tabs there is exactly one scroller: the section body. The host
(`RightSidebarTabs`) therefore sets `overflow-hidden`; putting a scroller there
again would nest one inside the other.

The active section persists in `useUIStore` so switching surfaces or remounting
the panel returns to where the user was.

## Search

One query in the container filters every section, and the tabs double as the
result summary.

If the active tab has no matches and another does, the panel follows the search
there. Without that, typing a query whose hits live elsewhere shows an empty
list and the user has to guess which tab to try.

Filtering is display-only: every mutation still acts on the full list, so
reordering or clearing completed todos while a filter is active cannot drop
hidden items. The query resets when the project changes, since a query that
matched the old project would silently hide everything in the new one.

## Invariants

- **An open note keeps a local, debounced draft.** Writing on every keystroke
  would put a request behind every character, and re-reading the store each
  render would fight the caret.
  The body-save callback stays stable across owner refreshes, so peer updates cannot restart the pending autosave timer.
- **An external note change is adopted only while the open note is untouched** since
  its last save. "Add to notes" from a chat selection must reach an open panel,
  but must never overwrite what the user is typing.
- **List cards never change height.** A note card shows its title and a short
  clamped preview; editing happens in the opened note, never inside the list.
- **A blanked note body is never persisted.** The server rejects it, so the row
  restores its last saved text on blur rather than showing a phantom failure.
  Deleting is an explicit action.
- **A load failure never blanks the panel.** The store keeps the last good
  snapshot; the panel toasts once, and only when nothing had loaded yet.
- **Completed todos sink to the bottom.** The display sorts them there; item
  writes store them last too, and a drag stores what the user dragged.
- **Plan creation is not optimistic.** The id and file name come from the
  server, and a row that cannot be opened is worse than a brief wait.

## Why list rows share one tooltip

The lists are not virtualized and every row keeps its buttons mounted, so a
tooltip per button would mount several tooltip roots per row. A control in a
list carries its text in `data-row-tooltip`, and `DelegatedTooltip`
(`ui/row-tooltip.tsx`) listens on the panel and anchors one tooltip to it. That also covers the same
controls in an open entry's toolbar. It answers a mouse or the keyboard; a touch
gets no tooltip on these controls.

## Pinned context

The pin toggle on a note or plan attaches it to the current session or draft.
Assembly and delivery live in `packages/web/server/lib/session-knowledge`.

## Related

- Store: `packages/ui/src/stores/useProjectContextStore.ts`
- HTTP client: `packages/ui/src/lib/projectContextApi.ts`
- Plan viewer/editor: `packages/ui/src/components/views/PlanView.tsx`
- User docs: `packages/docs/content/docs/notes-todos-plans.mdx`

## Dictation

The note and todo composers carry `InlineDictationButton`, which shows
only where the chat composer's mic would (dictation enabled, capture supported,
not VS Code). The transcript continues the field's text instead of adding the
entry, so a misheard word can be fixed first. It does not answer the
`toggle_dictation` shortcut: that key belongs to the chat composer, and two
listeners would start two recordings.
