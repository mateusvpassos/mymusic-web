// Porta do chord_engine.dart — parser ChordPro + acorde-sobre-letra, serialize, import.
import type { Section, SongLine, Chord } from './types';

const PARTS = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/;
// aceita sufixos em qualquer ordem: G7M, D9, D4, G7+, B7(4/9), A/C#, Cmaj7...
const CHORD_TOK =
  /^[A-G][#b]?(?:maj|min|m|M|dim|aug|sus|add|º|°|[0-9]+|[+\-]|[#b][0-9]+|\([^)]*\)|\/[A-G][#b]?)*$/;

// remove parêntese DESBALANCEADO de um token: "(D9"->"D9", "D4)"->"D4";
// mantém balanceados: "B7(4/9)" e "A7(13)" intactos.
function fixParens(t: string): string {
  if (t.startsWith('(') && !t.includes(')')) t = t.slice(1);
  if (t.endsWith(')') && !t.slice(0, -1).includes('(')) t = t.slice(0, -1);
  return t;
}
const INLINE_CHORD = /\[[A-G][#b]?[^\]]*\]/;
const SECTION_HEAD = /^\s*\[([^\]]+)\]\s*(.*)$/;

export function parseLine(raw: string): SongLine {
  const chords: Chord[] = [];
  let lyric = '';
  let i = 0;
  while (i < raw.length) {
    if (raw[i] === '[') {
      const end = raw.indexOf(']', i);
      if (end > i) {
        chords.push({ sym: raw.slice(i + 1, end), idx: lyric.length });
        i = end + 1;
        continue;
      }
    }
    lyric += raw[i];
    i++;
  }
  return { lyric, chords };
}

export function serializeLine(line: SongLine): string {
  const sorted = [...line.chords].sort((a, b) => a.idx - b.idx);
  let out = '';
  let pos = 0;
  for (const c of sorted) {
    const at = Math.max(0, Math.min(c.idx, line.lyric.length));
    out += line.lyric.slice(pos, at) + '[' + c.sym + ']';
    pos = at;
  }
  out += line.lyric.slice(pos);
  return out;
}

export function serializeSections(sections: Section[]): string {
  return sections
    .map((s) => {
      const head = s.name ? '#' + s.name + '\n' : '';
      return head + s.lines.map(serializeLine).join('\n');
    })
    .join('\n\n');
}

function isChord(t: string): boolean {
  return t.length > 0 && CHORD_TOK.test(t);
}

function isChordLine(line: string): boolean {
  const toks = line.match(/\S+/g);
  if (!toks || toks.length === 0) return false;
  return toks.every((t) => isChord(fixParens(t)));
}

function mergeChordLyric(chordLine: string, lyric: string): SongLine {
  const chords: Chord[] = [];
  let maxCol = 0;
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(chordLine)) !== null) {
    chords.push({ sym: fixParens(m[0]), idx: m.index });
    if (m.index > maxCol) maxCol = m.index;
  }
  let lyr = lyric;
  if (lyr.length < maxCol) lyr = lyr.padEnd(maxCol);
  return { lyric: lyr, chords };
}

// Aceita ChordPro [C]letra OU "acorde acima da letra" (Cifra Club).
export function importText(text: string): Section[] {
  const raw = text.replace(/\r/g, '').split('\n');
  const sections: Section[] = [];
  let cur: Section = { name: '', lines: [] };
  let started = false;
  const newSection = (name: string) => {
    if (started) sections.push(cur);
    cur = { name, lines: [] };
    started = true;
  };

  for (let i = 0; i < raw.length; i++) {
    let line = raw[i];

    if (line.startsWith('#')) {
      newSection(line.slice(1).trim());
      continue;
    }
    const sm = SECTION_HEAD.exec(line);
    if (sm && !isChord(sm[1].trim())) {
      newSection(sm[1].trim());
      const rest = sm[2];
      if (rest.trim() === '') continue;
      line = rest;
    }

    if (INLINE_CHORD.test(line)) {
      cur.lines.push(parseLine(line));
      started = true;
      continue;
    }

    if (isChordLine(line)) {
      const next = i + 1 < raw.length ? raw[i + 1] : null;
      const nextIsLyric =
        next !== null &&
        next.trim() !== '' &&
        !next.startsWith('#') &&
        !isChordLine(next) &&
        SECTION_HEAD.exec(next) === null;
      if (nextIsLyric) {
        cur.lines.push(mergeChordLyric(line, next!));
        i++;
      } else {
        cur.lines.push(mergeChordLyric(line, ''));
      }
      started = true;
      continue;
    }

    cur.lines.push({ lyric: line, chords: [] });
    started = true;
  }
  if (started) sections.push(cur);
  return sections;
}

export function firstChord(sections: Section[]): string | null {
  for (const s of sections)
    for (const l of s.lines)
      if (l.chords.length) {
        return [...l.chords].sort((a, b) => a.idx - b.idx)[0].sym;
      }
  return null;
}

export function suggestKey(sections: Section[]): string | null {
  const fc = firstChord(sections);
  if (!fc) return null;
  const m = PARTS.exec(fc);
  if (!m) return fc;
  const root = m[1];
  const qual = m[2] ?? '';
  const minor = qual.startsWith('m') && !qual.startsWith('maj');
  return minor ? root + 'm' : root;
}

export function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
  );
}
