import { BaseTrayAdapter } from './base';
import type { TrayPlatform } from '../types';

/**
 * macOS Menu Bar adapter.
 *
 * Electron's Tray maps to NSStatusItem on macOS — the native menu-bar
 * status item next to Wi‑Fi / battery / Control Center. This is not a
 * fake in-window menu bar.
 *
 * Behavior:
 * - Template icon respects light/dark menu bar appearance
 * - Left click toggles the compact popover panel (positioned under the icon)
 * - Right click / Ctrl-click shows the shared context menu
 * - Dock icon is hidden by the app bootstrap (LSBar-style utility)
 */
export class MacOSTrayAdapter extends BaseTrayAdapter {
  readonly platform: TrayPlatform = 'darwin';

  protected bindEvents(): void {
    if (!this.tray) return;

    // Primary click → open / toggle popover under the menu-bar icon
    this.tray.on('click', (_event, bounds) => {
      this.primaryClickHandler?.({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      });
    });

    // Right-click still shows context menu (Electron default when set)
    this.tray.on('right-click', () => {
      this.tray?.popUpContextMenu();
    });
  }

  showNotification(options: {
    title: string;
    body: string;
    silent?: boolean;
  }): void {
    // macOS uses Notification Center via Electron Notification
    super.showNotification(options);
  }
}
