import { SystemTrayService } from './SystemTrayService';
import { createTrayAdapter, detectTrayPlatform } from './adapters/createAdapter';
import { loadTrayIcon, loadAppIcon } from './icons';

export {
  SystemTrayService,
  createTrayAdapter,
  detectTrayPlatform,
  loadTrayIcon,
  loadAppIcon,
};

export type {
  TrayAdapter,
  TrayBounds,
  TrayMenuItem,
  TrayNotificationOptions,
  TrayServiceOptions,
  TrayPlatform,
} from './types';
