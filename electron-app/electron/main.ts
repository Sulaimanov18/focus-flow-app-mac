import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isCollapsed = false;

// Window dimensions
const EXPANDED_WIDTH = 420;
const EXPANDED_HEIGHT = 520;
const COLLAPSED_WIDTH = 380;
const COLLAPSED_HEIGHT = 60;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: EXPANDED_WIDTH,
    height: EXPANDED_HEIGHT,
    minWidth: 340,
    minHeight: 300,
    maxWidth: 600,
    maxHeight: 700,

    // FRAMELESS WINDOW CONFIGURATION
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',

    // macOS VIBRANCY
    vibrancy: 'under-window',
    visualEffectState: 'active',

    // Window behavior
    alwaysOnTop: true,
    resizable: true,
    movable: true,
    hasShadow: true,

    // Hide from dock when using tray
    skipTaskbar: false,

    // Rounded corners (macOS)
    roundedCorners: true,

    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the app
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Make window draggable by background
  mainWindow.setMovable(true);

  // Restore window position
  const Store = require('electron-store');
  const store = new Store();
  const savedBounds = store.get('windowBounds');
  if (savedBounds) {
    mainWindow.setBounds(savedBounds);
  }

  // Save window position on move/resize
  mainWindow.on('moved', () => {
    if (mainWindow) {
      store.set('windowBounds', mainWindow.getBounds());
    }
  });

  mainWindow.on('resized', () => {
    if (mainWindow) {
      store.set('windowBounds', mainWindow.getBounds());
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray(): void {
  // Create a simple tray icon (you can replace with your own icon)
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show/Hide',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            mainWindow.show();
          }
        }
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

  tray.setToolTip('FocusFlow');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
      }
    }
  });
}

// IPC Handlers
ipcMain.handle('toggle-collapse', () => {
  if (!mainWindow) return;

  isCollapsed = !isCollapsed;
  const bounds = mainWindow.getBounds();

  if (isCollapsed) {
    mainWindow.setMinimumSize(320, COLLAPSED_HEIGHT);
    mainWindow.setMaximumSize(500, COLLAPSED_HEIGHT);
    mainWindow.setBounds({
      x: bounds.x,
      y: bounds.y + bounds.height - COLLAPSED_HEIGHT,
      width: COLLAPSED_WIDTH,
      height: COLLAPSED_HEIGHT,
    }, true);
  } else {
    mainWindow.setMinimumSize(340, 300);
    mainWindow.setMaximumSize(600, 700);
    mainWindow.setBounds({
      x: bounds.x,
      y: bounds.y + bounds.height - EXPANDED_HEIGHT,
      width: EXPANDED_WIDTH,
      height: EXPANDED_HEIGHT,
    }, true);
  }

  return isCollapsed;
});

ipcMain.handle('get-collapsed-state', () => {
  return isCollapsed;
});

ipcMain.handle('close-window', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

ipcMain.handle('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {
  // On macOS, keep the app running in the tray
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Prevent the app from quitting when all windows are closed
app.on('before-quit', () => {
  if (tray) {
    tray.destroy();
  }
});
