<script setup lang="ts">
// Acervo geral: todas as músicas (obras) de quem usa o app, com as versões.
import { ref, computed } from 'vue';
import AppBar from '../components/AppBar.vue';
import { abrir } from '../nav';
import { acervo, obras, nomeDe, ligado } from '../acervo';
import * as be from '../backend';
import { searchSongs, fold } from '../core';

const busca = ref('');
const hits = computed(() => {
  const principais = Object.values(obras.value).map((l) => l[0]);
  const l = searchSongs(principais, busca.value);
  if (!busca.value.trim()) l.sort((a, b) => fold(a.song.title).localeCompare(fold(b.song.title)));
  return l;
});
const obraDaPrincipal = computed(() =>
  Object.fromEntries(Object.entries(obras.value).map(([k, l]) => [l[0].id, k])));
const naBiblioteca = computed(() => new Set(be.songs.value.map((s) => s.baseId)));
</script>

<template>
  <div>
    <AppBar titulo="Acervo geral" sub="Todas as músicas de quem usa o app" />
    <div class="wrap">
      <p v-if="!ligado" class="empty">Entre com o Google (☁ na tela inicial) para ver o acervo.</p>
      <template v-else>
        <div class="busca">
          <span class="ms">search</span>
          <input v-model="busca" placeholder="Buscar no acervo (nome, artista ou trecho da letra)..." />
        </div>
        <p v-if="acervo.erro" class="error">{{ acervo.erro }}</p>
        <p v-if="!acervo.carregou" class="faint">Carregando…</p>
        <ul class="list">
          <li v-for="h in hits" :key="h.song.id" class="row"
            @click="abrir({ nome: 'obra', obra: obraDaPrincipal[h.song.id] })">
            <div class="key-badge">{{ h.song.key }}</div>
            <div class="grow">
              <div class="title">{{ h.song.title }}</div>
              <div class="sub">
                {{ [h.song.artist, `de ${nomeDe(h.song.dono)}`,
                    obras[obraDaPrincipal[h.song.id]].length === 1 ? '1 versão' : `${obras[obraDaPrincipal[h.song.id]].length} versões`,
                    h.snippet ? `“${h.snippet}”` : ''].filter(Boolean).join('  •  ') }}
              </div>
            </div>
            <span v-if="obras[obraDaPrincipal[h.song.id]].some((v) => naBiblioteca.has(v.id))"
              class="ms fill tem" title="Já está na sua biblioteca">library_add_check</span>
            <span v-else class="ms faint">chevron_right</span>
          </li>
          <li v-if="acervo.carregou && !hits.length" class="empty">Nada encontrado</li>
        </ul>
      </template>
    </div>
  </div>
</template>

<style scoped>
.wrap { max-width: 960px; margin: 0 auto; padding: 0 12px 40px; }
.busca { display: flex; align-items: center; gap: 8px; background: var(--card); border-radius: 16px; padding: 0 14px; margin-bottom: 10px; }
.busca input { flex: 1; background: transparent; border: 0; padding: 14px 4px; }
.busca .ms { color: var(--muted); }
.tem { color: var(--primary); margin-right: 8px; }
</style>
