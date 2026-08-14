/// <reference types="vite/client" />

interface Window {
  electron: {
    hidePanel: () => void;
    onTogglePanel: (callback: (isVisible: boolean) => void) => void;
  };
}
