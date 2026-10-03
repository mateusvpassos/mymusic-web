<script setup lang="ts">
// Editor: trabalha numa CÓPIA (Cancelar desfaz tudo). Música de outra pessoa
// sem permissão: salvar vira sugestão, como no app.
import { ref, computed } from 'vue';
import AppBar from '../components/AppBar.vue';
import ChordChart from '../components/ChordChart.vue';
import Prompt from '../components/Prompt.vue';
import { voltar } from '../nav';
import * as be from '../backend';
import { sugerir, nomeDe } from '../cloud';
import { rascunho } from '../rascunho';
import { serializeSections, importText, suggestKey, detectMeta } from '../chordEngine';
import { TEMPOS, MOMENTOS } from '../liturgia';
import type { Song } from '../types';

const props = defineProps<{ id: string; nova?: boolean }>();

const origem = props.nova ? rascunho.value : be.songById(props.id);
const s = ref<Song | null>(origem ? JSON.parse(JSON.stringify(origem)) : null);
const texto = ref(origem ? serializeSections(origem.sections) : '');
const tag = ref('');
const sugestao = computed(() => !props.nova && !!origem && !be.podeEditarSong(origem));
const pedirNota = ref(false);
const enviado = ref(false);

const previa = computed<Song | null>(() => (s.value ? { ...s.value, sections: importText(texto.value) } : null));

function toggle(list: string[], v: string, ordem: readonly string[]) {
  const i = list.indexOf(v);
  if (i >= 0) list.splice(i, 1);
  else { list.push(v); list.sort((a, b) => ordem.indexOf(a) - ordem.indexOf(b)); }
}

function addTag() {
  const t = tag.value.trim().toLowerCase();
  if (t && s.value && !s.value.tags.includes(t)) s.value.tags.push(t);
  tag.value = '';
}

function montar(): Song {
  const x = s.value!;
  x.sections = importText(texto.value);
  // "Tom: G", "Capo 2", {title: ...} no texto colado preenchem os campos
  const meta = detectMeta(texto.value);
  if (meta.title && (!x.title.trim() || x.title === 'Nova música')) x.title = meta.title;
  if (meta.artist && !x.artist.trim()) x.artist = meta.artist;
  if (meta.capo !== undefined) x.capo = meta.capo;
  if (meta.key) x.key = meta.key;
  else if (!x.key.trim() || x.key.trim() === 'C') {
    const k = suggestKey(x.sections);
    if (k) x.key = k;
  }
  x.title = x.title.trim() || 'Sem título';
  return x;
}

function salvar() {
  if (sugestao.value) { pedirNota.value = true; return; }
  be.salvarSong(montar());
  if (props.nova) rascunho.value = null;
  voltar();
}

function enviar(nota: string) {
  pedirNota.value = false;
  sugerir(montar(), nota);
  enviado.value = true;
  setTimeout(voltar, 1200);
}
</script>

<template>
  <div v-if="!s" class="empty">Música não encontrada</div>
  <div v-else>
    <AppBar :titulo="sugestao ? 'Sugerir mudança' : props.nova ? 'Nova música' : 'Editar'">
      <button class="btn text" @click="voltar">Cancelar</button>
      <button class="btn" @click="salvar">
        <span class="ms">{{ sugestao ? 'outgoing_mail' : 'check' }}</span>{{ sugestao ? 'Enviar sugestão' : 'Salvar' }}
      </button>
    </AppBar>
    <div class="wrap">
      <div v-if="sugestao" class="banner">
        Esta música é de {{ nomeDe(origem!.dono) }}. O que você mudar vai como sugestão —
        {{ nomeDe(origem!.dono) }} aceita ou não.
      </div>
      <div v-if="enviado" class="banner ok">Sugestão enviada — {{ nomeDe(origem!.dono) }} decide se aceita.</div>

      <input v-model="s.title" class="titulo" placeholder="Título" />
      <div class="linha">
        <input v-model="s.artist" placeholder="Artista" class="grow" />
        <label class="mini">Tom<input v-model="s.key" /></label>
        <label class="mini">Capo<input v-model.number="s.capo" type="number" min="0" /></label>
        <label class="mini">BPM<input v-model.number="s.bpm" type="number" min="0" /></label>
      </div>
      <div class="chips tags">
        <button v-for="t in s.tags" :key="t" class="chip" @click="s.tags = s.tags.filter((x) => x !== t)">
          {{ t }}<span class="ms">close</span>
        </button>
        <input v-model="tag" placeholder="+ tag" class="tag-in" @keyup.enter="addTag" @blur="addTag" />
      </div>
      <input v-model="s.notes" placeholder="Anotações (ex.: entra suave, repete 2x)" class="full" />

      <details class="lit" :open="!!(s.tempos.length || s.momentos.length)">
        <summary>
          <span class="ms">church</span>
          {{ [...s.tempos, ...s.momentos].join(' · ') || 'Tempo litúrgico e momento da Missa' }}
        </summary>
        <div class="faint lbl">Tempo litúrgico (nenhum = qualquer tempo)</div>
        <div class="chips">
          <button v-for="t in TEMPOS" :key="t" class="chip" :class="{ on: s.tempos.includes(t) }"
            @click="toggle(s.tempos, t, TEMPOS)">
            <span v-if="s.tempos.includes(t)" class="ms">check</span>{{ t }}
          </button>
        </div>
        <div class="faint lbl">Momento da Missa</div>
        <div class="chips">
          <button v-for="m in MOMENTOS" :key="m" class="chip" :class="{ on: s.momentos.includes(m) }"
            @click="toggle(s.momentos, m, MOMENTOS)">
            <span v-if="s.momentos.includes(m)" class="ms">check</span>{{ m }}
          </button>
        </div>
      </details>

      <p class="faint dica">
        Cifra: acordes acima da letra (cole do Cifra Club) ou <code>[G]</code> antes da sílaba;
        <code>#Refrão</code> = seção.
      </p>
      <div class="split">
        <textarea v-model="texto" spellcheck="false" placeholder="Cole a cifra aqui…"></textarea>
        <div class="previa card">
          <div class="faint lbl">Prévia</div>
          <ChordChart v-if="previa && previa.sections.length" :song="previa" :fonte="0.8" />
          <div v-else class="faint">A prévia aparece aqui…</div>
        </div>
      </div>
    </div>
    <Prompt v-if="pedirNota" titulo="Enviar sugestão" dica="Recado p/ o dono (opcional) — ex.: acorde errado no refrão"
      ok="Enviar" @fechar="pedirNota = false" @ok="enviar" />
  </div>
</template>

<style scoped>
.wrap { max-width: 1200px; margin: 0 auto; padding: 0 16px 40px; display: flex; flex-direction: column; gap: 10px; }
.titulo { font-size: 20px; font-weight: 700; }
.linha { display: flex; gap: 8px; flex-wrap: wrap; }
.grow { flex: 1; min-width: 200px; }
.mini { display: flex; flex-direction: column; font-size: 12px; color: var(--muted); gap: 2px; }
.mini input { width: 84px; text-align: center; padding: 8px; }
.tags { align-items: center; }
.tag-in { width: 110px; padding: 7px 12px; }
.full { width: 100%; }
.lit summary { cursor: pointer; display: flex; align-items: center; gap: 8px; padding: 6px 0; }
.lit summary .ms { color: var(--primary); font-size: 20px; }
.lbl { font-size: 12px; margin: 8px 0 4px; }
.dica { margin: 4px 0 0; font-size: 13px; }
.split { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; min-height: 60vh; }
textarea { font-family: var(--mono); font-size: 14px; line-height: 1.45; min-height: 60vh; }
.previa { overflow: auto; max-height: 75vh; }
.banner.ok { background: color-mix(in srgb, var(--ok) 25%, transparent); color: var(--fg); }
@media (max-width: 760px) { .split { grid-template-columns: 1fr; } }
</style>
