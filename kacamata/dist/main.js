"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const profile_manager_1 = require("./core/profile-manager");
const vision_engine_1 = require("./core/vision-engine");
const capture_manager_1 = require("./native/capture-manager");
const distance_tracker_1 = require("./core/distance-tracker");
let mainWindow = null;
let overlayWindow = null;
let profileManager;
let visionEngine;
let captureManager;
let distanceTracker;
function createMainWindow() {
    mainWindow = new electron_1.BrowserWindow({
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
    const isDev = process.env.NODE_ENV === 'development' || !electron_1.app.isPackaged;
    if (isDev) {
        // Try to load from Vite dev server, fallback to file if not available
        mainWindow.loadURL('http://localhost:5173').catch(() => {
            mainWindow?.loadFile(path.join(__dirname, 'renderer/index.html'));
        });
        mainWindow.webContents.openDevTools();
    }
    else {
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
    const primaryDisplay = electron_1.screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    overlayWindow = new electron_1.BrowserWindow({
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
    }
    else {
        overlayWindow.loadFile(path.join(__dirname, 'renderer/index.html'), {
            hash: 'overlay',
        });
    }
}
electron_1.app.whenReady().then(() => {
    // Initialize core modules
    profileManager = new profile_manager_1.ProfileManager();
    visionEngine = new vision_engine_1.VisionEngine();
    captureManager = new capture_manager_1.CaptureManager();
    distanceTracker = new distance_tracker_1.DistanceTracker();
    createMainWindow();
    // Register global shortcuts
    electron_1.globalShortcut.register('CommandOrControl+E', () => {
        if (overlayWindow) {
            overlayWindow.destroy();
            overlayWindow = null;
        }
        else {
            createOverlayWindow();
        }
    });
    electron_1.globalShortcut.register('CommandOrControl+S', () => {
        mainWindow?.webContents.send('toggle-split-mode');
    });
    electron_1.globalShortcut.register('CommandOrControl+R', () => {
        mainWindow?.webContents.send('recalibrate');
    });
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('will-quit', () => {
    electron_1.globalShortcut.unregisterAll();
    captureManager?.cleanup();
    distanceTracker?.cleanup();
});
// IPC Handlers
electron_1.ipcMain.handle('profiles:list', async () => {
    return profileManager.listProfiles();
});
electron_1.ipcMain.handle('profiles:get', async (_, id) => {
    return profileManager.getProfile(id);
});
electron_1.ipcMain.handle('profiles:save', async (_, profile) => {
    return profileManager.saveProfile(profile);
});
electron_1.ipcMain.handle('profiles:delete', async (_, id) => {
    return profileManager.deleteProfile(id);
});
electron_1.ipcMain.handle('vision:process-frame', async (_, params) => {
    return visionEngine.processFrame(params);
});
electron_1.ipcMain.handle('vision:update-psf', async (_, psfParams, lfd_inspired) => {
    return visionEngine.updatePSF(psfParams, lfd_inspired || false);
});
electron_1.ipcMain.handle('capture:start', async () => {
    return captureManager.start();
});
electron_1.ipcMain.handle('capture:stop', async () => {
    return captureManager.stop();
});
electron_1.ipcMain.handle('capture:get-frame', async () => {
    return captureManager.getFrame();
});
electron_1.ipcMain.handle('capture:get-sources', async () => {
    const { desktopCapturer } = require('electron');
    const sources = await desktopCapturer.getSources({
        types: ['screen'],
    });
    return sources.map((s) => ({ id: s.id, name: s.name }));
});
electron_1.ipcMain.handle('distance:start', async () => {
    return distanceTracker.start();
});
electron_1.ipcMain.handle('distance:stop', async () => {
    return distanceTracker.stop();
});
electron_1.ipcMain.handle('distance:get', async () => {
    return distanceTracker.getCurrentDistance();
});
electron_1.ipcMain.on('distance-update', (_, distance) => {
    visionEngine.updateDistance(distance);
});
