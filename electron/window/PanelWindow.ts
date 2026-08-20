import { BrowserWindow, screen as electronScreen } from 'electron';
import * as path from 'path';
import type { TrayBounds } from '../tray/types';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Compact frameless popup panel anchored to the tray / menu-bar icon.
 * Lives independently of "main window visibility" — closing the panel
 * does not quit the app; the tray icon remains.
 */
export class PanelWindow {
  private window: Electron.BrowserWindow | null = null;
  private visible = false;

  create(): Electron.BrowserWindow {
    if (this.window) return this.window;

    this.window = new BrowserWindow({
      width: 380,
      height: 520,
      show: false,
      frame: false,
      transparent: true,
      resizable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      hasShadow: true,
      fullscreenable: false,
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload.js'),
        sandbox: false,
        contextIsolation: true,
      },
    });

    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    if (isDev) {
      void this.window.loadURL(devUrl);
    } else {
      void this.window.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
    }

    this.window.on('blur', () => {
      // Keep panel open while an OS auth popup / external window is focused? — hide for tray UX
      if (this.visible) this.hide();
    });

    this.window.on('closed', () => {
      this.window = null;
      this.visible = false;
    });

    return this.window;
  }

  getBrowserWindow(): Electron.BrowserWindow | null {
    return this.window;
  }

  isVisible(): boolean {
    return this.visible && !!this.window?.isVisible();
  }

  toggle(bounds?: TrayBounds): void {
    if (this.isVisible()) this.hide();
    else this.show(bounds);
  }

  show(bounds?: TrayBounds): void {
    const win = this.create();
    const pos = this.getPosition(bounds);
    win.setPosition(pos.x, pos.y, false);
    win.show();
    win.focus();
    this.visible = true;
    win.webContents.send('toggle-panel', true);
  }

  hide(): void {
    if (!this.window) return;
    this.window.webContents.send('toggle-panel', false);
    // Actual hide happens after renderer exit animation via IPC hide-panel
  }

  hideImmediate(): void {
    if (!this.window) return;
    this.window.hide();
    this.visible = false;
  }

  private getPosition(trayBounds?: TrayBounds): { x: number; y: number } {
    if (!this.window) return { x: 0, y: 0 };

    const windowBounds = this.window.getBounds();
    const trayRect = trayBounds ?? { x: 0, y: 0, width: 0, height: 0 };

    let x = Math.round(trayRect.x + trayRect.width / 2 - windowBounds.width / 2);
    let y = Math.round(trayRect.y + trayRect.height + 4);

    const display = electronScreen.getDisplayNearestPoint({
      x: trayRect.x,
      y: trayRect.y,
    });

    if (x + windowBounds.width > display.bounds.x + display.bounds.width) {
      x = display.bounds.x + display.bounds.width - windowBounds.width - 8;
    }
    if (x < display.bounds.x) x = display.bounds.x + 8;

    // Windows / Linux: tray usually at bottom → open panel above the icon
    if (trayRect.y > display.workArea.y + display.workArea.height / 2) {
      y = Math.round(trayRect.y - windowBounds.height - 4);
    }

    // macOS menu bar: keep under the status item, within work area
    if (process.platform === 'darwin') {
      const minY = display.workArea.y + 2;
      if (y < minY) y = minY;
    }

    return { x, y };
  }
}
