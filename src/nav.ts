// Pilha de telas, como no app (abrir música, repertório, histórico...).
// O "voltar" do navegador volta uma tela.
import { reactive, watch } from 'vue';

export type Tela =
  | { nome: 'inicio' }
  | { nome: 'musica'; id: string; setlistId?: string }
  | { nome: 'editar'; id: string; nova?: boolean }
  | { nome: 'repertorio'; id: string }
  | { nome: 'sugestoes' }
  | { nome: 'sugestao'; id: string }
  | { nome: 'versoes'; id: string }
  | { nome: 'grupo' }
  | { nome: 'atividade' }
  | { nome: 'imprimir'; setlistId?: string; songId?: string };

export const nav = reactive({ pilha: [{ nome: 'inicio' }] as Tela[] });

export const atual = () => nav.pilha[nav.pilha.length - 1];

export function abrir(t: Tela) {
  nav.pilha.push(t);
  history.pushState({ n: nav.pilha.length }, '');
  window.scrollTo(0, 0);
}

export function voltar() {
  if (nav.pilha.length > 1) history.back();
}

/** Troca a tela de cima (ex.: próxima música do repertório). */
export function trocar(t: Tela) {
  nav.pilha[nav.pilha.length - 1] = t;
}

window.addEventListener('popstate', () => {
  if (nav.pilha.length > 1) nav.pilha.pop();
});

// ---------- preferências deste navegador ----------

function ler<T>(k: string, padrao: T): T {
  try {
    const v = localStorage.getItem('mymusic.' + k);
    return v === null ? padrao : (JSON.parse(v) as T);
  } catch { return padrao; }
}

export const prefs = reactive({
  tema: ler<'dark' | 'light'>('tema', 'dark'),
  fonte: ler<number>('fonte', 1),
  soLetra: ler<boolean>('soLetra', false),
  aba: ler<'songs' | 'setlists'>('aba', 'songs'),
});

watch(prefs, (p) => {
  for (const [k, v] of Object.entries(p)) {
    try { localStorage.setItem('mymusic.' + k, JSON.stringify(v)); } catch { /* sem storage */ }
  }
  document.documentElement.dataset.theme = p.tema;
}, { deep: true, immediate: true });
