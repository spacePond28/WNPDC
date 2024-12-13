let folderCounter = 0;

function addFolder(name = "New Folder", parent = null) {
    const container = parent || document.getElementById("folderStructure");
    const folderId = `folder-${Date.now()}-${folderCounter++}`;
    const folderElement = document.createElement("div");
    folderElement.className = "accordion-item";
    folderElement.innerHTML = `
        <h2 class="accordion-header" id="heading-${folderId}">
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${folderId}" aria-expanded="false" aria-controls="collapse-${folderId}">
                📁 <span class="folder-name" contenteditable="true" onkeydown="handleFolderNameEdit(event)">${name}</span>
            </button>
        </h2>
        <div id="collapse-${folderId}" class="accordion-collapse collapse" aria-labelledby="heading-${folderId}">
            <div class="accordion-body nested"></div>
        </div>
    `;
    container.appendChild(folderElement);
    makeSortable(folderElement.querySelector(".nested"));
    return folderElement;
}



function handleFolderNameEdit(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        event.target.blur();
    }
}

//read the folder structure 
function getFolderStructure(element = document.getElementById("folderStructure")) {
    return Array.from(element.children).map(child => {
        if (child.classList.contains("file-item")) {
            return {
                name: child.querySelector(".file-name").innerText,
                path: child.dataset.filePath
            };
        } else {
            return {
                name: child.querySelector(".folder-name").innerText,
                subFolders: getFolderStructure(child.querySelector(".nested"))
            };
        }
    });
}


//export to .txt file 
function exportToFile() {
    const structure = getFolderStructure();
    const text = convertStructureToText(structure);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "folder_structure.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

document.getElementById("exportFile").addEventListener("click", exportToFile);

function convertStructureToText(structure, level = 1) {
    return structure.map(item => {
      const indent = "-".repeat(level);
      if (item.path) {
        return `${indent}${item.name} [File: ${item.path}]\n`;
      } else {
        return `${indent}${item.name}\n${convertStructureToText(item.subFolders, level + 1)}`;
      }
    }).join("");
  }

document.getElementById("browseFolder").addEventListener("click", () => {
    window.api.send("browse-folder");
});

function addFolderStructure(item, parent = null) {
    const container = parent ? parent.querySelector(".nested") : document.getElementById("folderStructure");

    

    if (container) {
        if (item.path) {
            const directoryPath = item.path.substring(0, item.path.lastIndexOf("\\"));
            const fileName = item.path.substring(item.path.lastIndexOf("\\") + 1);
            addFile({ directoryPath, fileName }, container);
        } else {
            const folder = addFolder(item.name, container);
            item.subFolders.forEach(subItem => addTxtFolderStructure(subItem, folder));
        }
    }
}



function makeSortable(container) {
    new Sortable(container, {
        group: { name: "nested", pull: true, put: true },
        animation: 150,
        fallbackOnBody: true,
        swapThreshold: 0.65,
        onAdd: function (event) {
            const item = event.item;
            if (!item.classList.contains("file-item")) {
                let nestedContainer = item.querySelector(".nested");
                if (!nestedContainer) {
                    nestedContainer = document.createElement("div");
                    nestedContainer.className = "accordion-body nested";
                    const collapseElement = item.querySelector(".accordion-collapse");
                    if (collapseElement) {
                        collapseElement.appendChild(nestedContainer);
                    }
                }
                const parentItem = item.closest(".accordion-item");
                if (parentItem) {
                    const buttonElement = parentItem.querySelector(".accordion-button");
                    if (buttonElement) {
                        buttonElement.style.display = "block";
                    }
                }
            }
           
        }
    });
}


function makeFileSortable(fileItem) {
    new Sortable(fileItem, {
        group: { name: "nested", pull: true, put: true },
        animation: 150,
        fallbackOnBody: true,
        swapThreshold: 0.65,
        onAdd: function (evt) {
            const item = evt.item;
            if (item.classList.contains("file-item")) {
                // Ensure the entire file-item is moved
                const parent = item.closest(".file-item");
                if (parent) {
                    parent.appendChild(item);
                }
            }
        }
    });
}

function saveConfig(config) {
    localStorage.setItem("folderConfig", JSON.stringify(config));
}

// Load configuration from localStorage
function loadConfig() {
    clearStructure();
    const savedConfig = localStorage.getItem("folderConfig");
    if (savedConfig) {
        JSON.parse(savedConfig).forEach(folder => addFolderStructure(folder));
    } else {
        resetToDefaultStructure();
    }
}


// Save user default structure
document.getElementById("saveDefault").addEventListener("click", saveDefaultStructure);

function saveDefaultStructure() {
    const currentStructure = getFolderStructure();
    localStorage.setItem("userDefaultStructure", JSON.stringify(currentStructure));
    alert("Default structure saved!");
}

// Reset to user default structure
document.getElementById("resetStructure").addEventListener("click", resetToUserDefaultStructure);

function resetToUserDefaultStructure() {
    clearStructure();
    const userDefaultStructure = localStorage.getItem("userDefaultStructure");
    if (userDefaultStructure) {
        const structure = JSON.parse(userDefaultStructure);
        structure.forEach(item => {
            if (item.name && item.name.trim() !== "") {
                addFolderStructure(item);
            }
        });
    } else {
        alert("No default structure saved. Please save a default structure first.");
    }
}

// Reset to predefined default structure
function resetToDefaultStructure() {
    clearStructure();
    const defaultStructure = parseStructure(document.getElementById("defaultStructureInput").value.split("\n"));
    defaultStructure.forEach(folder => {
        if (folder.name && folder.name.trim() !== "") {
            addFolderStructure(folder);
        }
    });
}




function clearStructure() {
    const folderStructure = document.getElementById("folderStructure");
    while (folderStructure.firstChild) {
        folderStructure.removeChild(folderStructure.firstChild);
    }
}

function parseStructure(lines) {
    const structure = [];
    let currentLevel = structure;

    lines.forEach(line => {
        const level = (line.match(/-/g) || []).length;
        const name = line.replace(/-/g, "").trim();
        if (name === "") return; // Skip empty lines
        const isFile = name.includes("[File:");
        const item = {
            name: isFile ? name.split(" [File:")[0].trim() : name,
            path: isFile ? name.split(" [File:")[1].replace("]", "").trim() : null,
            subFolders: []
        };

        if (level === 1) {
            structure.push(item);
            currentLevel = item.subFolders;
        } else {
            let parent = structure;
            for (let i = 1; i < level; i++) {
                parent = parent[parent.length - 1].subFolders;
            }
            parent.push(item);
            currentLevel = item.subFolders;
        }
    });

    return structure;
}





window.api.on("folder-selected", path => {
    document.getElementById("selectedFolder").value = path;
    document.getElementById("createFolders").disabled = false;
    document.getElementById("createFolders").dataset.path = path;
    loadConfig();
});

document.getElementById("createFolders").addEventListener("click", () => {
    const selectedPath = document.getElementById("createFolders").dataset.path;
    const folderStructure = getFolderStructure();
    saveConfig(folderStructure);
    window.api.send("create-folders", { path: selectedPath, folderStructure });
});

document.getElementById("addFolder").addEventListener("click", () => addFolder("New Folder"));

//add file stuff
document.getElementById("addFile").addEventListener("click", () => {
    window.api.send("browse-file");
});

window.api.on("file-selected", ({ directoryPath, fileName }) => {
    addFile({ directoryPath, fileName });
    window.electron.sendFilePath({ directoryPath, fileName }); // Send directory path and file name to main process
});

function addFile({ directoryPath, fileName }, parent = null) {
    const container = parent || document.getElementById("folderStructure");
    const fileId = `file-${Date.now()}-${folderCounter++}`;
    const fileElement = document.createElement("div");
    fileElement.className = "file-item";
    fileElement.id = fileId;
    fileElement.draggable = true;
    fileElement.innerHTML = `
        📄 <span class="file-name">${fileName}</span>
    `;
    fileElement.dataset.filePath = `${directoryPath}\\${fileName}`;
    fileElement.querySelector(".file-name").addEventListener("dragstart", (event) => {
        event.preventDefault();
    });
    container.appendChild(fileElement);
    makeFileSortable(fileElement);
    return fileElement;
}


window.addEventListener("DOMContentLoaded", () => {
    makeSortable(document.getElementById("folderStructure"));
    loadConfig();
});

const trashBin = document.getElementById("trashBin");
new Sortable(trashBin, {
    group: { name: "nested", pull: false, put: true },
    onAdd: function (evt) {
        const itemEl = evt.item;
        if (trashBin.contains(itemEl)) {
            itemEl.parentElement.removeChild(itemEl);
        }
    }
});

//clear all function
document.getElementById("clearAll").addEventListener("click", clearAll);

function clearAll() {
    clearStructure();
    saveConfig([]); // Save an empty configuration to localStorage
}



// Load and parse from .txt files
function parseTxtStructure(lines) {
    const structure = [];
    let currentLevel = structure;

    lines.forEach(line => {
        const level = (line.match(/-/g) || []).length;
        const name = line.replace(/-/g, "").trim();
        if (name === "") return; // Skip empty lines
        const isFile = name.includes("[File:");
        const item = {
            name: isFile ? name.split(" [File:")[0].trim() : name,
            path: isFile ? name.split(" [File:")[1].replace("]", "").trim() : null,
            subFolders: []
        };

        if (level === 1) {
            structure.push(item);
            currentLevel = item.subFolders;
        } else {
            let parent = structure;
            for (let i = 1; i < level; i++) {
                parent = parent[parent.length - 1].subFolders;
            }
            parent.push(item);
            currentLevel = item.subFolders;
        }
    });

    return structure;
}



function addTxtFolderStructure(item, parent = null) {
    const container = parent ? parent.querySelector(".nested") : document.getElementById("folderStructure");
    if (container) {
        if (item.path) {
            const directoryPath = item.path.substring(0, item.path.lastIndexOf("\\"));
            const fileName = item.path.substring(item.path.lastIndexOf("\\") + 1);
            addFile({ directoryPath, fileName }, container);
        } else {
            const folder = addFolder(item.name, container);
            item.subFolders.forEach(subItem => addTxtFolderStructure(subItem, folder));
        }
    }
}



document.getElementById("loadFile").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const lines = e.target.result.split("\n");
            const structure = parseTxtStructure(lines);
            clearStructure();
            structure.forEach(item => addTxtFolderStructure(item));
        };
        reader.readAsText(file);
    }
});


// Observe changes in the folder structure
function observeFolderStructure() {
    const folderStructure = document.getElementById("folderStructure");

    const observer = new MutationObserver(() => {
        saveConfig(getFolderStructure());
    });

    observer.observe(folderStructure, {
        childList: true,
        subtree: true,
        attributes: true
    });
}

// Call the observeFolderStructure function when the DOM is loaded
window.addEventListener("DOMContentLoaded", () => {
    makeSortable(document.getElementById("folderStructure"));
    loadConfig();
    observeFolderStructure(); // Start observing changes
});


