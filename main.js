const { app, BrowserWindow, ipcMain, dialog, globalShortcut, Menu } = require("electron");
const path = require("path");
const fs = require("fs");

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, "src/preload.js"),
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: false
        },
        autoHideMenuBar: true, // Automatically hide the menu bar
        icon: path.join(__dirname, "ico", "WNPDC512.png") // Path to your icon file
    });

    win.loadFile("src/index.html");

    // Automatically open the developer tools
    win.webContents.openDevTools();

    // Create a custom menu
    const menu = Menu.buildFromTemplate([
        {
            label: 'File',
            submenu: [
                {
                    label: 'Open',
                    click: () => {
                        dialog.showOpenDialog({
                            properties: ['openFile', 'multiSelections']
                        }).then(result => {
                            console.log(result.filePaths);
                        }).catch(err => {
                            console.log(err);
                        });
                    }
                },
                { type: 'separator' },
                {
                    label: 'Exit',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' }
            ]
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
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Learn More',
                    click: async () => {
                        const { shell } = require('electron');
                        await shell.openExternal('https://electronjs.org');
                    }
                }
            ]
        }
    ]);

    Menu.setApplicationMenu(menu);
}

function createFolders(basePath, folders) {
    folders.forEach(folder => {
        const folderPath = path.join(basePath, folder.name);
        fs.mkdirSync(folderPath, { recursive: true });
        if (folder.subFolders.length > 0) {
            createFolders(folderPath, folder.subFolders);
        }
    });
}

app.whenReady().then(() => {
    createWindow();

    // Unregister all shortcuts
    globalShortcut.unregisterAll();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

ipcMain.on("browse-folder", async (event) => {
    const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
    if (!result.canceled) {
        event.sender.send("folder-selected", result.filePaths[0]);
    }
});

ipcMain.on("create-folders", async (event, data) => {
    createFolders(data.path, data.folderStructure);
    dialog.showMessageBox({ message: "Directories Created!", buttons: ["OK"] });
});