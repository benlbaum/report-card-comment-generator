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

BANK: Phrase bank supports Selection phrase choices and optional Value Entry number/text fields with matching [Value] phrases. Fluency is configurable here. Topic settings collapses name/type/value configuration and topic removal; phrase editing stays visible. Wide, growing phrase boxes sit between left drag handles and quiet Remove actions; handles support mouse/touch and keyboard arrow reordering. Change order handles topics only, with no scope dropdown. Previous/Next navigate bank topics. Export/import bank-only files enables reuse across classes and semesters without student records or entered values. A divider separates settings from the phrase definition; units accompany values in fields and generated phrases. On narrow screens the save bar follows the editor instead of covering fields. A full-width save notice meets navigation with no gap, then auto-hides after ten seconds.

NAVIGATION: Write comments and Class overview remain on the left; Student roster and Phrase bank form the setup group on the right. Class overview contains comments, topic/value review, progress filtering and export. Class naming, starting a new class, student add/edit/remove controls, and Export/Import roster live in Student roster. Roster import previews new/duplicate identities before adding or starting a class; replacement requires confirmation and changes support Undo. Incoming comments, scores, and bank definitions are excluded.

ROSTER ORDER: Sort students sits beside the roster count and supports A–Z by first, last, or preferred name. The saved order applies across views and exports; current-student identity and all work are preserved, and Undo restores the previous order.
