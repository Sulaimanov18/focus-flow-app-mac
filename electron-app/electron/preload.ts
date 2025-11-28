import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  toggleCollapse: () => ipcRenderer.invoke('toggle-collapse'),
  getCollapsedState: () => ipcRenderer.invoke('get-collapsed-state'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
});
