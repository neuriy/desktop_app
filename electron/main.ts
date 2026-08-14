const { app, BrowserWindow, Tray, ipcMain, screen: electronScreen, nativeImage } = require('electron');
const path = require('path');

let mainWindow: any = null;
let tray: any = null;
let isPanelVisible = false;

const isDev = process.env.NODE_ENV !== 'production';

// Hide dock icon before app is ready (macOS)
if (process.platform === 'darwin') {
  app.dock?.hide();
}

function createTray() {
  // 16x16 purple square icon inline as base64 PNG
  const iconDataUrl =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9h' +
    'AAAARklEQVQ4jWNgGAWDHfwnQIyBgYH/DwMDA8P/AQ0MDCxEGsDAwMBALBgY' +
    'GBiIVc/AwMBALBgYGBiIVc/AwMBALBgYGBiIVQ8AOdMKKwt4ELUAAAAASUVORK5CYII=';
  const icon = nativeImage.createFromDataURL(iconDataUrl).resize({ width: 16, height: 16 });

  tray = new Tray(icon);
  tray.setToolTip('Neuriy — AI Assistant');

  tray.on('click', (_event: any, bounds: any) => {
    toggleWindow(bounds);
  });
}

function getWindowPosition(trayBounds?: any) {
  if (!mainWindow) return { x: 0, y: 0 };

  const windowBounds = mainWindow.getBounds();
  const trayRect = trayBounds || (tray ? tray.getBounds() : { x: 0, y: 0, width: 0, height: 0 });

  let x = Math.round(trayRect.x + trayRect.width / 2 - windowBounds.width / 2);
  let y = Math.round(trayRect.y + trayRect.height + 4);

  const display = electronScreen.getDisplayNearestPoint({ x: trayRect.x, y: trayRect.y });

  if (x + windowBounds.width > display.bounds.x + display.bounds.width) {
    x = display.bounds.x + display.bounds.width - windowBounds.width - 8;
  }
  if (x < display.bounds.x) x = display.bounds.x + 8;

  // Windows/Linux: tray is at bottom, so position window above it
  if (trayRect.y > display.bounds.height / 2) {
    y = Math.round(trayRect.y - windowBounds.height - 4);
  }

  return { x, y };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 380,
    height: 520,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
      contextIsolation: true,
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

  if (isDev) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('blur', () => {
    if (isPanelVisible) hideWindow();
  });
}

function toggleWindow(trayBounds?: any) {
  isPanelVisible ? hideWindow() : showWindow(trayBounds);
}

function showWindow(trayBounds?: any) {
  if (!mainWindow) return;
  const pos = getWindowPosition(trayBounds);
  mainWindow.setPosition(pos.x, pos.y, false);
  mainWindow.show();
  mainWindow.focus();
  isPanelVisible = true;
  mainWindow.webContents.send('toggle-panel', true);
}

function hideWindow() {
  if (!mainWindow) return;
  mainWindow.webContents.send('toggle-panel', false);
}

app.whenReady().then(() => {
  createTray();
  createWindow();

  // Auto-show in dev so you can immediately see the UI
  if (isDev) {
    setTimeout(() => showWindow(), 800);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('hide-panel', () => {
  if (mainWindow) {
    mainWindow.hide();
    isPanelVisible = false;
  }
});
