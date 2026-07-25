import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Task } from '@/types'

const THEME_PURPLE = '#7c3aed' // Unified brand purple (violet-600)

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([])

  // Load from localStorage safely
  try {
    const savedTasks = localStorage.getItem('dailytasks_tasks')
    if (savedTasks) {
      const parsed = JSON.parse(savedTasks) as Task[]
      tasks.value = parsed.map(t => ({ ...t, color: THEME_PURPLE }))
    }
  } catch (e) {
    console.error('Failed to load tasks from localStorage', e)
  }

  // Watch for changes and save to localStorage safely
  watch(tasks, (newTasks) => {
    try {
      localStorage.setItem('dailytasks_tasks', JSON.stringify(newTasks))
    } catch (e) {
      console.error('Failed to save tasks to localStorage', e)
      handleQuotaError(e)
    }
  }, { deep: true })

  // Actions
  function addTask(title: string) {
    const newTask: Task = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
      title: title.trim(),
      color: THEME_PURPLE,
      createdAt: new Date().toISOString()
    }
    tasks.value.push(newTask)
    return newTask
  }

  function updateTaskTitle(id: string, title: string) {
    const task = tasks.value.find(t => t.id === id)
    if (task) {
      task.title = title.trim()
    }
  }

  function updateTaskColor(id: string, color: string) {
    const task = tasks.value.find(t => t.id === id)
    if (task) {
      task.color = color
    }
  }

  function deleteTask(id: string) {
    tasks.value = tasks.value.filter(t => t.id !== id)
  }

  return {
    tasks,
    addTask,
    updateTaskTitle,
    updateTaskColor,
    deleteTask
  }
})

function handleQuotaError(e: any) {
  if (e instanceof DOMException && (
    e.name === 'QuotaExceededError' ||
    e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
  )) {
    alert('Bộ nhớ trình duyệt (localStorage) đã đầy. Tiến trình của bạn có thể không được lưu.')
  }
}
