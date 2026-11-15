# Report Card Comment Builder

Open **Report Card Comment Builder.html** in a browser. It is a standalone file and works offline; no installation or account is needed.

- **Write comments:** choose a student, then choose from all topics in the topic dropdown and select a full, personalized phrase. **Next topic** walks through all topics in the order set in the bank. The current topic’s sentence is highlighted in the live draft. Use the draft as your final comment, edit it, and copy it. Use **Edit details** to open the Student roster tab at the selected student.
- **Class overview:** review wrapped final comments or choose a topic from **Show comments** to edit phrase selections and values across the class. Click a student's name to open their comment. Filter by progress, and use **Export comments** to download a CSV.
- **Student roster:** the setup tab beside Phrase bank holds the class name, Start a new class, student details, Export/Import roster, and Add/Remove actions. Edit names, preferred names, pronouns, and progress; changes save automatically. **Sort students** orders the class A–Z by first name, last name, or preferred name and supports Undo. The saved order also applies to student navigation, the class overview, and exports. Blank rows stay last; preferred-name sorting falls back to the first name when blank. Last-name sorting uses the final word of the full name, or the surname before a comma in “Last, First” format. The plus button below the list adds a blank editable row.
- **Phrase bank:** edit phrases in wide, growing text boxes. Drag a phrase’s left handle to reorder it directly, or focus the handle and press Up/Down arrow keys. Topic settings stay visible below the topic dropdown: rename or remove a topic, choose **Selection** or **Value Entry**, and configure values and units. Student selections, entered values, and final comments are kept when a topic is renamed. Selection provides phrase choices; Value Entry accepts a number or text with a matching phrase. **Change order** opens a window for topics only, with dragging and keyboard Up/Down controls. Navigate topics with **Previous/Next**. Changes are staged until **Save bank**. Final comments are kept.
- **Optional scores:** Fluency is a configurable topic, rather than a student detail. Use the topic name as the entry label, then define the unit, optional numeric limits, and a phrase such as `[HeShe] has a Fluency score of [Value].` Units appear beside the value field and in generated phrases. A unit already written after the token, such as `[Value]%`, is kept once. Enter each student's value while writing, or select that topic in Class overview. Blank entries are skipped, and zero is valid. `[Score]` remains supported in older phrases.
- **Pronouns:** choose a preset (including They/Them, Ze/Hir, and Xe/Xem) or select **Custom…** and enter X/Y. `[HeShe]`, `[HeSheThey]`, `[HisHerTheir]`, and `[HimHerThem]` use the student's pronouns. The original phrases adjust common verb agreement for They/Them.
- Bank-save and Undo notices, including student sorting, span the page below navigation and disappear after 6 seconds. Hover does not stop dismissal. Keyboard focus inside a notice pauses dismissal until focus leaves.
- Work is saved automatically in browser storage on the current device. Export class backups regularly; browser storage can be cleared, and different browsers or copies of a local file may use separate storage.

## Reusing a phrase bank

1. Open **Phrase bank → Export bank**. This exports the current definitions, labels, score settings, and topic/option order, including pending edits, into a separate JSON file. It contains no student records, entered scores, or comments.
2. In another class or semester, choose **Import bank** and select that JSON file. A class backup from this app can also supply just its bank.
3. Choose **Add new topics** to keep current topics and skip matching names, or **Replace bank** to swap the full bank. Review it, then choose **Save bank**. **Discard changes** cancels pending changes, and **Undo** restores the previous bank after saving.

Student details and final comments stay intact. Replacing a bank clears draft selections whose phrases no longer exist; compatible selections are retained. Exporting a full class backup still includes the bank as well as the class work.

## Sharing a roster between two teachers

1. Teacher A selects **Student roster → Export roster**.
2. Send that JSON file to Teacher B, along with the HTML app if they do not already have it.
3. Teacher B selects **Student roster → Import roster**, chooses the JSON file, reviews the preview, and selects **Add students to class**. To use exactly the shared student list, choose **Start class from roster** instead. That option replaces the current students after confirmation and offers Undo. A class backup can also supply just its student roster; incoming scores and comments are excluded.
4. Both teachers write their own comments. The roster contains student IDs, names, preferred names, and pronouns. It does not contain scores, selections, final comments, or the phrase bank. Reimporting the same roster skips existing students and keeps the receiving teacher’s work.

This is file sharing, not live collaboration. Export and import a new roster when students are added. Existing students are skipped rather than overwritten; edits to their names do not automatically update another teacher’s copy.

Roster export and import are also available in **Share & back up**.

**Export class backup** includes all students, custom pronouns, values, selections, comments, and bank settings. Restoring a backup replaces the current class after confirmation and offers Undo. Older version 1 exports from the original app are supported. A backup can also be imported as students only.

The original HTML beside this project was left unchanged. Its students and all 16 phrase categories are preserved in this version.

## Development

Edit the files in `src/`, then run `npm run build` to rebuild the standalone HTML. Run `npm test` for the data and interface regression checks. `npm run preview` serves only the app and its approved reference sketch at http://127.0.0.1:4173 for local review. Preview storage is separate from the standalone file’s storage. The app itself has no runtime dependencies.
