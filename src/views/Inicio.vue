<script setup lang="ts">
// Biblioteca: músicas e repertórios, como a tela inicial do app.
import { ref, computed } from 'vue';
import AppBar from '../components/AppBar.vue';
import Prompt from '../components/Prompt.vue';
import { abrir, prefs } from '../nav';
import * as be from '../backend';
import * as store from '../store';
import { state } from '../store';
import { cloud, ativa, eu, nomeDe, paraDecidir, disponivel } from '../cloud';
import { paraDecidirA } from '../acervo';
import { searchSongs, fold, fmtData } from '../core';
import { usoMusicas, quando, temposDe, proximoDomingo } from '../liturgia';
import type { Song, Setlist } from '../types';
// música nova só entra na lista ao salvar (o editor pega daqui)
import { rascunho } from '../rascunho';

const busca = ref('');
const menu = ref<string | null>(null);
const novoRep = ref(false);
const dataNovo = ref(isoDia(proximoDomingo()));
const apagar = ref<{ tipo: 'song' | 'set'; id: string; nome: string } | null>(null);

function isoDia(d: Date) {
  const two = (v: number) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
}

const uso = computed(() => usoMusicas(be.setlists.value));
const hits = computed(() => {
  const l = searchSongs(be.songs.value, busca.value);
  // sem busca: ordem alfabética (no web é o que mais ajuda a achar)
  if (!busca.value.trim()) l.sort((a, b) => fold(a.song.title).localeCompare(fold(b.song.title)));
  return l;
});
const reps = computed(() => {
  const q = fold(busca.value.trim());
  return be.setlists.value
    .filter((s) => !q || fold(s.name).includes(q))
    .sort((a, b) => {
      if (a.date && b.date) return b.date.localeCompare(a.date);
      if (a.date) return -1;
      if (b.date) return 1;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
});

function meta(s: Song): string {
  const u = uso.value[s.id];
  return [
    ativa.value && s.dono && s.dono !== eu.value ? `de ${nomeDe(s.dono)}` : '',
    s.artist,
    s.bpm ? `${s.bpm} BPM` : '',
    u ? `tocada ${quando(u.ultima)} (${u.vezes}x)` : '',
  ].filter(Boolean).join('  •  ');
}

function novaMusica() {
  const d = store.draftSong();
  abrir({ nome: 'editar', id: d.id, nova: true });
  rascunho.value = d;
}

function criarRep(nome: string) {
  novoRep.value = false;
  if (!nome) return;
  const sl = be.novoSetlist(nome, dataNovo.value ? `${dataNovo.value}T00:00:00.000` : null);
  abrir({ nome: 'repertorio', id: sl.id });
}

function confirmaApagar() {
  const a = apagar.value!;
  if (a.tipo === 'song') be.excluirSong(a.id);
  else be.excluirSetlist(a.id);
  apagar.value = null;
}

const tempoNovo = computed(() =>
  dataNovo.value ? temposDe(new Date(`${dataNovo.value}T00:00:00`))[0] : '');
const fecharMenu = () => (menu.value = null);
</script>

<template>
  <div @click="fecharMenu">
    <AppBar titulo="MyMusic" sem-voltar>
      <template #logo><img src="/icon.png" class="logo" alt="" /></template>
      <button v-if="cloud.user" class="icon-btn" title="Acervo geral" @click="abrir({ nome: 'acervo' })">
        <span class="ms">public</span>
      </button>
      <button v-if="cloud.user" class="icon-btn" title="Sugestões" @click="abrir({ nome: 'sugestoes' })">
        <span class="ms">inbox</span>
        <span v-if="paraDecidir.length + paraDecidirA.length" class="dot">{{ paraDecidir.length + paraDecidirA.length }}</span>
      </button>
      <button v-if="ativa" class="icon-btn" title="Atividade recente" @click="abrir({ nome: 'atividade' })">
        <span class="ms">history</span>
      </button>
      <button v-if="disponivel" class="icon-btn" :title="ativa ? `Grupo: ${cloud.grupo!.nome}` : 'Grupo compartilhado'"
        @click="abrir({ nome: 'grupo' })">
        <span class="ms">{{ ativa ? 'cloud_done' : 'cloud_off' }}</span>
      </button>
      <button class="icon-btn" :title="prefs.tema === 'dark' ? 'Tema claro' : 'Tema escuro'"
        @click="prefs.tema = prefs.tema === 'dark' ? 'light' : 'dark'">
        <span class="ms">{{ prefs.tema === 'dark' ? 'light_mode' : 'dark_mode' }}</span>
      </button>
    </AppBar>

    <!-- modo Drive (sem grupo): salvar manual, como antes -->
    <div v-if="!ativa && state.signedIn" class="drive no-print">
      <span class="muted"><span class="ms">add_to_drive</span> Google Drive</span>
      <span v-if="state.dirty" class="sujo">● não salvo</span>
      <button class="btn" :disabled="state.saving || !state.dirty" @click="store.saveToDrive()">
        {{ state.saving ? 'Salvando…' : 'Salvar no Drive' }}
      </button>
      <button class="btn tonal" :disabled="state.loading" @click="store.loadFromDrive()">Recarregar</button>
      <button class="btn text" @click="store.signOut()">Sair</button>
    </div>
    <p v-if="state.error" class="error wrap">⚠ {{ state.error }}</p>
    <p v-if="cloud.erro" class="error wrap">⚠ {{ cloud.erro }}</p>

    <div v-if="!be.pronto.value" class="wrap"><div class="entrar card">
      <h2 class="section-title"><span class="ms">login</span>Entrar</h2>
      <p v-if="disponivel">
        Com um grupo compartilhado, as músicas ficam na nuvem: quem criou é o dono, os outros
        mandam sugestões e tudo tem histórico.
      </p>
      <div class="acoes-entrar">
        <button v-if="disponivel" class="btn" @click="abrir({ nome: 'grupo' })">
          <span class="ms">groups</span>Grupo compartilhado
        </button>
        <button class="btn tonal" @click="store.signIn()">
          <span class="ms">add_to_drive</span>Usar o Google Drive (modo antigo)
        </button>
      </div>
    </div></div>

    <template v-else>
      <nav class="tabs no-print">
        <button :class="{ on: prefs.aba === 'songs' }" @click="prefs.aba = 'songs'">Músicas</button>
        <button :class="{ on: prefs.aba === 'setlists' }" @click="prefs.aba = 'setlists'">Repertórios</button>
      </nav>
      <div class="wrap">
        <div class="busca">
          <span class="ms">search</span>
          <input v-model="busca" placeholder="Buscar..." />
        </div>

        <ul v-if="prefs.aba === 'songs'" class="list">
          <li v-for="h in hits" :key="h.song.id" class="row" @click="abrir({ nome: 'musica', id: h.song.id })">
            <div class="key-badge">{{ h.song.key }}</div>
            <div class="grow">
              <div class="title">{{ h.song.title }}</div>
              <div v-if="h.snippet" class="sub trecho">“{{ h.snippet }}”</div>
              <div v-if="meta(h.song)" class="sub">{{ meta(h.song) }}</div>
              <div v-if="h.song.tags.length" class="tags">
                <span v-for="t in h.song.tags.slice(0, 4)" :key="t" class="tag">{{ t }}</span>
              </div>
            </div>
            <div class="menu-wrap" @click.stop>
              <button class="icon-btn" @click="menu = menu === h.song.id ? null : h.song.id">
                <span class="ms">more_vert</span>
              </button>
              <div v-if="menu === h.song.id" class="menu">
                <button @click="abrir({ nome: 'editar', id: h.song.id }); fecharMenu()">
                  {{ be.podeEditarSong(h.song) ? 'Editar' : 'Sugerir mudança' }}
                </button>
                <button @click="be.duplicarSong(h.song); fecharMenu()">Duplicar</button>
                <button v-if="be.souDono(h.song.dono)"
                  @click="apagar = { tipo: 'song', id: h.song.id, nome: h.song.title }; fecharMenu()">Excluir</button>
              </div>
            </div>
          </li>
          <li v-if="!hits.length" class="empty">Nenhuma música</li>
        </ul>

        <ul v-else class="list">
          <li v-for="sl in reps" :key="sl.id" class="row" @click="abrir({ nome: 'repertorio', id: sl.id })">
            <span class="ms rep-ic">queue_music</span>
            <div class="grow">
              <div class="title">{{ sl.name }}</div>
              <div class="sub">
                {{ [sl.date ? fmtData(sl.date) : '', `${sl.songIds.length} músicas`,
                    ativa && sl.dono && sl.dono !== eu ? `de ${nomeDe(sl.dono)}` : ''].filter(Boolean).join('  •  ') }}
              </div>
            </div>
            <div class="menu-wrap" @click.stop>
              <button class="icon-btn" @click="menu = menu === sl.id ? null : sl.id">
                <span class="ms">more_vert</span>
              </button>
              <div v-if="menu === sl.id" class="menu">
                <button @click="be.duplicarSetlist(sl as Setlist); fecharMenu()">Duplicar</button>
                <button v-if="be.souDono(sl.dono)"
                  @click="apagar = { tipo: 'set', id: sl.id, nome: sl.name }; fecharMenu()">Excluir</button>
              </div>
            </div>
          </li>
          <li v-if="!reps.length" class="empty">Nenhum repertório</li>
        </ul>
      </div>

      <button class="fab no-print" @click="prefs.aba === 'songs' ? novaMusica() : (novoRep = true)">
        <span class="ms">add</span>{{ prefs.aba === 'songs' ? 'Música' : 'Repertório' }}
      </button>
    </template>

    <Prompt v-if="novoRep" titulo="Novo repertório" dica="Nome" ok="Criar"
      @fechar="novoRep = false" @ok="criarRep">
      <label class="data">
        <span class="ms">event</span>
        <input v-model="dataNovo" type="date" />
        <span class="muted">{{ tempoNovo }}</span>
      </label>
    </Prompt>
    <Prompt v-if="apagar" titulo="Excluir?" :texto="`“${apagar.nome}” vai sair para todos.`" sem-campo ok="Excluir"
      @fechar="apagar = null" @ok="confirmaApagar" />
  </div>
</template>

<style scoped>
.logo { width: 32px; height: 32px; border-radius: 9px; margin-left: 4px; }
.wrap { max-width: 960px; margin: 0 auto; padding: 0 12px 110px; }
.tabs { display: flex; border-bottom: 1px solid var(--line); max-width: 960px; margin: 0 auto 10px; }
.tabs button {
  flex: 1; background: none; border: 0; padding: 14px; color: var(--muted); font-weight: 500;
  border-bottom: 3px solid transparent;
}
.tabs button.on { color: var(--primary); border-bottom-color: var(--primary); }
.busca {
  display: flex; align-items: center; gap: 8px; background: var(--card); border-radius: 16px;
  padding: 0 14px; margin-bottom: 10px;
}
.busca input { flex: 1; background: transparent; border: 0; padding: 14px 4px; }
.busca .ms { color: var(--muted); }
.trecho { color: var(--primary); font-style: italic; }
.tags { display: flex; gap: 4px; margin-top: 4px; }
.rep-ic { color: var(--muted); margin: 0 4px; }
.menu-wrap { position: relative; }
.menu {
  position: absolute; right: 0; top: 44px; z-index: 20; background: var(--card-hi);
  border-radius: 16px; padding: 6px 0; min-width: 190px; box-shadow: 0 8px 24px rgba(0,0,0,.35);
}
.menu button { display: block; width: 100%; text-align: left; background: none; border: 0; padding: 12px 18px; font-size: 15px; }
.menu button:hover { background: var(--chip); }
.fab {
  position: fixed; right: 24px; bottom: 24px; display: flex; align-items: center; gap: 10px;
  border: 0; border-radius: 18px; padding: 16px 22px; font-weight: 700; font-size: 16px; color: #fff;
  background: linear-gradient(135deg, var(--primary), var(--tertiary));
  box-shadow: 0 6px 18px rgba(0,0,0,.3);
}
:root[data-theme='dark'] .fab { color: #1b1b21; }
.drive {
  max-width: 960px; margin: 0 auto 8px; padding: 0 12px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.drive .ms { font-size: 18px; vertical-align: -3px; }
.sujo { color: #ffb74d; font-size: 13px; }
.entrar { margin-top: 24px; }
.acoes-entrar { display: flex; gap: 8px; flex-wrap: wrap; }
.data { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
.data .ms { color: var(--primary); }
</style>
