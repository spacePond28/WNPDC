const { app, BrowserWindow, ipcMain, dialog, globalShortcut, Menu } = require("electron");
const path = require("path");
const fs = require("fs");

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, "src/preload.js"),
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: false
        },
        autoHideMenuBar: false, // Ensure the menu bar is not hidden
        icon: path.join(__dirname, "ico", "WNPDC512.png")
    });

    mainWindow.loadFile("src/index.html");
    // mainWindow.webContents.openDevTools(); // Disable this line to remove the console window

    const menu = Menu.buildFromTemplate([
        {
            label: "File",
            submenu: [
                {
                    label: "Exit",
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: "Help",
            submenu: [
                {
                    label: "How to Use",
                    click: () => {
                        dialog.showMessageBox({
                            type: "info",
                            title: "How to Use",
                            message: `**How to Use WNPDC**

1. **Add Folder**: Click the "Add Folder" button to create a new folder in the project structure.
2. **Add File**: Click the "Add File" button to add a new file to the selected folder.
3. **Reset Structure**: Click the "Reset Structure" button to reset the project structure to the default configuration.
4. **Clear All**: Click the "Clear All" button to remove all folders and files from the project structure.
5. **Load File**: Click the "Load File" button to load a project structure from a .txt file.
6. **Export as .txt**: Click the "Export as .txt" button to save the current project structure as a .txt file.
7. **Save as Default**: Click the "Save as Default" button to save the current project structure as your default configuration.

For more information, visit [Weave Creative Limited](https://weave-creative.co.uk).`
                        });
                    }
                },
                {
                    label: "About",
                    click: () => {
                        dialog.showMessageBox({
                            type: "info",
                            title: "About",
                            message: `**About WNPDC**

WNPDC is an open-source project developed by Weave Creative Limited. This application is designed to help users create and manage project directory structures with ease.

**License**

This software is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License. You are free to share, copy, and redistribute the material in any medium or format, and adapt, remix, transform, and build upon the material, under the following terms:
- **Attribution**: You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.
- **NonCommercial**: You may not use the material for commercial purposes.
- **ShareAlike**: If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

**Disclaimer**

This software is provided "as is," without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and noninfringement. In no event shall the authors or copyright holders be liable for any claim, damages, or other liability, whether in an action of contract, tort, or otherwise, arising from, out of, or in connection with the software or the use or other dealings in the software.

For more information, visit [Weave Creative Limited](https://weave-creative.co.uk).`
                        });
                    }
                },
                {
                    label: "Learn More",
                    click: async () => {
                        const { shell } = require("electron");
                        await shell.openExternal("https://weave-creative.co.uk");
                    }
                }
            ]
        }
    ]);

    Menu.setApplicationMenu(menu);
}

function createFolders(basePath, folderStructure) {
    folderStructure.forEach(folder => {
        const folderPath = path.join(basePath, folder.name);
        if (folder.path) {
            const sourcePath = folder.path;
            const destinationPath = folderPath;
            fs.copyFileSync(sourcePath, destinationPath);
        } else {
            fs.mkdirSync(folderPath, { recursive: true });
            if (folder.subFolders.length > 0) {
                createFolders(folderPath, folder.subFolders);
            }
        }
    });
}

ipcMain.on("create-folders", async (event, data) => {
    createFolders(data.path, data.folderStructure);
    dialog.showMessageBox({
        message: "Directories and files created!",
        buttons: ["OK"]
    });
});

app.whenReady().then(() => {
    createWindow();
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

ipcMain.on("browse-folder", async event => {
    const result = await dialog.showOpenDialog({
        properties: ["openDirectory"]
    });
    if (!result.canceled) {
        event.sender.send("folder-selected", result.filePaths[0]);
    }
});

ipcMain.on("browse-file", async event => {
    const result = await dialog.showOpenDialog({
        properties: ["openFile"]
    });
    if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        const directoryPath = path.dirname(filePath);
        const fileName = path.basename(filePath);
        event.sender.send("file-selected", { directoryPath, fileName });
    }
});
