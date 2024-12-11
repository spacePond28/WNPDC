document.getElementById('browseFolder').addEventListener('click', () => {
    window.api.send('browse-folder');
});

window.api.on('folder-selected', (path) => {
    document.getElementById('selectedFolder').value = path;
    document.getElementById('createFolders').disabled = false;
    document.getElementById('createFolders').dataset.path = path;
    loadConfig();
});

document.getElementById('createFolders').addEventListener('click', () => {
    const selectedPath = document.getElementById('createFolders').dataset.path;
    const folderStructure = getFolderStructure();
    saveConfig(folderStructure);

    window.api.send('create-folders', { path: selectedPath, folderStructure });
});

document.getElementById('addFolder').addEventListener('click', () => {
    addFolder('New Folder');
});

document.getElementById('resetStructure').addEventListener('click', () => {
    resetToDefaultStructure();
});

document.getElementById('loadFile').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            const lines = content.split('\n');
            const structure = parseStructure(lines);
            clearStructure();
            structure.forEach(folder => addFolderStructure(folder));
        };
        reader.readAsText(file);
    }
});

function addFolder(name = 'New Folder', parent = null) {
    const container = parent || document.getElementById('folderStructure');
    const folderItem = document.createElement('div');
    folderItem.className = 'list-group-item folder';
    folderItem.innerHTML = `<span class="toggle-icon" style="display: none;">></span>
                            <span class="folder-icon" draggable="true">📁</span>
                            <span class="folder-name" contenteditable="true">${name}</span>
                            <div class="nested hidden"></div>`;
    container.appendChild(folderItem);

    folderItem.querySelector('.toggle-icon').addEventListener('click', (e) => {
        e.stopPropagation();
        const nested = folderItem.querySelector('.nested');
        if (nested.classList.contains('hidden')) {
            nested.classList.remove('hidden');
            e.target.innerText = 'v';
        } else {
            nested.classList.add('hidden');
            e.target.innerText = '>';
        }
    });

    makeSortable(folderItem.querySelector('.nested'));

    return folderItem;
}

function getFolderStructure(container = document.getElementById('folderStructure')) {
    return Array.from(container.children).map(child => ({
        name: child.querySelector('.folder-name').innerText,
        subFolders: getFolderStructure(child.querySelector('.nested'))
    }));
}

function saveConfig(config) {
    localStorage.setItem('folderConfig', JSON.stringify(config));
}

function loadConfig() {
    clearStructure();
    const savedConfig = localStorage.getItem('folderConfig');
    if (savedConfig) {
        const config = JSON.parse(savedConfig);
        config.forEach(folder => addFolderStructure(folder));
    } else {
        resetToDefaultStructure();
    }
}

function resetToDefaultStructure() {
    clearStructure();
    const defaultStructureInput = document.getElementById('defaultStructureInput').value.split('\n');
    const defaultStructure = parseStructure(defaultStructureInput);
    defaultStructure.forEach(folder => addFolderStructure(folder));
}

function clearStructure() {
    const folderStructure = document.getElementById('folderStructure');
    while (folderStructure.firstChild) {
        folderStructure.removeChild(folderStructure.firstChild);
    }
}

function parseStructure(lines) {
    const result = [];
    let current = result;

    lines.forEach(line => {
        const depth = line.match(/-/g)?.length || 0;
        const name = line.replace(/-/g, '').trim();
        if (name) { // Only add folders with a name
            const folder = { name, subFolders: [] };

            if (depth === 0) {
                if (name !== 'ROOT') { // Skip adding ROOT
                    result.push(folder);
                    current = folder.subFolders;
                }
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

function addFolderStructure(folder, parent = null) {
    const parentElement = parent 
        ? Array.from(document.querySelectorAll('.folder-name')).find(el => el.innerText === parent.name)?.parentElement.querySelector('.nested') 
        : document.getElementById('folderStructure');

    if (!parentElement) {
        console.error(`Parent folder "${parent.name}" not found.`);
        return;
    }

    const folderItem = addFolder(folder.name, parentElement);
    if (folder.subFolders.length > 0) {
        folderItem.querySelector('.toggle-icon').style.display = 'inline';
    }
    folder.subFolders.forEach(subFolder => addFolderStructure(subFolder, folder));
}

function makeSortable(container) {
    new Sortable(container, {
      group: {
        name: 'nested',
        pull: true,
        put: true,
      },
      animation: 150,
      fallbackOnBody: true,
      swapThreshold: 0.65,
      onAdd: function (evt) {
        const itemEl = evt.item;
        if (!itemEl.querySelector('.nested')) {
          const nestedContainer = document.createElement('div');
          nestedContainer.className = 'nested hidden';
          itemEl.appendChild(nestedContainer);
        }
        const parentEl = itemEl.closest('.folder');
        if (parentEl) {
          const toggleIcon = parentEl.querySelector('.toggle-icon');
          if (toggleIcon) {
            toggleIcon.style.display = 'inline';
          }
        }
      },
      onEnd: function (evt) {
        const itemEl = evt.item;
        const parentEl = itemEl.closest('.folder');
        if (parentEl) {
          const toggleIcon = parentEl.querySelector('.toggle-icon');
          if (toggleIcon) {
            toggleIcon.style.display = 'inline';
          }
        }
      },
      // **Modification here:**
      onMove: function (evt) {
        const related = evt.related;
        const relatedContainer = related ? related.closest('.folder') : null;
        if (relatedContainer && relatedContainer !== evt.from) {
          // Check if the related item is a folder
          if (relatedContainer.classList.contains('folder')) {
            const nestedContainer = relatedContainer.querySelector('.nested');
            if (!nestedContainer) {
              const newNested = document.createElement('div');
              newNested.className = 'nested hidden';
              relatedContainer.appendChild(newNested);
            }
          }
        }
      },
      sort: false, // Disable sorting within the same container
    });
  
    // Enable drag-and-drop on folder icons
    container.querySelectorAll('.folder-icon').forEach(icon => {
      icon.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });
  
      icon.addEventListener('drop', (e) => {
        e.preventDefault();
        const itemId = e.dataTransfer.getData('text/plain');
        const itemEl = document.getElementById(itemId);
        const parentFolder = icon.closest('.folder');
        const nestedContainer = parentFolder.querySelector('.nested');
        nestedContainer.appendChild(itemEl);
        if (nestedContainer.classList.contains('hidden')) {
          nestedContainer.classList.remove('hidden');
          parentFolder.querySelector('.toggle-icon').innerText = 'v';
        }
      });
    });
  }

// Initialize sortable for the main container and any nested containers
window.addEventListener('DOMContentLoaded', () => {
    makeSortable(document.getElementById('folderStructure'));
    document.querySelectorAll('.nested').forEach(container => makeSortable(container));
    loadConfig();
});

const trashBin = document.getElementById('trashBin');

new Sortable(trashBin, {
    group: {
        name: 'nested',
        pull: false,
        put: true
    },
    onAdd: function(evt) {
        const itemEl = evt.item;
        itemEl.parentElement.removeChild(itemEl);
    }
});

window.addEventListener('DOMContentLoaded', () => {
    makeSortable(document.getElementById('folderStructure'));
    loadConfig();
});