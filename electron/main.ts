/**
 * Electron main process bootstrap.
 *
 * Tray / menu-bar logic lives exclusively in SystemTrayService + adapters.
 * This file only wires lifecycle, single-instance lock, and IPC.
 */

import {
  app,
  ipcMain,
  shell,
} from 'electron';
import { SystemTrayService } from './tray/SystemTrayService';
import { PanelWindow } from './window/PanelWindow';
import { loadSettings, saveSettings } from './settings/store';

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Prevent duplicate tray instances
  app.quit();
} else {
  // Hide Dock on macOS — this is a Menu Bar utility, not a Dock app
  if (process.platform === 'darwin') {
    app.dock?.hide();
  }

  const panel = new PanelWindow();
  const isDev = process.env.NODE_ENV !== 'production';

  app.whenReady().then(() => {
    const settings = loadSettings();

    panel.create();

    SystemTrayService.initialize(
      {
        appName: 'Neuriy',
        tooltip: 'Neuriy — AI Assistant',
        statusLabel: settings.statusLabel,
      },
      {
        toggle: (bounds) => panel.toggle(bounds),
        show: (bounds) => panel.show(bounds),
        hide: () => panel.hide(),
        isVisible: () => panel.isVisible(),
      }
    );

    SystemTrayService.setNotificationsEnabled(settings.notificationsEnabled);
    if (settings.launchAtLogin) {
      SystemTrayService.setLaunchAtLogin(true);
    }

    // Dev convenience: open panel once so the UI is visible while iterating
    if (isDev) {
      setTimeout(() => SystemTrayService.show(), 800);
    }
  });

  app.on('second-instance', () => {
    // Focus existing instance instead of spawning another tray icon
    SystemTrayService.openMainWindow();
  });

  // Closing all windows must NOT quit — tray keeps the process alive on every OS
  app.on('window-all-closed', () => {
    // no-op (intentionally does not call app.quit)
  });

  app.on('before-quit', () => {
    SystemTrayService.destroy();
  });

  app.on('will-quit', () => {
    SystemTrayService.destroy();
  });

  // ── IPC ──────────────────────────────────────────────────────────────

  ipcMain.on('hide-panel', () => {
    panel.hideImmediate();
  });

  ipcMain.on('open-external', (_event, url: string) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
      void shell.openExternal(url);
    }
  });

  ipcMain.handle('tray:get-platform', () => SystemTrayService.getPlatform());

  ipcMain.handle('tray:get-settings', () => loadSettings());

  ipcMain.handle(
    'tray:set-settings',
    (_event, partial: { launchAtLogin?: boolean; notificationsEnabled?: boolean }) => {
      const next = saveSettings(partial);
      if (typeof partial.launchAtLogin === 'boolean') {
        SystemTrayService.setLaunchAtLogin(partial.launchAtLogin);
      }
      if (typeof partial.notificationsEnabled === 'boolean') {
        SystemTrayService.setNotificationsEnabled(partial.notificationsEnabled);
      }
      return next;
    }
  );

  ipcMain.handle(
    'tray:notify',
    (_event, payload: { title: string; body: string; silent?: boolean }) => {
      SystemTrayService.showNotification(payload);
    }
  );

  ipcMain.on('tray:quit', () => {
    SystemTrayService.quit();
  });

  // Auth / OAuth popups open in the system browser
  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      if (/^https?:\/\//i.test(url)) {
        void shell.openExternal(url);
      }
      return { action: 'deny' };
    });
  });
}
