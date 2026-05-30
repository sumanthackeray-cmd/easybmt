const { app, BrowserWindow, Menu, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "EasyBMT - GST Billing & POS Software",
    icon: path.join(__dirname, '../public/favicon.png'),
    // Start fullscreen so Windows taskbar is hidden on launch
    fullscreen: true,
    // Show frame so user can minimize/restore/close via title bar buttons
    frame: true,
    // Show window only after content has loaded (no white flash)
    show: false,
    backgroundColor: '#0f0f0f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Allow local file access for offline mode
      webSecurity: false,
      allowRunningInsecureContent: false,
    }
  });

  // 100% Offline Execution Logic:
  // If compiled React bundle is present inside dist/, serve it locally from hard drive.
  const localIndexPath = path.join(__dirname, '../dist/index.html');

  if (fs.existsSync(localIndexPath)) {
    mainWindow.loadFile(localIndexPath);
    console.log("Launching EasyBMT in offline-native local desktop mode.");
  } else {
    // Fallback if local build is not present
    mainWindow.loadURL('https://vogats-firebase-studio.web.app/');
    console.log("Local build not found. Launching EasyBMT in cloud-connected webview mode.");
  }

  // Remove default menu bar for clean premium SaaS desktop experience
  Menu.setApplicationMenu(null);

  // Show window gracefully once content is ready (avoids white flash)
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.show();
  });

  // Handle reload/navigation crashes gracefully
  mainWindow.webContents.on('did-fail-load', () => {
    if (fs.existsSync(localIndexPath)) {
      mainWindow.loadFile(localIndexPath);
    }
  });

  // When user leaves fullscreen (e.g. presses F11 or Escape),
  // maximize the window so they still get a large usable area
  mainWindow.on('leave-full-screen', () => {
    mainWindow.maximize();
  });

  // F11 toggles fullscreen on/off
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
    }
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
    globalShortcut.unregisterAll();
  });
}

app.on('ready', () => {
  createWindow();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
