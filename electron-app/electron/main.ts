import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, globalShortcut } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;
let miniWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isCollapsed = false;
let isQuitting = false;

// Window dimensions
const EXPANDED_WIDTH = 420;
const EXPANDED_HEIGHT = 520;
const COLLAPSED_WIDTH = 380;
const COLLAPSED_HEIGHT = 60;

// Mini widget dimensions
const MINI_WIDTH = 340;
const MINI_HEIGHT = 220;

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
      preload: path.join(__dirname, 'preload.cjs'),
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

function createMiniWindow(): void {
  if (miniWindow) {
    // Window already exists, just show/focus it
    if (miniWindow.isVisible()) {
      miniWindow.hide();
    } else {
      miniWindow.show();
      miniWindow.focus();
    }
    return;
  }

  miniWindow = new BrowserWindow({
    width: MINI_WIDTH,
    height: MINI_HEIGHT,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    transparent: true,
    backgroundColor: '#00000000',
    skipTaskbar: true,
    roundedCorners: true,
    hasShadow: true,
    show: false, // Start hidden, show after ready

    // macOS VIBRANCY
    vibrancy: 'under-window',
    visualEffectState: 'active',

    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the mini widget view
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    miniWindow.loadURL('http://localhost:5173/#/mini');
  } else {
    miniWindow.loadFile(path.join(__dirname, '../renderer/index.html'), {
      hash: '/mini',
    });
  }

  // Restore mini window position
  const Store = require('electron-store');
  const store = new Store();
  const savedMiniBounds = store.get('miniWindowBounds');
  if (savedMiniBounds) {
    miniWindow.setBounds({ ...savedMiniBounds, width: MINI_WIDTH, height: MINI_HEIGHT });
  }

  // Save mini window position on move
  miniWindow.on('moved', () => {
    if (miniWindow) {
      store.set('miniWindowBounds', miniWindow.getBounds());
    }
  });

  // Show window when ready
  miniWindow.once('ready-to-show', () => {
    if (miniWindow) {
      miniWindow.show();
      miniWindow.focus();
    }
  });

  // Hide instead of close
  miniWindow.on('close', (e) => {
    if (miniWindow && !isQuitting) {
      e.preventDefault();
      miniWindow.hide();
    }
  });

  miniWindow.on('closed', () => {
    miniWindow = null;
  });
}

function toggleMiniWidget(): void {
  if (!miniWindow) {
    createMiniWindow();
  } else if (miniWindow.isVisible()) {
    miniWindow.hide();
  } else {
    miniWindow.show();
    miniWindow.focus();
  }
}

function registerGlobalShortcuts(): void {
  // Register global shortcut to toggle mini widget
  // Using Cmd+Shift+F (F for Focus) to avoid conflicts with Spotlight
  const shortcut = process.platform === 'darwin' ? 'Command+Shift+F' : 'Ctrl+Shift+F';

  const registered = globalShortcut.register(shortcut, () => {
    console.log('Global shortcut triggered!');
    toggleMiniWidget();
  });

  if (!registered) {
    console.error('Failed to register global shortcut:', shortcut);
  } else {
    console.log('Global shortcut registered:', shortcut);
  }
}

function unregisterGlobalShortcuts(): void {
  globalShortcut.unregisterAll();
}

function createTray(): void {
  // Load the CapyFocus tray icon
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'icons', 'app', 'template', 'iconTemplate.png')
    : path.join(__dirname, '..', 'assets', 'icons', 'app', 'template', 'iconTemplate.png');

  let icon = nativeImage.createFromPath(iconPath);

  // If icon failed to load, create empty one as fallback
  if (icon.isEmpty()) {
    icon = nativeImage.createEmpty();
  }

  // Mark as template image for macOS (adapts to dark/light mode)
  icon.setTemplateImage(true);

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
    {
      label: 'Toggle Mini Widget',
      accelerator: process.platform === 'darwin' ? 'Cmd+Shift+F' : 'Ctrl+Shift+F',
      click: () => {
        toggleMiniWidget();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('CapyFocus');
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

ipcMain.handle('close-mini-widget', () => {
  if (miniWindow) {
    miniWindow.hide();
  }
});

ipcMain.handle('toggle-mini-widget', () => {
  toggleMiniWidget();
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  createTray();
  registerGlobalShortcuts();

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

app.on('will-quit', () => {
  unregisterGlobalShortcuts();
});

// Prevent the app from quitting when all windows are closed
app.on('before-quit', () => {
  isQuitting = true;
  if (tray) {
    tray.destroy();
  }
});
