# Report Card Comment Builder

Open **Report Card Comment Builder.html** in a browser. It is a standalone file and works offline; no installation or account is needed.

- **Write comments:** choose a student, then choose from all topics in the topic dropdown and select a full, personalized phrase. **Next topic** walks through all topics in the order set in the bank. The current topic’s sentence is highlighted in the live draft. Use the draft as your final comment, edit it, and copy it. Both draft and final comment show a live character count against the 1,000-character allowance. The final counter sits above its text box; over-limit text shows the amount to trim and a warning, while editing, saving, copying, and marking done remain available. Use **Edit details** to open the Student roster tab at the selected student.
- **Class overview:** review wrapped final comments or choose a topic from **Show comments** to edit phrase selections and values across the class. Click a student's name to open their comment, or use its **Copy** button to copy that student's complete saved comment. Empty comments cannot be copied. Filter by progress, and use **Export comments** to download a CSV. **Export class backup** and **Import class backup** transfer the complete class, including saved comments, values, selections, and the phrase bank.
- **Student roster:** the setup tab beside Phrase bank holds the class name, Start a new class, student details, Export/Import roster, and Add/Remove actions. Edit names, preferred names, pronouns, and progress; changes save automatically. **Sort students** orders the class A–Z by first name, last name, or preferred name and supports Undo. The saved order also applies to student navigation, the class overview, and exports. Blank rows stay last; preferred-name sorting falls back to the first name when blank. Last-name sorting uses the final word of the full name, or the surname before a comma in “Last, First” format. The plus button below the list adds a blank editable row.
- **Phrase bank:** opens to a list of all topics with their entry type and option count or value format, units, and limits. Drag the left handles to reorder topics. Choose a row’s **Edit** button to rename it, change its type, or edit its options and value settings. **Back to phrase bank** returns to the list without losing pending edits; **Previous/Next** moves between editors. Phrase options also have drag handles beside their wide, growing text boxes. Focus a topic or phrase handle and press Up/Down arrow keys to reorder by keyboard. Choose **Save bank** to keep edits and ordering. Renaming preserves student selections and values; final comments are kept.
- **Value entries:** a topic can accept a number or text with units and optional numeric limits. Add multiple **Matching phrases** in its editor, using `[Value]` wherever the entry belongs, or use phrases without the token. While writing, enter a value and choose the matching phrase for that student. Switching phrases keeps the value; each student keeps their own choice. Blank entries skip the topic, and zero is valid. Units appear beside the field and once in generated text. Older `[Score]` tokens migrate to `[Value]` without changing saved final comments.
- **Pronouns:** choose He/Him, She/Her, They/Them, or **Custom…** and enter X/Y. `[HeShe]`, `[HeSheThey]`, `[HisHerTheir]`, and `[HimHerThem]` use the student's pronouns. The original phrases adjust common verb agreement for They/Them.
- Bank-save and Undo notices, including student sorting, span the page below navigation and disappear after 6 seconds. Hover does not stop dismissal. Keyboard focus inside a notice pauses dismissal until focus leaves.
- **Saving and returning:** student details, comments, phrase selections, and entered values save immediately to **localStorage**, not sessionStorage. Closing the browser or shutting down the computer does not remove them. Return to the same site in the same browser/profile on the same device; no backup/import is needed for normal visits. The header explains this. Private browsing, cleared browser data, a different browser/profile/device, or moving from a downloaded file to the hosted site require a backup to transfer or restore work. Phrase-bank edits remain pending until **Save bank**; the bank shows a clear unsaved message and warns before closing. Storage failures show an explicit warning to export a backup.

## Sharing the tool with other teachers

Use **public/index.html** for distribution. It is a clean, self-contained copy with no embedded student records and Kelly’s 14-topic starting phrase bank. New teachers land on Student roster to add or import their students. Existing browser work is retained when the app is updated at the same address.

- **Recommended for school-wide use:** host this single file on a stable HTTPS website. Teachers bookmark one link, and updates reach everyone without replacing downloaded files. The app needs static hosting only; it has no backend, accounts, analytics, or network requests that upload class data. Teachers' work remains in their browser profile/device. Hosting does not add live sharing or synchronization.
- **Offline alternative:** send only **public/index.html**, optionally renamed to **Report Card Comment Builder.html**. No accompanying JavaScript, CSS, source folder, or installation is required. Teachers open the file in their browser and use imports/exports independently. Browser storage for local `file:` pages is not standardized, so retain exported backups and use the same file location. See [MDN's localStorage documentation](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).

To move from a downloaded file to a hosted website, export a full class backup first, then import it at the new address. Use roster exports for names/pronouns, bank exports for shared phrases, and class backups for the complete work, including comments.

The hosted app is at **https://benlbaum.github.io/report-card-comment-generator/**. The repository is public; the Pages workflow publishes only the clean **public/** output, with no embedded student records. Every push to `main` installs dependencies, rebuilds both HTML versions, runs the regression tests, and deploys the clean app after the tests pass. The same workflow can be run manually from GitHub Actions. Teachers keep their existing browser work at the same website address.

## Reusing a phrase bank

1. Open **Phrase bank → Export bank**. This exports the current definitions, labels, value settings, and topic/option order, including pending edits, into a separate JSON file. It contains no student records, entered values, or comments.
2. In another class or semester, choose **Import bank** and select that JSON file. A class backup from this app can also supply just its bank.
3. Choose **Add new topics** to keep current topics and skip matching names, or **Replace bank** to swap the full bank. Review it, then choose **Save bank**. **Discard changes** cancels pending changes, and **Undo** restores the previous bank after saving.

Student details and final comments stay intact. Replacing a bank clears draft selections whose phrases no longer exist; compatible selections are retained. Exporting a full class backup still includes the bank as well as the class work.

## Sharing a roster between two teachers

1. Teacher A selects **Student roster → Export roster**.
2. Send that JSON file to Teacher B, along with the HTML app if they do not already have it.
3. Teacher B selects **Student roster → Import roster**, chooses the JSON file, reviews the preview, and selects **Add students to class**. To use exactly the shared student list, choose **Start class from roster** instead. That option replaces the current students after confirmation and offers Undo. A class backup can also supply just its student roster; incoming values and comments are excluded.
4. Both teachers write their own comments. The roster contains student IDs, names, preferred names, and pronouns. It does not contain values, selections, final comments, or the phrase bank. Reimporting the same roster skips existing students and keeps the receiving teacher’s work.

This is file sharing, not live collaboration. Export and import a new roster when students are added. Existing students are skipped rather than overwritten; edits to their names do not automatically update another teacher’s copy.

## Moving or restoring a complete class

1. In **Class overview**, choose **Export class backup** to download a JSON file containing all students, custom pronouns, values, selections, comments, and bank settings.
2. In the receiving app, open **Class overview → Import class backup** and select that file. The preview shows the class name and counts of students, saved comments, and topics.
3. Choose **Restore class backup**, then confirm replacement of the current class. **Undo** restores the previous class. Cancel leaves current work intact. Older version 1 exports from the original app are supported.

**Export comments** remains a CSV for using comments outside this app. To restore a complete class, use its JSON backup. To bring over student identities alone, import the backup through **Student roster → Import roster**. Each section holds its own transfer controls; there is no separate sharing menu in the header.

The original student data and 16-topic bank remain in `src/data.json` as a legacy fixture. New copies use Kelly’s supplied 14-topic bank from `src/default-bank.json`. Existing browser banks are preserved; **Phrase bank → Load default bank → Replace bank → Save bank** applies the new default after preview, while keeping student details and final comments. Export a class backup first to retain the old draft selections as well. The distribution has no embedded students.

## Development

Edit the files in `src/`, then run `npm run build` to rebuild the original standalone HTML and the clean **public/index.html** distribution. Run `npm test` for the data and interface regression checks. `npm run preview` serves only the app and its approved reference sketch at http://127.0.0.1:4173 for local review. Preview storage is separate from the standalone file’s storage. The app itself has no runtime dependencies.
