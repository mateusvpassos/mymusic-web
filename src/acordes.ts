// Forma de acorde no braço (mesma regra do app: E-shape ou A-shape, a de
// casa mais baixa). 6 cordas da grave p/ aguda; -1 abafada, 0 solta.

export interface Forma { base: number; casas: number[] }

const PC: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6,
  G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};
const E: Record<string, number[]> = {
  maj: [0, 2, 2, 1, 0, 0], m: [0, 2, 2, 0, 0, 0], '7': [0, 2, 0, 1, 0, 0],
  m7: [0, 2, 0, 0, 0, 0], maj7: [0, 2, 1, 1, 0, 0], sus4: [0, 2, 2, 2, 0, 0],
};
const A: Record<string, number[]> = {
  maj: [-1, 0, 2, 2, 2, 0], m: [-1, 0, 2, 2, 1, 0], '7': [-1, 0, 2, 0, 2, 0],
  m7: [-1, 0, 2, 0, 1, 0], maj7: [-1, 0, 2, 1, 2, 0], sus4: [-1, 0, 2, 2, 3, 0],
};

function qualidade(q: string): string {
  if (/maj7|M7|7M|7\+/.test(q)) return 'maj7';
  if (q.startsWith('m') && !q.startsWith('maj')) return q.includes('7') ? 'm7' : 'm';
  if (q.includes('7')) return '7';
  if (q.includes('sus')) return 'sus4';
  return 'maj';
}

export function formaDe(sym: string): Forma | null {
  const m = /^([A-G][#b]?)([^/]*)/.exec(sym);
  if (!m) return null;
  const pc = PC[m[1]];
  if (pc === undefined) return null;
  const q = qualidade(m[2] ?? '');
  const baseE = (((pc - 4) % 12) + 12) % 12;
  const baseA = (((pc - 9) % 12) + 12) % 12;
  const useA = baseA < baseE;
  const base = useA ? baseA : baseE;
  const t = (useA ? A : E)[q];
  return { base, casas: t.map((x) => (x < 0 ? -1 : base === 0 ? x : base + x)) };
}
