// Prüft die Bibliotheken der App auf bekannte Sicherheitslücken (npm audit, nur was in die App kommt).
// Bekannte, schon geprüfte Meldungen stehen in known-advisories.json (fast alle betreffen nur die Bauwerkzeuge
// von Expo und verschwinden mit dem nächsten Expo-Update). Jede NEUE Meldung ab „hoch“ lässt die Prüfung scheitern.
// Aufruf: node scripts/security/audit-deps.mjs [--update]  (--update schreibt den aktuellen Stand als bekannt fest)
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = new URL('./known-advisories.json', import.meta.url);
let raw;
try {
  raw = execFileSync('npm', ['audit', '--omit=dev', '--json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  raw = e.stdout; // npm audit endet mit Fehler, sobald es etwas findet
}
const report = JSON.parse(raw);
const found = new Map();
for (const v of Object.values(report.vulnerabilities ?? {})) {
  for (const via of v.via) {
    if (typeof via === 'object' && ['high', 'critical'].includes(via.severity)) {
      found.set(via.url ?? `${via.name}:${via.title}`, `${via.severity}: ${via.name} – ${via.title}`);
    }
  }
}

if (process.argv.includes('--update')) {
  writeFileSync(FILE, `${JSON.stringify([...found.keys()].sort(), null, 2)}\n`);
  console.log(`${found.size} Meldungen als bekannt eingetragen.`);
  process.exit(0);
}

const known = new Set(JSON.parse(readFileSync(FILE, 'utf8')));
const fresh = [...found].filter(([id]) => !known.has(id));
const gone = [...known].filter((id) => !found.has(id));
console.log(`${found.size} Meldungen ab „hoch“, davon ${found.size - fresh.length} bekannt.`);
if (gone.length) console.log(`Inzwischen behoben: ${gone.length} (mit --update aus der Liste streichen).`);
if (fresh.length) {
  console.log(`\nNEU:\n${fresh.map(([id, text]) => `- ${text} (${id})`).join('\n')}`);
  process.exit(1);
}
