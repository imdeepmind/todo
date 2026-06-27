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

    let todos = JSON.parse(localStorage.getItem('todos')) || [];
    let isDarkMode = localStorage.getItem('theme') === 'dark';

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

    // Convert a word to a deterministic, high-contrast HSL color (One-to-One / Collision-resistant)
    const stringToColor = (word) => {
        let hash = 0;
        for (let i = 0; i < word.length; i++) {
            hash = word.charCodeAt(i) + ((hash << 5) - hash);
        }
        // Map hash to a hue value in [0, 359]
        const hue = Math.abs(hash) % 360;
        // Vary saturation (70-85%) and lightness (40-50%) to expand unique color combinations
        const sat = 70 + (Math.abs(hash >> 3) % 15);
        const light = 40 + (Math.abs(hash >> 6) % 10);
        return `hsl(${hue}, ${sat}%, ${light}%)`;
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
        // Matches '#word' preceded by start of string or whitespace
        return escaped.replace(/(^|\s)(#([a-zA-Z0-9_-]+))/g, (match, space, hashtag, word) => {
            const color = stringToColor(word.toLowerCase()); // Case-insensitive color generation
            return `${space}<span class="hashtag-chip" style="background-color: ${color};">${hashtag}</span>`;
        });
    };

    // Render Todos
    const renderTodos = () => {
        todoList.innerHTML = '';
        
        if (todos.length >= 2) {
            clearAllBtn.classList.add('visible');
        } else {
            clearAllBtn.classList.remove('visible');
        }
        
        if (todos.length === 0) {
            emptyState.classList.add('active');
        } else {
            emptyState.classList.remove('active');
            todos.forEach((todo, index) => {
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

    const saveTodos = () => {
        localStorage.setItem('todos', JSON.stringify(todos));
    };

    // Modal Controls
    const openModal = () => {
        modalOverlay.classList.add('active');
        todoInput.value = '';
        // Use a small timeout to ensure the element is focusable after visibility changes
        setTimeout(() => {
            todoInput.focus();
        }, 50);
    };

    const closeModal = () => {
        modalOverlay.classList.remove('active');
    };

    addBtn.addEventListener('click', openModal);
    cancelBtn.addEventListener('click', closeModal);

    const addTodo = () => {
        const title = todoInput.value.trim();
        if (title) {
            todos.push({ title, completed: false });
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
            const currentIndex = Array.from(todoList.children).indexOf(todoItem);
            
            if (currentIndex !== -1) {
                todos[currentIndex].completed = target.checked;
                
                // Animate smoothly without re-rendering the entire list
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
            const currentIndex = Array.from(todoList.children).indexOf(todoItem);
            
            if (currentIndex !== -1) {
                // Prevent further interactions during animation
                todoItem.style.pointerEvents = 'none';
                todoItem.classList.add('deleting');
                
                setTimeout(() => {
                    todos.splice(currentIndex, 1);
                    renderTodos();
                }, 280); // Wait for fadeOut animation
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
            todos = [];
            renderTodos();
        }, 280);
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        // Disable shortcuts if modal is open
        if (modalOverlay.classList.contains('active')) {
            if (e.key === 'Escape') closeModal();
            return;
        }

        // Avoid triggering shortcuts if the user is typing in any input (safety check)
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        const key = e.key.toLowerCase();

        // 'a' - Open Add Task Modal
        if (key === 'a') {
            e.preventDefault();
            openModal();
        }
        // 'c' - Clear All Todos
        else if (key === 'c') {
            clearAllBtn.click();
        }
        // '1'-'9' - Toggle ith Todo
        else if (key >= '1' && key <= '9') {
            const index = parseInt(key) - 1;
            const checkboxes = todoList.querySelectorAll('input[type="checkbox"]');
            if (checkboxes[index]) {
                checkboxes[index].click();
            }
        }
    });

    // Initial render
    renderTodos();
});
