import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { ChecklistEntry, Task } from '@/types'

const STORAGE_TASKS = 'dailytasks_daily_tasks'
const STORAGE_ENTRIES = 'dailytasks_daily_entries'
const THEME_PURPLE = '#7c3aed'

export const useDailyTaskStore = defineStore('dailyTasks', () => {
  const tasks = ref<Task[]>(load(STORAGE_TASKS, []))
  const entries = ref<ChecklistEntry[]>(load(STORAGE_ENTRIES, []))

  watch(tasks, value => {
    try {
      localStorage.setItem(STORAGE_TASKS, JSON.stringify(value))
    } catch (e) {
      console.error('Failed to save daily tasks to localStorage', e)
      handleQuotaError(e)
    }
  }, { deep: true })

  watch(entries, value => {
    try {
      localStorage.setItem(STORAGE_ENTRIES, JSON.stringify(value))
    } catch (e) {
      console.error('Failed to save daily entries to localStorage', e)
      handleQuotaError(e)
    }
  }, { deep: true })

  function addTask(title: string, dateStr?: string) {
    const now = new Date()
    const taskDate = dateStr || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const timePart = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`
    tasks.value.push({
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
      title: title.trim(), color: THEME_PURPLE, createdAt: `${taskDate}T${timePart}`,
      duration: null, timeSpent: 0
    })
  }

  function updateTask(id: string, updates: { title?: string; duration?: number | null; timeSpent?: number }) {
    const task = tasks.value.find(item => item.id === id)
    if (task) {
      if (updates.title !== undefined) task.title = updates.title.trim()
      if (updates.duration !== undefined) task.duration = updates.duration
      if (updates.timeSpent !== undefined) task.timeSpent = updates.timeSpent
    }
  }

  function deleteTask(id: string) {
    tasks.value = tasks.value.filter(task => task.id !== id)
    entries.value = entries.value.filter(entry => entry.taskId !== id)
  }

  function toggleEntry(taskId: string, date: string) {
    const entry = entries.value.find(item => item.taskId === taskId && item.date === date)
    if (entry) {
      entry.progress = entry.progress === 100 ? 0 : 100
      entry.completedAt = entry.progress === 100 ? new Date().toISOString() : null
      return
    }
    entries.value.push({
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
      taskId, date, progress: 100, completedAt: new Date().toISOString()
    })
  }

  return { tasks, entries, addTask, updateTask, deleteTask, toggleEntry }
})

function load<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key)
    if (!saved) return fallback
    return JSON.parse(saved) as T
  } catch (error) {
    console.error(`Failed to load ${key} from localStorage`, error)
    return fallback
  }
}

function handleQuotaError(e: any) {
  if (e instanceof DOMException && (
    e.name === 'QuotaExceededError' ||
    e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
  )) {
    alert('Bộ nhớ trình duyệt (localStorage) đã đầy. Tiến trình của bạn có thể không được lưu.')
  }
}
