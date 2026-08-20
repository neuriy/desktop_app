/**
 * Shared types for the cross-platform SystemTrayService.
 * Platform adapters implement TrayAdapter; the rest of the app
 * only talks to SystemTrayService.
 */

export type TrayPlatform = 'darwin' | 'win32' | 'linux';

export type TrayMenuItemId =
  | 'status'
  | 'open'
  | 'dashboard'
  | 'settings'
  | 'notifications'
  | 'separator'
  | 'quit'
  | string;

export interface TrayMenuItem {
  id: TrayMenuItemId;
  label: string;
  type?: 'normal' | 'separator' | 'checkbox' | 'radio';
  checked?: boolean;
  enabled?: boolean;
  /** When true, item is display-only (e.g. status line). */
  readonly?: boolean;
}

export interface TrayNotificationOptions {
  title: string;
  body: string;
  silent?: boolean;
}

export interface TrayServiceOptions {
  appName?: string;
  tooltip?: string;
  /** Initial connection / presence status shown in the tray menu. */
  statusLabel?: string;
}

export interface TrayBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type TrayMenuActionHandler = (itemId: string) => void;
export type TrayClickHandler = (bounds: TrayBounds) => void;

/**
 * Platform-specific adapter contract.
 * Each OS implements native tray / menu-bar behavior behind this interface.
 */
export interface TrayAdapter {
  readonly platform: TrayPlatform;

  initialize(icon: Electron.NativeImage, tooltip: string): void;
  setIcon(icon: Electron.NativeImage): void;
  setTooltip(tooltip: string): void;
  updateMenu(items: TrayMenuItem[], onAction: TrayMenuActionHandler): void;
  /**
   * Left-click / primary click on the tray icon.
   * macOS & Linux: click opens popup; Windows: click opens popup, right-click shows menu.
   */
  onPrimaryClick(handler: TrayClickHandler): void;
  getBounds(): TrayBounds;
  showNotification(options: TrayNotificationOptions): void;
  destroy(): void;
}
