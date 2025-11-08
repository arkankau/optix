import { app, BrowserWindow, ipcMain, globalShortcut, screen, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import { ProfileManager } from './core/profile-manager';
import { VisionEngine } from './core/vision-engine';
import { CaptureManager } from './native/capture-manager';
import { DistanceTracker } from './core/distance-tracker';

let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let controlPanel: BrowserWindow | null = null;
let tray: Tray | null = null;
let profileManager: ProfileManager;
let visionEngine: VisionEngine;
let captureManager: CaptureManager;
let distanceTracker: DistanceTracker;
let overlayEnabled = false;

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

  // Check if we're in development (Vite dev server running) or production
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  if (isDev) {
    // Try to load from Vite dev server, fallback to file if not available
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      mainWindow?.loadFile(path.join(__dirname, 'renderer/index.html'));
    });
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
  }

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
  if (overlayWindow) return;

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.bounds;

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
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false, // Prevent throttling for smooth 60fps
    },
  });

  // Make window click-through but allow interaction with UI elements
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  
  // Set as always on top with highest level
  overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  if (isDev) {
    overlayWindow.loadURL('http://localhost:5173/#overlay').catch(() => {
      overlayWindow?.loadFile(path.join(__dirname, 'renderer/index.html'), {
        hash: 'overlay',
      });
    });
    // Uncomment for debugging overlay
    // overlayWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    overlayWindow.loadFile(path.join(__dirname, 'renderer/index.html'), {
      hash: 'overlay',
    });
  }

  overlayWindow.on('closed', () => {
    overlayWindow = null;
    overlayEnabled = false;
    updateTrayMenu();
  });

  overlayEnabled = true;
  updateTrayMenu();
}

function createControlPanel() {
  if (controlPanel) {
    controlPanel.focus();
    return;
  }

  controlPanel = new BrowserWindow({
    width: 400,
    height: 600,
    resizable: false,
    frame: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'Clarity Controls',
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  if (isDev) {
    controlPanel.loadURL('http://localhost:5173/#controls').catch(() => {
      controlPanel?.loadFile(path.join(__dirname, 'renderer/index.html'), {
        hash: 'controls',
      });
    });
  } else {
    controlPanel.loadFile(path.join(__dirname, 'renderer/index.html'), {
      hash: 'controls',
    });
  }

  controlPanel.on('closed', () => {
    controlPanel = null;
  });
}

function toggleOverlay() {
  if (overlayWindow) {
    overlayWindow.destroy();
    overlayWindow = null;
    overlayEnabled = false;
  } else {
    createOverlayWindow();
    overlayEnabled = true;
  }
  updateTrayMenu();
}

function createTray() {
  // Create a simple icon for the tray (you'll want to add proper icon files)
  const icon = nativeImage.createFromPath(
    path.join(__dirname, '../assets/icon.png')
  ).resize({ width: 16, height: 16 });
  
  tray = new Tray(icon);
  updateTrayMenu();
  
  tray.setToolTip('Clarity - Vision Correction Overlay');
  
  tray.on('click', () => {
    if (controlPanel) {
      controlPanel.focus();
    } else {
      createControlPanel();
    }
  });
}

function updateTrayMenu() {
  if (!tray) return;
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: overlayEnabled ? 'Hide Overlay' : 'Show Overlay',
      click: toggleOverlay,
    },
    {
      label: 'Control Panel',
      click: createControlPanel,
    },
    { type: 'separator' },
    {
      label: 'Setup Wizard',
      click: () => {
        if (!mainWindow) createMainWindow();
        mainWindow?.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);
  
  tray.setContextMenu(contextMenu);
}

app.whenReady().then(() => {
  // Initialize core modules
  profileManager = new ProfileManager();
  visionEngine = new VisionEngine();
  captureManager = new CaptureManager();
  distanceTracker = new DistanceTracker();

  // Create system tray
  createTray();

  // Start with setup wizard on first run, or control panel if profile exists
  try {
    const profiles = profileManager.listProfiles();
    if (profiles && profiles.length > 0) {
      // User has profiles - start overlay and show control panel
      createOverlayWindow();
      createControlPanel();
    } else {
      // First run - show setup wizard
      createMainWindow();
    }
  } catch (error) {
    // Error loading profiles - show setup wizard
    console.error('Error loading profiles:', error);
    createMainWindow();
  }

  // Register global shortcuts
  globalShortcut.register('CommandOrControl+Shift+O', () => {
    toggleOverlay();
  });

  globalShortcut.register('CommandOrControl+Shift+C', () => {
    createControlPanel();
  });

  globalShortcut.register('CommandOrControl+S', () => {
    mainWindow?.webContents.send('toggle-split-mode');
    overlayWindow?.webContents.send('toggle-split-mode');
  });

  globalShortcut.register('CommandOrControl+R', () => {
    mainWindow?.webContents.send('recalibrate');
    controlPanel?.webContents.send('recalibrate');
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Don't quit on window close - keep running in system tray
  // User must explicitly quit from tray menu
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

