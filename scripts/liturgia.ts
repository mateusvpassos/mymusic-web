// Confere o calendário com os mesmos casos de test/liturgia_test.dart (app).
// Rodar: node scripts/liturgia.ts
import { temposDe, pascoa, advento, batismo } from '../src/liturgia.ts';

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const casos: [string, string][] = [
  [iso(pascoa(2025)), '2025-04-20'], [iso(pascoa(2026)), '2026-04-05'], [iso(pascoa(2027)), '2027-03-28'],
  [iso(advento(2025)), '2025-11-30'], [iso(advento(2026)), '2026-11-29'],
  [iso(batismo(2025)), '2025-01-12'], [iso(batismo(2026)), '2026-01-11'], [iso(batismo(2024)), '2024-01-08'],
];
const tempos: [string, string[]][] = [
  ['2026-11-28', ['Tempo Comum']], ['2026-11-29', ['Advento']], ['2026-12-24', ['Advento']],
  ['2026-12-25', ['Natal']], ['2026-01-11', ['Natal']], ['2026-01-12', ['Tempo Comum']],
  ['2026-02-17', ['Tempo Comum']], ['2026-02-18', ['Quaresma']], ['2026-03-29', ['Semana Santa', 'Quaresma']],
  ['2026-04-05', ['Páscoa']], ['2026-05-24', ['Pentecostes', 'Páscoa']], ['2026-05-25', ['Tempo Comum']],
];
let falhas = 0;
for (const [a, b] of casos) if (a !== b) { falhas++; console.log('ERRO data', a, '!=', b); }
for (const [d, esp] of tempos) {
  const [y, m, dd] = d.split('-').map(Number);
  const r = temposDe(new Date(y, m - 1, dd));
  if (r.join() !== esp.join()) { falhas++; console.log('ERRO', d, r, '!=', esp); }
}
console.log(falhas ? `${falhas} falha(s)` : `OK: ${casos.length + tempos.length} casos iguais ao app`);
process.exit(falhas ? 1 : 0);
