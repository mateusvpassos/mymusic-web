// Mesmo calendário do app (lib/core/liturgia.dart) — os nomes vão no JSON.
import type { Setlist } from './types';

export const TEMPOS = [
  'Advento', 'Natal', 'Quaresma', 'Semana Santa', 'Páscoa', 'Pentecostes', 'Tempo Comum',
] as const;

/** Na ordem em que acontecem na Missa. */
export const MOMENTOS = [
  'Entrada', 'Ato Penitencial', 'Glória', 'Salmo', 'Aclamação', 'Ofertório',
  'Santo', 'Cordeiro', 'Comunhão', 'Ação de Graças', 'Final',
] as const;

const DIA = 86400000;
const dia = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());

/** Domingo de Páscoa (Meeus/Jones/Butcher), em ms UTC. */
export function pascoa(ano: number): number {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const di = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(ano, mes - 1, di);
}

/** 1º domingo do Advento: 4 domingos antes do Natal. */
export function advento(ano: number): number {
  const vespera = Date.UTC(ano, 11, 24);
  const dow = new Date(vespera).getUTCDay(); // 0 = domingo
  return vespera - dow * DIA - 21 * DIA;
}

/** Batismo do Senhor (regra do Brasil: Epifania no domingo entre 2 e 8/1). */
export function batismo(ano: number): number {
  let epi = Date.UTC(ano, 0, 2);
  while (new Date(epi).getUTCDay() !== 0) epi += DIA;
  return epi + (new Date(epi).getUTCDate() >= 7 ? 1 : 7) * DIA;
}

/** Tempos que valem na data, o mais específico primeiro. */
export function temposDe(data: Date): string[] {
  const d = dia(data), ano = data.getFullYear();
  if (d >= advento(ano) && d < Date.UTC(ano, 11, 25)) return ['Advento'];
  if (data.getMonth() === 11 && data.getDate() >= 25) return ['Natal'];
  if (d <= batismo(ano)) return ['Natal'];
  const dp = Math.round((d - pascoa(ano)) / DIA);
  if (dp >= -46 && dp <= -8) return ['Quaresma'];
  if (dp >= -7 && dp <= -1) return ['Semana Santa', 'Quaresma'];
  if (dp >= 48 && dp <= 49) return ['Pentecostes', 'Páscoa'];
  if (dp >= 0 && dp <= 49) return ['Páscoa'];
  return ['Tempo Comum'];
}

export function ordem(momento?: string): number {
  const i = momento ? (MOMENTOS as readonly string[]).indexOf(momento) : -1;
  return i < 0 ? MOMENTOS.length : i;
}

export interface SongUse { ultima: number; vezes: number }

/** Uso pelos repertórios COM data até [ate] (inclusive). */
export function usoMusicas(setlists: Setlist[], ate = new Date(), exceto?: string): Record<string, SongUse> {
  const limite = dia(ate);
  const out: Record<string, SongUse> = {};
  for (const sl of setlists) {
    if (!sl.date || sl.id === exceto) continue;
    const d = dia(new Date(sl.date));
    if (d > limite) continue;
    for (const id of new Set(sl.songIds)) {
      const u = out[id];
      if (!u) out[id] = { ultima: d, vezes: 1 };
      else { u.vezes++; if (d > u.ultima) u.ultima = d; }
    }
  }
  return out;
}

/** "hoje", "há 3 semanas", "12/03/2025"... */
export function quando(ultima: number, hoje = new Date()): string {
  const dias = Math.round((dia(hoje) - ultima) / DIA);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  if (dias < 7) return `há ${dias} dias`;
  if (dias < 60) { const s = Math.floor(dias / 7); return s === 1 ? 'há 1 semana' : `há ${s} semanas`; }
  if (dias < 365) return `há ${Math.floor(dias / 30)} meses`;
  const d = new Date(ultima);
  const two = (v: number) => String(v).padStart(2, '0');
  return `${two(d.getUTCDate())}/${two(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

/** Próximo domingo (ou hoje, se for domingo), à meia-noite local. */
export function proximoDomingo(hoje = new Date()): Date {
  const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  return d;
}
