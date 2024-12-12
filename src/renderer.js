let folderCounter = 0;

function addFolder(name = "New Folder", parent = null) {
    const container = parent || document.getElementById("folderStructure");
    const folderId = `folder-${Date.now()}-${folderCounter++}`;
    const accordionId = container.id || `folderStructure-${folderCounter}`;
    container.id = accordionId;
    const folderItem = document.createElement("div");
    folderItem.className = "accordion-item";
    folderItem.innerHTML = `
        <h2 class="accordion-header" id="heading-${folderId}">
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${folderId}" aria-expanded="false" aria-controls="collapse-${folderId}">
                📁 <span class="folder-name" contenteditable="true" onkeydown="handleFolderNameEdit(event)">${name}</span>
            </button>
        </h2>
        <div id="collapse-${folderId}" class="accordion-collapse collapse" aria-labelledby="heading-${folderId}">
            <div class="accordion-body nested"></div>
        </div>
    `;
    container.appendChild(folderItem);
    makeSortable(folderItem.querySelector(".nested"));
    return folderItem;
}

function addFile(file, parent = null) {
    const container = parent || document.getElementById("folderStructure");
    const id = `file-${Date.now()}-${folderCounter++}`;
    const fileItem = document.createElement("div");
    fileItem.className = "file-item";
    fileItem.id = id;
    fileItem.draggable = true; // Ensure the file-item is draggable
    fileItem.innerHTML = `
            📄 <span class="file-name">${file.name}</span>
            `;
    console.log(file); // Log the file object to check its properties
    fileItem.dataset.filePath = file.path || "unknown"; // Ensure the full path is stored
    container.appendChild(fileItem);
    makeFileSortable(fileItem); // Make the entire file-item sortable
    return fileItem;
}

function handleFolderNameEdit(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        event.target.blur();
    }
}

function getFolderStructure(container = document.getElementById("folderStructure")) {
    return Array.from(container.children).map(child => {
        if (child.classList.contains("file-item")) {
            return { name: child.querySelector(".file-name").innerText, path: child.dataset.filePath };
        } else {
            return { name: child.querySelector(".folder-name").innerText, subFolders: getFolderStructure(child.querySelector(".nested")) };
        }
    });
}

function addFolderStructure(folder, parent = null) {
    const container = parent ? parent.querySelector(".nested") : document.getElementById("folderStructure");
    if (container) {
        if (folder.path) {
            addFile({ name: folder.name, path: folder.path }, container);
        } else {
            const folderElement = addFolder(folder.name, container);
            folder.subFolders.forEach(subFolder => addFolderStructure(subFolder, folderElement));
        }
    }
}

function makeSortable(container) {
    new Sortable(container, {
        group: { name: "nested", pull: true, put: true },
        animation: 150,
        fallbackOnBody: true,
        swapThreshold: 0.65,
        onAdd: function (evt) {
            const itemEl = evt.item;
            if (!itemEl.classList.contains("file-item")) {
                let nested = itemEl.querySelector(".nested");
                if (!nested) {
                    nested = document.createElement("div");
                    nested.className = "accordion-body nested";
                    const collapseElement = itemEl.querySelector(".accordion-collapse");
                    if (collapseElement) {
                        collapseElement.appendChild(nested);
                    }
                }
                const accordionItem = itemEl.closest(".accordion-item");
                if (accordionItem) {
                    const accordionButton = accordionItem.querySelector(".accordion-button");
                    if (accordionButton) {
                        accordionButton.style.display = "block";
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

function loadConfig() {
    clearStructure();
    const savedConfig = localStorage.getItem("folderConfig");
    if (savedConfig) {
        JSON.parse(savedConfig).forEach(folder => addFolderStructure(folder));
    } else {
        resetToDefaultStructure();
    }
}

function resetToDefaultStructure() {
    clearStructure();
    parseStructure(document.getElementById("defaultStructureInput").value.split("\n")).forEach(folder => addFolderStructure(folder));
}

function clearStructure() {
    const folderStructure = document.getElementById("folderStructure");
    while (folderStructure.firstChild) {
        folderStructure.removeChild(folderStructure.firstChild);
    }
}

function parseStructure(lines) {
    const result = [];
    let current = result;
    lines.forEach(line => {
        const depth = (line.match(/-/g) || []).length;
        const name = line.replace(/-/g, "").trim();
        if (name) {
            const folder = { name, subFolders: [] };
            if (depth === 0) {
                result.push(folder);
                current = folder.subFolders;
            } else {
                let parent = result;
                for (let i = 1; i < depth; i++) {
                    parent = parent[parent.length - 1].subFolders;
                }
                parent.push(folder);
                current = folder.subFolders;
            }
        }
    });
    return result;
}

function exportToFile() {
    const text = convertStructureToText(getFolderStructure());
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

function convertStructureToText(structure, level = 1) {
    return structure.map(item => {
        const indent = "-".repeat(level);
        if (item.path) {
            return `${indent}${item.name} (File: ${item.path})\n`;
        } else {
            return `${indent}${item.name}\n${convertStructureToText(item.subFolders, level + 1)}`;
        }
    }).join("");
}

document.getElementById("browseFolder").addEventListener("click", () => {
    window.api.send("browse-folder");
});

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
document.getElementById("resetStructure").addEventListener("click", resetToDefaultStructure);
document.getElementById("loadFile").addEventListener("change", event => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = e => {
            const lines = parseStructure(e.target.result.split("\n"));
            clearStructure();
            lines.forEach(folder => addFolderStructure(folder));
        };
        reader.readAsText(file);
    }
});

document.getElementById("exportFile").addEventListener("click", exportToFile);

document.getElementById("addFile").addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = event => {
        const file = event.target.files[0];
        if (file) {
            console.log(file); // Log the file object to check its properties
            addFile(file);
        }
    };
    input.click();
});

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
