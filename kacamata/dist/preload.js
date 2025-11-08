"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // Profile management
    profiles: {
        list: () => electron_1.ipcRenderer.invoke('profiles:list'),
        get: (id) => electron_1.ipcRenderer.invoke('profiles:get', id),
        save: (profile) => electron_1.ipcRenderer.invoke('profiles:save', profile),
        delete: (id) => electron_1.ipcRenderer.invoke('profiles:delete', id),
    },
    // Vision processing
    vision: {
        processFrame: (params) => electron_1.ipcRenderer.invoke('vision:process-frame', params),
        updatePSF: (psfParams, lfdInspired) => electron_1.ipcRenderer.invoke('vision:update-psf', psfParams, lfdInspired),
    },
    // Screen capture
    capture: {
        start: () => electron_1.ipcRenderer.invoke('capture:start'),
        stop: () => electron_1.ipcRenderer.invoke('capture:stop'),
        getFrame: () => electron_1.ipcRenderer.invoke('capture:get-frame'),
        getSources: () => electron_1.ipcRenderer.invoke('capture:get-sources'),
    },
    // Distance tracking
    distance: {
        start: () => electron_1.ipcRenderer.invoke('distance:start'),
        stop: () => electron_1.ipcRenderer.invoke('distance:stop'),
        get: () => electron_1.ipcRenderer.invoke('distance:get'),
    },
    // Events
    on: (channel, callback) => {
        electron_1.ipcRenderer.on(channel, (_, ...args) => callback(...args));
    },
    off: (channel, callback) => {
        electron_1.ipcRenderer.removeListener(channel, callback);
    },
});
