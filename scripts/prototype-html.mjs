// Baut aus dem Web-Export eine einzelne HTML-Datei (Skript und Icon-Schrift eingebettet), z. B. zum Teilen als Vorschau.
// Aufruf: npx expo export --platform web --output-dir dist && node scripts/prototype-html.mjs dist echt-prototyp.html
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const [dist = 'dist', out = 'echt-prototyp.html'] = process.argv.slice(2);
const files = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]));
const all = files(dist);

let js = readFileSync(all.find((f) => f.endsWith('.js') && f.includes('_expo')), 'utf8');
for (const font of all.filter((f) => f.endsWith('.ttf'))) {
  js = js.replaceAll(font.slice(dist.length), `data:font/ttf;base64,${readFileSync(font).toString('base64')}`);
}

writeFileSync(out, `<title>Echt Prototyp</title>
<style>
  :root { --bg: #FFFFFF; --frame: #ECECE8; color-scheme: light; }
  html, body { height: 100%; }
  body { overflow: hidden; background: var(--frame); }
  #root { display: flex; height: 100%; flex: 1; max-width: 430px; margin: 0 auto; background: var(--bg); }
</style>
<div id="root"></div>
<script>
${js}
</script>
`);
console.log(`geschrieben: ${out}`);
