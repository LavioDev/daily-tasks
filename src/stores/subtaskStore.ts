import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Subtask } from '@/types'

const STORAGE_SUBTASKS = 'dailytasks_subtasks'

export const useSubtaskStore = defineStore('subtasks', () => {
  const subtasks = ref<Subtask[]>(load(STORAGE_SUBTASKS, []))

  // Watch for changes and save to localStorage safely
  watch(subtasks, (val) => {
    try {
      localStorage.setItem(STORAGE_SUBTASKS, JSON.stringify(val))
    } catch (e) {
      console.error('Failed to save subtasks to localStorage', e)
      handleQuotaError(e)
    }
  }, { deep: true })

  // Actions
  function addSubtask(
    taskId: string,
    title: string,
    options?: { duration?: number | null; timeSpent?: number }
  ): Subtask {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11)
    const existing = subtasks.value.filter(s => s.taskId === taskId)
    const newSubtask: Subtask = {
      id,
      taskId,
      title: title.trim(),
      order: existing.length,
      duration: options?.duration ?? null,
      timeSpent: options?.timeSpent ?? 0,
      createdAt: new Date().toISOString()
    }
    subtasks.value.push(newSubtask)
    return newSubtask
  }

  function updateSubtask(id: string, updates: Partial<Subtask>) {
    const subtask = subtasks.value.find(s => s.id === id)
    if (subtask) {
      if (updates.title !== undefined) subtask.title = updates.title.trim()
      if (updates.duration !== undefined) subtask.duration = updates.duration
      if (updates.timeSpent !== undefined) subtask.timeSpent = updates.timeSpent
      if (updates.order !== undefined) subtask.order = updates.order
    }
  }

  function deleteSubtask(id: string) {
    subtasks.value = subtasks.value.filter(s => s.id !== id)
  }

  function deleteSubtasksByTaskId(taskId: string) {
    subtasks.value = subtasks.value.filter(s => s.taskId !== taskId)
  }

  function reorderSubtasks(taskId: string, orderedIds: string[]) {
    orderedIds.forEach((id, index) => {
      const s = subtasks.value.find(item => item.id === id && item.taskId === taskId)
      if (s) {
        s.order = index
      }
    })
  }

  // Getters
  function getSubtasksByTaskId(taskId: string): Subtask[] {
    return subtasks.value
      .filter(s => s.taskId === taskId)
      .sort((a, b) => a.order - b.order)
  }

  return {
    subtasks,
    addSubtask,
    updateSubtask,
    deleteSubtask,
    deleteSubtasksByTaskId,
    reorderSubtasks,
    getSubtasksByTaskId
  }
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
