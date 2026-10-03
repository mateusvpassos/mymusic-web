import { reactive } from 'vue';
import type { Song, Setlist, AppData, RawData } from './types';
import {
  songFromRaw, songToRaw, setlistFromRaw, setlistToRaw, defaultSettings,
} from './types';
import { uid } from './chordEngine';
import * as drive from './drive';

interface State {
  data: AppData;
  /** lápides 'song:<id>' / 'setlist:<id>' -> quando foi excluído (ISO) */
  deleted: Record<string, string>;
  signedIn: boolean;
  email: string;
  loading: boolean;
  saving: boolean;
  error: string | null;
  dirty: boolean;
}

export const state = reactive<State>({
  data: { songs: [], setlists: [], settings: defaultSettings() },
  deleted: {},
  signedIn: false,
  email: '',
  loading: false,
  saving: false,
  error: null,
  dirty: false,
});

export async function signIn() {
  state.error = null;
  try {
    await drive.signIn();
    state.signedIn = true;
    await loadFromDrive();
  } catch (e: any) {
    state.error = String(e.message ?? e);
  }
}

export function signOut() {
  drive.signOut();
  state.signedIn = false;
  state.data = { songs: [], setlists: [], settings: defaultSettings() };
  state.deleted = {};
}

// excluído depois da última edição desta versão?
function buried(kind: 'song' | 'setlist', id: string, updatedAt: string): boolean {
  const t = state.deleted[`${kind}:${id}`];
  return !!t && !(new Date(updatedAt) > new Date(t));
}

function mergeTombstones(inc: Record<string, string> | undefined) {
  for (const [k, at] of Object.entries(inc ?? {})) {
    const cur = state.deleted[k];
    if (!cur || new Date(at) > new Date(cur)) state.deleted[k] = at;
  }
}

export async function loadFromDrive() {
  state.loading = true;
  state.error = null;
  try {
    const raw = await drive.downloadData();
    if (raw) {
      const j: RawData = JSON.parse(raw);
      state.deleted = {};
      mergeTombstones(j.deleted);
      state.data = {
        songs: (j.songs ?? []).map(songFromRaw).filter((x) => !buried('song', x.id, x.updatedAt)),
        setlists: (j.setlists ?? [])
          .map(setlistFromRaw)
          .filter((x) => !buried('setlist', x.id, x.updatedAt)),
        settings: j.settings ?? defaultSettings(),
      };
    }
    state.dirty = false;
  } catch (e: any) {
    state.error = String(e.message ?? e);
  } finally {
    state.loading = false;
  }
}

// Salvar = baixar o que está no Drive agora, mesclar (mais recente vence,
// exclusão vence o que é mais antigo que ela) e só então subir. Antes o web
// subia o que tinha carregado e apagava o que o tablet mudou nesse meio-tempo.
export async function saveToDrive() {
  state.saving = true;
  state.error = null;
  try {
    const cur = await drive.downloadData();
    const j: RawData = cur ? JSON.parse(cur) : {};
    mergeTombstones(j.deleted);
    for (const s of (j.songs ?? []).map(songFromRaw)) {
      const i = state.data.songs.findIndex((x) => x.id === s.id);
      if (i < 0) state.data.songs.push(s);
      else if (new Date(s.updatedAt) > new Date(state.data.songs[i].updatedAt)) state.data.songs[i] = s;
    }
    for (const sl of (j.setlists ?? []).map(setlistFromRaw)) {
      const i = state.data.setlists.findIndex((x) => x.id === sl.id);
      if (i < 0) state.data.setlists.push(sl);
      else if (new Date(sl.updatedAt) > new Date(state.data.setlists[i].updatedAt))
        state.data.setlists[i] = sl;
    }
    state.data.songs = state.data.songs.filter((x) => !buried('song', x.id, x.updatedAt));
    state.data.setlists = state.data.setlists.filter((x) => !buried('setlist', x.id, x.updatedAt));

    const raw = {
      songs: state.data.songs.map(songToRaw),
      setlists: state.data.setlists.map(setlistToRaw),
      // o web não edita config nem histórico: repassa o que o app gravou
      settings: j.settings ?? state.data.settings,
      audit: j.audit ?? [],
      deleted: state.deleted,
    };
    await drive.uploadData(JSON.stringify(raw, null, 2));
    state.dirty = false;
  } catch (e: any) {
    state.error = String(e.message ?? e);
  } finally {
    state.saving = false;
  }
}

// ---- CRUD ----
const now = () => new Date().toISOString();

/** Música nova ainda fora da lista — entra com putSong() ao confirmar. */
export function draftSong(): Song {
  return {
    id: uid(), title: 'Nova música', artist: '', key: 'C', capo: 0,
    sections: [], tags: [], notes: '', bpm: 0, scrollSpeed: 0,
    tempos: [], momentos: [], updatedAt: now(),
  };
}

/** Grava a cópia editada: substitui a existente ou entra no topo se for nova. */
export function putSong(s: Song) {
  s.updatedAt = now();
  const i = state.data.songs.findIndex((x) => x.id === s.id);
  if (i >= 0) state.data.songs[i] = s;
  else state.data.songs.unshift(s);
  state.dirty = true;
}

export function touchSong(s: Song) {
  s.updatedAt = now();
  state.dirty = true;
}

export function deleteSong(id: string) {
  state.data.songs = state.data.songs.filter((s) => s.id !== id);
  state.deleted[`song:${id}`] = now();
  for (const sl of state.data.setlists) {
    sl.songIds = sl.songIds.filter((x) => x !== id);
  }
  state.dirty = true;
}

export function newSetlist(name: string): Setlist {
  const sl: Setlist = { id: uid(), name, songIds: [], transpose: {}, moments: {}, date: null, updatedAt: now() };
  state.data.setlists.unshift(sl);
  state.dirty = true;
  return sl;
}

export function touchSetlist(sl: Setlist) {
  sl.updatedAt = now();
  state.dirty = true;
}

export function deleteSetlist(id: string) {
  state.data.setlists = state.data.setlists.filter((s) => s.id !== id);
  state.deleted[`setlist:${id}`] = now();
  state.dirty = true;
}

export function songById(id: string): Song | undefined {
  return state.data.songs.find((s) => s.id === id);
}
