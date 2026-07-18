import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { ChecklistEntry, Task } from '@/types'

const STORAGE_TASKS = 'dailytasks_daily_tasks'
const STORAGE_ENTRIES = 'dailytasks_daily_entries'
const THEME_PURPLE = '#7c3aed'

export const useDailyTaskStore = defineStore('dailyTasks', () => {
  const tasks = ref<Task[]>(load(STORAGE_TASKS, []))
  const entries = ref<ChecklistEntry[]>(load(STORAGE_ENTRIES, []))

  watch(tasks, value => localStorage.setItem(STORAGE_TASKS, JSON.stringify(value)), { deep: true })
  watch(entries, value => localStorage.setItem(STORAGE_ENTRIES, JSON.stringify(value)), { deep: true })

  function addTask(title: string) {
    tasks.value.push({
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
      title: title.trim(), color: THEME_PURPLE, createdAt: new Date().toISOString()
    })
  }

  function updateTaskTitle(id: string, title: string) {
    const task = tasks.value.find(item => item.id === id)
    if (task) task.title = title.trim()
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

  return { tasks, entries, addTask, updateTaskTitle, deleteTask, toggleEntry }
})

function load<T>(key: string, fallback: T): T {
  const saved = localStorage.getItem(key)
  if (!saved) return fallback
  try { return JSON.parse(saved) as T } catch (error) {
    console.error(`Failed to parse ${key}`, error)
    return fallback
  }
}
