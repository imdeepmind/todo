document.addEventListener('DOMContentLoaded', () => {
    const todoList = document.getElementById('todo-list');
    const emptyState = document.getElementById('empty-state');
    const addBtn = document.getElementById('add-btn');
    const modalOverlay = document.getElementById('modal-overlay');
    const todoInput = document.getElementById('todo-input');
    const confirmBtn = document.getElementById('confirm-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const sunIcon = themeToggle.querySelector('.sun-icon');
    const moonIcon = themeToggle.querySelector('.moon-icon');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const tagFiltersContainer = document.getElementById('tag-filters-container');
    const modalFolderIndicator = document.getElementById('modal-folder-indicator');

    // Folders Elements
    const folderBtn = document.getElementById('folder-btn');
    const activeFolderIndicator = document.getElementById('active-folder-indicator');
    const currentFolderName = document.getElementById('current-folder-name');
    const foldersModalOverlay = document.getElementById('folders-modal-overlay');
    const foldersCloseBtn = document.getElementById('folders-close-btn');
    const createFolderForm = document.getElementById('create-folder-form');
    const createFolderInput = document.getElementById('create-folder-input');
    const folderCardsGrid = document.getElementById('folder-cards-grid');

    const DEFAULT_FOLDER_ID = 'inbox';
    const DEFAULT_FOLDER_NAME = 'Inbox';

    // Initialize Folders State
    let folders = JSON.parse(localStorage.getItem('folders'));
    if (!Array.isArray(folders) || folders.length === 0) {
        folders = [{ id: DEFAULT_FOLDER_ID, name: DEFAULT_FOLDER_NAME, isDefault: true }];
    } else {
        if (!folders.some(f => f.id === DEFAULT_FOLDER_ID)) {
            folders.unshift({ id: DEFAULT_FOLDER_ID, name: DEFAULT_FOLDER_NAME, isDefault: true });
        }
    }

    let activeFolderId = localStorage.getItem('activeFolderId') || DEFAULT_FOLDER_ID;
    if (!folders.some(f => f.id === activeFolderId)) {
        activeFolderId = DEFAULT_FOLDER_ID;
    }

    // Initialize Todos with Backward-Compatible Migration
    let todos = JSON.parse(localStorage.getItem('todos')) || [];
    let hasMigrated = false;
    todos = todos.map(todo => {
        if (!todo.folderId) {
            hasMigrated = true;
            return { ...todo, folderId: DEFAULT_FOLDER_ID };
        }
        return todo;
    });

    let isDarkMode = localStorage.getItem('theme') === 'dark';
    let activeFilters = new Set();

    const saveFolders = () => {
        localStorage.setItem('folders', JSON.stringify(folders));
    };

    const saveActiveFolder = () => {
        localStorage.setItem('activeFolderId', activeFolderId);
    };

    const saveTodos = () => {
        localStorage.setItem('todos', JSON.stringify(todos));
    };

    if (hasMigrated) {
        saveTodos();
    }
    saveFolders();
    saveActiveFolder();

    const getActiveFolder = () => {
        return folders.find(f => f.id === activeFolderId) || folders[0];
    };

    // Initialize Theme
    const updateTheme = () => {
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        } else {
            document.body.classList.add('light-mode');
            document.body.classList.remove('dark-mode');
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        }
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    };

    updateTheme();

    themeToggle.addEventListener('click', () => {
        isDarkMode = !isDarkMode;
        updateTheme();
    });

    // Convert a word to a deterministic, high-contrast HSL color
    const stringToColor = (word) => {
        let hash = 0;
        for (let i = 0; i < word.length; i++) {
            hash = word.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash) % 360;
        const sat = 70 + (Math.abs(hash >> 3) % 15);
        const light = 40 + (Math.abs(hash >> 6) % 10);
        return `hsl(${hue}, ${sat}%, ${light}%)`;
    };

    // Generate color configuration for a tag
    const getTagColorConfig = (tag) => {
        let hash = 0;
        for (let i = 0; i < tag.length; i++) {
            hash = tag.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash) % 360;
        const sat = 70 + (Math.abs(hash >> 3) % 15);
        const light = 40 + (Math.abs(hash >> 6) % 10);
        
        return {
            color: `hsl(${hue}, ${sat}%, ${light}%)`,
            inactive: `hsla(${hue}, ${sat}%, ${light}%, 0.08)`,
            inactiveHover: `hsla(${hue}, ${sat}%, ${light}%, 0.18)`,
            border: `hsla(${hue}, ${sat}%, ${light}%, 0.3)`,
            glow: `hsla(${hue}, ${sat}%, ${light}%, 0.35)`
        };
    };

    // Helper to escape HTML and prevent XSS
    const escapeHTML = (str) => {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    // Parse todo title, escape it, and replace hashtag words with dynamic styled chips
    const parseTitleWithHashtags = (title) => {
        const escaped = escapeHTML(title);
        return escaped.replace(/(^|\s)(#([a-zA-Z0-9_-]+))/g, (match, space, hashtag, word) => {
            const color = stringToColor(word.toLowerCase());
            return `${space}<span class="hashtag-chip" style="background-color: ${color};">${hashtag}</span>`;
        });
    };

    // Extract unique tags from todo titles in the current active folder
    const getUniqueTags = () => {
        const tags = new Set();
        todos.forEach(todo => {
            if (todo.folderId !== activeFolderId) return;
            const matches = todo.title.match(/(?:^|\s)#([a-zA-Z0-9_-]+)/g);
            if (matches) {
                matches.forEach(match => {
                    tags.add(match.trim().toLowerCase().substring(1));
                });
            }
        });
        return Array.from(tags).sort();
    };

    // Check if todo matches active filters
    const matchesFilters = (todo) => {
        if (activeFilters.size === 0) return true;
        const matches = todo.title.match(/(?:^|\s)#([a-zA-Z0-9_-]+)/g);
        if (!matches) return false;
        const todoTags = matches.map(m => m.trim().toLowerCase().substring(1));
        return todoTags.some(tag => activeFilters.has(tag));
    };

    // Update filter UI checkbox list
    const updateFilters = () => {
        const uniqueTags = getUniqueTags();
        
        activeFilters.forEach(tag => {
            if (!uniqueTags.includes(tag)) {
                activeFilters.delete(tag);
            }
        });

        if (uniqueTags.length === 0) {
            tagFiltersContainer.classList.remove('visible');
            tagFiltersContainer.innerHTML = '';
            return;
        }

        tagFiltersContainer.classList.add('visible');

        tagFiltersContainer.innerHTML = uniqueTags.map(tag => {
            const isChecked = activeFilters.has(tag);
            const colorConfig = getTagColorConfig(tag);
            return `
                <label class="tag-filter-item" style="--tag-bg-color: ${colorConfig.color}; --tag-bg-inactive: ${colorConfig.inactive}; --tag-bg-inactive-hover: ${colorConfig.inactiveHover}; --tag-bg-border: ${colorConfig.border}; --tag-glow-color: ${colorConfig.glow};">
                    <input type="checkbox" data-tag="${tag}" ${isChecked ? 'checked' : ''}>
                    <span class="tag-filter-chip">
                        <span class="tag-filter-checkmark"></span>
                        <span class="tag-text">#${tag}</span>
                    </span>
                </label>
            `;
        }).join('');
    };

    tagFiltersContainer.addEventListener('change', (e) => {
        const target = e.target;
        if (target.type === 'checkbox' && target.dataset.tag) {
            const tag = target.dataset.tag;
            if (target.checked) {
                activeFilters.add(tag);
            } else {
                activeFilters.delete(tag);
            }
            renderTodos();
        }
    });

    // Update Header Current Folder Indicator
    const updateFolderHeader = () => {
        const activeFolder = getActiveFolder();
        if (currentFolderName) {
            currentFolderName.textContent = activeFolder.name;
        }
    };

    // Render Small Folder Cards inside the Folders Modal
    const renderFolderCards = () => {
        if (!folderCardsGrid) return;

        folderCardsGrid.innerHTML = folders.map(folder => {
            const isActive = folder.id === activeFolderId;
            const folderTodos = todos.filter(t => t.folderId === folder.id);
            const pendingCount = folderTodos.filter(t => !t.completed).length;
            const completedCount = folderTodos.filter(t => t.completed).length;
            const totalCount = folderTodos.length;

            const statsText = totalCount === 0 
                ? 'EMPTY' 
                : `${pendingCount} PENDING · ${completedCount} DONE`;

            return `
                <div class="folder-card ${isActive ? 'active' : ''}" data-folder-id="${folder.id}" role="button" tabindex="0">
                    <div class="folder-card-top">
                        <div class="folder-card-title-group">
                            <span class="folder-card-name" title="${escapeHTML(folder.name)}">${escapeHTML(folder.name)}</span>
                            ${isActive ? '<span class="folder-card-badge">Active</span>' : ''}
                        </div>
                        ${!folder.isDefault ? `
                            <button class="folder-card-delete" data-delete-id="${folder.id}" title="Delete folder" aria-label="Delete ${escapeHTML(folder.name)} folder">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        ` : ''}
                    </div>
                    <div class="folder-card-stats">
                        <span>${statsText}</span>
                    </div>
                </div>
            `;
        }).join('');
    };

    // Folders Modal Controls
    const openFoldersModal = () => {
        foldersModalOverlay.classList.add('active');
        renderFolderCards();
        createFolderInput.value = '';
        setTimeout(() => {
            createFolderInput.focus();
        }, 50);
    };

    const closeFoldersModal = () => {
        foldersModalOverlay.classList.remove('active');
    };

    folderBtn.addEventListener('click', openFoldersModal);
    activeFolderIndicator.addEventListener('click', openFoldersModal);
    foldersCloseBtn.addEventListener('click', closeFoldersModal);

    foldersModalOverlay.addEventListener('click', (e) => {
        if (e.target === foldersModalOverlay) {
            closeFoldersModal();
        }
    });

    // Create New Folder
    createFolderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = createFolderInput.value.trim();
        if (!name) return;

        const existing = folders.find(f => f.name.toLowerCase() === name.toLowerCase());
        if (existing) {
            activeFolderId = existing.id;
        } else {
            const newId = `folder-${Date.now()}`;
            folders.push({
                id: newId,
                name: name,
                isDefault: false
            });
            activeFolderId = newId;
            saveFolders();
        }

        saveActiveFolder();
        activeFilters.clear();
        updateFolderHeader();
        updateFilters();
        renderTodos();
        closeFoldersModal();
    });

    // Card Click & Delete Event Delegation
    folderCardsGrid.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.folder-card-delete');
        if (deleteBtn) {
            e.stopPropagation();
            const folderIdToDelete = deleteBtn.dataset.deleteId;
            if (folderIdToDelete && folderIdToDelete !== DEFAULT_FOLDER_ID) {
                // Safely migrate tasks from deleted folder to default inbox
                todos = todos.map(todo => {
                    if (todo.folderId === folderIdToDelete) {
                        return { ...todo, folderId: DEFAULT_FOLDER_ID };
                    }
                    return todo;
                });

                folders = folders.filter(f => f.id !== folderIdToDelete);
                if (activeFolderId === folderIdToDelete) {
                    activeFolderId = DEFAULT_FOLDER_ID;
                }

                saveFolders();
                saveTodos();
                saveActiveFolder();
                activeFilters.clear();
                updateFolderHeader();
                renderFolderCards();
                updateFilters();
                renderTodos();
            }
            return;
        }

        const card = e.target.closest('.folder-card');
        if (card && card.dataset.folderId) {
            const selectedFolderId = card.dataset.folderId;
            if (selectedFolderId !== activeFolderId) {
                activeFolderId = selectedFolderId;
                saveActiveFolder();
                activeFilters.clear();
                updateFolderHeader();
                updateFilters();
                renderTodos();
            }
            closeFoldersModal();
        }
    });

    // Render Todos
    const renderTodos = () => {
        todoList.innerHTML = '';
        const currentFolderTodos = todos.filter(t => t.folderId === activeFolderId);
        
        if (currentFolderTodos.length >= 2) {
            clearAllBtn.classList.add('visible');
        } else {
            clearAllBtn.classList.remove('visible');
        }
        
        const filteredTodos = currentFolderTodos.filter(matchesFilters);
        
        if (filteredTodos.length === 0) {
            const activeFolder = getActiveFolder();
            if (currentFolderTodos.length === 0) {
                emptyState.textContent = activeFolder.isDefault 
                    ? 'No tasks for today.' 
                    : `No tasks in ${activeFolder.name}.`;
            } else {
                emptyState.textContent = 'No tasks matching selected filters.';
            }
            emptyState.classList.add('active');
        } else {
            emptyState.classList.remove('active');
            todos.forEach((todo, index) => {
                if (todo.folderId !== activeFolderId) {
                    return;
                }
                if (activeFilters.size > 0 && !matchesFilters(todo)) {
                    return;
                }
                
                const todoItem = document.createElement('div');
                todoItem.className = `todo-item ${todo.completed ? 'completed' : ''}`;
                todoItem.innerHTML = `
                    <label class="checkbox-container">
                        <input type="checkbox" ${todo.completed ? 'checked' : ''} data-index="${index}">
                        <span class="checkmark"></span>
                    </label>
                    <span class="todo-title">${parseTitleWithHashtags(todo.title)}</span>
                    <button class="icon-btn delete-btn" data-index="${index}" aria-label="Delete todo">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                `;
                todoList.appendChild(todoItem);
            });
        }
        saveTodos();
    };

    // Todo Modal Controls
    const openModal = () => {
        modalOverlay.classList.add('active');
        const activeFolder = getActiveFolder();
        if (modalFolderIndicator) {
            modalFolderIndicator.innerHTML = `Folder: <span class="folder-badge">${escapeHTML(activeFolder.name)}</span>`;
        }
        todoInput.value = '';
        setTimeout(() => {
            todoInput.focus();
        }, 50);
    };

    const closeModal = () => {
        modalOverlay.classList.remove('active');
    };

    addBtn.addEventListener('click', openModal);
    cancelBtn.addEventListener('click', closeModal);

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });

    const addTodo = () => {
        const title = todoInput.value.trim();
        if (title) {
            todos.push({
                title,
                completed: false,
                folderId: activeFolderId
            });
            saveTodos();
            updateFilters();
            renderTodos();
            closeModal();
        }
    };

    confirmBtn.addEventListener('click', addTodo);
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });

    // Event Delegation for list actions
    todoList.addEventListener('click', (e) => {
        const target = e.target;
        
        // Toggle Checkbox
        if (target.type === 'checkbox') {
            const todoItem = target.closest('.todo-item');
            const originalIndex = parseInt(target.dataset.index, 10);
            
            if (!isNaN(originalIndex) && originalIndex >= 0 && originalIndex < todos.length) {
                todos[originalIndex].completed = target.checked;
                
                if (target.checked) {
                    todoItem.classList.add('completed');
                } else {
                    todoItem.classList.remove('completed');
                }
                saveTodos();
            }
        }
        
        // Delete Button
        const deleteBtn = target.closest('.delete-btn');
        if (deleteBtn) {
            const todoItem = deleteBtn.closest('.todo-item');
            const originalIndex = parseInt(deleteBtn.dataset.index, 10);
            
            if (!isNaN(originalIndex) && originalIndex >= 0 && originalIndex < todos.length) {
                todoItem.style.pointerEvents = 'none';
                todoItem.classList.add('deleting');
                
                setTimeout(() => {
                    todos.splice(originalIndex, 1);
                    saveTodos();
                    updateFilters();
                    renderTodos();
                }, 280);
            }
        }
    });

    // Clear All Button Logic
    clearAllBtn.addEventListener('click', () => {
        const items = document.querySelectorAll('.todo-item');
        items.forEach(item => {
            item.style.pointerEvents = 'none';
            item.classList.add('deleting');
        });
        
        setTimeout(() => {
            todos = todos.filter(t => t.folderId !== activeFolderId);
            saveTodos();
            updateFilters();
            renderTodos();
        }, 280);
    });

    // Folder cycling helper for keyboard shortcuts
    const cycleFolder = (direction) => {
        if (folders.length <= 1) return;
        const currentIndex = folders.findIndex(f => f.id === activeFolderId);
        if (currentIndex === -1) return;
        const nextIndex = (currentIndex + direction + folders.length) % folders.length;
        activeFolderId = folders[nextIndex].id;
        saveActiveFolder();
        activeFilters.clear();
        updateFolderHeader();
        updateFilters();
        renderTodos();
    };

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        // Handle modal escapes
        if (foldersModalOverlay.classList.contains('active')) {
            if (e.key === 'Escape') {
                closeFoldersModal();
                return;
            }
        }

        if (modalOverlay.classList.contains('active')) {
            if (e.key === 'Escape') {
                closeModal();
                return;
            }
        }

        // Avoid triggering shortcuts if user is typing in any input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        const key = e.key.toLowerCase();

        // 'a' - Open Add Task Modal
        if (key === 'a') {
            e.preventDefault();
            openModal();
        }
        // 'f' - Open Folders Modal
        else if (key === 'f') {
            e.preventDefault();
            openFoldersModal();
        }
        // '[' - Previous Folder
        else if (e.key === '[') {
            e.preventDefault();
            cycleFolder(-1);
        }
        // ']' - Next Folder
        else if (e.key === ']') {
            e.preventDefault();
            cycleFolder(1);
        }
        // 'c' - Clear All Todos in active folder
        else if (key === 'c') {
            clearAllBtn.click();
        }
        // '1'-'9' - Toggle ith Todo in current view
        else if (key >= '1' && key <= '9') {
            const index = parseInt(key) - 1;
            const checkboxes = todoList.querySelectorAll('input[type="checkbox"]');
            if (checkboxes[index]) {
                checkboxes[index].click();
            }
        }
    });

    // Initial render
    updateFolderHeader();
    updateFilters();
    renderTodos();
});
