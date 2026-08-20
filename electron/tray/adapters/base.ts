import type {
  TrayAdapter,
  TrayBounds,
  TrayClickHandler,
  TrayMenuActionHandler,
  TrayMenuItem,
  TrayNotificationOptions,
  TrayPlatform,
} from '../types';

/**
 * Shared Electron Tray wiring used by all platform adapters.
 * Platform classes customize click / menu / notification behavior.
 */
export abstract class BaseTrayAdapter implements TrayAdapter {
  abstract readonly platform: TrayPlatform;

  protected tray: Electron.Tray | null = null;
  protected primaryClickHandler: TrayClickHandler | null = null;
  protected menuActionHandler: TrayMenuActionHandler | null = null;
  protected lastMenuItems: TrayMenuItem[] = [];

  initialize(icon: Electron.NativeImage, tooltip: string): void {
    const { Tray } = require('electron') as typeof import('electron');
    if (this.tray) {
      this.destroy();
    }
    this.tray = new Tray(icon);
    this.tray.setToolTip(tooltip);
    this.tray.setIgnoreDoubleClickEvents(true);
    this.bindEvents();
  }

  protected abstract bindEvents(): void;

  setIcon(icon: Electron.NativeImage): void {
    this.tray?.setImage(icon);
  }

  setTooltip(tooltip: string): void {
    this.tray?.setToolTip(tooltip);
  }

  updateMenu(items: TrayMenuItem[], onAction: TrayMenuActionHandler): void {
    this.lastMenuItems = items;
    this.menuActionHandler = onAction;
    this.applyMenu(items);
  }

  protected applyMenu(items: TrayMenuItem[]): void {
    if (!this.tray) return;
    const { Menu } = require('electron') as typeof import('electron');
    const template = items.map((item) => {
      if (item.type === 'separator' || item.id === 'separator') {
        return { type: 'separator' as const };
      }
      return {
        id: item.id,
        label: item.label,
        type: (item.type ?? 'normal') as 'normal' | 'checkbox' | 'radio',
        checked: item.checked,
        enabled: item.readonly ? false : item.enabled !== false,
        click: item.readonly
          ? undefined
          : () => this.menuActionHandler?.(item.id),
      };
    });
    this.tray.setContextMenu(Menu.buildFromTemplate(template));
  }

  onPrimaryClick(handler: TrayClickHandler): void {
    this.primaryClickHandler = handler;
  }

  getBounds(): TrayBounds {
    const b = this.tray?.getBounds();
    if (!b) return { x: 0, y: 0, width: 0, height: 0 };
    return { x: b.x, y: b.y, width: b.width, height: b.height };
  }

  showNotification(options: TrayNotificationOptions): void {
    const { Notification, app } = require('electron') as typeof import('electron');
    if (!Notification.isSupported()) return;
    const notification = new Notification({
      title: options.title,
      body: options.body,
      silent: options.silent ?? false,
      icon: process.platform === 'darwin' ? undefined : undefined,
    });
    notification.show();
    // Keep reference briefly so GC doesn't drop it before display on some platforms
    setTimeout(() => notification.close(), 8000);
    void app; // silence unused in subclasses that may use app
  }

  destroy(): void {
    if (this.tray) {
      this.tray.removeAllListeners();
      this.tray.destroy();
      this.tray = null;
    }
    this.primaryClickHandler = null;
    this.menuActionHandler = null;
  }
}
