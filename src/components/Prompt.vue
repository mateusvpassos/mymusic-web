<script setup lang="ts">
// Diálogo simples com um campo (nome, motivo, recado...).
import { ref } from 'vue';

const props = defineProps<{ titulo: string; texto?: string; valor?: string; dica?: string; ok?: string; semCampo?: boolean }>();
const emit = defineEmits<{ fechar: []; ok: [valor: string] }>();
const v = ref(props.valor ?? '');
</script>

<template>
  <div class="scrim center" @click.self="emit('fechar')">
    <form class="dialog" @submit.prevent="emit('ok', v.trim())">
      <h3>{{ titulo }}</h3>
      <p v-if="texto" class="muted">{{ texto }}</p>
      <input v-if="!semCampo" v-model="v" :placeholder="dica" autofocus style="width: 100%" />
      <slot />
      <div class="actions">
        <button type="button" class="btn text" @click="emit('fechar')">Cancelar</button>
        <button type="submit" class="btn">{{ ok ?? 'OK' }}</button>
      </div>
    </form>
  </div>
</template>
