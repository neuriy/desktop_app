import { nativeImage, type NativeImage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Resolve tray / app icons with HiDPI support.
 * Prefers on-disk assets under assets/; falls back to a tiny embedded PNG.
 */

/** Minimal 16×16 violet circle PNG (valid). */
const ICON_16_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAYElEQVR42mNgoCWosXorAMLkaOqssXr7oMbq7X8ofgAVEyCk2RxNIzoGyZnjsxmfZmRDBLAZ0EmEZhjuxGbAAxIMeIDN+f9JxALUM4BiL1ArECmLRooTElWSMlUyE6kAAEt0WPg5FkV5AAAAAElFTkSuQmCC';

function assetsRoot(): string {
  // Packaged builds copy assets → resources/assets via electron-builder extraResources
  if (appIsPackaged()) {
    return path.join(process.resourcesPath, 'assets');
  }
  return path.join(__dirname, '..', '..', 'assets');
}

function appIsPackaged(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { app } = require('electron') as typeof import('electron');
    return app.isPackaged;
  } catch {
    return process.env.NODE_ENV === 'production';
  }
}

function tryLoad(filePath: string): NativeImage | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const img = nativeImage.createFromPath(filePath);
    return img.isEmpty() ? null : img;
  } catch {
    return null;
  }
}

/**
 * Build a tray icon appropriate for the current platform and display scale.
 * macOS: template image (monochrome, auto light/dark menu bar).
 * Windows/Linux: color PNG sized for the notification / status area.
 */
export function loadTrayIcon(): NativeImage {
  const root = assetsRoot();

  if (process.platform === 'darwin') {
    const template =
      tryLoad(path.join(root, 'tray', 'iconTemplate.png')) ||
      tryLoad(path.join(root, 'tray', 'icon.png'));
    if (template) {
      template.setTemplateImage(true);
      return template;
    }
  }

  const color =
    tryLoad(path.join(root, 'tray', 'icon.png')) ||
    tryLoad(path.join(root, 'icons', 'icon-32.png')) ||
    tryLoad(path.join(root, 'icons', 'icon.png'));

  if (color) {
    const size = process.platform === 'win32' ? 16 : 22;
    return color.resize({ width: size, height: size, quality: 'best' });
  }

  const fallback = nativeImage.createFromDataURL(
    `data:image/png;base64,${ICON_16_BASE64}`
  );
  if (process.platform === 'darwin') {
    fallback.setTemplateImage(true);
  }
  const size = process.platform === 'win32' ? 16 : process.platform === 'darwin' ? 16 : 22;
  return fallback.resize({ width: size, height: size, quality: 'best' });
}

/** Larger color icon for notifications / about. */
export function loadAppIcon(): NativeImage {
  const root = assetsRoot();
  return (
    tryLoad(path.join(root, 'icons', 'icon.png')) ||
    tryLoad(path.join(root, 'tray', 'icon.png')) ||
    nativeImage.createFromDataURL(`data:image/png;base64,${ICON_16_BASE64}`)
  );
}

export function getIconPaths() {
  const root = assetsRoot();
  return {
    tray: path.join(root, 'tray'),
    icons: path.join(root, 'icons'),
    root,
  };
}
