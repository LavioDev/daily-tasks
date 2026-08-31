import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { ChecklistEntry, Subtask } from '@/types'

const STORAGE_KEY = 'dailytasks_checklist'
const LEGACY_DAILY_ENTRIES_KEY = 'dailytasks_daily_entries'

export const useChecklistStore = defineStore('checklist', () => {
  const entries = ref<ChecklistEntry[]>([])

  // Load from localStorage safely
  try {
    const savedEntries = localStorage.getItem(STORAGE_KEY)
    if (savedEntries) {
      entries.value = JSON.parse(savedEntries)
    }

    // Migration: merge legacy daily entries if present
    const legacyEntries = localStorage.getItem(LEGACY_DAILY_ENTRIES_KEY)
    if (legacyEntries) {
      try {
        const parsedLegacy = JSON.parse(legacyEntries) as ChecklistEntry[]
        if (Array.isArray(parsedLegacy)) {
          for (const item of parsedLegacy) {
            const exists = entries.value.some(e => e.taskId === item.taskId && e.date === item.date && e.subtaskId === item.subtaskId)
            if (!exists) {
              entries.value.push(item)
            }
          }
        }
      } catch (err) {
        console.error('Failed to parse legacy daily entries', err)
      }
      localStorage.removeItem(LEGACY_DAILY_ENTRIES_KEY)
    }
  } catch (e) {
    console.error('Failed to load checklist entries from localStorage', e)
  }

  // Watch for changes and save to localStorage safely
  watch(entries, (newEntries) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries))
    } catch (e) {
      console.error('Failed to save checklist entries to localStorage', e)
      handleQuotaError(e)
    }
  }, { deep: true })

  // Check state helpers
  function isTaskCompleted(taskId: string, date: string): boolean {
    return entries.value.some(
      e => e.taskId === taskId && !e.subtaskId && e.date === date && e.progress === 100
    )
  }

  function isSubtaskCompleted(subtaskId: string, date: string): boolean {
    return entries.value.some(
      e => e.subtaskId === subtaskId && e.date === date && e.progress === 100
    )
  }

  // Direct Task Toggle
  function toggleEntry(taskId: string, date: string) {
    const existing = entries.value.find((e) => e.taskId === taskId && !e.subtaskId && e.date === date)
    
    if (existing) {
      if (existing.progress === 100) {
        existing.progress = 0
        existing.completedAt = null
      } else {
        existing.progress = 100
        existing.completedAt = new Date().toISOString()
      }
    } else {
      const newEntry: ChecklistEntry = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
        taskId,
        subtaskId: null,
        date,
        progress: 100,
        completedAt: new Date().toISOString()
      }
      entries.value.push(newEntry)
    }
  }

  // Set explicit status for a task
  function setTaskProgress(taskId: string, date: string, progress: number) {
    const existing = entries.value.find((e) => e.taskId === taskId && !e.subtaskId && e.date === date)
    if (existing) {
      existing.progress = progress
      existing.completedAt = progress === 100 ? new Date().toISOString() : null
    } else if (progress > 0) {
      entries.value.push({
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
        taskId,
        subtaskId: null,
        date,
        progress,
        completedAt: new Date().toISOString()
      })
    }
  }

  // Set explicit status for a subtask
  function setSubtaskProgress(taskId: string, subtaskId: string, date: string, progress: number) {
    const existing = entries.value.find((e) => e.subtaskId === subtaskId && e.date === date)
    if (existing) {
      existing.progress = progress
      existing.completedAt = progress === 100 ? new Date().toISOString() : null
    } else if (progress > 0) {
      entries.value.push({
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
        taskId,
        subtaskId,
        date,
        progress,
        completedAt: new Date().toISOString()
      })
    }
  }

  // Subtask toggle with Auto-complete of parent Task
  function toggleSubtaskEntry(taskId: string, subtaskId: string, date: string, allSubtasksOfTask: Subtask[]) {
    // 1. Toggle this subtask
    const isDone = isSubtaskCompleted(subtaskId, date)
    setSubtaskProgress(taskId, subtaskId, date, isDone ? 0 : 100)

    // 2. Check if all subtasks are now completed for this date
    if (allSubtasksOfTask.length > 0) {
      const allDone = allSubtasksOfTask.every(st => {
        if (st.id === subtaskId) {
          return !isDone
        }
        return isSubtaskCompleted(st.id, date)
      })

      // 3. Mark parent task as completed if all subtasks are done, otherwise mark incomplete
      setTaskProgress(taskId, date, allDone ? 100 : 0)
    }
  }

  // Toggle parent task and propagate to all its subtasks
  function toggleTaskWithSubtasks(taskId: string, date: string, allSubtasksOfTask: Subtask[]) {
    const currentlyDone = isTaskCompleted(taskId, date)
    const targetProgress = currentlyDone ? 0 : 100

    // Set parent task
    setTaskProgress(taskId, date, targetProgress)

    // Set all subtasks
    for (const st of allSubtasksOfTask) {
      setSubtaskProgress(taskId, st.id, date, targetProgress)
    }
  }

  function deleteEntriesForTask(taskId: string) {
    entries.value = entries.value.filter((e) => e.taskId !== taskId)
  }

  function deleteEntriesForSubtask(subtaskId: string) {
    entries.value = entries.value.filter((e) => e.subtaskId !== subtaskId)
  }

  return {
    entries,
    isTaskCompleted,
    isSubtaskCompleted,
    toggleEntry,
    setTaskProgress,
    setSubtaskProgress,
    toggleSubtaskEntry,
    toggleTaskWithSubtasks,
    deleteEntriesForTask,
    deleteEntriesForSubtask
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
