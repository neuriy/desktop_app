const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  hidePanel: () => ipcRenderer.send('hide-panel'),
  onTogglePanel: (callback: (isVisible: boolean) => void) => {
    ipcRenderer.on('toggle-panel', (_event: any, isVisible: boolean) =>
      callback(isVisible)
    );
  },
});
