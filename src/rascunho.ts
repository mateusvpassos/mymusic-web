// Música nova em edição: só entra na lista quando salvar (não fica uma
// "Nova música" vazia p/ trás se desistir).
import { ref } from 'vue';
import type { Song } from './types';

export const rascunho = ref<Song | null>(null);
