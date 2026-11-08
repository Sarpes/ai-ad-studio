// Assembles the deck's slide files into one printable HTML page (one 1920x1080 page per slide).
// Speaker notes (<aside>) are removed; uploaded logos (/_blob/...) map to the local copies;
// <x-shape kind="arrow-right"> (deck-only element) becomes an inline SVG arrow.
import fs from 'node:fs';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const deck = JSON.parse(fs.readFileSync(path.join(root, 'project', 'deck.json'), 'utf8'));
const blobs = {
  '/_blob/f8d384f0ebc51109c53d94c615f0bfec': 'fal.png',
  '/_blob/40123a923bb47caf158bc4258bfee3f5': 'revenuecat.png',
};
const arrow =
  '<svg width="64" height="32" viewBox="0 0 64 32" style="align-self:center;flex:none" aria-label="arrow">' +
  '<path d="M0 10 H38 V0 L64 16 L38 32 V22 H0 Z" fill="#3D2C63"/></svg>';

let slides = '';
for (const id of deck.order) {
  let html = fs.readFileSync(path.join(root, 'project', 'slides', `${id}.html`), 'utf8');
  html = html.replace(/<aside>[\s\S]*?<\/aside>/g, '');
  for (const [blob, file] of Object.entries(blobs)) html = html.split(blob).join(file);
  html = html.replace(/<x-shape kind="arrow-right"[^>]*><\/x-shape>/g, arrow);
  slides += html + '\n';
}
if (/\/_blob\/|<x-shape|<aside>/.test(slides)) throw new Error('unconverted deck element left in output');

const fonts = Object.values(deck.faces).map((f) => `<link rel="stylesheet" href="${f.href}">`).join('\n');
const out = `<!doctype html><html><head><meta charset="utf-8"><title>${deck.title}</title>
${fonts}
<style>
@page { size: 1920px 1080px; margin: 0 }
html, body { margin: 0; padding: 0; background: #120B1F }
section { width: 1920px; height: 1080px; box-sizing: border-box; position: relative; overflow: hidden; page-break-after: always; break-after: page }
h1, h2, h3, p, ul, ol { margin: 0 }
ul, ol { padding-left: 1.2em }
table { border-collapse: collapse; width: 100% }
th, td { padding: 0.35em 0.6em; text-align: left; border-bottom: 1px solid #3D2C63 }
* { -webkit-print-color-adjust: exact; print-color-adjust: exact }
</style></head><body>
${slides}</body></html>`;
fs.writeFileSync(path.join(root, 'deck-print.html'), out);
console.log(`slides: ${deck.order.length}, bytes: ${out.length}`);
