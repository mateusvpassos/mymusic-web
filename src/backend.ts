// As telas falam só com isto. Com o grupo da nuvem ligado, cada mudança vai
// direto (com versão e permissão); sem ele, vale o modo antigo do Drive
// (edita aqui e "Salvar no Drive").
import { computed } from 'vue';
import * as store from './store';
import { state } from './store';
import * as nuvem from './cloud';
import { cloud, ativa } from './cloud';
import type { Song, Setlist } from './types';
import { emptyMeta } from './types';
import { uid } from './chordEngine';

export const modoNuvem = ativa;
export const songs = computed<Song[]>(() => (ativa.value ? cloud.songs : state.data.songs));
export const setlists = computed<Setlist[]>(() => (ativa.value ? cloud.setlists : state.data.setlists));
export const pronto = computed(() => ativa.value || state.signedIn);

export const songById = (id: string) => songs.value.find((s) => s.id === id);
export const setlistById = (id: string) => setlists.value.find((s) => s.id === id);

export const podeEditarSong = nuvem.podeEditarSong;
export const podeEditarSetlist = nuvem.podeEditarSetlist;
export const souDono = nuvem.souDono;

export function salvarSong(s: Song) {
  if (ativa.value) nuvem.putSong(s);
  else store.putSong(s);
}

export function excluirSong(id: string) {
  if (ativa.value) {
    nuvem.deleteSong(id);
    // tira dos meus repertórios também
    for (const sl of cloud.setlists)
      if (sl.songIds.includes(id) && nuvem.podeEditarSetlist(sl))
        nuvem.putSetlist({ ...sl, songIds: sl.songIds.filter((x) => x !== id) });
  } else store.deleteSong(id);
}

export function salvarSetlist(sl: Setlist) {
  if (ativa.value) nuvem.putSetlist(sl);
  else store.touchSetlist(sl);
}

export function novoSetlist(name: string, date: string | null): Setlist {
  const sl: Setlist = {
    id: uid(), name, songIds: [], transpose: {}, moments: {}, date,
    ...emptyMeta(), updatedAt: new Date().toISOString(),
  };
  if (ativa.value) nuvem.putSetlist(sl);
  else { state.data.setlists.unshift(sl); state.dirty = true; }
  return sl;
}

export function excluirSetlist(id: string) {
  if (ativa.value) nuvem.deleteSetlist(id);
  else store.deleteSetlist(id);
}

export function duplicarSong(s: Song): Song {
  const c: Song = {
    ...JSON.parse(JSON.stringify(s)), id: uid(), title: `${s.title} (cópia)`,
    ...emptyMeta(), versao: 0, updatedAt: new Date().toISOString(),
  };
  salvarSong(c);
  return c;
}

export function duplicarSetlist(sl: Setlist): Setlist {
  const c: Setlist = {
    ...JSON.parse(JSON.stringify(sl)), id: uid(), name: `${sl.name} (cópia)`,
    ...emptyMeta(), updatedAt: new Date().toISOString(),
  };
  if (ativa.value) nuvem.putSetlist(c);
  else { state.data.setlists.unshift(c); state.dirty = true; }
  return c;
}
