// Login Google (GIS) + leitura/gravação no appDataFolder do Drive.
import { WEB_CLIENT_ID, DRIVE_SCOPE, DATA_FILE } from './config';

declare global {
  interface Window {
    google?: any;
  }
}

let token: string | null = null;
let tokenClient: any = null;

function ensureClient(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (tokenClient) return resolve();
    const tryInit = (tries: number) => {
      if (window.google?.accounts?.oauth2) {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: WEB_CLIENT_ID,
          scope: DRIVE_SCOPE,
          callback: () => {},
        });
        resolve();
      } else if (tries > 0) {
        setTimeout(() => tryInit(tries - 1), 200);
      } else {
        reject(new Error('Google Identity Services não carregou'));
      }
    };
    tryInit(25);
  });
}

export async function signIn(): Promise<void> {
  await ensureClient();
  return new Promise((resolve, reject) => {
    tokenClient.callback = (resp: any) => {
      if (resp.error) return reject(new Error(resp.error));
      token = resp.access_token;
      resolve();
    };
    tokenClient.requestAccessToken({ prompt: token ? '' : 'consent' });
  });
}

export function signOut() {
  if (token && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(token, () => {});
  }
  token = null;
}

export const isSignedIn = () => token !== null;

function authHeaders(): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

async function findFileId(): Promise<string | null> {
  const url =
    'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder' +
    `&q=${encodeURIComponent(`name = '${DATA_FILE}'`)}&fields=files(id,name)`;
  const r = await fetch(url, { headers: authHeaders() });
  if (!r.ok) throw new Error(`Drive list ${r.status}`);
  const j = await r.json();
  return j.files?.[0]?.id ?? null;
}

/** Baixa o JSON do Drive. Retorna null se não existe backup. */
export async function downloadData(): Promise<string | null> {
  const id = await findFileId();
  if (!id) return null;
  const r = await fetch(
    `https://www.googleapis.com/drive/v3/files/${id}?alt=media`,
    { headers: authHeaders() },
  );
  if (!r.ok) throw new Error(`Drive download ${r.status}`);
  return await r.text();
}

/** Sobe o JSON (cria ou atualiza o arquivo no appDataFolder). */
export async function uploadData(json: string): Promise<void> {
  let id = await findFileId();
  if (!id) {
    const meta = { name: DATA_FILE, parents: ['appDataFolder'] };
    const r = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(meta),
    });
    if (!r.ok) throw new Error(`Drive create ${r.status}`);
    id = (await r.json()).id;
  }
  const up = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`,
    {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: json,
    },
  );
  if (!up.ok) throw new Error(`Drive upload ${up.status}`);
}
