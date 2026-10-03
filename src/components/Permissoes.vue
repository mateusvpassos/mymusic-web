<script setup lang="ts">
// Dono e quem mais pode editar (música ou repertório). Só o dono muda.
import { ref, computed } from 'vue';
import { cloud, nomeDe, souDono } from '../cloud';

const props = defineProps<{ titulo: string; dono: string; editores: string[] }>();
const emit = defineEmits<{ fechar: []; salvar: [emails: string[]] }>();
const ed = ref([...props.editores]);
const meu = computed(() => souDono(props.dono));
const outros = computed(() => (cloud.grupo?.membros ?? []).filter((m) => m !== props.dono));
const confiados = computed(() => cloud.confianca[props.dono] ?? []);

function alterna(m: string) {
  if (!meu.value || confiados.value.includes(m)) return;
  ed.value = ed.value.includes(m) ? ed.value.filter((x) => x !== m) : [...ed.value, m];
}
</script>

<template>
  <div class="scrim" @click.self="emit('fechar')">
    <div class="sheet">
      <h3 class="section-title">{{ titulo }}</h3>
      <p>Dono: <b>{{ nomeDe(dono) }}</b></p>
      <p class="muted">
        {{ meu ? 'Quem mais pode editar direto (os outros mandam sugestão):' : 'Podem editar direto:' }}
      </p>
      <div class="chips">
        <button v-for="m in outros" :key="m" class="chip"
          :class="{ on: ed.includes(m) || confiados.includes(m) }"
          :disabled="!meu || confiados.includes(m)"
          :title="confiados.includes(m) ? `Liberado para tudo de ${nomeDe(dono)}` : ''"
          @click="alterna(m)">
          <span v-if="ed.includes(m) || confiados.includes(m)" class="ms">check</span>{{ nomeDe(m) }}
        </button>
        <span v-if="!outros.length" class="faint">Convide pessoas no grupo primeiro.</span>
      </div>
      <div class="actions">
        <button class="btn text" @click="emit('fechar')">Fechar</button>
        <button v-if="meu" class="btn" @click="emit('salvar', ed); emit('fechar')">Salvar</button>
      </div>
    </div>
  </div>
</template>
