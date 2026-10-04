// Cor do tema, como no app: as mesmas 8 cores. A índigo padrão usa os tons
// fixos do style.css; as outras geram os tons a partir do matiz da cor.

export const CORES = [
  0xff3d5afe, 0xff00897b, 0xff7e57c2, 0xffd81b60,
  0xfff4511e, 0xff43a047, 0xff1e88e5, 0xff8d6e63,
];
export const PADRAO = 0xff3d5afe;

export const hexDe = (argb: number) => '#' + (argb & 0xffffff).toString(16).padStart(6, '0');

function hsl(argb: number): [number, number, number] {
  const r = ((argb >> 16) & 255) / 255, g = ((argb >> 8) & 255) / 255, b = (argb & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

const c = (h: number, s: number, l: number) =>
  `hsl(${((h % 360) + 360) % 360} ${Math.round(Math.min(1, s) * 100)}% ${Math.round(l * 1000) / 10}%)`;

const VARS = ['--bg', '--surface-1', '--card', '--card-hi', '--chip', '--line', '--primary', '--on-primary',
  '--primary-container', '--tertiary', '--tertiary-container', '--on-tertiary-container', '--chord'];

/** Cor forte/escura da cor do tema p/ fundo branco (PDF, Word, imagem). */
export function corForte(argb: number): string {
  const [h, s] = hsl(argb);
  return c(h, Math.min(1, Math.max(0.85, s * 1.25)), 0.42);
}

/** Mesma cor forte em hex (o Word não entende hsl). */
export function corForteHex(argb: number): string {
  const [h, s0] = hsl(argb);
  const s = Math.min(1, Math.max(0.85, s0 * 1.25)), l = 0.42;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function aplicarTema(argb: number, tema: 'dark' | 'light') {
  const st = document.documentElement.style;
  for (const v of VARS) st.removeProperty(v);
  if (argb === PADRAO) return;
  const [h, s] = hsl(argb);
  const t = h + 60; // terciária: matiz vizinho, como no Material 3
  const vals: Record<string, string> = tema === 'dark'
    ? {
        '--bg': c(h, 0.08, 0.085), '--surface-1': c(h, 0.08, 0.11), '--card': c(h, 0.07, 0.155),
        '--card-hi': c(h, 0.07, 0.18), '--chip': c(h, 0.07, 0.22), '--line': c(h, 0.06, 0.29),
        '--primary': c(h, s * 0.9, 0.82), '--on-primary': c(h, s, 0.2),
        '--primary-container': c(h, s * 0.65, 0.4), '--chord': c(h, s * 0.9, 0.82),
        '--tertiary': c(t, 0.45, 0.82), '--tertiary-container': c(t, 0.22, 0.3),
        '--on-tertiary-container': c(t, 0.9, 0.92),
      }
    : {
        '--bg': c(h, 1, 0.988), '--surface-1': c(h, 0.4, 0.965), '--card': c(h, 0.2, 0.925),
        '--card-hi': c(h, 0.18, 0.9), '--chip': c(h, 0.15, 0.88), '--line': c(h, 0.1, 0.8),
        '--primary': c(h, s * 0.6, 0.45), '--on-primary': '#ffffff',
        '--primary-container': c(h, 1, 0.92), '--chord': corForte(argb),
        '--tertiary': c(t, 0.18, 0.4), '--tertiary-container': c(t, 1, 0.92),
        '--on-tertiary-container': c(t, 0.4, 0.12),
      };
  for (const [k, v] of Object.entries(vals)) st.setProperty(k, v);
}
