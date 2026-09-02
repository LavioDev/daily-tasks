<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  Check,
  Circle,
  Timer,
  Layers,
  CheckCheck,
  PanelLeftClose,
  PanelLeft
} from '@lucide/vue'
import { useProjectStore } from '@/stores/projectStore'
import { useTaskStore } from '@/stores/taskStore'
import { useSubtaskStore } from '@/stores/subtaskStore'
import { useChecklistStore } from '@/stores/checklistStore'
import type { Project, Phase, Task, Subtask } from '@/types'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()
const taskStore = useTaskStore()
const subtaskStore = useSubtaskStore()
const checklistStore = useChecklistStore()

// Sidebar visibility state
const isSidebarOpen = ref(true)

const projectId = computed(() => route.params.projectId as string)
const project = computed(() => projectStore.getProjectById(projectId.value))

// Selected Date for checking tasks & subtasks
const selectedDate = ref(toDateInput(new Date()))

function toDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function changeDay(offset: number) {
  const date = new Date(`${selectedDate.value}T00:00:00`)
  date.setDate(date.getDate() + offset)
  selectedDate.value = toDateInput(date)
}

// ═══ PHASE STATE & AUTO-SKIP ═══
const currentPhaseIndex = ref(0)

const projectPhases = computed(() => {
  if (!project.value) return []
  return projectStore.getPhasesByProject(project.value.id)
})

const currentPhase = computed<Phase | undefined>(() => {
  if (projectPhases.value.length === 0) return undefined
  if (currentPhaseIndex.value >= projectPhases.value.length) {
    return projectPhases.value[0]
  }
  return projectPhases.value[currentPhaseIndex.value]
})

// Auto-jump to the nearest unmarked phase
function jumpToNearestUnmarkedPhase() {
  const phases = projectPhases.value
  if (phases.length === 0) return

  const firstUnmarkedIndex = phases.findIndex(ph => !ph.isMarked)
  if (firstUnmarkedIndex !== -1) {
    currentPhaseIndex.value = firstUnmarkedIndex
  } else {
    currentPhaseIndex.value = 0
  }
}

onMounted(() => {
  jumpToNearestUnmarkedPhase()
})

watch(projectPhases, (newPhases) => {
  if (currentPhaseIndex.value >= newPhases.length && newPhases.length > 0) {
    currentPhaseIndex.value = newPhases.length - 1
  }
})

function selectPhase(index: number) {
  currentPhaseIndex.value = index
}

function goToPrevPhase() {
  if (currentPhaseIndex.value > 0) {
    currentPhaseIndex.value--
  }
}

function goToNextPhase() {
  if (currentPhaseIndex.value < projectPhases.value.length - 1) {
    currentPhaseIndex.value++
  }
}

// Toggle Phase Mark (with auto-advance to next unmarked phase)
function handleTogglePhaseMark(phase: Phase) {
  const nowMarked = projectStore.togglePhaseMark(phase.id)
  if (nowMarked) {
    const nextUnmarkedIndex = projectPhases.value.findIndex((ph, idx) => idx > currentPhaseIndex.value && !ph.isMarked)
    if (nextUnmarkedIndex !== -1) {
      setTimeout(() => {
        currentPhaseIndex.value = nextUnmarkedIndex
      }, 350)
    }
  }
}

// ═══ PHASE MODALS ═══
const isPhaseModalOpen = ref(false)
const editingPhase = ref<Phase | null>(null)
const phaseTitle = ref('')
const phaseDescription = ref('')
const phaseStartDate = ref('')
const phaseEndDate = ref('')

function openAddPhaseModal() {
  editingPhase.value = null
  phaseTitle.value = ''
  phaseDescription.value = ''
  phaseStartDate.value = selectedDate.value
  phaseEndDate.value = ''
  isPhaseModalOpen.value = true
}

function openEditPhaseModal(phase: Phase, e?: Event) {
  if (e) e.stopPropagation()
  editingPhase.value = phase
  phaseTitle.value = phase.title
  phaseDescription.value = phase.description || ''
  phaseStartDate.value = phase.startDate || ''
  phaseEndDate.value = phase.endDate || ''
  isPhaseModalOpen.value = true
}

function savePhase() {
  if (!phaseTitle.value.trim() || !project.value) return

  if (editingPhase.value) {
    projectStore.updatePhase(editingPhase.value.id, {
      title: phaseTitle.value.trim(),
      description: phaseDescription.value.trim(),
      startDate: phaseStartDate.value || undefined,
      endDate: phaseEndDate.value || undefined
    })
  } else {
    projectStore.addPhase(project.value.id, phaseTitle.value.trim(), {
      description: phaseDescription.value.trim(),
      startDate: phaseStartDate.value || undefined,
      endDate: phaseEndDate.value || undefined
    })
    currentPhaseIndex.value = projectPhases.value.length - 1
  }
  isPhaseModalOpen.value = false
}

function deletePhase(phaseId: string, e?: Event) {
  if (e) e.stopPropagation()
  if (confirm('Xóa giai đoạn này cùng toàn bộ các công việc và nhiệm vụ con bên trong?')) {
    projectStore.deletePhase(phaseId)
    taskStore.deleteTasksForPhase(phaseId)
    if (currentPhaseIndex.value > 0) {
      currentPhaseIndex.value--
    }
  }
}

// ═══ QUICK ADD TASK AT BOTTOM ═══
const quickTaskTitle = ref('')

function handleQuickAddTask() {
  if (!quickTaskTitle.value.trim() || !project.value || !currentPhase.value) return
  taskStore.addTask(quickTaskTitle.value.trim(), 'project', {
    projectId: project.value.id,
    phaseId: currentPhase.value.id,
    dueDate: selectedDate.value,
    color: project.value.color
  })
  quickTaskTitle.value = ''
}

// ═══ TASK EDIT MODAL ═══
const isTaskModalOpen = ref(false)
const editingTask = ref<Task | null>(null)
const taskTitle = ref('')
const taskDuration = ref<number | null>(null)
const taskDueDate = ref('')

function openEditTaskModal(task: Task) {
  editingTask.value = task
  taskTitle.value = task.title
  taskDuration.value = task.duration ?? null
  taskDueDate.value = task.dueDate || ''
  isTaskModalOpen.value = true
}

function saveTask() {
  if (!taskTitle.value.trim() || !editingTask.value) return

  taskStore.updateTask(editingTask.value.id, {
    title: taskTitle.value.trim(),
    duration: taskDuration.value,
    dueDate: taskDueDate.value || undefined
  })
  isTaskModalOpen.value = false
}

function deleteTask(taskId: string) {
  if (confirm('Xóa công việc này và các nhiệm vụ con?')) {
    taskStore.deleteTask(taskId)
  }
}

// ═══ SUBTASK PER TASK ROW STATE ═══
const activeAddingSubtaskId = ref<string | null>(null)
const newSubtaskTitle = ref('')

function startAddSubtask(taskId: string) {
  cancelEditSubtask()
  activeAddingSubtaskId.value = taskId
  newSubtaskTitle.value = ''
}

function submitAddSubtask(taskId: string) {
  if (!newSubtaskTitle.value.trim()) return
  subtaskStore.addSubtask(taskId, newSubtaskTitle.value.trim())
  newSubtaskTitle.value = ''
  activeAddingSubtaskId.value = null
}

function cancelAddSubtask() {
  activeAddingSubtaskId.value = null
  newSubtaskTitle.value = ''
}

function deleteSubtask(subtaskId: string) {
  subtaskStore.deleteSubtask(subtaskId)
  checklistStore.deleteEntriesForSubtask(subtaskId)
}

// ═══ SUBTASK EDIT STATE ═══
const editingSubtaskId = ref<string | null>(null)
const editingSubtaskTitle = ref('')

function startEditSubtask(subtask: Subtask) {
  cancelAddSubtask()
  editingSubtaskId.value = subtask.id
  editingSubtaskTitle.value = subtask.title
}

function saveEditSubtask(subtaskId: string) {
  if (!editingSubtaskTitle.value.trim()) return
  subtaskStore.updateSubtask(subtaskId, {
    title: editingSubtaskTitle.value.trim()
  })
  editingSubtaskId.value = null
  editingSubtaskTitle.value = ''
}

function cancelEditSubtask() {
  editingSubtaskId.value = null
  editingSubtaskTitle.value = ''
}

// ═══ CHECK & AUTO-COMPLETE ═══
function handleTaskToggle(task: Task) {
  const subtasks = subtaskStore.getSubtasksByTaskId(task.id)
  checklistStore.toggleTaskWithSubtasks(task.id, selectedDate.value, subtasks)
}

function handleSubtaskToggle(task: Task, subtask: Subtask) {
  const subtasks = subtaskStore.getSubtasksByTaskId(task.id)
  checklistStore.toggleSubtaskEntry(task.id, subtask.id, selectedDate.value, subtasks)
}

// ═══ STATS HELPERS ═══
const currentPhaseTasks = computed(() => {
  if (!currentPhase.value) return []
  return taskStore.getTasksByPhase(currentPhase.value.id)
})

function getPhaseStats(phaseId: string) {
  const tasks = taskStore.getTasksByPhase(phaseId)
  const completed = tasks.filter(t => checklistStore.isTaskCompleted(t.id, selectedDate.value)).length
  return {
    total: tasks.length,
    completed,
    percent: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0
  }
}

function getTaskSubtaskStats(taskId: string) {
  const subtasks = subtaskStore.getSubtasksByTaskId(taskId)
  const completed = subtasks.filter(s => checklistStore.isSubtaskCompleted(s.id, selectedDate.value)).length
  return {
    total: subtasks.length,
    completed
  }
}

function launchTimer(taskId: string) {
  router.push(`/timer/${taskId}`)
}
</script>

<template>
  <main class="flex-1 bg-slate-50 px-4 py-4 sm:px-6 lg:px-8 w-full flex flex-col">
    <div class="w-full flex-1 flex flex-col gap-3">
      
      <!-- ═══ UNIFIED TOP BAR: PROJECT INFO + DATE PICKER + ADD PHASE ═══ -->
      <div v-if="project" class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 py-1">
        
        <!-- Left: Back link + Project Title -->
        <div class="flex items-center gap-3">
          <RouterLink
            to="/projects"
            class="p-1.5 text-slate-400 hover:text-violet-700 hover:bg-slate-100 transition-colors shrink-0"
            title="Quay lại danh sách Dự án"
          >
            <ChevronLeft class="w-5 h-5" />
          </RouterLink>
          <span class="w-1.5 h-6 shrink-0" :style="{ backgroundColor: project.color }"></span>
          <div>
            <h1 class="text-base font-black uppercase text-slate-800 tracking-tight leading-none">{{ project.title }}</h1>
            <p v-if="project.description" class="text-xs text-slate-400 mt-1 line-clamp-1 leading-none">{{ project.description }}</p>
          </div>
        </div>

        <!-- Right: Combined Date Navigator + Add Phase Button -->
        <div class="flex items-center gap-3 self-end md:self-auto shrink-0">
          <!-- Date Selector -->
          <div class="flex items-center border border-slate-200 bg-white">
            <button @click="changeDay(-1)" class="p-1.5 text-slate-500 hover:bg-slate-100" title="Ngày trước">
              <ChevronLeft class="h-4 w-4" />
            </button>
            <input
              v-model="selectedDate"
              type="date"
              class="h-8 border-0 px-2 text-xs font-bold text-slate-700 outline-none cursor-pointer"
            />
            <button @click="changeDay(1)" class="p-1.5 text-slate-500 hover:bg-slate-100" title="Ngày sau">
              <ChevronRight class="h-4 w-4" />
            </button>
            <button
              @click="selectedDate = toDateInput(new Date())"
              class="h-8 border-l border-slate-200 px-2.5 text-[11px] font-black uppercase tracking-wider text-violet-700 hover:bg-violet-50 transition-colors"
            >
              Hôm nay
            </button>
          </div>

          <!-- Add Phase Button -->
          <button
            @click="openAddPhaseModal"
            class="flex items-center gap-1.5 h-8 px-3.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors shadow-sm"
            style="border-radius: 0"
          >
            <Plus class="w-4 h-4" /> Thêm Phase
          </button>
        </div>
      </div>

      <!-- ═══ FULL WIDTH 2-COLUMN LAYOUT (COMPACT SIDEBAR + EXPANDED TASK VIEW) ═══ -->
      <div v-if="project && projectPhases.length > 0" class="flex-1 flex flex-col md:flex-row gap-4 w-full items-start">
        
        <!-- ═══ COMPACT CLEAN SIDEBAR (PHASES) ═══ -->
        <aside
          v-if="isSidebarOpen"
          class="w-full md:w-64 lg:w-72 bg-white border border-slate-200 shrink-0 shadow-sm self-stretch md:self-auto"
        >
          <!-- Sidebar Header -->
          <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Các giai đoạn</span>
            <span class="text-xs font-mono font-bold text-slate-500">{{ projectPhases.length }} phase</span>
          </div>

          <!-- Phase List Navigation -->
          <div class="divide-y divide-slate-100">
            <button
              v-for="(phase, idx) in projectPhases"
              :key="phase.id"
              @click="selectPhase(idx)"
              class="w-full text-left px-4 py-3 transition-all flex flex-col gap-1.5 group select-none relative"
              :class="idx === currentPhaseIndex
                ? 'bg-violet-50/80 border-l-4 border-violet-600'
                : 'hover:bg-slate-50/80 border-l-4 border-transparent'"
            >
              <!-- Phase Label & Check/Mark Badge -->
              <div class="flex items-center justify-between gap-1">
                <div class="flex items-center gap-2 min-w-0">
                  <span
                    class="font-mono text-[10px] font-bold px-1.5 py-0.2 shrink-0"
                    :class="idx === currentPhaseIndex ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600'"
                  >
                    P{{ idx + 1 }}
                  </span>
                  <span
                    class="text-xs truncate font-bold"
                    :class="idx === currentPhaseIndex ? 'text-violet-900' : 'text-slate-700 group-hover:text-slate-900'"
                  >
                    {{ phase.title }}
                  </span>
                </div>

                <!-- Done badge -->
                <span
                  v-if="phase.isMarked"
                  class="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 shrink-0"
                  title="Phase đã hoàn thành"
                >
                  <Check class="w-3.5 h-3.5" />
                </span>
              </div>

              <!-- Phase Task Progress indicator -->
              <div class="flex items-center justify-between text-[10px] text-slate-400 font-medium pl-6">
                <span>{{ getPhaseStats(phase.id).completed }}/{{ getPhaseStats(phase.id).total }} việc</span>
                <span class="font-mono">{{ getPhaseStats(phase.id).percent }}%</span>
              </div>
            </button>
          </div>

          <!-- Sidebar Bottom Add Phase -->
          <div class="p-3 border-t border-slate-100 bg-slate-50/40">
            <button
              @click="openAddPhaseModal"
              class="w-full py-2 px-3 text-xs font-bold text-slate-500 hover:text-violet-700 hover:bg-white border border-dashed border-slate-300 hover:border-violet-300 transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus class="w-3.5 h-3.5" /> Thêm giai đoạn mới
            </button>
          </div>
        </aside>

        <!-- ═══ MAIN ACTIVE PHASE VIEW ═══ -->
        <section v-if="currentPhase" class="flex-1 w-full min-w-0 bg-white border border-slate-200 shadow-sm flex flex-col">
          
          <!-- Phase Title Bar & Mark Toggle Button -->
          <div class="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/40">
            <div>
              <div class="flex items-center gap-2">
            
                <span v-if="currentPhase.isMarked" class="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                  ✓ Đã xong
                </span>
              </div>
              <div class="flex items-center gap-2 mt-0.5">
                <button
                  @click="isSidebarOpen = !isSidebarOpen"
                  class="p-1 -ml-1 text-slate-400 hover:text-violet-700 hover:bg-violet-50 transition-colors shrink-0"
                  :title="isSidebarOpen ? 'Thu gọn danh sách giai đoạn' : 'Mở danh sách giai đoạn'"
                >
                  <PanelLeftClose v-if="isSidebarOpen" class="w-4 h-4 text-slate-500" />
                  <PanelLeft v-else class="w-4 h-4 text-violet-600" />
                </button>
                <h2 class="text-lg font-extrabold text-slate-800">{{ currentPhase.title }}</h2>
              </div>
              <p v-if="currentPhase.description" class="text-xs text-slate-500 mt-0.5">{{ currentPhase.description }}</p>
            </div>

            <!-- Phase Controls: Mark Button & Edit/Delete (Icon only) -->
            <div class="flex items-center gap-1 self-start sm:self-auto shrink-0">
              <!-- Mark Phase Button (Icon only) -->
              <button
                @click="handleTogglePhaseMark(currentPhase)"
                class="p-1.5 transition-colors select-none"
                :class="currentPhase.isMarked
                  ? 'text-emerald-600 hover:bg-emerald-50'
                  : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-100'"
                :title="currentPhase.isMarked ? 'Đã hoàn thành Phase (Click để bỏ đánh dấu)' : 'Đánh dấu hoàn thành Phase'"
              >
                <CheckCheck v-if="currentPhase.isMarked" class="w-4 h-4" />
                <Circle v-else class="w-4 h-4" />
              </button>

              <!-- Edit Phase Button (Icon only) -->
              <button
                @click="(e) => openEditPhaseModal(currentPhase!, e)"
                class="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Chỉnh sửa Phase"
              >
                <Edit2 class="w-4 h-4" />
              </button>

              <!-- Delete Phase Button (Icon only) -->
              <button
                @click="(e) => deletePhase(currentPhase!.id, e)"
                class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Xóa Phase"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- ═══ MINIMALIST TASKS & SUBTASKS LIST ═══ -->
          <div class="flex-1 divide-y divide-slate-100">

            <!-- Task Items -->
            <div
              v-for="task in currentPhaseTasks"
              :key="task.id"
              class="px-6 py-3 hover:bg-slate-50/60 transition-colors group/item"
            >
              <!-- Single Clean Task Row -->
              <div class="flex items-center justify-between gap-3 py-1">
                <div class="flex items-center gap-3 min-w-0 flex-1">
                  <!-- Task Checkbox (5x5) -->
                  <button
                    @click="handleTaskToggle(task)"
                    class="flex h-5 w-5 shrink-0 items-center justify-center border-2 transition-all"
                    :class="checklistStore.isTaskCompleted(task.id, selectedDate)
                      ? 'border-violet-600 bg-violet-600 text-white'
                      : 'border-slate-300 bg-white hover:border-violet-500'"
                    :title="checklistStore.isTaskCompleted(task.id, selectedDate) ? 'Đã xong' : 'Chưa xong'"
                  >
                    <Check v-if="checklistStore.isTaskCompleted(task.id, selectedDate)" class="h-3.5 w-3.5 stroke-[3]" />
                  </button>

                  <span class="w-1 h-4 shrink-0 bg-violet-600"></span>

                  <!-- Task Title -->
                  <span
                    class="text-sm font-bold truncate select-text cursor-text tracking-tight"
                    :class="checklistStore.isTaskCompleted(task.id, selectedDate) ? 'text-slate-400 line-through font-medium' : 'text-slate-800'"
                  >
                    {{ task.title }}
                  </span>

                  <!-- Subtask count pill -->
                  <span
                    v-if="getTaskSubtaskStats(task.id).total > 0"
                    class="text-[11px] font-mono px-1.5 py-0.5 border shrink-0 font-bold"
                    :class="getTaskSubtaskStats(task.id).completed === getTaskSubtaskStats(task.id).total
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'"
                  >
                    {{ getTaskSubtaskStats(task.id).completed }}/{{ getTaskSubtaskStats(task.id).total }}
                  </span>

                  <span v-if="task.duration" class="text-xs text-slate-400 font-mono">
                    {{ task.duration }}p
                  </span>
                </div>

                <!-- Hover Actions on Task Row -->
                <div class="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0">
                  <!-- Button to Add Subtask for this Task -->
                  <button
                    @click="startAddSubtask(task.id)"
                    class="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                    title="Thêm nhiệm vụ con (Subtask)"
                  >
                    <Plus class="w-4 h-4" />
                  </button>
                    
                  <button
                    @click="openEditTaskModal(task)"
                    class="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                    title="Sửa công việc"
                  >
                    <Edit2 class="w-4 h-4" />
                  </button>
                  <button
                    @click="deleteTask(task.id)"
                    class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Xóa công việc"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <!-- Elegant Subtasks List (Border bottom only, indented) -->
              <div
                v-if="subtaskStore.getSubtasksByTaskId(task.id).length > 0 || activeAddingSubtaskId === task.id"
                class="ml-9 mr-4 my-1 divide-y divide-slate-100/80"
              >
                <!-- Subtask Item with bottom border only -->
                <div
                  v-for="subtask in subtaskStore.getSubtasksByTaskId(task.id)"
                  :key="subtask.id"
                >
                  <!-- Inline Edit Subtask Form -->
                  <form
                    v-if="editingSubtaskId === subtask.id"
                    @submit.prevent="saveEditSubtask(subtask.id)"
                    class="py-1.5 flex items-center gap-2.5 border-b border-violet-400 w-full"
                  >
                    <span class="w-3.5 h-3.5 border border-dashed border-violet-300 shrink-0"></span>
                    <input
                      v-model="editingSubtaskTitle"
                      type="text"
                      placeholder="Sửa nhiệm vụ con..."
                      class="text-xs text-slate-700 placeholder:text-slate-400 outline-none bg-transparent flex-1 font-medium py-0.5 select-text"
                      autofocus
                      @keydown.esc="cancelEditSubtask"
                    />
                    <button
                      type="submit"
                      :disabled="!editingSubtaskTitle.trim()"
                      class="text-xs font-bold text-violet-600 hover:text-violet-800 disabled:opacity-30"
                    >
                      Lưu
                    </button>
                    <button
                      type="button"
                      @click="cancelEditSubtask"
                      class="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Hủy
                    </button>
                  </form>

                  <!-- Normal Subtask Row -->
                  <div
                    v-else
                    class="py-1.5 flex items-center justify-between gap-2.5 group/sub"
                  >
                    <div class="flex items-center gap-2.5 min-w-0 flex-1">
                      <button
                        @click="handleSubtaskToggle(task, subtask)"
                        class="flex h-3.5 w-3.5 shrink-0 items-center justify-center border transition-all"
                        :class="checklistStore.isSubtaskCompleted(subtask.id, selectedDate)
                          ? 'border-violet-600 bg-violet-600 text-white'
                          : 'border-slate-300 bg-white hover:border-violet-400'"
                        title="Check subtask"
                      >
                        <Check v-if="checklistStore.isSubtaskCompleted(subtask.id, selectedDate)" class="h-2.5 w-2.5 stroke-[2.5]" />
                      </button>
                      <span
                        class="text-xs font-medium truncate select-text cursor-text"
                        :class="checklistStore.isSubtaskCompleted(subtask.id, selectedDate) ? 'text-slate-400 line-through' : 'text-slate-700'"
                      >
                        {{ subtask.title }}
                      </span>
                    </div>
                    <div class="flex items-center gap-1 opacity-0 group-hover/sub:opacity-100 transition-opacity shrink-0">
                      <button
                        @click="startEditSubtask(subtask)"
                        class="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                        title="Đổi tên / Sửa subtask"
                      >
                        <Edit2 class="w-3.5 h-3.5" />
                      </button>
                      <button
                        @click="deleteSubtask(subtask.id)"
                        class="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Xóa subtask"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Inline Subtask Input Form with bottom border only -->
                <form
                  v-if="activeAddingSubtaskId === task.id"
                  @submit.prevent="submitAddSubtask(task.id)"
                  class="py-1.5 flex items-center gap-2.5 border-b border-violet-400"
                >
                  <span class="w-3.5 h-3.5 border border-dashed border-slate-300 shrink-0"></span>
                  <input
                    v-model="newSubtaskTitle"
                    type="text"
                    placeholder="Nhập nhiệm vụ con..."
                    class="text-xs text-slate-700 placeholder:text-slate-400 outline-none bg-transparent flex-1 font-medium py-0.5"
                    autofocus
                    @keydown.esc="cancelAddSubtask"
                  />
                  <button
                    type="submit"
                    :disabled="!newSubtaskTitle.trim()"
                    class="text-xs font-bold text-violet-600 hover:text-violet-800 disabled:opacity-30"
                  >
                    Lưu
                  </button>
                  <button
                    type="button"
                    @click="cancelAddSubtask"
                    class="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Hủy
                  </button>
                </form>
              </div>
            </div>

            <!-- Empty Phase Tasks State -->
            <div v-if="currentPhaseTasks.length === 0" class="py-10 text-center text-slate-400 text-sm">
              Chưa có công việc nào trong Phase này.
            </div>

            <!-- Elegant Add Task Input at Bottom (Bottom Line Style) -->
            <form @submit.prevent="handleQuickAddTask" class="px-6 py-4 bg-white flex items-center gap-3">
              <Plus class="w-4 h-4 text-violet-500 shrink-0" />
              <input
                v-model="quickTaskTitle"
                type="text"
                placeholder="Thêm công việc mới..."
                class="flex-1 text-sm text-slate-800 placeholder:text-slate-400 bg-transparent border-b border-slate-200 focus:border-violet-600 py-1 outline-none transition-colors font-medium"
              />
              <button
                v-if="quickTaskTitle.trim()"
                type="submit"
                class="text-xs font-bold text-violet-600 hover:text-violet-800 px-3 py-1"
              >
                Lưu
              </button>
            </form>
          </div>

          <!-- ═══ BOTTOM NAVIGATION BETWEEN PHASES ═══ -->
          <div class="px-6 py-3 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between mt-auto">
            <button
              @click="goToPrevPhase"
              :disabled="currentPhaseIndex === 0"
              class="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-xs font-bold text-slate-700 transition-colors"
            >
              <ChevronLeft class="w-4 h-4" /> Phase trước
            </button>

            <span class="text-xs font-mono font-bold text-slate-500">
              {{ currentPhaseIndex + 1 }} / {{ projectPhases.length }}
            </span>

            <button
              @click="goToNextPhase"
              :disabled="currentPhaseIndex === projectPhases.length - 1"
              class="flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-xs font-bold text-slate-700 transition-colors"
            >
              Phase tiếp theo <ChevronRight class="w-4 h-4" />
            </button>
          </div>
        </section>
      </div>

      <!-- Empty Phases State -->
      <div v-else-if="project" class="border border-slate-200 bg-white p-16 text-center flex flex-col items-center gap-3 shadow-sm">
        <Layers class="w-10 h-10 text-slate-300" />
        <h3 class="text-sm font-bold text-slate-700 uppercase">Chưa có giai đoạn (Phase) nào</h3>
        <p class="text-xs text-slate-400 max-w-sm">
          Tạo các giai đoạn để quản lý công việc theo từng trang tuần tự.
        </p>
        <button
          @click="openAddPhaseModal"
          class="flex items-center gap-1.5 h-9 px-4 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors"
          style="border-radius: 0"
        >
          <Plus class="w-4 h-4" /> Thêm giai đoạn đầu tiên
        </button>
      </div>
    </div>

    <!-- Phase Modal with AntD zoom animation -->
    <Transition name="antd-modal">
      <div
        v-if="isPhaseModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] px-4"
        @click.self="isPhaseModalOpen = false"
      >
        <div class="antd-modal-content bg-white border border-slate-200 w-full max-w-md shadow-2xl p-6 space-y-4">
          <h3 class="text-xs font-black uppercase tracking-widest text-slate-800">
            {{ editingPhase ? 'Chỉnh sửa Giai đoạn' : 'Thêm Giai đoạn Mới' }}
          </h3>
          <form @submit.prevent="savePhase" class="space-y-3">
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Tên giai đoạn *</label>
              <input
                v-model="phaseTitle"
                type="text"
                required
                class="h-9 border border-slate-200 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-violet-500"
                placeholder="VD: Giai đoạn 1 - Thiết kế"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Mô tả</label>
              <input
                v-model="phaseDescription"
                type="text"
                class="h-9 border border-slate-200 px-3 text-xs font-medium text-slate-700 outline-none focus:border-violet-500"
                placeholder="Ghi chú giai đoạn..."
              />
            </div>
            <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                @click="isPhaseModalOpen = false"
                class="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="submit"
                class="px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold"
              >
                Lưu
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- Edit Task Modal with AntD zoom animation -->
    <Transition name="antd-modal">
      <div
        v-if="isTaskModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] px-4"
        @click.self="isTaskModalOpen = false"
      >
        <div class="antd-modal-content bg-white border border-slate-200 w-full max-w-md shadow-2xl p-6 space-y-4">
          <h3 class="text-xs font-black uppercase tracking-widest text-slate-800">
            Chỉnh sửa Công việc
          </h3>
          <form @submit.prevent="saveTask" class="space-y-3">
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Tên công việc *</label>
              <input
                v-model="taskTitle"
                type="text"
                required
                class="h-9 border border-slate-200 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-violet-500"
                placeholder="Nhập tên công việc..."
              />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Thời gian (phút)</label>
                <input
                  v-model.number="taskDuration"
                  type="number"
                  min="1"
                  class="h-9 border border-slate-200 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-violet-500"
                  placeholder="VD: 30"
                />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Hạn hoàn thành</label>
                <input
                  v-model="taskDueDate"
                  type="date"
                  class="h-9 border border-slate-200 px-2 text-xs font-semibold text-slate-700 outline-none focus:border-violet-500"
                />
              </div>
            </div>
            <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                @click="isTaskModalOpen = false"
                class="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="submit"
                class="px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold"
              >
                Lưu
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </main>
</template>
