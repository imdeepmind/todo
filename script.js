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

    // Render Todos
    const renderTodos = () => {
        todoList.innerHTML = '';
        
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
                    <span class="todo-title">${todo.title}</span>
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
        todoInput.focus();
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
            const index = target.getAttribute('data-index');
            todos[index].completed = target.checked;
            renderTodos();
        }
        
        // Delete Button
        const deleteBtn = target.closest('.delete-btn');
        if (deleteBtn) {
            const index = deleteBtn.getAttribute('data-index');
            todos.splice(index, 1);
            renderTodos();
        }
    });

    // Initial render
    renderTodos();
});
