// Sessão ao vivo, como no app: o tablet/celular cria a sessão (servidor na
// rede local) e o navegador entra digitando o endereço que aparece lá.
// Mesmo protocolo do app (WebSocket ws://IP:47800/live). O navegador não
// consegue criar sessão nem achar sozinho — só entrar pelo endereço.
import { reactive, computed } from 'vue';
import { prefs } from './nav';
import { uid } from './chordEngine';
import { songFromRaw, setlistFromRaw, songToRaw, setlistToRaw } from './types';
import type { Song, Setlist, RawSong, RawSetlist } from './types';

export type Modo = 'conduz' | 'segue' | 'livre';
export interface Peer { id: string; name: string; mode: Modo }
export interface Nav { by: string; songId: string; setlistId: string | null; transpose: number }
export interface Rolagem { by: string; songId: string; frac: number }

const PORTA = 47800;
const meuId = uid();

export const live = reactive({
  ativo: false,
  endereco: '',
  modo: 'segue' as Modo,
  conectando: false,
  reconectando: false,
  erro: '',
  host: '',
  peers: [] as Peer[],
  nav: null as Nav | null,
  rolagem: null as Rolagem | null,
  /** músicas/repertórios que vieram com a navegação (p/ quem não tem no grupo) */
  songs: {} as Record<string, Song>,
  setlists: {} as Record<string, Setlist>,
  aviso: '',
});

export const seguindo = computed(() => live.ativo && live.modo === 'segue');
export const conduzindo = computed(() => live.ativo && live.modo === 'conduz');

export function meuNome() {
  const n = prefs.aparelho.trim();
  if (n) return n;
  const auto = `Navegador ${meuId.slice(-4).toUpperCase()}`;
  prefs.aparelho = auto; // fixa na 1ª vez, como o app
  return auto;
}

type Ouvinte = { nav?: (n: Nav) => void; rolagem?: (r: Rolagem) => void };
const ouvintes = new Set<Ouvinte>();
/** A tela da música se inscreve p/ seguir quem conduz. */
export function ouvir(o: Ouvinte) { ouvintes.add(o); return () => ouvintes.delete(o); }

let ws: WebSocket | null = null;
let quer = false;
let retry = 0;

function enviar(m: Record<string, unknown>) {
  try { if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m)); } catch { /* caiu */ }
}

function conectar(): Promise<boolean> {
  return new Promise((ok) => {
    let s: WebSocket;
    try { s = new WebSocket(`ws://${live.endereco}/live`); } catch { live.erro = 'Endereço inválido'; ok(false); return; }
    const t = setTimeout(() => { s.close(); }, 5000);
    let abriu = false;
    s.onopen = () => {
      abriu = true; clearTimeout(t); ws = s;
      live.reconectando = false; live.erro = '';
      enviar({ t: 'hello', v: 1, id: meuId, name: meuNome(), mode: live.modo });
      ok(true);
    };
    s.onmessage = (e) => { try { tratar(JSON.parse(e.data as string)); } catch { /* malformada */ } };
    s.onclose = () => {
      clearTimeout(t);
      if (!abriu) { live.erro = `Não achei a sessão em ${live.endereco}`; ok(false); return; }
      if (ws === s) ws = null;
      caiu();
    };
  });
}

// Wi-Fi cai: tenta voltar sozinho por ~1 min antes de desistir
function caiu() {
  if (!quer) return;
  live.reconectando = true;
  live.peers = live.peers.filter((p) => p.id === meuId);
  let n = 0;
  clearInterval(retry);
  retry = window.setInterval(async () => {
    if (!quer || ws) { clearInterval(retry); return; }
    if (++n > 30) { clearInterval(retry); sair(); live.erro = 'Conexão com a sessão perdida'; return; }
    await conectar();
  }, 2000);
}

export async function entrar(endereco: string) {
  sair();
  let e = endereco.trim().replace(/^wss?:\/\//, '').replace(/\/.*$/, '');
  if (!e) return false;
  if (!/:\d+$/.test(e)) e += `:${PORTA}`;
  live.endereco = e;
  live.erro = '';
  live.conectando = true;
  quer = true;
  const ok = await conectar();
  live.conectando = false;
  if (!ok) { quer = false; live.endereco = ''; return false; }
  live.ativo = true;
  live.peers = [{ id: meuId, name: meuNome(), mode: live.modo }];
  return true;
}

export function sair() {
  quer = false;
  clearInterval(retry);
  const s = ws;
  ws = null;
  if (s) { try { s.send(JSON.stringify({ t: 'bye', id: meuId })); s.close(); } catch { /* já caiu */ } }
  Object.assign(live, { ativo: false, endereco: '', reconectando: false, host: '', peers: [], nav: null, rolagem: null });
}

export function setModo(m: Modo) {
  live.modo = m;
  const eu = live.peers.find((p) => p.id === meuId);
  if (eu) eu.mode = m;
  if (!live.ativo) return;
  enviar({ t: 'mode', id: meuId, mode: m });
  // um condutor por vez
  if (m === 'conduz') enviar({ t: 'takeover', id: meuId });
}

export function publicarNav(song: Song, setlist: Setlist | undefined, transpose: number) {
  if (!conduzindo.value) return;
  enviar({
    t: 'nav', by: meuId, songId: song.id, setlistId: setlist?.id ?? null, transpose,
    song: songToRaw(song), ...(setlist ? { setlist: setlistToRaw(setlist) } : {}),
  });
}

export function publicarRolagem(songId: string, frac: number) {
  if (!conduzindo.value) return;
  enviar({ t: 'scroll', by: meuId, songId, frac });
}

const nomeDe = (id?: string) => live.peers.find((p) => p.id === id)?.name ?? 'outro aparelho';

function setPeers(l: unknown) {
  if (!Array.isArray(l)) return;
  const ps = l.map((p) => ({ id: String(p.id), name: String(p.name ?? '?'), mode: (p.mode ?? 'livre') as Modo }));
  if (!ps.some((p) => p.id === meuId)) ps.push({ id: meuId, name: meuNome(), mode: live.modo });
  live.peers = ps;
}

function tratar(m: Record<string, unknown>) {
  switch (m.t) {
    case 'welcome':
      live.host = String(m.host ?? '');
      setPeers(m.peers);
      if (m.nav && typeof m.nav === 'object') tratar(m.nav as Record<string, unknown>);
      if (m.scroll && typeof m.scroll === 'object') tratar(m.scroll as Record<string, unknown>);
      break;
    case 'peers':
      live.host = String(m.host ?? live.host);
      setPeers(m.peers);
      break;
    case 'nav': {
      if (m.song && typeof m.song === 'object') {
        const s = songFromRaw(m.song as RawSong);
        live.songs[s.id] = s;
      }
      if (m.setlist && typeof m.setlist === 'object') {
        const sl = setlistFromRaw(m.setlist as RawSetlist);
        live.setlists[sl.id] = sl;
      }
      const n: Nav = { by: String(m.by), songId: String(m.songId), setlistId: (m.setlistId as string) ?? null, transpose: Number(m.transpose ?? 0) };
      if (n.by === meuId) return;
      live.nav = n;
      live.rolagem = null;
      if (seguindo.value) ouvintes.forEach((o) => o.nav?.(n));
      break;
    }
    case 'scroll': {
      const r: Rolagem = { by: String(m.by), songId: String(m.songId), frac: Number(m.frac) };
      if (r.by === meuId) return;
      live.rolagem = r;
      if (seguindo.value) ouvintes.forEach((o) => o.rolagem?.(r));
      break;
    }
    case 'takeover':
      if (m.id !== meuId && live.modo === 'conduz') {
        live.aviso = `${nomeDe(m.id as string)} assumiu a condução — este navegador agora segue`;
        setModo('segue');
        setTimeout(() => (live.aviso = ''), 5000);
      }
      break;
    // 'song'/'setlist': com a nuvem ligada as edições vêm pelo Firebase
  }
}

window.addEventListener('beforeunload', () => sair());
