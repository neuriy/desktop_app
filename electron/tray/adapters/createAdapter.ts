import type { TrayAdapter, TrayPlatform } from '../types';
import { MacOSTrayAdapter } from './macos';
import { WindowsTrayAdapter } from './windows';
import { LinuxTrayAdapter } from './linux';

/** Detect OS and return the matching native tray adapter. */
export function createTrayAdapter(platform: NodeJS.Platform = process.platform): TrayAdapter {
  switch (platform as TrayPlatform | string) {
    case 'darwin':
      return new MacOSTrayAdapter();
    case 'win32':
      return new WindowsTrayAdapter();
    case 'linux':
    default:
      // Treat unknown UNIX-like hosts as Linux status-area style
      return new LinuxTrayAdapter();
  }
}

export function detectTrayPlatform(): TrayPlatform {
  if (process.platform === 'darwin') return 'darwin';
  if (process.platform === 'win32') return 'win32';
  return 'linux';
}
