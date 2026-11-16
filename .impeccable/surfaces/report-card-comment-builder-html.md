---
version: 1
slug: "report-card-comment-builder-html"
primary_target: "Report Card Comment Builder.html"
related_targets: ["src/template.html","src/styles.css","src/app.js"]
---

# Comment workspace

Mode: Operate. Primary target: standalone Report Card Comment Builder.html.
The user confirmed one student at a time and chose the Focused writing desk sketch.

## Direction contract

THESIS: A focused writing workspace with all topics in one dropdown and no category-group tabs. One topic and one set of phrase choices at a time.

OWN-WORLD: Plum #4d385d, brass #b78836, lavender-white #f6f3f7, and white editing surfaces. Familiar system sans, quiet underline tabs, defined form controls, and no rainbow category colors.

STORY: Pick a student, select useful phrases, review the live draft, and polish the final comment. Student details are edited in a separate Student roster tab beside Phrase bank, also reached from the writing screen; phrase editing stays secondary. Roster sharing remains directly available.

FIRST VIEWPORT: Compact plum header and white navigation. The workspace meets the navigation without an outer gap. Left: a student dropdown matching the topic selector width, an Edit details link in the Student label row, a visible student counter, and student Previous/Next controls aligned to the section’s right edge. Below: one topic selector and counter with Previous/Next to its right, followed by full phrase choices including a matching Skip this topic choice. Right: live draft and final editor aligned to the work area. Signature interaction: the active topic's sentence is highlighted inside the live draft; no duplicate phrase dropdown. Motion: a brief background-color transition for selected phrases, disabled for reduced motion.

FORM: Public-radio program guide typography translated into a standard writing app. Candidate 7; seed:8f710637c90c7b9e. Approved sketch: .impeccable/mocks/decision/focused.html. Code-led; no generated comp or raster assets.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

BANK: Phrase bank opens to a flat list of all topics with name, entry type, and option count or value format/units/limits. Left drag handles reorder topics; Edit opens the existing topic configuration and options editor. Back to phrase bank returns to the list without losing pending changes. The list stacks metadata beneath names on mobile, retaining handles and Edit actions without horizontal overflow. Selection phrase choices and optional Value Entry number/text fields with matching [Value] phrases remain supported. Fluency is configurable here. Within the editor, topic settings remain visible below a full-width divider after topic navigation. Wide, growing phrase boxes sit between left drag handles and quiet Remove actions. Topic and phrase handles support mouse/touch and keyboard arrow reordering; no Change order window remains. Previous/Next navigate bank topics inside the editor. Export/import bank-only files enables reuse across classes and semesters without student records or entered values. A divider separates settings from the phrase definition; units accompany values in fields and generated phrases. On narrow screens the save bar follows the editor instead of covering fields. A full-width save notice meets navigation with no gap, then auto-hides after six seconds. Hover does not pause dismissal; keyboard focus inside the notice pauses it until focus leaves.

NAVIGATION: Write comments and Class overview remain on the left; Student roster and Phrase bank form the setup group on the right. Class overview contains comments, topic/value review, progress filtering, CSV comment export, and complete JSON class backup export/import with inline preview, confirmed replacement, and Undo. The masthead has no sharing menu; each section owns its transfer controls. Class naming, starting a new class, student add/edit/remove controls, and Export/Import roster live in Student roster. Roster import previews new/duplicate identities before adding or starting a class; replacement requires confirmation and changes support Undo. Incoming comments, scores, and bank definitions are excluded.

ROSTER ORDER: Sort students sits beside the roster count and supports A–Z by first, last, or preferred name. The saved order applies across views and exports; current-student identity and all work are preserved, and Undo restores the previous order.

COMMENT COPY: Each final-comment row in Class overview has a secondary Copy action at the right, disabled for empty text. On mobile it shares the name/status row above the wrapped comment. Copy preserves current student and saved work; browser-copy and manual-selection fallbacks remain available. The shareable single-file distribution starts with no student records and opens Student roster for setup.

VALUE PHRASES AND RETENTION: Value Entry topics support multiple draggable matching phrases, chosen per student alongside the same value field. [Value] is the only taught value token; old Score tokens migrate without changing final comments. Kelly’s supplied 14-topic bank is the new default, with a staged Load default bank action for existing users. The masthead’s compact autosave disclosure explains retained student work after browser/computer restart, same browser/profile/device, backups, and private-window/cleared-data caveats. Pending bank edits explicitly require Save bank; storage failure replaces success text with a backup warning.

COMMENT LENGTH: Draft and final text show a live count against 1,000 characters. The final counter is above the editor, with excess length and a warning when over. No 1,000-character input limit or action blocking is imposed; teachers can keep editing and trim their work.
