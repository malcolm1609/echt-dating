// Fasst die Ergebnisse von Tiefentest, Stresstest und Klicktest als Markdown zusammen (für die GitHub-Übersicht).
// Aufruf: node scripts/beta-test/summary.mjs <ordner>
import { existsSync, readFileSync } from 'node:fs';

const dir = process.argv[2] ?? 'beta-test-results';
const read = (f) => (existsSync(`${dir}/${f}`) ? JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')) : null);
const lines = [];
const checks = (title, data) => {
  if (!data) return lines.push(`## ${title}\n\nNicht gelaufen.\n`);
  const failed = data.results.filter((x) => !x.ok);
  lines.push(`## ${title}: ${data.results.length - failed.length} von ${data.results.length} bestanden\n`);
  let section = '';
  for (const x of data.results) {
    if (x.section !== section) lines.push(`\n**${(section = x.section)}**\n`);
    lines.push(`- ${x.ok ? '✅' : '❌'} ${x.name} (${x.ms} ms)${x.detail ? ` – ${x.detail}` : ''}`);
  }
  lines.push('');
};

checks('Tiefentest', read('tiefentest.json'));
checks('Klicktest im Browser', read('klicktest/ergebnis.json'));

const load = read('stresstest.json');
if (!load) lines.push('## Stresstest\n\nNicht gelaufen.\n');
else {
  lines.push(`## Stresstest mit ${load.users} Testkonten\n`);
  if (load.aborted) lines.push(`❌ Abgebrochen: ${load.aborted}\n`);
  lines.push(`Konten angelegt in ${load.setup.createSeconds ?? '?'} s, angemeldet in ${load.setup.loginSeconds ?? '?'} s.\n`);
  lines.push('| Gleichzeitig | Anfragen/s | Fehler | Median | 95 % unter | 99 % unter |', '|---|---|---|---|---|---|');
  for (const p of load.phases) lines.push(`| ${p.concurrent} | ${p.perSecond} | ${p.errorRate} % | ${p.p50} ms | ${p.p95} ms | ${p.p99} ms |`);
  lines.push('\n**Wettläufe und Regeln**\n');
  for (const x of [...load.races, ...load.invariants]) lines.push(`- ${x.ok ? '✅' : '❌'} ${x.name}: ${x.detail}`);
  const last = load.phases.at(-1);
  if (last) {
    lines.push(`\n**Einzelne Aufrufe bei ${last.concurrent} gleichzeitig**\n`, '| Aufruf | Anzahl | Median | 95 % unter | Fehler |', '|---|---|---|---|---|');
    for (const o of last.ops) lines.push(`| ${o.name} | ${o.count} | ${o.p50} ms | ${o.p95} ms | ${o.errors ? `${o.errors} ${JSON.stringify(o.errorTypes)}` : '0'} |`);
  }
  lines.push('');
}
console.log(lines.join('\n'));
