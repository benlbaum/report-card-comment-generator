import { readFileSync, writeFileSync } from 'node:fs';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const html = read('src/template.html')
  .replace('/* STYLES */', read('src/styles.css'))
  .replace('/* APPLICATION */', `const INITIAL_DATA = ${JSON.stringify(JSON.parse(read('src/data.json'))).replaceAll('<', '\\u003c')};\n${read('src/core.cjs')}\n${read('src/app.js')}`);
writeFileSync(new URL('Report Card Comment Builder.html', import.meta.url), html);
console.log('Built Report Card Comment Builder.html (standalone, works offline).');
