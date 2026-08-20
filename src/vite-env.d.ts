/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_NID_LOGIN_URL?: string;
  readonly VITE_ELLOFIVE_API_URL?: string;
  readonly VITE_ELLOFIVE_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface TraySettings {
  launchAtLogin: boolean;
  notificationsEnabled: boolean;
  statusLabel: string;
}

interface Window {
  electron?: {
    hidePanel: () => void;
    onTogglePanel: (callback: (isVisible: boolean) => void) => void;
    openExternal: (url: string) => void;
    getTrayPlatform?: () => Promise<string>;
    getTraySettings?: () => Promise<TraySettings>;
    setTraySettings?: (partial: {
      launchAtLogin?: boolean;
      notificationsEnabled?: boolean;
    }) => Promise<TraySettings>;
    showTrayNotification?: (payload: {
      title: string;
      body: string;
      silent?: boolean;
    }) => Promise<void>;
    quitApp?: () => void;
    onNavigate?: (callback: (route: string) => void) => void;
  };
}
