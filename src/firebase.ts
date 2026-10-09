// Liga o Firebase: projeto de verdade (firebaseConfig abaixo) ou, nos
// testes, o emulador local (VITE_MYMUSIC_EMU=127.0.0.1 npm run dev).
import { initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import {
  initializeFirestore, connectFirestoreEmulator, persistentLocalCache,
  persistentMultipleTabManager, disableNetwork, enableNetwork, type Firestore,
} from 'firebase/firestore';

/**
 * Console do Firebase → Configurações do projeto → Seus apps → Web.
 * Não é segredo: o acesso é controlado por firebase/firestore.rules (repo do app).
 * null = nuvem ainda não configurada (o editor usa o Drive como antes).
 */
const firebaseConfig: FirebaseOptions | null = {
  apiKey: 'AIzaSyDJrINzDLOL52Mz5au7H0zay0pdmMrPUsg',
  authDomain: 'cifras-779b6.firebaseapp.com',
  projectId: 'cifras-779b6',
  storageBucket: 'cifras-779b6.firebasestorage.app',
  messagingSenderId: '167404504785',
  appId: '1:167404504785:web:a1c18245a702ea718467f0',
};

const EMU = (import.meta.env.VITE_MYMUSIC_EMU as string | undefined) ?? '';
export const emulador = EMU !== '';

let app: FirebaseApp | null = null;
export let auth: Auth | null = null;
export let db: Firestore | null = null;

const opts: FirebaseOptions | null = emulador
  ? { apiKey: 'demo-key', projectId: 'demo-mymusic', appId: '1:1:web:1', authDomain: 'demo-mymusic.firebaseapp.com' }
  : firebaseConfig;

if (opts) {
  app = initializeApp(opts);
  auth = getAuth(app);
  // cache local: abre e mostra as músicas mesmo sem internet
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  if (emulador) {
    connectAuthEmulator(auth, `http://${EMU}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, EMU, 8188);
  }
}

export const disponivel = app !== null;

// Aba escondida/PC dormindo: a conexão cai e o Firestore só volta depois de
// uma espera crescente. Voltou a aba (ou a rede) = reconecta na hora.
let escondidaEm = 0;
async function reconectar() {
  if (!db) return;
  try { await disableNetwork(db); await enableNetwork(db); } catch { /* segue */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { escondidaEm = Date.now(); return; }
  if (escondidaEm && Date.now() - escondidaEm > 10000) reconectar();
  escondidaEm = 0;
});
window.addEventListener('online', reconectar);
