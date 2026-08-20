import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export interface AppSettings {
  launchAtLogin: boolean;
  notificationsEnabled: boolean;
  statusLabel: string;
}

const DEFAULTS: AppSettings = {
  launchAtLogin: false,
  notificationsEnabled: true,
  statusLabel: 'Status: Online',
};

function settingsPath(): string {
  return path.join(app.getPath('userData'), 'neuriy-settings.json');
}

export function loadSettings(): AppSettings {
  try {
    const raw = fs.readFileSync(settingsPath(), 'utf8');
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(partial: Partial<AppSettings>): AppSettings {
  const next = { ...loadSettings(), ...partial };
  try {
    fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
    fs.writeFileSync(settingsPath(), JSON.stringify(next, null, 2), 'utf8');
  } catch (err) {
    console.error('[settings] failed to persist', err);
  }
  return next;
}
