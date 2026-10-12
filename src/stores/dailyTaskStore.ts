import { defineStore } from 'pinia'
import { computed } from 'vue'
import type { Task } from '@/types'
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

  function addScheduledTask(title: string, schedule: NonNullable<Task['schedule']>) {
    const duration = (schedule.endMinute - schedule.startMinute) / 60
    return taskStore.addTask(title, 'daily', { dateStr: schedule.date, duration, schedule })
  }

  function updateSchedule(taskId: string, schedule: NonNullable<Task['schedule']>) {
    const task = tasks.value.find(item => item.id === taskId)
    if (!task) return

    const previousDate = task.schedule?.date ?? task.createdAt.slice(0, 10)
    const wasCompleted = checklistStore.isTaskCompleted(taskId, previousDate)
    const duration = (schedule.endMinute - schedule.startMinute) / 60

    taskStore.updateTask(taskId, { schedule, duration })
    if (previousDate !== schedule.date) {
      checklistStore.setTaskProgress(taskId, previousDate, 0)
      checklistStore.setTaskProgress(taskId, schedule.date, wasCompleted ? 100 : 0)
    }
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
    addScheduledTask,
    updateSchedule,
    updateTask,
    deleteTask,
    toggleEntry
  }
})
