import { reactive } from 'vue';
import type { Song, Setlist, AppData, RawData } from './types';
import {
  songFromRaw, songToRaw, setlistFromRaw, setlistToRaw, defaultSettings,
} from './types';
import { uid } from './chordEngine';
import * as drive from './drive';

interface State {
  data: AppData;
  signedIn: boolean;
  email: string;
  loading: boolean;
  saving: boolean;
  error: string | null;
  dirty: boolean;
}

export const state = reactive<State>({
  data: { songs: [], setlists: [], settings: defaultSettings() },
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
}

export async function loadFromDrive() {
  state.loading = true;
  state.error = null;
  try {
    const raw = await drive.downloadData();
    if (raw) {
      const j: RawData = JSON.parse(raw);
      state.data = {
        songs: (j.songs ?? []).map(songFromRaw),
        setlists: (j.setlists ?? []).map(setlistFromRaw),
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

export async function saveToDrive() {
  state.saving = true;
  state.error = null;
  try {
    const raw = {
      songs: state.data.songs.map(songToRaw),
      setlists: state.data.setlists.map(setlistToRaw),
      settings: state.data.settings,
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

export function newSong(): Song {
  const s: Song = {
    id: uid(), title: 'Nova música', artist: '', key: 'C', capo: 0,
    sections: [], tags: [], notes: '', bpm: 0, updatedAt: now(),
  };
  state.data.songs.unshift(s);
  state.dirty = true;
  return s;
}

export function touchSong(s: Song) {
  s.updatedAt = now();
  state.dirty = true;
}

export function deleteSong(id: string) {
  state.data.songs = state.data.songs.filter((s) => s.id !== id);
  for (const sl of state.data.setlists) {
    sl.songIds = sl.songIds.filter((x) => x !== id);
  }
  state.dirty = true;
}

export function newSetlist(name: string): Setlist {
  const sl: Setlist = { id: uid(), name, songIds: [], transpose: {}, date: null, updatedAt: now() };
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
  state.dirty = true;
}

export function songById(id: string): Song | undefined {
  return state.data.songs.find((s) => s.id === id);
}
