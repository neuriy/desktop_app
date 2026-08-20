import { BaseTrayAdapter } from './base';
import type { TrayPlatform } from '../types';

/**
 * Linux Status Area / System Tray adapter.
 *
 * Uses Electron Tray, which prefers StatusNotifierItem (AppIndicator)
 * and falls back to the legacy XEmbed tray where still available.
 *
 * Compatible with GNOME (AppIndicator extension / Ubuntu), KDE Plasma,
 * XFCE, Cinnamon, and other StatusNotifier hosts. When no tray host is
 * present, Electron still creates the Tray object — callers should keep
 * a fallback (e.g. show the panel once) which SystemTrayService handles.
 */
export class LinuxTrayAdapter extends BaseTrayAdapter {
  readonly platform: TrayPlatform = 'linux';

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

    this.tray.on('right-click', () => {
      this.tray?.popUpContextMenu();
    });
  }

  initialize(icon: Electron.NativeImage, tooltip: string): void {
    super.initialize(icon, tooltip);
    // Some DEs only surface the menu on right-click; ensure a menu exists early
    if (this.lastMenuItems.length === 0 && this.tray) {
      // Menu applied later via updateMenu
    }
  }
}
