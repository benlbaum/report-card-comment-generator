import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
const routes = new Map([
  ['/', 'Report Card Comment Builder.html'],
  ['/reference', '.impeccable/mocks/decision/focused.html']
]);
createServer((request, response) => {
  const file = routes.get(request.url?.split('?')[0]);
  if (!file) { response.writeHead(404); response.end('Not found'); return; }
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(readFileSync(new URL(file, import.meta.url)));
}).listen(4173, '127.0.0.1', () => console.log('Local preview: http://127.0.0.1:4173/'));
