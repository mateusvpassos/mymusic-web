// Liga o Firebase: projeto de verdade (firebaseConfig abaixo) ou, nos
// testes, o emulador local (VITE_MYMUSIC_EMU=127.0.0.1 npm run dev).
import { initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import {
  initializeFirestore, connectFirestoreEmulator, persistentLocalCache,
  persistentMultipleTabManager, type Firestore,
} from 'firebase/firestore';

/**
 * Console do Firebase → Configurações do projeto → Seus apps → Web.
 * Não é segredo: o acesso é controlado por firebase/firestore.rules (repo do app).
 * null = nuvem ainda não configurada (o editor usa o Drive como antes).
 */
const firebaseConfig: FirebaseOptions | null = null;

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
