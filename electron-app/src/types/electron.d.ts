export interface ElectronAPI {
  toggleCollapse: () => Promise<boolean>;
  getCollapsedState: () => Promise<boolean>;
  closeWindow: () => Promise<void>;
  minimizeWindow: () => Promise<void>;
  closeMiniWidget: () => Promise<void>;
  toggleMiniWidget: () => Promise<void>;
  setAlwaysOnTop: (enabled: boolean) => Promise<boolean>;
  // Audio helpers for dev/prod path resolution
  getAudioPath: (fileName: string) => Promise<string>;
  isPackaged: () => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
