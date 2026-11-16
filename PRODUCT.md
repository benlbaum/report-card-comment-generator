# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Teachers writing report card comments and sharing a student roster with a co-teacher.

## Product Purpose

Build a personalized comment from saved phrases, edit the result, and copy it into a report card. The user confirmed that the main screen should focus on one student at a time.

## Operating Context

The application is a standalone HTML file that works offline. Teachers move between students, choose phrases, and review progress across the class.

## Capabilities and Constraints

- Preserve existing student work and banks. New teachers start with Kelly’s supplied 14-topic bank; the original 16-topic bank remains a legacy fixture.
- Keep roster export/import, independent teacher comments, complete backups, autosaving, and phrase bank editing.
- Existing browser storage and version 1 exports must continue to load.
- The user rejected the wall of category tabs and the previous rainbow styling. Navigation must expose fewer choices at once while keeping all phrases available.
- No cloud service or live synchronization is established.

## Product Principles

- The current student and their comment come first.
- Reveal secondary controls when needed.
- Never overwrite finished comments during class generation or roster import.
- Sharing a student roster must not share the teacher's comments or values.

## Evidence on Hand

Original student and phrase content is preserved in src/data.json. The previous standalone HTML and regression tests are available in the project.

## Configurable topics and pronouns

Teachers can add, remove, reorder, and configure topics as Selection or Value Entry, with phrase choices or optional number/text values linked to one of multiple matching phrases. The default Fact Fluency topic uses Kelly’s selection options; teachers may configure it as Value Entry. Student values and pronouns, including custom X/Y pronouns, remain local to each teacher's class work; roster exports include pronouns but exclude values and bank settings. Class overview shows full wrapped comments and a dark Export comments action, without bulk draft generation.

Teachers can export/import bank-only files to reuse definitions and ordering across classes and semesters without transferring student records or comments. Imports may add new topics or replace the bank, remain staged until saving, and support Undo. Phrase bank opens to a list of topics with name, entry type, and option/value details. Each row has a reorder handle and an Edit button that opens the existing configuration and option editor. Back to phrase bank returns to the list without losing pending work. Topics in the list and phrase options in the editor reorder directly, with keyboard arrow-key alternatives.

Student roster setup lives in its own tab alongside Phrase bank. Class overview is dedicated to comment review, topic/value editing, and export. Roster setup holds class naming, new-class setup, and student add/edit/remove controls. The writing screen links directly to the current student in this roster.

Teachers can sort students A–Z by first, last, or preferred name. Sorting persists across views and exports, retains the current student and all work, and supports Undo.

Transfer controls live in the relevant sections. Class overview exports/imports complete JSON class backups, including all comments, values, selections, and the bank, while retaining CSV comment export. Import previews the class before a confirmed replacement and supports Undo. Student roster handles identity-only transfers; Phrase bank handles bank-only transfers. The masthead contains no sharing menu.

Class overview provides a Copy action per saved final comment, including fallbacks for browsers without clipboard access. Distribution includes a clean self-contained public/index.html with no embedded students; a first-time teacher starts on Student roster. The same file can be hosted on a static HTTPS website or sent as an offline HTML tool. Each browser/device retains independent work; there is no automatic synchronization or server-side student storage.

Student work autosaves to localStorage and survives browser/computer restart. The masthead exposes a compact saving status and expandable retention explanation, including same browser/profile/device, private-window and clearing caveats, backup transfer, and the separate Save bank requirement. Failure to store work is explicit and warns before closing. Load default bank uses the existing staged import preview so teachers choose whether to replace their saved bank. Older Score tokens normalize to Value on load and import, while final comments remain untouched.

A persistent Help link offers concise bullet points about local storage and returning after shutdown, backups and every import/export format, and the main writing, class, and phrase controls. It opens within the app and returns to the teacher’s previous work without saving or discarding pending bank edits.
