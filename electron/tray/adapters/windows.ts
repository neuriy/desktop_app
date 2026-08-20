import { BaseTrayAdapter } from './base';
import type { TrayPlatform } from '../types';

/**
 * Windows System Tray / Notification Area adapter.
 *
 * Electron Tray uses the native Shell_NotifyIcon / notification-area icon.
 *
 * Behavior:
 * - Left click → open compact popup / dashboard
 * - Right click → native context menu (Open, Settings, Notifications, Quit)
 * - Optional toast notifications via Windows Action Center
 */
export class WindowsTrayAdapter extends BaseTrayAdapter {
  readonly platform: TrayPlatform = 'win32';

  protected bindEvents(): void {
    if (!this.tray) return;

    this.tray.on('click', (_event, bounds) => {
      this.primaryClickHandler?.({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      });
    });

    this.tray.on('right-click', (_event, bounds) => {
      // Explicit pop-up near the tray icon
      this.tray?.popUpContextMenu(undefined, {
        x: Math.round(bounds.x),
        y: Math.round(bounds.y),
      });
    });

    this.tray.on('double-click', (_event, bounds) => {
      this.primaryClickHandler?.({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      });
    });
  }
}
