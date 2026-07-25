import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { ChecklistEntry } from '@/types'

export const useChecklistStore = defineStore('checklist', () => {
  const entries = ref<ChecklistEntry[]>([])

  // Load from localStorage safely
  try {
    const savedEntries = localStorage.getItem('dailytasks_checklist')
    if (savedEntries) {
      entries.value = JSON.parse(savedEntries)
    }
  } catch (e) {
    console.error('Failed to load checklist entries from localStorage', e)
  }

  // Watch for changes and save to localStorage safely
  watch(entries, (newEntries) => {
    try {
      localStorage.setItem('dailytasks_checklist', JSON.stringify(newEntries))
    } catch (e) {
      console.error('Failed to save checklist entries to localStorage', e)
      handleQuotaError(e)
    }
  }, { deep: true })

  // Actions
  function toggleEntry(taskId: string, date: string) {
    const existing = entries.value.find((e) => e.taskId === taskId && e.date === date)
    
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
        date,
        progress: 100,
        completedAt: new Date().toISOString()
      }
      entries.value.push(newEntry)
    }
  }

  function deleteEntriesForTask(taskId: string) {
    entries.value = entries.value.filter((e) => e.taskId !== taskId)
  }

  return {
    entries,
    toggleEntry,
    deleteEntriesForTask
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
