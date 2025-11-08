import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Profile management
  profiles: {
    list: () => ipcRenderer.invoke('profiles:list'),
    get: (id: string) => ipcRenderer.invoke('profiles:get', id),
    save: (profile: any) => ipcRenderer.invoke('profiles:save', profile),
    delete: (id: string) => ipcRenderer.invoke('profiles:delete', id),
  },

  // Vision processing
  vision: {
    processFrame: (params: any) => ipcRenderer.invoke('vision:process-frame', params),
    updatePSF: (psfParams: any, lfdInspired?: boolean) =>
      ipcRenderer.invoke('vision:update-psf', psfParams, lfdInspired),
  },

  // Screen capture
  capture: {
    start: () => ipcRenderer.invoke('capture:start'),
    stop: () => ipcRenderer.invoke('capture:stop'),
    getFrame: () => ipcRenderer.invoke('capture:get-frame'),
    getSources: () => ipcRenderer.invoke('capture:get-sources'),
  },

  // Distance tracking
  distance: {
    start: () => ipcRenderer.invoke('distance:start'),
    stop: () => ipcRenderer.invoke('distance:stop'),
    get: () => ipcRenderer.invoke('distance:get'),
  },

  // Events
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_, ...args) => callback(...args));
  },

  off: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },
});

