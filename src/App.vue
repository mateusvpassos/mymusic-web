<script setup lang="ts">
// Telas empilhadas como no app (src/nav.ts).
import { computed } from 'vue';
import { nav } from './nav';
import Inicio from './views/Inicio.vue';
import Musica from './views/Musica.vue';
import Editar from './views/Editar.vue';
import Repertorio from './views/Repertorio.vue';
import Sugestoes from './views/Sugestoes.vue';
import Sugestao from './views/Sugestao.vue';
import Versoes from './views/Versoes.vue';
import Grupo from './views/Grupo.vue';
import Atividade from './views/Atividade.vue';
import Imprimir from './views/Imprimir.vue';
import Acervo from './views/Acervo.vue';
import Obra from './views/Obra.vue';

const t = computed(() => nav.pilha[nav.pilha.length - 1]);
// chave: trocar de música/repertório recria a tela (estado limpo)
const chave = computed(() => JSON.stringify(t.value));
</script>

<template>
  <Inicio v-if="t.nome === 'inicio'" />
  <Musica v-else-if="t.nome === 'musica'" :key="chave" :id="t.id" :setlist-id="t.setlistId" />
  <Editar v-else-if="t.nome === 'editar'" :key="chave" :id="t.id" :nova="t.nova" :acervo="t.acervo" />
  <Acervo v-else-if="t.nome === 'acervo'" />
  <Obra v-else-if="t.nome === 'obra'" :key="chave" :obra="t.obra" :versao-id="t.versaoId" />
  <Repertorio v-else-if="t.nome === 'repertorio'" :key="chave" :id="t.id" />
  <Sugestoes v-else-if="t.nome === 'sugestoes'" />
  <Sugestao v-else-if="t.nome === 'sugestao'" :key="chave" :id="t.id" />
  <Versoes v-else-if="t.nome === 'versoes'" :key="chave" :id="t.id" :acervo="t.acervo" />
  <Grupo v-else-if="t.nome === 'grupo'" />
  <Atividade v-else-if="t.nome === 'atividade'" />
  <Imprimir v-else-if="t.nome === 'imprimir'" :key="chave" :setlist-id="t.setlistId" :song-id="t.songId" />
</template>
