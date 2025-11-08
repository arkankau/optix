import { app, BrowserWindow, ipcMain, globalShortcut, screen } from 'electron';
import * as path from 'path';
import { ProfileManager } from './core/profile-manager';
import { VisionEngine } from './core/vision-engine';
import { CaptureManager } from './native/capture-manager';
import { DistanceTracker } from './core/distance-tracker';

let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let profileManager: ProfileManager;
let visionEngine: VisionEngine;
let captureManager: CaptureManager;
let distanceTracker: DistanceTracker;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../assets/icon.png'),
  });

  // Always load from built files (production mode)
  // For development with hot reload, use `npm run dev` instead
  const rendererPath = path.join(__dirname, 'renderer/index.html');
  console.log('Loading renderer from:', rendererPath);
  
  mainWindow.loadFile(rendererPath);
  mainWindow.webContents.openDevTools(); // Keep devtools for debugging

  // Log errors for debugging
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('console-message', (event, level, message) => {
    console.log(`[Renderer ${level}]:`, message);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createOverlayWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  overlayWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  if (process.env.NODE_ENV === 'development') {
    overlayWindow.loadURL('http://localhost:5173/overlay');
  } else {
    overlayWindow.loadFile(path.join(__dirname, 'renderer/index.html'), {
      hash: 'overlay',
    });
  }
}

app.whenReady().then(() => {
  // Initialize core modules
  profileManager = new ProfileManager();
  visionEngine = new VisionEngine();
  captureManager = new CaptureManager();
  distanceTracker = new DistanceTracker();

  createMainWindow();

  // Register global shortcuts
  globalShortcut.register('CommandOrControl+E', () => {
    if (overlayWindow) {
      overlayWindow.destroy();
      overlayWindow = null;
    } else {
      createOverlayWindow();
    }
  });

  globalShortcut.register('CommandOrControl+S', () => {
    mainWindow?.webContents.send('toggle-split-mode');
  });

  globalShortcut.register('CommandOrControl+R', () => {
    mainWindow?.webContents.send('recalibrate');
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  captureManager?.cleanup();
  distanceTracker?.cleanup();
});

// IPC Handlers
ipcMain.handle('profiles:list', async () => {
  return profileManager.listProfiles();
});

ipcMain.handle('profiles:get', async (_, id: string) => {
  return profileManager.getProfile(id);
});

ipcMain.handle('profiles:save', async (_, profile: any) => {
  return profileManager.saveProfile(profile);
});

ipcMain.handle('profiles:delete', async (_, id: string) => {
  return profileManager.deleteProfile(id);
});

ipcMain.handle('vision:process-frame', async (_, params: any) => {
  return visionEngine.processFrame(params);
});

ipcMain.handle('vision:update-psf', async (_, psfParams: any, lfd_inspired?: boolean) => {
  return visionEngine.updatePSF(psfParams, lfd_inspired || false);
});

ipcMain.handle('capture:start', async () => {
  return captureManager.start();
});

ipcMain.handle('capture:stop', async () => {
  return captureManager.stop();
});

ipcMain.handle('capture:get-frame', async () => {
  return captureManager.getFrame();
});

ipcMain.handle('capture:get-sources', async () => {
  const { desktopCapturer } = require('electron');
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
  });
  return sources.map((s: any) => ({ id: s.id, name: s.name }));
});

ipcMain.handle('distance:start', async () => {
  return distanceTracker.start();
});

ipcMain.handle('distance:stop', async () => {
  return distanceTracker.stop();
});

ipcMain.handle('distance:get', async () => {
  return distanceTracker.getCurrentDistance();
});

ipcMain.on('distance-update', (_, distance: number) => {
  visionEngine.updateDistance(distance);
});

