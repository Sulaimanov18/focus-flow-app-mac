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
  // Load the CapyFocus tray icon - focus ring design
  // macOS template images: Use black pixels (#000000) with alpha for shape
  // macOS automatically inverts colors for light/dark menu bar
  // "Template" suffix in filename is convention, but we MUST call setTemplateImage(true)

  let iconDir: string;

  if (app.isPackaged) {
    iconDir = path.join(process.resourcesPath, 'icons', 'menu');
  } else {
    iconDir = path.join(app.getAppPath(), 'assets', 'icons', 'menu');
  }

  // Load both 1x (16px) and 2x (32px) images for proper retina support
  // Electron will use the appropriate one based on display scale factor
  const icon1xPath = path.join(iconDir, 'capyfocus-focusTemplate.png');
  const icon2xPath = path.join(iconDir, 'capyfocus-focusTemplate@2x.png');

  console.log('Tray icon 1x path:', icon1xPath);
  console.log('Tray icon 2x path:', icon2xPath);

  // Create icon from the 1x image first
  let icon = nativeImage.createFromPath(icon1xPath);

  if (icon.isEmpty()) {
    console.error('Failed to load tray icon from:', icon1xPath);
    // Create a fallback empty icon
    icon = nativeImage.createEmpty();
  } else {
    console.log('Tray icon 1x loaded. Size:', icon.getSize());

    // Add the @2x representation for retina displays
    // This is the key to crisp icons on retina Macs
    const icon2x = nativeImage.createFromPath(icon2xPath);
    if (!icon2x.isEmpty()) {
      console.log('Tray icon 2x loaded. Size:', icon2x.getSize());
      // Add 2x representation with scale factor 2
      icon.addRepresentation({
        scaleFactor: 2.0,
        width: 32,
        height: 32,
        buffer: icon2x.toPNG(),
      });
    }
  }

  // DO NOT resize - use the images at their native sizes (16px and 32px@2x)
  // resize() creates issues with template images

  // CRITICAL: Set template flag AFTER all representations are added
  // This tells macOS to treat the icon as a template (auto-invert for dark/light mode)
  icon.setTemplateImage(true);

  // Debug logging
  console.log('Final icon isEmpty:', icon.isEmpty());
  console.log('Final icon size:', icon.getSize());
  console.log('Final icon isTemplateImage:', icon.isTemplateImage());

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

ipcMain.handle('set-always-on-top', (_event, enabled: boolean) => {
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(enabled);
  }
  if (miniWindow) {
    miniWindow.setAlwaysOnTop(enabled);
  }
  return enabled;
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
