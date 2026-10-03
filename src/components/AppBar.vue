<script setup lang="ts">
import { voltar } from '../nav';
defineProps<{ titulo: string; sub?: string; semVoltar?: boolean }>();
</script>

<template>
  <header class="bar no-print">
    <button v-if="!semVoltar" class="icon-btn" title="Voltar" @click="voltar"><span class="ms">arrow_back</span></button>
    <slot name="logo" />
    <div class="t">
      <div class="titulo">{{ titulo }}</div>
      <div v-if="sub || $slots.sub" class="sub"><slot name="sub">{{ sub }}</slot></div>
    </div>
    <div class="acoes"><slot /></div>
  </header>
</template>

<style scoped>
.bar {
  position: sticky; top: 0; z-index: 10; background: var(--bg);
  display: flex; align-items: center; gap: 8px; padding: 10px 8px 10px 12px; min-height: 64px;
}
.t { flex: 1; min-width: 0; }
.titulo { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sub { font-size: 12px; color: var(--primary); font-weight: 500; }
.acoes { display: flex; align-items: center; gap: 2px; }
</style>
