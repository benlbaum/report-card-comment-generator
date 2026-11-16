# Hosting on a school website

## What to send IT

> Please host this report-card comment tool as a standalone page on our school website. The source and ready-to-use file are at https://github.com/benlbaum/report-card-comment-generator. Deploy **public/index.html** at a stable HTTPS address and add a link for teachers. It needs JavaScript and browser local storage, but no database, application server, or paid service. The project uses the 0BSD open-source license, so the school may use, modify, and redistribute it without fees, attribution, or a requirement to publish its changes.

## Deployment

- **File to publish:** download `public/index.html` from the repository and serve it as HTML, such as `/tools/report-card-comments/index.html`. It contains the JavaScript, styles, default phrases, and license. No accompanying assets are needed, and no students are embedded.
- **Website setup:** use HTTPS and a regular standalone HTML page. A link from the school website is sufficient. Avoid pasting the app into a content editor that removes JavaScript or putting it in a cross-site iframe with restricted storage.
- **Requirements:** a current browser with JavaScript and local storage enabled. No Node.js, npm, database, API keys, user accounts, or server-side code are needed to run the published app. IT can use the school's existing staff access controls if desired.
- **Content security policy:** the file contains inline JavaScript and CSS. If the host enforces a strict CSP, IT should authorize those specific blocks using its approved hashes/nonces or adapt the build to external assets. See [MDN’s CSP guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP#inline_javascript) for the host's integration options.
- **Publish only the app:** student roster exports, phrase-bank exports, and class backups are teacher files, not website assets. Do not upload class backups or rosters to the web directory.

## Teacher work and moving to the school address

- Student details, comments, choices, and values stay in each teacher's browser/profile. The app does not upload this work to the host or provide server backups or device synchronization.
- Closing the browser or shutting down normally keeps saved work. Private browsing, clearing browser data, or using another device/profile can remove or separate it. Phrase-bank edits need **Save bank**.
- Before switching from the GitHub Pages address, each teacher should choose **Class overview → Export class backup**. At the new school address, choose **Class overview → Import class backup** and restore that file. This transfers their class, comments, values, selections, and saved phrase bank once; no import is needed on normal return visits.
- Keep the hosting origin stable. Browser storage is tied to the scheme, host, and port, not an individual folder. Multiple copies on the same origin use the same app storage key; folders do not create separate teacher accounts or classes. See [browser storage behavior](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).

## Updating or customizing

- To update, replace the hosted `index.html` with the newer `public/index.html` at the same address. Existing browser work and custom banks continue to load. Teachers should keep an exported class backup before an update.
- To customize the source, use Node.js 24 and run `npm ci`, `npm run build`, and `npm test`. Deploy the resulting **public/** folder. Node and npm are build tools only.
- The [0BSD license](LICENSE) permits use, copying, modification, and redistribution for any purpose, including commercial use. There is no fee, attribution requirement, or requirement to share modifications. The software is provided as-is, without warranty. Third-party development dependencies retain their own licenses.

Current hosted example: https://benlbaum.github.io/report-card-comment-generator/
