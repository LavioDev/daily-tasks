import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Task, TaskType } from '@/types'
import { useChecklistStore } from '@/stores/checklistStore'
import { useSubtaskStore } from '@/stores/subtaskStore'

const THEME_PURPLE = '#7c3aed' // Unified brand purple (violet-600)
const STORAGE_KEY = 'dailytasks_tasks'
const LEGACY_DAILY_TASKS_KEY = 'dailytasks_daily_tasks'

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([])
  const checklistStore = useChecklistStore()
  const subtaskStore = useSubtaskStore()

  // Load from localStorage safely
  try {
    const savedTasks = localStorage.getItem(STORAGE_KEY)
    if (savedTasks) {
      const parsed = JSON.parse(savedTasks) as Task[]
      tasks.value = parsed.map(t => ({
        ...t,
        type: t.type || 'monthly',
        color: t.color || THEME_PURPLE
      }))
    }

    // Migration: merge legacy daily tasks if present
    const legacyDailyTasks = localStorage.getItem(LEGACY_DAILY_TASKS_KEY)
    if (legacyDailyTasks) {
      try {
        const parsedLegacy = JSON.parse(legacyDailyTasks) as Task[]
        if (Array.isArray(parsedLegacy)) {
          for (const item of parsedLegacy) {
            const exists = tasks.value.some(t => t.id === item.id)
            if (!exists) {
              tasks.value.push({
                ...item,
                type: 'daily',
                color: item.color || THEME_PURPLE
              })
            }
          }
        }
      } catch (err) {
        console.error('Failed to parse legacy daily tasks', err)
      }
      localStorage.removeItem(LEGACY_DAILY_TASKS_KEY)
    }
  } catch (e) {
    console.error('Failed to load tasks from localStorage', e)
  }

  // Watch for changes and save to localStorage safely
  watch(tasks, (newTasks) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newTasks))
    } catch (e) {
      console.error('Failed to save tasks to localStorage', e)
      handleQuotaError(e)
    }
  }, { deep: true })

  // Computed subsets
  const monthlyTasks = computed(() => tasks.value.filter(t => t.type === 'monthly' || (!t.type && !t.projectId)))
  const dailyTasks = computed(() => tasks.value.filter(t => t.type === 'daily'))
  const projectTasks = computed(() => tasks.value.filter(t => t.type === 'project' || !!t.projectId))

  // Actions
  function addTask(
    title: string,
    type: TaskType = 'monthly',
    options?: {
      dateStr?: string
      duration?: number | null
      timeSpent?: number
      projectId?: string
      phaseId?: string
      dueDate?: string
      color?: string
    }
  ): Task {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11)
    const now = new Date()

    let createdAt = now.toISOString()
    if (type === 'daily') {
      const taskDate = options?.dateStr || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const timePart = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`
      createdAt = `${taskDate}T${timePart}`
    }

    const newTask: Task = {
      id,
      title: title.trim(),
      color: options?.color || THEME_PURPLE,
      createdAt,
      type,
      projectId: options?.projectId,
      phaseId: options?.phaseId,
      dueDate: options?.dueDate,
      duration: options?.duration ?? null,
      timeSpent: options?.timeSpent ?? 0
    }

    tasks.value.push(newTask)
    return newTask
  }

  function updateTask(id: string, updates: Partial<Task>) {
    const task = tasks.value.find(t => t.id === id)
    if (task) {
      if (updates.title !== undefined) task.title = updates.title.trim()
      if (updates.color !== undefined) task.color = updates.color
      if (updates.type !== undefined) task.type = updates.type
      if (updates.projectId !== undefined) task.projectId = updates.projectId
      if (updates.phaseId !== undefined) task.phaseId = updates.phaseId
      if (updates.dueDate !== undefined) task.dueDate = updates.dueDate
      if (updates.duration !== undefined) task.duration = updates.duration
      if (updates.timeSpent !== undefined) task.timeSpent = updates.timeSpent
    }
  }

  function updateTaskTitle(id: string, title: string) {
    updateTask(id, { title })
  }

  function updateTaskColor(id: string, color: string) {
    updateTask(id, { color })
  }

  function deleteTask(id: string) {
    tasks.value = tasks.value.filter(t => t.id !== id)
    subtaskStore.deleteSubtasksByTaskId(id)
    checklistStore.deleteEntriesForTask(id)
  }

  function deleteTasksForProject(projectId: string) {
    const tasksToDelete = tasks.value.filter(t => t.projectId === projectId)
    for (const t of tasksToDelete) {
      subtaskStore.deleteSubtasksByTaskId(t.id)
      checklistStore.deleteEntriesForTask(t.id)
    }
    tasks.value = tasks.value.filter(t => t.projectId !== projectId)
  }

  function deleteTasksForPhase(phaseId: string) {
    const tasksToDelete = tasks.value.filter(t => t.phaseId === phaseId)
    for (const t of tasksToDelete) {
      subtaskStore.deleteSubtasksByTaskId(t.id)
      checklistStore.deleteEntriesForTask(t.id)
    }
    tasks.value = tasks.value.filter(t => t.phaseId !== phaseId)
  }

  function getTasksByProject(projectId: string): Task[] {
    return tasks.value.filter(t => t.projectId === projectId)
  }

  function getTasksByPhase(phaseId: string): Task[] {
    return tasks.value.filter(t => t.phaseId === phaseId)
  }

  return {
    tasks,
    monthlyTasks,
    dailyTasks,
    projectTasks,
    addTask,
    updateTask,
    updateTaskTitle,
    updateTaskColor,
    deleteTask,
    deleteTasksForProject,
    deleteTasksForPhase,
    getTasksByProject,
    getTasksByPhase
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
