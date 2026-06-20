// Tipos do app + formato JSON IDÊNTICO ao app Flutter (chaves compactas).

export interface Chord { sym: string; idx: number }
export interface SongLine { lyric: string; chords: Chord[] }
export interface Section { name: string; lines: SongLine[] }

export interface Song {
  id: string;
  title: string;
  artist: string;
  key: string;
  capo: number;
  sections: Section[];
  tags: string[];
  notes: string;
  updatedAt: string; // ISO8601
}

export interface Setlist {
  id: string;
  name: string;
  songIds: string[];
  transpose: Record<string, number>;
  date: string | null;
  updatedAt: string;
}

export interface AppSettings {
  seedColor: number;
  dark: boolean;
  fontScale: number;
  scrollSpeed: number;
  pedalKeys: Record<string, number[]>;
}

export interface AppData {
  songs: Song[];
  setlists: Setlist[];
  settings: AppSettings;
}

// ---- JSON bruto (como gravado no Drive) ----
export interface RawChord { s: string; i: number }
export interface RawLine { l: string; c: RawChord[] }
export interface RawSection { n: string; l: RawLine[] }
export interface RawSong {
  id: string; title: string; artist?: string; key?: string; capo?: number;
  sections?: RawSection[]; tags?: string[]; notes?: string; updatedAt?: string;
}
export interface RawSetlist {
  id: string; name: string; songIds?: string[];
  transpose?: Record<string, number>; date?: string | null; updatedAt?: string;
}
export interface RawData {
  songs?: RawSong[];
  setlists?: RawSetlist[];
  settings?: AppSettings;
}

export function songFromRaw(j: RawSong): Song {
  return {
    id: j.id,
    title: j.title,
    artist: j.artist ?? '',
    key: j.key ?? 'C',
    capo: j.capo ?? 0,
    sections: (j.sections ?? []).map((s) => ({
      name: s.n,
      lines: (s.l ?? []).map((l) => ({
        lyric: l.l,
        chords: (l.c ?? []).map((c) => ({ sym: c.s, idx: c.i })),
      })),
    })),
    tags: j.tags ?? [],
    notes: j.notes ?? '',
    updatedAt: j.updatedAt ?? new Date().toISOString(),
  };
}

export function songToRaw(s: Song): RawSong {
  return {
    id: s.id,
    title: s.title,
    artist: s.artist,
    key: s.key,
    capo: s.capo,
    sections: s.sections.map((sec) => ({
      n: sec.name,
      l: sec.lines.map((l) => ({
        l: l.lyric,
        c: l.chords.map((c) => ({ s: c.sym, i: c.idx })),
      })),
    })),
    tags: s.tags,
    notes: s.notes,
    updatedAt: s.updatedAt,
  };
}

export function setlistFromRaw(j: RawSetlist): Setlist {
  return {
    id: j.id,
    name: j.name,
    songIds: j.songIds ?? [],
    transpose: j.transpose ?? {},
    date: j.date ?? null,
    updatedAt: j.updatedAt ?? new Date().toISOString(),
  };
}

export function setlistToRaw(s: Setlist): RawSetlist {
  return {
    id: s.id, name: s.name, songIds: s.songIds,
    transpose: s.transpose, date: s.date, updatedAt: s.updatedAt,
  };
}

export const defaultSettings = (): AppSettings => ({
  seedColor: 0xff3d5afe,
  dark: true,
  fontScale: 1.0,
  scrollSpeed: 28,
  pedalKeys: {},
});
