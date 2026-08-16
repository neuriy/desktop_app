import { initNeuriyAuth } from '@neuriy/auth';

/**
 * Same Firebase project as the Neuriy IDHook auth web app
 * (https://github.com/neuriy/IDHook) so desktop sessions share nID accounts.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyB-wfqzVbPcT5Bf1JvJNGKA3j8K6BPyMhw',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'robbieart-com.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'robbieart-com',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'robbieart-com.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '762094443577',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:762094443577:web:bb725c4d3c8b5c943c41e8',
};

/** Hosted Neuriy nID login (IDHook web app). Override with VITE_NID_LOGIN_URL. */
export const NID_LOGIN_URL =
  import.meta.env.VITE_NID_LOGIN_URL ?? 'https://id.neuriy.com';

let initialized = false;

export function ensureNeuriyAuth() {
  if (initialized) return;
  initNeuriyAuth({
    ...firebaseConfig,
    redirectUrl: typeof window !== 'undefined' ? window.location.href : undefined,
  });
  initialized = true;
}
