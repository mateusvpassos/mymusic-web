<script setup lang="ts">
import { ref, computed } from 'vue';
import * as store from './store';
import { state } from './store';
import { serializeSections, importText, suggestKey } from './chordEngine';
import type { Song, Setlist } from './types';

const tab = ref<'songs' | 'setlists'>('songs');
const query = ref('');

// ---- edição de música ----
const editing = ref<Song | null>(null);
const editText = ref('');
const tagInput = ref('');

const filtered = computed(() =>
  state.data.songs.filter((s) => {
    const q = query.value.toLowerCase();
    return (
      !q ||
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      s.tags.some((t) => t.toLowerCase().includes(q))
    );
  }),
);

function openSong(s: Song) {
  editing.value = s;
  editText.value = serializeSections(s.sections);
}
function newSong() {
  openSong(store.newSong());
}
function applySong() {
  const s = editing.value!;
  s.sections = importText(editText.value);
  if (!s.key.trim() || s.key.trim() === 'C') {
    const k = suggestKey(s.sections);
    if (k) s.key = k;
  }
  s.title = s.title.trim() || 'Sem título';
  store.touchSong(s);
  editing.value = null;
}
function removeSong(s: Song) {
  if (confirm(`Excluir "${s.title}"?`)) store.deleteSong(s.id);
}
function addTag() {
  const t = tagInput.value.trim().toLowerCase();
  if (t && editing.value && !editing.value.tags.includes(t)) editing.value.tags.push(t);
  tagInput.value = '';
}

// ---- repertórios ----
const editingSet = ref<Setlist | null>(null);
function newSetlist() {
  const name = prompt('Nome do repertório');
  if (name && name.trim()) editingSet.value = store.newSetlist(name.trim());
}
function songTitle(id: string) {
  return store.songById(id)?.title ?? '(removida)';
}
function addToSet(sl: Setlist, id: string) {
  if (id && !sl.songIds.includes(id)) {
    sl.songIds.push(id);
    store.touchSetlist(sl);
  }
}
function removeFromSet(sl: Setlist, id: string) {
  sl.songIds = sl.songIds.filter((x) => x !== id);
  delete sl.transpose[id];
  store.touchSetlist(sl);
}
function moveInSet(sl: Setlist, i: number, dir: number) {
  const j = i + dir;
  if (j < 0 || j >= sl.songIds.length) return;
  [sl.songIds[i], sl.songIds[j]] = [sl.songIds[j], sl.songIds[i]];
  store.touchSetlist(sl);
}
function setTranspose(sl: Setlist, id: string, v: number) {
  if (v === 0) delete sl.transpose[id];
  else sl.transpose[id] = v;
  store.touchSetlist(sl);
}
</script>

<template>
  <div class="app">
    <header>
      <h1>🎵 MyMusic <span class="sub">— editor web</span></h1>
      <div class="auth">
        <template v-if="!state.signedIn">
          <button class="primary" @click="store.signIn()">Entrar com Google</button>
        </template>
        <template v-else>
          <span v-if="state.dirty" class="dirty">● não salvo</span>
          <button class="primary" :disabled="state.saving || !state.dirty" @click="store.saveToDrive()">
            {{ state.saving ? 'Salvando…' : 'Salvar no Drive' }}
          </button>
          <button @click="store.loadFromDrive()" :disabled="state.loading">Recarregar</button>
          <button class="ghost" @click="store.signOut()">Sair</button>
        </template>
      </div>
    </header>

    <p v-if="state.error" class="error">⚠ {{ state.error }}</p>

    <template v-if="state.signedIn">
      <nav class="tabs">
        <button :class="{ active: tab === 'songs' }" @click="tab = 'songs'">Músicas</button>
        <button :class="{ active: tab === 'setlists' }" @click="tab = 'setlists'">Repertórios</button>
      </nav>

      <!-- MÚSICAS -->
      <section v-if="tab === 'songs'">
        <div class="toolbar">
          <input v-model="query" placeholder="Buscar…" />
          <button class="primary" @click="newSong">+ Música</button>
        </div>
        <ul class="list">
          <li v-for="s in filtered" :key="s.id">
            <div class="item" @click="openSong(s)">
              <span class="badge">{{ s.key }}</span>
              <div>
                <strong>{{ s.title }}</strong>
                <small v-if="s.artist"> — {{ s.artist }}</small>
                <div class="tags"><em v-for="t in s.tags" :key="t">{{ t }}</em></div>
              </div>
            </div>
            <button class="ghost" @click="removeSong(s)">✕</button>
          </li>
          <li v-if="!filtered.length" class="empty">Nenhuma música</li>
        </ul>
      </section>

      <!-- REPERTÓRIOS -->
      <section v-if="tab === 'setlists'">
        <div class="toolbar">
          <span></span>
          <button class="primary" @click="newSetlist">+ Repertório</button>
        </div>
        <ul class="list">
          <li v-for="sl in state.data.setlists" :key="sl.id">
            <div class="item" @click="editingSet = sl">
              <span class="badge">{{ sl.songIds.length }}</span>
              <strong>{{ sl.name }}</strong>
            </div>
            <button class="ghost" @click="store.deleteSetlist(sl.id)">✕</button>
          </li>
          <li v-if="!state.data.setlists.length" class="empty">Nenhum repertório</li>
        </ul>
      </section>
    </template>

    <p v-else class="hint">
      Entre com a conta Google do tablet. As músicas e repertórios são salvos na
      mesma pasta do Drive — sincroniza automático no app.
    </p>

    <!-- MODAL: editor de música -->
    <div v-if="editing" class="modal" @click.self="editing = null">
      <div class="sheet">
        <div class="grid">
          <input v-model="editing.title" placeholder="Título" class="big" />
          <input v-model="editing.artist" placeholder="Artista" />
          <input v-model="editing.key" placeholder="Tom" class="key" />
          <input v-model.number="editing.capo" type="number" placeholder="Capo" class="key" />
        </div>
        <div class="tags-edit">
          <em v-for="t in editing.tags" :key="t" @click="editing.tags = editing.tags.filter(x => x !== t)">
            {{ t }} ✕
          </em>
          <input v-model="tagInput" placeholder="+ tag" @keyup.enter="addTag" />
        </div>
        <label>Cifra (acordes acima da letra, ou <code>[G]</code> antes da sílaba; <code>#Seção</code> = seção)</label>
        <textarea v-model="editText" spellcheck="false" placeholder="Cole a cifra aqui…"></textarea>
        <div class="actions">
          <button class="ghost" @click="editing = null">Cancelar</button>
          <button class="primary" @click="applySong">OK</button>
        </div>
      </div>
    </div>

    <!-- MODAL: editor de repertório -->
    <div v-if="editingSet" class="modal" @click.self="editingSet = null">
      <div class="sheet">
        <input v-model="editingSet.name" class="big" @input="store.touchSetlist(editingSet!)" />
        <ol class="setlist">
          <li v-for="(id, i) in editingSet.songIds" :key="id">
            <span class="num">{{ i + 1 }}</span>
            <span class="t">{{ songTitle(id) }}</span>
            <label class="tom">tom
              <input type="number" :value="editingSet.transpose[id] || 0"
                @change="setTranspose(editingSet!, id, +($event.target as HTMLInputElement).value)" />
            </label>
            <button class="ghost" @click="moveInSet(editingSet!, i, -1)">▲</button>
            <button class="ghost" @click="moveInSet(editingSet!, i, 1)">▼</button>
            <button class="ghost" @click="removeFromSet(editingSet!, id)">✕</button>
          </li>
          <li v-if="!editingSet.songIds.length" class="empty">Vazio</li>
        </ol>
        <div class="add-row">
          <select @change="addToSet(editingSet!, ($event.target as HTMLSelectElement).value); ($event.target as HTMLSelectElement).value = ''">
            <option value="">+ adicionar música…</option>
            <option v-for="s in state.data.songs" :key="s.id" :value="s.id">{{ s.title }}</option>
          </select>
        </div>
        <div class="actions">
          <button class="primary" @click="editingSet = null">Fechar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app { max-width: 880px; margin: 0 auto; padding: 16px; }
header { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
h1 { font-size: 22px; margin: 0; }
.sub { color: var(--muted); font-weight: 400; font-size: 15px; }
.auth { display: flex; gap: 8px; align-items: center; }
.dirty { color: #ffb74d; font-size: 13px; }
.tabs { display: flex; gap: 4px; margin: 16px 0; border-bottom: 1px solid var(--line); }
.tabs button { background: none; border: none; color: var(--muted); padding: 10px 16px; cursor: pointer; border-bottom: 2px solid transparent; }
.tabs button.active { color: var(--fg); border-color: var(--accent); }
.toolbar { display: flex; gap: 8px; margin-bottom: 12px; }
.toolbar input { flex: 1; }
.list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.list > li { display: flex; align-items: center; gap: 8px; background: var(--card); border-radius: 12px; padding: 4px; }
.item { display: flex; align-items: center; gap: 12px; flex: 1; padding: 10px 12px; cursor: pointer; }
.badge { background: var(--accent); color: #fff; border-radius: 999px; min-width: 34px; height: 34px; display: grid; place-items: center; font-weight: 700; font-size: 13px; padding: 0 6px; }
.tags em, .tags-edit em { font-style: normal; background: var(--chip); color: var(--muted); border-radius: 999px; padding: 1px 8px; font-size: 12px; margin-right: 4px; cursor: pointer; }
.tags { margin-top: 2px; }
.empty { justify-content: center; color: var(--muted); padding: 24px; }
.hint { color: var(--muted); margin-top: 24px; }
.error { color: #ff6b6b; }

.modal { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: grid; place-items: center; padding: 16px; z-index: 10; }
.sheet { background: var(--bg2); border-radius: 16px; width: 100%; max-width: 760px; max-height: 90vh; overflow: auto; padding: 18px; display: flex; flex-direction: column; gap: 10px; }
.grid { display: grid; grid-template-columns: 1fr 1fr auto auto; gap: 8px; }
.big { font-size: 18px; font-weight: 700; }
.key { width: 70px; text-align: center; }
.tags-edit { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.tags-edit input { width: 90px; }
label { color: var(--muted); font-size: 13px; }
textarea { min-height: 320px; font-family: ui-monospace, monospace; font-size: 13px; line-height: 1.45; resize: vertical; }
.actions { display: flex; justify-content: flex-end; gap: 8px; }
.setlist { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.setlist li { display: flex; align-items: center; gap: 8px; background: var(--card); border-radius: 8px; padding: 6px 8px; }
.setlist .num { background: var(--accent); color: #fff; border-radius: 999px; width: 24px; height: 24px; display: grid; place-items: center; font-size: 12px; }
.setlist .t { flex: 1; }
.tom { font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 4px; }
.tom input { width: 54px; }
.add-row select { width: 100%; }

input, textarea, select { font: inherit; color: var(--fg); background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; }
button { font: inherit; cursor: pointer; color: var(--fg); background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; }
button.primary { background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 600; }
button.primary:disabled { opacity: .5; cursor: default; }
button.ghost { background: none; border: none; color: var(--muted); padding: 6px 8px; }
</style>
