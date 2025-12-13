import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  toggleCollapse: () => ipcRenderer.invoke('toggle-collapse'),
  getCollapsedState: () => ipcRenderer.invoke('get-collapsed-state'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeMiniWidget: () => ipcRenderer.invoke('close-mini-widget'),
  toggleMiniWidget: () => ipcRenderer.invoke('toggle-mini-widget'),
  setAlwaysOnTop: (enabled: boolean) => ipcRenderer.invoke('set-always-on-top', enabled),
  // Audio helpers for dev/prod path resolution
  getAudioPath: (fileName: string) => ipcRenderer.invoke('get-audio-path', fileName),
  isPackaged: () => ipcRenderer.invoke('is-packaged'),
});
