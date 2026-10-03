<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import AppBar from '../components/AppBar.vue';
import ChordChart from '../components/ChordChart.vue';
import Permissoes from '../components/Permissoes.vue';
import { abrir, trocar, prefs } from '../nav';
import * as be from '../backend';
import { ativa, setEditoresSong, nomeDe, eu } from '../cloud';
import { transposeSong } from '../core';
import { isChordSymbol } from '../chordEngine';

const props = defineProps<{ id: string; setlistId?: string }>();

const song = computed(() => be.songById(props.id));
const sl = computed(() => (props.setlistId ? be.setlistById(props.setlistId) : undefined));
const lista = computed(() => sl.value?.songIds.filter((x) => be.songById(x)) ?? []);
const idx = computed(() => lista.value.indexOf(props.id));

// tom: o salvo no repertório (se veio de um) + o que mexer aqui
const tom = ref(0);
watch(() => [props.id, props.setlistId], () => { tom.value = sl.value?.transpose[props.id] ?? 0; }, { immediate: true });
const comCapo = ref(true);
const mostrada = computed(() => {
  const s = song.value;
  if (!s) return null;
  return transposeSong(s, tom.value - (comCapo.value ? s.capo : 0));
});
const acordes = computed(() => {
  const vistos = new Set<string>();
  for (const sec of mostrada.value?.sections ?? [])
    for (const l of sec.lines) for (const c of l.chords) if (isChordSymbol(c.sym)) vistos.add(c.sym);
  return [...vistos];
});

function setTom(v: number) {
  tom.value = v;
  // repertório que posso editar guarda o tom; o dos outros fica só aqui
  const r = sl.value;
  if (r && be.podeEditarSetlist(r)) {
    const t = { ...r.transpose };
    if (v === 0) delete t[props.id]; else t[props.id] = v;
    be.salvarSetlist({ ...r, transpose: t });
  }
}

function ir(i: number) {
  const id = lista.value[i];
  if (id) trocar({ nome: 'musica', id, setlistId: props.setlistId });
  rolando.value = false;
  window.scrollTo(0, 0);
}

// ---- auto-rolagem (velocidade gravada na música, como no app) ----
const rolando = ref(false);
const PADRAO = 28;
const velocidade = computed(() => (song.value?.scrollSpeed || PADRAO));
let raf = 0, ultimo = 0, sobra = 0;
function passo(t: number) {
  if (!rolando.value) return;
  const dt = ultimo ? (t - ultimo) / 1000 : 0;
  ultimo = t;
  sobra += velocidade.value * dt;
  if (sobra >= 1) {
    const px = Math.floor(sobra);
    sobra -= px;
    window.scrollBy(0, px);
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 2) { rolando.value = false; return; }
  }
  raf = requestAnimationFrame(passo);
}
watch(rolando, (v) => { cancelAnimationFrame(raf); ultimo = 0; sobra = 0; if (v) raf = requestAnimationFrame(passo); });
onBeforeUnmount(() => cancelAnimationFrame(raf));
function setVel(delta: number) {
  const s = song.value;
  if (!s || !be.podeEditarSong(s)) return;
  be.salvarSong({ ...s, scrollSpeed: Math.min(200, Math.max(4, velocidade.value + delta)) });
}

const perm = ref(false);
const sub = computed(() => {
  const s = song.value, m = mostrada.value;
  if (!s || !m) return '';
  return [
    sl.value?.moments[props.id] ?? '',
    m.key,
    s.capo ? `capo ${s.capo}${comCapo.value ? '' : ' (off)'}` : '',
    tom.value ? `${tom.value > 0 ? '+' : ''}${tom.value}` : '',
    s.bpm ? `${s.bpm} BPM` : '',
    lista.value.length > 1 ? `${idx.value + 1}/${lista.value.length}` : '',
    ativa.value && s.dono && s.dono !== eu.value ? `de ${nomeDe(s.dono)}` : '',
  ].filter(Boolean).join('  •  ');
});
</script>

<template>
  <div v-if="!song || !mostrada" class="empty">Música não encontrada</div>
  <div v-else class="tela">
    <AppBar :titulo="song.title" :sub="sub">
      <button class="icon-btn" title="Imprimir / PDF"
        @click="abrir({ nome: 'imprimir', songId: song.id, setlistId: props.setlistId })">
        <span class="ms">print</span>
      </button>
      <template v-if="ativa">
        <button class="icon-btn" title="Histórico e versões" @click="abrir({ nome: 'versoes', id: song.id })">
          <span class="ms">history</span>
        </button>
        <button class="icon-btn" title="Dono e quem pode editar" @click="perm = true">
          <span class="ms">manage_accounts</span>
        </button>
      </template>
      <button class="icon-btn" :title="be.podeEditarSong(song) ? 'Editar' : 'Sugerir mudança'"
        @click="abrir({ nome: 'editar', id: song.id })">
        <span class="ms">{{ be.podeEditarSong(song) ? 'edit' : 'rate_review' }}</span>
      </button>
    </AppBar>

    <div v-if="!prefs.soLetra && acordes.length" class="acordes no-print">
      <span v-for="c in acordes" :key="c" class="chip ac">{{ c }}</span>
    </div>
    <div v-if="song.notes" class="nota"><span class="ms">sticky_note_2</span><i>{{ song.notes }}</i></div>

    <main class="cifra">
      <ChordChart :song="mostrada" :fonte="prefs.fonte" :letra="prefs.soLetra" />
    </main>

    <footer class="barra no-print">
      <button class="icon-btn" title="Música anterior" :disabled="idx <= 0" v-if="lista.length > 1" @click="ir(idx - 1)">
        <span class="ms">skip_previous</span>
      </button>
      <button class="icon-btn" title="Tom -" @click="setTom(tom - 1)"><span class="ms">remove</span></button>
      <span class="lbl">Tom</span>
      <button class="icon-btn" title="Tom +" @click="setTom(tom + 1)"><span class="ms">add</span></button>
      <button class="icon-btn" title="Fonte -" @click="prefs.fonte = Math.max(0.7, +(prefs.fonte - 0.1).toFixed(1))">
        <span class="ms">text_decrease</span>
      </button>
      <button class="icon-btn" title="Fonte +" @click="prefs.fonte = Math.min(2.8, +(prefs.fonte + 0.1).toFixed(1))">
        <span class="ms">text_increase</span>
      </button>
      <button v-if="song.capo" class="icon-btn" :class="{ on: comCapo }" title="Acordes com capo"
        @click="comCapo = !comCapo"><span class="ms">album</span></button>
      <button class="icon-btn" :class="{ on: prefs.soLetra }"
        :title="prefs.soLetra ? 'Mostrar acordes' : 'Só letra (p/ quem canta)'"
        @click="prefs.soLetra = !prefs.soLetra"><span class="ms">lyrics</span></button>
      <button class="icon-btn play" :class="{ on: rolando }" title="Auto-rolagem" @click="rolando = !rolando">
        <span class="ms fill">{{ rolando ? 'pause' : 'play_arrow' }}</span>
      </button>
      <template v-if="rolando">
        <button class="icon-btn" title="Mais devagar" @click="setVel(-4)"><span class="ms">fast_rewind</span></button>
        <span class="lbl" :title="song.scrollSpeed ? 'Velocidade desta música' : 'Velocidade padrão'">
          {{ Math.round(velocidade) }}{{ song.scrollSpeed ? '' : '*' }}
        </span>
        <button class="icon-btn" title="Mais rápido" @click="setVel(4)"><span class="ms">fast_forward</span></button>
      </template>
      <button class="icon-btn" title="Próxima música" v-if="lista.length > 1" :disabled="idx >= lista.length - 1"
        @click="ir(idx + 1)"><span class="ms">skip_next</span></button>
    </footer>

    <div v-if="rolando" class="faixa no-print"></div>

    <Permissoes v-if="perm" :titulo="song.title" :dono="song.dono" :editores="song.editores"
      @fechar="perm = false" @salvar="(l) => setEditoresSong(song!, l)" />
  </div>
</template>

<style scoped>
.tela { padding-bottom: 60vh; }
.acordes {
  display: flex; gap: 6px; overflow-x: auto; padding: 8px 12px; background: var(--surface-1);
  border-bottom: 1px solid var(--line);
}
.ac { color: var(--chord); font-weight: 700; }
.nota { display: flex; align-items: center; gap: 8px; padding: 6px 16px; background: var(--chip); font-size: 14px; }
.nota .ms { font-size: 18px; }
.cifra { padding: 8px 16px; max-width: 1100px; }
.barra {
  position: fixed; left: 0; right: 0; bottom: 0; display: flex; align-items: center; gap: 2px;
  padding: 6px 8px; background: var(--surface-1); border-top: 1px solid var(--line); overflow-x: auto;
}
.lbl { font-weight: 600; font-size: 13px; padding: 0 2px; }
.play { background: var(--chip); }
.faixa {
  position: fixed; left: 0; right: 0; top: 30vh; height: 3em; pointer-events: none;
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  border-top: 1px solid color-mix(in srgb, var(--primary) 35%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--primary) 35%, transparent);
}
</style>
