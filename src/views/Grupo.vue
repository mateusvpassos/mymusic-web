<script setup lang="ts">
// Conta e compartilhamento: quem você é, de quem é a biblioteca em uso,
// quem tem acesso a ela e quem pode editar direto.
import { ref, computed } from 'vue';
import AppBar from '../components/AppBar.vue';
import Prompt from '../components/Prompt.vue';
import {
  cloud, eu, souDonoDoGrupo, nomeDe, entrar, sair, criarGrupo, escolherGrupo,
  convidar, remover, setConfianca, disponivel, entrarTeste,
} from '../cloud';
import { emulador } from '../firebase';

const convite = ref('');
const emailTeste = ref('');
const nomeTeste = ref('');
const criando = ref(false);
const tirar = ref<string | null>(null);
const outros = computed(() => (cloud.grupo?.membros ?? []).filter((m) => m !== eu.value));
const meus = computed(() => cloud.confianca[eu.value] ?? []);
function alternaConfianca(m: string) {
  setConfianca(meus.value.includes(m) ? meus.value.filter((x) => x !== m) : [...meus.value, m]);
}
function convida() {
  const e = convite.value.trim().toLowerCase();
  if (e) convidar(e);
  convite.value = '';
}
</script>

<template>
  <div>
    <AppBar titulo="Conta e compartilhamento" />
    <div class="wrap">
      <div v-if="!disponivel" class="card">
        <h3 class="section-title"><span class="ms">cloud_off</span>Nuvem ainda não configurada</h3>
        <p>Falta configurar o Firebase.</p>
      </div>

      <div v-else-if="!cloud.user" class="card">
        <h3 class="section-title"><span class="ms">login</span>Entrar</h3>
        <p>Entre com a conta Google p/ ver o acervo e as suas músicas.</p>
        <form v-if="emulador" class="linha" @submit.prevent="entrarTeste(emailTeste, nomeTeste)">
          <input v-model="emailTeste" placeholder="E-mail (teste)" />
          <input v-model="nomeTeste" placeholder="Nome (teste)" />
          <button class="btn">Entrar (emulador)</button>
        </form>
        <button v-else class="btn" @click="entrar"><span class="ms">account_circle</span>Entrar com Google</button>
      </div>

      <template v-else>
        <!-- conta -->
        <div class="card conta">
          <span class="av grande">{{ (cloud.user.nome[0] ?? '?').toUpperCase() }}</span>
          <div class="grow">
            <div class="nome">{{ cloud.user.nome }}</div>
            <div class="faint">{{ cloud.user.email }}</div>
          </div>
          <button class="btn text" @click="sair">Sair</button>
        </div>

        <p v-if="!cloud.grupo" class="muted">Preparando a sua biblioteca…</p>

        <template v-else>
          <!-- biblioteca em uso -->
          <div class="card">
            <h3 class="section-title"><span class="ms">library_music</span>
              {{ souDonoDoGrupo ? 'Sua biblioteca' : `Biblioteca de ${nomeDe(cloud.grupo.dono)}` }}</h3>
            <p v-if="souDonoDoGrupo">
              As suas músicas e os seus repertórios ficam salvos aqui, na nuvem. Quem você convidar vê tudo,
              toca junto e pode <b>sugerir mudanças</b> — você aceita ou não (ícone
              <span class="ms inline">inbox</span> na tela inicial).
            </p>
            <p v-else>
              {{ nomeDe(cloud.grupo.dono) }} te convidou. Você vê e toca tudo; o que for dos outros você muda
              mandando sugestão, a não ser que te liberem p/ editar direto.
            </p>
            <div v-if="cloud.grupos.length > 1" class="trocar">
              <span class="faint">Você tem acesso a {{ cloud.grupos.length }} bibliotecas:</span>
              <div class="chips">
                <button v-for="g in cloud.grupos" :key="g.id" class="chip" :class="{ on: g.id === cloud.grupo.id }"
                  @click="escolherGrupo(g)">
                  <span v-if="g.id === cloud.grupo.id" class="ms">check</span>
                  {{ g.dono === eu ? 'Minha' : g.nome }}
                </button>
              </div>
            </div>
            <div class="faint estado">
              <span class="ms inline">{{ cloud.carregou ? 'cloud_done' : 'cloud_sync' }}</span>
              {{ cloud.carregou ? 'Tudo salvo — as mudanças chegam na hora p/ todos.' : 'Carregando…' }}
            </div>
          </div>

          <!-- pessoas -->
          <div class="card">
            <h3 class="section-title"><span class="ms">group</span>Quem tem acesso ({{ cloud.grupo.membros.length }})</h3>
            <ul class="pessoas">
              <li v-for="m in cloud.grupo.membros" :key="m">
                <span class="av">{{ (nomeDe(m)[0] ?? '?').toUpperCase() }}</span>
                <div class="grow"><div>{{ nomeDe(m) }}{{ m === eu ? ' (você)' : '' }}</div>
                  <div class="faint small">{{ m }}{{ m === cloud.grupo.dono ? ' · dono da biblioteca' : '' }}</div></div>
                <button v-if="souDonoDoGrupo && m !== cloud.grupo.dono" class="icon-btn" title="Tirar o acesso"
                  @click="tirar = m"><span class="ms">person_remove</span></button>
              </li>
            </ul>
            <template v-if="souDonoDoGrupo">
              <form class="linha" @submit.prevent="convida">
                <input v-model="convite" type="email" placeholder="E-mail Google da pessoa" class="grow" />
                <button class="btn" :disabled="!convite.trim()"><span class="ms">person_add</span>Convidar</button>
              </form>
              <p class="faint small">A pessoa instala o app, entra com esse e-mail e já vê a sua biblioteca.</p>
            </template>
          </div>

          <!-- edição direta -->
          <div v-if="souDonoDoGrupo" class="card">
            <h3 class="section-title"><span class="ms">edit_note</span>Quem pode editar direto</h3>
            <p>
              Normalmente só você muda as suas músicas; os outros mandam sugestão. Marque quem pode mudar
              <b>tudo</b> direto, sem pedir:
            </p>
            <div class="chips">
              <button v-for="m in outros" :key="m" class="chip" :class="{ on: meus.includes(m) }" @click="alternaConfianca(m)">
                <span class="ms">{{ meus.includes(m) ? 'check' : 'add' }}</span>{{ nomeDe(m) }}
              </button>
              <span v-if="!outros.length" class="faint">Convide alguém primeiro.</span>
            </div>
            <p class="faint small">Dá p/ liberar também só uma música ou um repertório
              (na tela dele › <span class="ms inline">manage_accounts</span>).</p>
          </div>

          <div class="card">
            <h3 class="section-title"><span class="ms">public</span>Acervo geral</h3>
            <p>
              É a aba <b>Músicas</b> da tela inicial: todas as músicas de quem usa o app. As suas entram lá
              sozinhas (continuam suas; os outros só sugerem). Ao tocar ou pôr no repertório uma do acervo,
              ela vem p/ as suas músicas como cópia — dá p/ mudar o tom e as anotações sem mexer na original.
            </p>
          </div>

          <button class="btn text criar" @click="criando = true">
            <span class="ms">add</span>Criar outra biblioteca separada (ex.: de um coral)</button>
        </template>
      </template>
      <p v-if="cloud.erro" class="error">{{ cloud.erro }}</p>
    </div>
    <Prompt v-if="criando" titulo="Nova biblioteca" dica="Nome (ex.: Coral da paróquia)" ok="Criar"
      @fechar="criando = false" @ok="(n) => { criando = false; if (n) criarGrupo(n); }" />
    <Prompt v-if="tirar" titulo="Tirar o acesso?" :texto="`${nomeDe(tirar)} deixa de ver a sua biblioteca.`" sem-campo
      ok="Tirar" @fechar="tirar = null" @ok="remover(tirar!); tirar = null" />
  </div>
</template>

<style scoped>
.wrap { max-width: 760px; margin: 0 auto; padding: 0 16px 40px; display: flex; flex-direction: column; gap: 12px; }
.card p { margin: 6px 0 12px; line-height: 1.45; }
.conta { display: flex; align-items: center; gap: 14px; }
.nome { font-weight: 700; font-size: 17px; }
.small { font-size: 12px; }
.inline { font-size: 18px; vertical-align: -4px; }
.estado { font-size: 13px; margin-top: 8px; }
.trocar { display: flex; flex-direction: column; gap: 6px; margin-bottom: 4px; }
.pessoas { list-style: none; margin: 0 0 8px; padding: 0; }
.pessoas li { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
.av {
  width: 34px; height: 34px; border-radius: 50%; background: var(--primary-container); color: #fff;
  display: grid; place-items: center; font-weight: 600; flex: none;
}
.av.grande { width: 46px; height: 46px; font-size: 20px; }
.grow { flex: 1; min-width: 0; }
.linha { display: flex; gap: 8px; flex-wrap: wrap; }
.criar { align-self: flex-start; }
</style>
