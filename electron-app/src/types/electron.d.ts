export interface ElectronAPI {
  toggleCollapse: () => Promise<boolean>;
  getCollapsedState: () => Promise<boolean>;
  closeWindow: () => Promise<void>;
  minimizeWindow: () => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
