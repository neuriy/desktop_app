import { app } from 'electron';
import { createTrayAdapter, detectTrayPlatform } from './adapters/createAdapter';
import { loadTrayIcon } from './icons';
import type {
  TrayAdapter,
  TrayBounds,
  TrayMenuItem,
  TrayNotificationOptions,
  TrayServiceOptions,
} from './types';

export type { TrayMenuItem, TrayNotificationOptions, TrayServiceOptions, TrayBounds };

type PanelController = {
  toggle: (bounds?: TrayBounds) => void;
  show: (bounds?: TrayBounds) => void;
  hide: () => void;
  isVisible: () => boolean;
};

/**
 * Cross-platform SystemTrayService / MenuBarService facade.
 *
 * Application code must use this API only — never import platform adapters
 * or Electron Tray directly from feature modules.
 *
 *   SystemTrayService.initialize()
 *   SystemTrayService.setIcon()
 *   SystemTrayService.setTooltip()
 *   SystemTrayService.show() / hide()
 *   SystemTrayService.updateMenu()
 *   SystemTrayService.showNotification()
 *   SystemTrayService.openMainWindow()
 *   SystemTrayService.quit()
 */
class SystemTrayServiceImpl {
  private adapter: TrayAdapter | null = null;
  private panel: PanelController | null = null;
  private initialized = false;
  private statusLabel = 'Status: Online';
  private appName = 'Neuriy';
  private tooltip = 'Neuriy — AI Assistant';
  private notificationsEnabled = true;
  private launchAtLogin = false;

  /** Detect OS, create native adapter, install tray / menu-bar icon. */
  initialize(options: TrayServiceOptions = {}, panel?: PanelController): void {
    if (this.initialized) {
      // Prevent duplicate tray instances
      return;
    }

    this.appName = options.appName ?? this.appName;
    this.tooltip = options.tooltip ?? this.tooltip;
    this.statusLabel = options.statusLabel ?? this.statusLabel;
    this.panel = panel ?? null;

    this.adapter = createTrayAdapter();
    const icon = loadTrayIcon();
    this.adapter.initialize(icon, this.tooltip);

    this.adapter.onPrimaryClick((bounds) => {
      this.openMainWindow(bounds);
    });

    this.refreshMenu();
    this.syncLoginItemFromOs();
    this.initialized = true;

    const platform = detectTrayPlatform();
    console.log(`[SystemTrayService] initialized on ${platform}`);
  }

  setIcon(): void {
    this.adapter?.setIcon(loadTrayIcon());
  }

  setTooltip(tooltip: string): void {
    this.tooltip = tooltip;
    this.adapter?.setTooltip(tooltip);
  }

  setStatus(statusLabel: string): void {
    this.statusLabel = statusLabel;
    this.refreshMenu();
  }

  show(): void {
    this.openMainWindow(this.adapter?.getBounds());
  }

  hide(): void {
    this.panel?.hide();
  }

  updateMenu(extraItems: TrayMenuItem[] = []): void {
    const base = this.buildDefaultMenu();
    // Insert extra items before the final Quit separator block
    const quitIdx = base.findIndex((i) => i.id === 'quit');
    const merged =
      quitIdx >= 0
        ? [...base.slice(0, quitIdx), ...extraItems, ...base.slice(quitIdx)]
        : [...base, ...extraItems];
    this.applyMenu(merged);
  }

  showNotification(options: TrayNotificationOptions): void {
    if (!this.notificationsEnabled) return;
    this.adapter?.showNotification(options);
  }

  openMainWindow(bounds?: TrayBounds): void {
    if (!this.panel) return;
    if (bounds) {
      this.panel.toggle(bounds);
    } else {
      this.panel.toggle(this.adapter?.getBounds());
    }
  }

  openDashboard(): void {
    this.panel?.show(this.adapter?.getBounds());
  }

  openSettings(): void {
    // Settings are surfaced in the renderer; open panel and navigate via IPC
    this.panel?.show(this.adapter?.getBounds());
    const { BrowserWindow } = require('electron') as typeof import('electron');
    const win = BrowserWindow.getAllWindows()[0];
    win?.webContents.send('navigate', 'settings');
  }

  setNotificationsEnabled(enabled: boolean): void {
    this.notificationsEnabled = enabled;
    try {
      const { saveSettings } = require('../settings/store') as typeof import('../settings/store');
      saveSettings({ notificationsEnabled: enabled });
    } catch {
      /* ignore before app ready */
    }
    this.refreshMenu();
  }

  isNotificationsEnabled(): boolean {
    return this.notificationsEnabled;
  }

  setLaunchAtLogin(enabled: boolean): void {
    this.launchAtLogin = enabled;
    try {
      app.setLoginItemSettings({
        openAtLogin: enabled,
        openAsHidden: true,
        path: process.execPath,
        args: app.isPackaged ? [] : [require('path').resolve(process.argv[1] || '.')],
      });
      const { saveSettings } = require('../settings/store') as typeof import('../settings/store');
      saveSettings({ launchAtLogin: enabled });
    } catch (err) {
      console.warn('[SystemTrayService] setLoginItemSettings', err);
    }
    this.refreshMenu();
  }

  isLaunchAtLogin(): boolean {
    return this.launchAtLogin;
  }

  getBounds(): TrayBounds {
    return this.adapter?.getBounds() ?? { x: 0, y: 0, width: 0, height: 0 };
  }

  getPlatform() {
    return detectTrayPlatform();
  }

  quit(): void {
    this.destroy();
    app.quit();
  }

  /** Tear down native tray icon — call on graceful shutdown. */
  destroy(): void {
    this.adapter?.destroy();
    this.adapter = null;
    this.initialized = false;
  }

  private syncLoginItemFromOs(): void {
    try {
      const settings = app.getLoginItemSettings();
      this.launchAtLogin = !!settings.openAtLogin;
    } catch {
      this.launchAtLogin = false;
    }
  }

  private refreshMenu(): void {
    this.applyMenu(this.buildDefaultMenu());
  }

  private buildDefaultMenu(): TrayMenuItem[] {
    return [
      { id: 'app-title', label: `✨ ${this.appName}`, readonly: true },
      { id: 'separator', type: 'separator', label: '' },
      { id: 'status', label: this.statusLabel, readonly: true },
      { id: 'separator-2', type: 'separator', label: '' },
      { id: 'open', label: 'Open App' },
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'settings', label: 'Settings' },
      {
        id: 'notifications',
        label: 'Notifications',
        type: 'checkbox',
        checked: this.notificationsEnabled,
      },
      {
        id: 'launch-at-login',
        label: 'Launch at Login',
        type: 'checkbox',
        checked: this.launchAtLogin,
      },
      { id: 'separator-3', type: 'separator', label: '' },
      { id: 'quit', label: 'Quit' },
    ];
  }

  private applyMenu(items: TrayMenuItem[]): void {
    this.adapter?.updateMenu(items, (itemId) => this.handleMenuAction(itemId));
  }

  private handleMenuAction(itemId: string): void {
    switch (itemId) {
      case 'open':
      case 'dashboard':
        this.openDashboard();
        break;
      case 'settings':
        this.openSettings();
        break;
      case 'notifications':
        this.setNotificationsEnabled(!this.notificationsEnabled);
        break;
      case 'launch-at-login':
        this.setLaunchAtLogin(!this.launchAtLogin);
        break;
      case 'quit':
        this.quit();
        break;
      default:
        break;
    }
  }
}

/** Singleton — prevents duplicate tray icons across hot reloads / multi-windows. */
export const SystemTrayService = new SystemTrayServiceImpl();
