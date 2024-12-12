const { app, BrowserWindow, ipcMain, dialog, globalShortcut, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'src/preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'ico', 'WNPDC512.png'),
  });

  mainWindow.loadFile('src/index.html');
  mainWindow.webContents.openDevTools();

  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          label: 'Open',
          click: () => {
            dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] })
              .then((result) => {})
              .catch((err) => {});
          },
        },
        { type: 'separator' },
        {
          label: 'Exit',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://electronjs.org');
          },
        },
      ],
    },
  ]);

  Menu.setApplicationMenu(menu);
}

function createFolders(basePath, folderStructure) {
  folderStructure.forEach((item) => {
    const itemPath = path.join(basePath, item.name);
    if (item.path) {
      // It's a file, copy it
      fs.copyFileSync(item.path, itemPath);
    } else {
      // It's a folder, create it and recurse
      fs.mkdirSync(itemPath, { recursive: true });
      if (item.subFolders.length > 0) {
        createFolders(itemPath, item.subFolders);
      }
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  globalShortcut.unregisterAll();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.on('browse-folder', async (event) => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (!result.canceled) {
    event.sender.send('folder-selected', result.filePaths[0]);
  }
});

ipcMain.on('create-folders', async (event, data) => {
  createFolders(data.path, data.folderStructure);
  dialog.showMessageBox({ message: 'Directories Created!', buttons: ['OK'] });
});

// Add this handler to open a file dialog and send the file path
ipcMain.on('browse-file', async (event) => {
  const result = await dialog.showOpenDialog({ properties: ['openFile'] });
  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const directoryPath = path.dirname(filePath);
    const fileName = path.basename(filePath);
    event.sender.send('file-selected', { directoryPath, fileName });
  }
});
