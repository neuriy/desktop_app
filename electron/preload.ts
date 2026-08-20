const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  hidePanel: () => ipcRenderer.send('hide-panel'),
  onTogglePanel: (callback: (isVisible: boolean) => void) => {
    ipcRenderer.on('toggle-panel', (_event: unknown, isVisible: boolean) =>
      callback(isVisible)
    );
  },
  openExternal: (url: string) => ipcRenderer.send('open-external', url),

  // System tray / menu-bar bridge (no platform logic in renderer)
  getTrayPlatform: () => ipcRenderer.invoke('tray:get-platform') as Promise<string>,
  getTraySettings: () =>
    ipcRenderer.invoke('tray:get-settings') as Promise<{
      launchAtLogin: boolean;
      notificationsEnabled: boolean;
      statusLabel: string;
    }>,
  setTraySettings: (partial: {
    launchAtLogin?: boolean;
    notificationsEnabled?: boolean;
  }) => ipcRenderer.invoke('tray:set-settings', partial),
  showTrayNotification: (payload: { title: string; body: string; silent?: boolean }) =>
    ipcRenderer.invoke('tray:notify', payload),
  quitApp: () => ipcRenderer.send('tray:quit'),
  onNavigate: (callback: (route: string) => void) => {
    ipcRenderer.on('navigate', (_event: unknown, route: string) => callback(route));
  },
});
