const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let mainWindow;
let serverProcess;
// Detect if running in development or production
const isDev = !app.isPackaged;

function getResourcePath(relativePath) {
  if (isDev) {
    return path.join(__dirname, relativePath);
  }
  return path.join(process.resourcesPath, relativePath);
}

ipcMain.handle('get-paths', async () => {
  const userData = app.getPath('userData');

  return {
    backups: path.join(userData, 'backups'),
    prisma: path.join(userData, 'wizard.db')
  };
});

ipcMain.on('restore-backup', () => {
    if (serverProcess) {
        serverProcess.kill();
    }

    app.quit();
});

function createWindow() {

  const htmlPath = isDev
    ? path.join(__dirname, '..', 'frontend', 'index.html')
    : path.join(app.getAppPath(), 'frontend', 'index.html');

  const iconPath = isDev
    ? path.join(__dirname, '..', 'frontend', 'assets', 'imagens', 'logo.ico')
    : path.join(app.getAppPath(), 'frontend', 'assets', 'imagens', 'logo.ico');

  console.log('HTML:', htmlPath);
  console.log('ICON:', iconPath);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: '#fafafa',
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.setMenu(null);

  const fs = require('fs');

  mainWindow.loadFile(htmlPath);

  mainWindow.webContents.on('did-fail-load', (event, code, desc) => {
    dialog.showErrorBox(
      'Erro ao carregar HTML',
      `${code} - ${desc}`
    );
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
  killServer();
  mainWindow = null;
});
}

function startServer() {
  const serverDir = isDev
    ? path.join(__dirname, '..', 'server')
    : path.join(process.resourcesPath, 'server');

  const dbPath = isDev
    ? path.join(__dirname, '..', 'prisma', 'wizard.db')
    : path.join(app.getPath('userData'), 'wizard.db');

  const nodeCommand = isDev
    ? 'node'
    : process.execPath;

  console.log('Servidor:', serverDir);
  console.log('Banco:', dbPath);
  console.log('Node:', nodeCommand);

  serverProcess = fork(
  path.join(serverDir, 'index.js'),
  [],
  {
    cwd: serverDir,
    env: {
      ...process.env,
      DATABASE_URL: `file:${dbPath}`
    }
  }
);
}
function killServer() {
  if (!serverProcess) return;

  console.log('Encerrando servidor:', serverProcess.pid);

  try {
    serverProcess.kill();
  } catch (err) {
    console.error(err);
  }

  serverProcess = null;
}
app.whenReady().then(() => {
  startServer();
  setTimeout(createWindow, 2000);
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    killServer();
    app.quit();
  }
});

app.on('before-quit', () => {
  killServer();
});