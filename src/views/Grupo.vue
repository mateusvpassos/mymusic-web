<script setup lang="ts">
// Grupo compartilhado: entrar, convidar, quem edita o quê, trazer do Drive.
import { ref, computed } from 'vue';
import AppBar from '../components/AppBar.vue';
import Prompt from '../components/Prompt.vue';
import {
  cloud, ativa, eu, souDonoDoGrupo, nomeDe, entrar, sair, criarGrupo, escolherGrupo,
  convidar, remover, setConfianca, enviar, naoEstaoNoGrupo, disponivel, entrarTeste,
} from '../cloud';
import { emulador } from '../firebase';
import { acervo, obras, naoPublicadas, publicar } from '../acervo';
import * as store from '../store';
import { state } from '../store';

const convite = ref('');
const emailTeste = ref('');
const nomeTeste = ref('');
const criando = ref(false);
const outros = computed(() => (cloud.grupo?.membros ?? []).filter((m) => m !== eu.value));
const meus = computed(() => cloud.confianca[eu.value] ?? []);
function alternaConfianca(m: string) {
  setConfianca(meus.value.includes(m) ? meus.value.filter((x) => x !== m) : [...meus.value, m]);
}

// migração: o que está no Drive (modo antigo) e ainda não está no grupo
const falta = computed(() => (state.signedIn && ativa.value && cloud.carregou
  ? naoEstaoNoGrupo(state.data.songs, state.data.setlists) : null));
const enviados = ref<{ songs: number; sets: number } | null>(null);
const publicadas = ref(0);
function publicarTodas() {
  const l = [...naoPublicadas.value];
  l.forEach((s) => publicar(s));
  publicadas.value = l.length;
}
function trazerDoDrive() {
  enviados.value = enviar(state.data.songs, state.data.setlists);
}
</script>

<template>
  <div>
    <AppBar titulo="Grupo compartilhado" />
    <div class="wrap">
      <div v-if="!disponivel" class="card">
        <h3 class="section-title"><span class="ms">cloud_off</span>Nuvem ainda não configurada</h3>
        <p>Falta criar o projeto no console do Firebase. Enquanto isso o editor usa o Google Drive.</p>
      </div>

      <div v-else-if="!cloud.user" class="card">
        <h3 class="section-title"><span class="ms">login</span>Entrar</h3>
        <p>
          Com a conta Google, as músicas ficam num grupo compartilhado: cada um vê tudo, quem criou é o
          dono e os outros mandam sugestões.
        </p>
        <form v-if="emulador" class="teste" @submit.prevent="entrarTeste(emailTeste, nomeTeste)">
          <input v-model="emailTeste" placeholder="E-mail (teste)" />
          <input v-model="nomeTeste" placeholder="Nome (teste)" />
          <button class="btn">Entrar (emulador)</button>
        </form>
        <button v-else class="btn" @click="entrar"><span class="ms">account_circle</span>Entrar com Google</button>
      </div>

      <template v-else>
        <div class="card">
          <h3 class="section-title"><span class="ms">account_circle</span>{{ cloud.user.nome }}
            <span class="push"></span><button class="btn text" @click="sair">Sair</button></h3>
          <div>{{ cloud.user.email }}</div>
        </div>

        <div v-if="!cloud.grupo" class="card">
          <h3 class="section-title"><span class="ms">groups</span>Nenhum grupo ainda</h3>
          <ul v-if="cloud.grupos.length" class="list">
            <li v-for="g in cloud.grupos" :key="g.id" class="row" @click="escolherGrupo(g)">
              <span class="ms">group</span>
              <div class="grow"><div class="title small">{{ g.nome }}</div><div class="sub">{{ g.membros.length }} pessoa(s)</div></div>
            </li>
          </ul>
          <p v-else>
            Para entrar no grupo de alguém, peça para te convidar com o e-mail <b>{{ cloud.user.email }}</b>.
            Ou crie o seu grupo (banda, coral, ministério...):
          </p>
          <button class="btn" @click="criando = true"><span class="ms">add</span>Criar grupo</button>
        </div>

        <template v-else>
          <div class="card">
            <h3 class="section-title"><span class="ms">groups</span>{{ cloud.grupo.nome }}
              <span class="push"></span>
              <select v-if="cloud.grupos.length > 1" :value="cloud.grupo.id"
                @change="escolherGrupo(cloud.grupos.find((g) => g.id === ($event.target as HTMLSelectElement).value)!)">
                <option v-for="g in cloud.grupos" :key="g.id" :value="g.id">{{ g.nome }}</option>
              </select>
            </h3>
            <div>{{ souDonoDoGrupo ? 'Você é o responsável pelo grupo.' : `Responsável: ${nomeDe(cloud.grupo.dono)}` }}</div>
            <div class="muted">{{ cloud.carregou ? 'Sincronizado — as mudanças chegam na hora.' : 'Carregando…' }}</div>
          </div>

          <div class="card">
            <h3 class="section-title"><span class="ms">group</span>Pessoas ({{ cloud.grupo.membros.length }})</h3>
            <ul class="pessoas">
              <li v-for="m in cloud.grupo.membros" :key="m">
                <span class="av">{{ (nomeDe(m)[0] ?? '?').toUpperCase() }}</span>
                <div class="grow"><div>{{ nomeDe(m) }}</div>
                  <div class="faint small">{{ m }}{{ m === cloud.grupo.dono ? ' · responsável' : '' }}</div></div>
                <button v-if="souDonoDoGrupo && m !== cloud.grupo.dono" class="icon-btn" title="Tirar do grupo"
                  @click="remover(m)"><span class="ms">person_remove</span></button>
              </li>
            </ul>
            <form v-if="souDonoDoGrupo" class="convite" @submit.prevent="convidar(convite); convite = ''">
              <input v-model="convite" type="email" placeholder="E-mail Google de quem convidar" />
              <button class="btn">Convidar</button>
            </form>
            <p v-if="souDonoDoGrupo" class="faint small">A pessoa entra com esse e-mail e já cai no grupo.</p>
          </div>

          <div class="card">
            <h3 class="section-title"><span class="ms">verified_user</span>Quem edita o que é seu sem pedir</h3>
            <p>
              Marcados podem mudar TODAS as suas músicas e repertórios direto. Os outros mandam sugestão e você
              aceita ou não. Dá p/ liberar também música por música (tela da música ›
              <span class="ms" style="font-size: 18px; vertical-align: -4px">manage_accounts</span>).
            </p>
            <div class="chips">
              <button v-for="m in outros" :key="m" class="chip" :class="{ on: meus.includes(m) }" @click="alternaConfianca(m)">
                <span v-if="meus.includes(m)" class="ms">check</span>{{ nomeDe(m) }}
              </button>
              <span v-if="!outros.length" class="faint">Convide alguém primeiro.</span>
            </div>
          </div>

          <div v-if="acervo.carregou" class="card">
            <h3 class="section-title"><span class="ms">public</span>Acervo geral</h3>
            <p v-if="publicadas">Publicadas: {{ publicadas }} música(s).</p>
            <p v-else-if="!naoPublicadas.length">
              Todas as suas músicas estão no acervo. {{ Object.keys(obras).length }} músicas no acervo ao todo.
            </p>
            <template v-else>
              <p>
                {{ naoPublicadas.length }} música(s) suas ainda não estão no acervo geral. Publicando, todo mundo do
                app pode ver e puxar (você continua dono; os outros sugerem). O grupo segue com as cópias dele.
              </p>
              <button class="btn" @click="publicarTodas"><span class="ms">publish</span>Publicar {{ naoPublicadas.length }} no acervo</button>
            </template>
          </div>

          <div class="card">
            <h3 class="section-title"><span class="ms">cloud_upload</span>Trazer do Google Drive</h3>
            <template v-if="!state.signedIn">
              <p>Manda para o grupo as músicas e repertórios que estão no Drive (o que o app usava até agora).
                Quem manda vira o dono.</p>
              <button class="btn tonal" @click="store.signIn()"><span class="ms">add_to_drive</span>Abrir o Drive</button>
            </template>
            <template v-else-if="falta">
              <p v-if="enviados">Enviado: {{ enviados.songs }} música(s) e {{ enviados.sets }} repertório(s).</p>
              <p v-else-if="!falta.songs && !falta.sets">Tudo do Drive já está no grupo.</p>
              <template v-else>
                <p>{{ falta.songs }} música(s) e {{ falta.sets }} repertório(s) do Drive ainda não estão no grupo.</p>
                <button class="btn" @click="trazerDoDrive"><span class="ms">upload</span>Enviar para o grupo</button>
              </template>
            </template>
          </div>
        </template>
      </template>
      <p v-if="cloud.erro" class="error">{{ cloud.erro }}</p>
    </div>
    <Prompt v-if="criando" titulo="Novo grupo" dica="Nome do grupo (ex.: banda, coral, ministério)" ok="Criar"
      @fechar="criando = false" @ok="(n) => { criando = false; if (n) criarGrupo(n); }" />
  </div>
</template>

<style scoped>
.wrap { max-width: 860px; margin: 0 auto; padding: 0 16px 40px; display: flex; flex-direction: column; gap: 12px; }
.card p { margin: 6px 0 12px; }
.push { flex: 1; }
.small { font-size: 12px; }
.title.small { font-size: 16px; }
.pessoas { list-style: none; margin: 0; padding: 0; }
.pessoas li { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
.av {
  width: 34px; height: 34px; border-radius: 50%; background: var(--primary-container); color: #fff;
  display: grid; place-items: center; font-weight: 600;
}
.grow { flex: 1; min-width: 0; }
.convite { display: flex; gap: 8px; margin-top: 8px; }
.teste { display: flex; gap: 8px; flex-wrap: wrap; }
.convite input { flex: 1; }
</style>
