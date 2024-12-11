const { app, BrowserWindow, ipcMain, dialog } = require('electron');
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
            nodeIntegration: false
        }
    });

    mainWindow.loadFile('src/index.html');
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('browse-folder', async (event) => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (result.canceled) return;
    event.sender.send('folder-selected', result.filePaths[0]);
});

ipcMain.on('create-folders', async (event, data) => {
    const baseFolder = data.path;
    const folderStructure = data.folderStructure;

    createFolders(baseFolder, folderStructure);

    dialog.showMessageBox({ message: 'Directories Created!', buttons: ['OK'] });
});

function createFolders(basePath, structure) {
    structure.forEach(folder => {
        const folderPath = path.join(basePath, folder.name);
        fs.mkdirSync(folderPath, { recursive: true });
        if (folder.subFolders.length > 0) {
            createFolders(folderPath, folder.subFolders);
        }
    });
}

