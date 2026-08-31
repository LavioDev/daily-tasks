import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue'
import type { Project, Phase, ProjectStatus } from '@/types'

const STORAGE_PROJECTS = 'dailytasks_projects'
const STORAGE_PHASES = 'dailytasks_phases'
const DEFAULT_PROJECT_COLOR = '#7c3aed'

export const useProjectStore = defineStore('projects', () => {
  const projects = ref<Project[]>(load(STORAGE_PROJECTS, []))
  const phases = ref<Phase[]>(load(STORAGE_PHASES, []))

  // Watch for changes and save to localStorage safely
  watch(projects, (val) => {
    try {
      localStorage.setItem(STORAGE_PROJECTS, JSON.stringify(val))
    } catch (e) {
      console.error('Failed to save projects to localStorage', e)
      handleQuotaError(e)
    }
  }, { deep: true })

  watch(phases, (val) => {
    try {
      localStorage.setItem(STORAGE_PHASES, JSON.stringify(val))
    } catch (e) {
      console.error('Failed to save phases to localStorage', e)
      handleQuotaError(e)
    }
  }, { deep: true })

  // Project Actions
  function addProject(data: {
    title: string
    description?: string
    color?: string
    startDate?: string
    targetDate?: string
    status?: ProjectStatus
  }): Project {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11)
    const newProject: Project = {
      id,
      title: data.title.trim(),
      description: data.description?.trim() || '',
      color: data.color || DEFAULT_PROJECT_COLOR,
      status: data.status || 'active',
      startDate: data.startDate,
      targetDate: data.targetDate,
      order: projects.value.length,
      createdAt: new Date().toISOString()
    }
    projects.value.push(newProject)
    return newProject
  }

  function updateProject(id: string, updates: Partial<Project>) {
    const project = projects.value.find(p => p.id === id)
    if (project) {
      if (updates.title !== undefined) project.title = updates.title.trim()
      if (updates.description !== undefined) project.description = updates.description.trim()
      if (updates.color !== undefined) project.color = updates.color
      if (updates.status !== undefined) project.status = updates.status
      if (updates.startDate !== undefined) project.startDate = updates.startDate
      if (updates.targetDate !== undefined) project.targetDate = updates.targetDate
      if (updates.order !== undefined) project.order = updates.order
    }
  }

  function deleteProject(id: string) {
    projects.value = projects.value.filter(p => p.id !== id)
    phases.value = phases.value.filter(ph => ph.projectId !== id)
  }

  // Phase Actions
  function addPhase(
    projectId: string,
    title: string,
    options?: { description?: string; startDate?: string; endDate?: string; isMarked?: boolean }
  ): Phase {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11)
    const projectPhases = phases.value.filter(ph => ph.projectId === projectId)
    const newPhase: Phase = {
      id,
      projectId,
      title: title.trim(),
      description: options?.description?.trim() || '',
      startDate: options?.startDate,
      endDate: options?.endDate,
      isMarked: options?.isMarked || false,
      order: projectPhases.length,
      createdAt: new Date().toISOString()
    }
    phases.value.push(newPhase)
    return newPhase
  }

  function updatePhase(id: string, updates: Partial<Phase>) {
    const phase = phases.value.find(ph => ph.id === id)
    if (phase) {
      if (updates.title !== undefined) phase.title = updates.title.trim()
      if (updates.description !== undefined) phase.description = updates.description.trim()
      if (updates.startDate !== undefined) phase.startDate = updates.startDate
      if (updates.endDate !== undefined) phase.endDate = updates.endDate
      if (updates.isMarked !== undefined) phase.isMarked = updates.isMarked
      if (updates.order !== undefined) phase.order = updates.order
    }
  }

  function togglePhaseMark(phaseId: string): boolean {
    const phase = phases.value.find(ph => ph.id === phaseId)
    if (phase) {
      phase.isMarked = !phase.isMarked
      return phase.isMarked
    }
    return false
  }

  function deletePhase(id: string) {
    phases.value = phases.value.filter(ph => ph.id !== id)
  }

  function reorderPhases(projectId: string, orderedIds: string[]) {
    orderedIds.forEach((id, index) => {
      const phase = phases.value.find(ph => ph.id === id && ph.projectId === projectId)
      if (phase) {
        phase.order = index
      }
    })
  }

  // Getters
  const activeProjects = computed(() => projects.value.filter(p => p.status === 'active'))

  function getProjectById(id: string) {
    return projects.value.find(p => p.id === id)
  }

  function getPhasesByProject(projectId: string) {
    return phases.value
      .filter(ph => ph.projectId === projectId)
      .sort((a, b) => a.order - b.order)
  }

  return {
    projects,
    phases,
    activeProjects,
    addProject,
    updateProject,
    deleteProject,
    addPhase,
    updatePhase,
    togglePhaseMark,
    deletePhase,
    reorderPhases,
    getProjectById,
    getPhasesByProject
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
