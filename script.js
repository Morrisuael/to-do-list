(function () {
  "use strict";

  const STORAGE_KEY = "todo-list:tasks";

  // --- State ---
  let tasks = loadTasks();
  let currentFilter = "all";

  // --- DOM refs ---
  const form = document.getElementById("add-form");
  const input = document.getElementById("task-input");
  const list = document.getElementById("task-list");
  const emptyState = document.getElementById("empty-state");
  const itemsLeft = document.getElementById("items-left");
  const clearCompletedBtn = document.getElementById("clear-completed");
  const filterButtons = document.querySelectorAll(".filter");

  // --- Storage helpers ---
  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isValidTask).map(normalizeTask);
    } catch (e) {
      return [];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      // Storage may be unavailable; fail silently.
    }
  }

  function isValidTask(t) {
    return (
      t &&
      typeof t === "object" &&
      typeof t.id === "string" &&
      typeof t.text === "string" &&
      t.text.trim().length > 0 &&
      typeof t.completed === "boolean"
    );
  }

  function normalizeTask(t) {
    return {
      id: t.id,
      text: t.text.trim(),
      completed: t.completed,
    };
  }

  function generateId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "task-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
  }

  // --- XSS-safe text insertion ---
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Rendering ---
  function filteredTasks() {
    if (currentFilter === "active") return tasks.filter((t) => !t.completed);
    if (currentFilter === "completed") return tasks.filter((t) => t.completed);
    return tasks;
  }

  function render() {
    const visible = filteredTasks();
    list.innerHTML = "";

    if (visible.length === 0) {
      emptyState.hidden = false;
      if (tasks.length === 0) {
        emptyState.querySelector("p").textContent = "No tasks yet. Add one above!";
      } else if (currentFilter === "active") {
        emptyState.querySelector("p").textContent = "No active tasks. Nice work!";
      } else if (currentFilter === "completed") {
        emptyState.querySelector("p").textContent = "No completed tasks yet.";
      } else {
        emptyState.querySelector("p").textContent = "No tasks to show.";
      }
    } else {
      emptyState.hidden = true;
    }

    const fragment = document.createDocumentFragment();
    visible.forEach((task) => {
      const li = document.createElement("li");
      li.className = "task" + (task.completed ? " is-completed" : "");
      li.dataset.id = task.id;

      li.innerHTML = `
        <input
          type="checkbox"
          class="task__checkbox"
          ${task.completed ? "checked" : ""}
          aria-label="Mark task as ${task.completed ? "incomplete" : "complete"}"
        >
        <span class="task__text">${escapeHtml(task.text)}</span>
        <button type="button" class="task__delete" aria-label="Delete task">&times;</button>
      `;

      fragment.appendChild(li);
    });
    list.appendChild(fragment);

    updateFooter();
  }

  function updateFooter() {
    const remaining = tasks.filter((t) => !t.completed).length;
    itemsLeft.textContent =
      remaining === 1 ? "1 item left" : remaining + " items left";

    const hasCompleted = tasks.some((t) => t.completed);
    clearCompletedBtn.disabled = !hasCompleted;
  }

  // --- Actions ---
  function addTask(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    tasks.unshift({
      id: generateId(),
      text: trimmed,
      completed: false,
    });
    saveTasks();
    render();
  }

  function toggleTask(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    task.completed = !task.completed;
    saveTasks();
    render();
  }

  function deleteTask(id) {
    tasks = tasks.filter((t) => t.id !== id);
    saveTasks();
    render();
  }

  function clearCompleted() {
    tasks = tasks.filter((t) => !t.completed);
    saveTasks();
    render();
  }

  function setFilter(filter) {
    currentFilter = filter;
    filterButtons.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.filter === filter);
    });
    render();
  }

  // --- Event listeners ---
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    addTask(input.value);
    input.value = "";
    input.focus();
  });

  list.addEventListener("click", (e) => {
    const li = e.target.closest(".task");
    if (!li) return;
    const id = li.dataset.id;

    if (e.target.classList.contains("task__delete")) {
      deleteTask(id);
    }
  });

  list.addEventListener("change", (e) => {
    if (e.target.classList.contains("task__checkbox")) {
      const li = e.target.closest(".task");
      if (li) toggleTask(li.dataset.id);
    }
  });

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => setFilter(btn.dataset.filter));
  });

  clearCompletedBtn.addEventListener("click", clearCompleted);

  // --- Init ---
  render();
})();
