import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const initialData = {...JSON.parse(read('src/data.json')), ...JSON.parse(read('src/default-bank.json'))};
const pack = data => read('src/template.html')
  .replace('/* STYLES */', read('src/styles.css'))
  .replace('/* APPLICATION */', `const INITIAL_DATA = ${JSON.stringify(data).replaceAll('<', '\\u003c')};\n${read('src/core.cjs')}\n${read('src/app.js')}`);
writeFileSync(new URL('Report Card Comment Builder.html', import.meta.url), pack(initialData));
mkdirSync(new URL('public/', import.meta.url), {recursive:true});
writeFileSync(new URL('public/index.html', import.meta.url), pack({...initialData, className:'My class', students:[]}));
console.log('Built standalone app and public/index.html (clean shareable copy, no student records).');
