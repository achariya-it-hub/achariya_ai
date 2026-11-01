const { app, BrowserWindow, Menu, Tray, nativeImage, shell, ipcMain } = require('electron');
const path = require('path');

// Determine app URL: can be overridden via environment or config
// During development or local testing: http://localhost:3000
// For production team deployment: point to your hosted domain (e.g. https://crm.yourdomain.com)
const DEFAULT_URL = process.env.APP_URL || 'http://localhost:3000';

let mainWindow = null;
let tray = null;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1080,
    minHeight: 650,
    title: 'Digiventures CRM & Workspace',
    backgroundColor: '#0f172a',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      spellcheck: true,
    },
  });

  // Remove default menu bar for a clean native app look
  Menu.setApplicationMenu(null);

  // Load app URL
  const targetUrl = process.env.APP_URL || DEFAULT_URL;
  console.log(`[Electron] Loading Digiventures from: ${targetUrl}`);
  mainWindow.loadURL(targetUrl);

  // Smooth appearance when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links in default system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      // If external site (e.g. docs, social media links), open in real browser
      if (!url.includes('localhost') && !url.includes('digiventures')) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
    }
    return { action: 'allow' };
  });

  // Minimize to tray instead of quitting if user closes window (optional, clean behavior)
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      // If tray exists, minimize to tray
      if (tray) {
        event.preventDefault();
        mainWindow.hide();
      }
    }
  });

  // Fallback if URL fails to load (e.g. offline)
  mainWindow.webContents.on('did-fail-load', () => {
    console.warn(`[Electron] Failed to load ${targetUrl}. Displaying connection helper.`);
    mainWindow.loadFile(path.join(__dirname, 'offline.html'));
  });
}

function createTray() {
  try {
    const iconPath = path.join(__dirname, 'icon.png');
    // If icon exists use it, otherwise create an empty image
    const icon = nativeImage.createFromPath(iconPath);
    tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open Digiventures',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Tasks Board',
        click: () => {
          if (mainWindow) {
            mainWindow.loadURL(`${DEFAULT_URL}/dashboard/tasks`);
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      {
        label: 'Social & Calendar',
        click: () => {
          if (mainWindow) {
            mainWindow.loadURL(`${DEFAULT_URL}/dashboard/social`);
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Reload App',
        click: () => {
          if (mainWindow) mainWindow.reload();
        },
      },
      {
        label: 'Quit Digiventures',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]);

    tray.setToolTip('Digiventures CRM & Workspace');
    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (err) {
    console.warn('[Electron] Tray initialization warning:', err.message);
  }
}

// IPC Handlers
ipcMain.handle('app-version', () => app.getVersion());
ipcMain.handle('retry-connection', () => {
  if (mainWindow) {
    const targetUrl = process.env.APP_URL || DEFAULT_URL;
    mainWindow.loadURL(targetUrl);
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

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

