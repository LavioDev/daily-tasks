import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useTaskStore } from '@/stores/taskStore'
import { useChecklistStore } from '@/stores/checklistStore'

export const useDailyTaskStore = defineStore('dailyTasks', () => {
  const taskStore = useTaskStore()
  const checklistStore = useChecklistStore()

  // Proxies to unified stores
  const tasks = computed(() => taskStore.dailyTasks)
  const entries = computed(() => checklistStore.entries)

  function addTask(title: string, dateStr?: string) {
    taskStore.addTask(title, 'daily', { dateStr })
  }

  function updateTask(id: string, updates: { title?: string; duration?: number | null; timeSpent?: number }) {
    taskStore.updateTask(id, updates)
  }

  function deleteTask(id: string) {
    taskStore.deleteTask(id)
  }

  function toggleEntry(taskId: string, date: string) {
    checklistStore.toggleEntry(taskId, date)
  }

  return {
    tasks,
    entries,
    addTask,
    updateTask,
    deleteTask,
    toggleEntry
  }
})
