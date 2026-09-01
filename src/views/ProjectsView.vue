<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  Plus,
  FolderKanban,
  Edit2,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  Sparkles
} from '@lucide/vue'
import { useProjectStore } from '@/stores/projectStore'
import { useTaskStore } from '@/stores/taskStore'
import { useSubtaskStore } from '@/stores/subtaskStore'
import { useChecklistStore } from '@/stores/checklistStore'
import type { Project, ProjectStatus } from '@/types'
import { Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

const router = useRouter()
const projectStore = useProjectStore()
const taskStore = useTaskStore()
const subtaskStore = useSubtaskStore()
const checklistStore = useChecklistStore()

// Modal State
const isModalOpen = ref(false)
const editingProject = ref<Project | null>(null)
const formTitle = ref('')
const formDescription = ref('')
const formColor = ref('#7c3aed')
const formStatus = ref<ProjectStatus>('active')
const formStartDate = ref('')
const formTargetDate = ref('')

const COLOR_OPTIONS = [
  '#7c3aed', // violet
  '#2563eb', // blue
  '#0d9488', // teal
  '#059669', // emerald
  '#d97706', // amber
  '#ea580c', // orange
  '#e11d48', // rose
  '#475569'  // slate
]

const todayStr = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

// Project Progress calculation
function getProjectStats(projectId: string) {
  const phases = projectStore.getPhasesByProject(projectId)
  const tasks = taskStore.getTasksByProject(projectId)
  
  if (tasks.length === 0) {
    return {
      phaseCount: phases.length,
      taskCount: 0,
      completedTaskCount: 0,
      percent: 0
    }
  }

  // Count completed tasks (completed either on today or on their due date/creation date)
  let completedCount = 0
  for (const t of tasks) {
    const taskDate = t.dueDate || (t.createdAt ? t.createdAt.split('T')[0] : '') || todayStr.value
    if (checklistStore.isTaskCompleted(t.id, taskDate)) {
      completedCount++
    }
  }

  const percent = Math.round((completedCount / tasks.length) * 100)

  return {
    phaseCount: phases.length,
    taskCount: tasks.length,
    completedTaskCount: completedCount,
    percent
  }
}

// Global Summary Stats
const totalProjects = computed(() => projectStore.projects.length)
const activeProjects = computed(() => projectStore.projects.filter(p => p.status === 'active').length)
const completedProjects = computed(() => projectStore.projects.filter(p => p.status === 'completed').length)
const totalProjectTasks = computed(() => taskStore.projectTasks.length)

// Today's Tasks Stats for Project Tasks ONLY
const todayStats = computed(() => {
  const dateStr = todayStr.value
  
  // Only tasks belonging to projects (dueDate today OR created today)
  const projectTasksOnDate = taskStore.projectTasks.filter(
    (t) => (t.dueDate && t.dueDate === dateStr) || (t.createdAt && t.createdAt.startsWith(dateStr))
  )

  const applicableTaskIds = new Set(projectTasksOnDate.map((t) => t.id))
  const total = applicableTaskIds.size

  const completed = checklistStore.entries.filter(
    (e) => e.date === dateStr && e.progress === 100 && applicableTaskIds.has(e.taskId) && !e.subtaskId
  ).length

  const notDone = Math.max(0, total - completed)
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0

  return {
    total,
    completed,
    notDone,
    percent
  }
})

// Pie Chart data for Today's tasks
const pieChartData = computed(() => {
  const { completed, notDone, total } = todayStats.value
  return {
    labels: ['Hoàn thành', 'Chưa hoàn thành'],
    datasets: [
      {
        data: total > 0 ? [completed, notDone] : [0, 1],
        backgroundColor: ['#7c3aed', '#f1f5f9'],
        borderColor: ['#7c3aed', '#e2e8f0'],
        borderWidth: 1,
        hoverOffset: 2
      }
    ]
  }
})

const pieChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '70%',
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#0f172a',
      titleColor: '#f8fafc',
      bodyColor: '#cbd5e1',
      padding: 6,
      cornerRadius: 2,
      titleFont: { family: 'Inter', size: 10 },
      bodyFont: { family: 'Inter', size: 10 },
      callbacks: {
        label: (context: any) => ` ${context.label}: ${context.parsed}`
      }
    }
  }
}

function openCreateModal() {
  editingProject.value = null
  formTitle.value = ''
  formDescription.value = ''
  formColor.value = '#7c3aed'
  formStatus.value = 'active'
  formStartDate.value = todayStr.value
  formTargetDate.value = ''
  isModalOpen.value = true
}

function openEditModal(project: Project, e?: Event) {
  if (e) e.stopPropagation()
  editingProject.value = project
  formTitle.value = project.title
  formDescription.value = project.description || ''
  formColor.value = project.color
  formStatus.value = project.status
  formStartDate.value = project.startDate || ''
  formTargetDate.value = project.targetDate || ''
  isModalOpen.value = true
}

function saveProject() {
  if (!formTitle.value.trim()) return

  if (editingProject.value) {
    projectStore.updateProject(editingProject.value.id, {
      title: formTitle.value.trim(),
      description: formDescription.value.trim(),
      color: formColor.value,
      status: formStatus.value,
      startDate: formStartDate.value || undefined,
      targetDate: formTargetDate.value || undefined
    })
  } else {
    projectStore.addProject({
      title: formTitle.value.trim(),
      description: formDescription.value.trim(),
      color: formColor.value,
      status: formStatus.value,
      startDate: formStartDate.value || undefined,
      targetDate: formTargetDate.value || undefined
    })
  }

  isModalOpen.value = false
}

function deleteProject(id: string, e?: Event) {
  if (e) e.stopPropagation()
  if (confirm('Bạn có chắc muốn xóa dự án này cùng tất cả các giai đoạn, công việc và nhiệm vụ con liên quan?')) {
    projectStore.deleteProject(id)
    taskStore.deleteTasksForProject(id)
  }
}

function navigateToProject(projectId: string) {
  router.push(`/projects/${projectId}`)
}
</script>

<template>
  <main class="flex-1 bg-slate-50 px-4 py-6 sm:px-6 lg:px-8 w-full">
    <div class="w-full">
      <!-- Top Action Bar -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5">
        <div>
          <h1 class="text-xl font-black uppercase text-slate-800 tracking-tight flex items-center gap-2">
            <FolderKanban class="w-5 h-5 text-violet-600" />
            Quản lý Dự án (Projects)
          </h1>
        </div>
        <button
          @click="openCreateModal"
          class="flex items-center justify-center gap-2 h-10 px-4 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors shadow-sm self-start sm:self-auto"
          style="border-radius: 0"
        >
          <Plus class="w-4 h-4" /> Tạo dự án mới
        </button>
      </div>

      <!-- ═══ SUMMARY STATS WIDGETS CONTAINER ═══ -->
      <div class="bg-white border border-slate-200 px-6 py-5 mb-6 shadow-sm">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          
          <!-- 1. Tổng dự án -->
          <div class="flex flex-col justify-between h-[100px]">
            <span class="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Tổng dự án</span>
            <div class="flex items-baseline gap-1.5 my-auto">
              <span class="text-2xl font-mono font-extrabold text-slate-800">{{ totalProjects }}</span>
              <span class="text-xs text-slate-400 font-semibold">dự án</span>
            </div>
            <span class="text-xs text-slate-500 truncate">
              <strong class="text-violet-700">{{ activeProjects }}</strong> đang chạy · <strong class="text-slate-700">{{ completedProjects }}</strong> xong
            </span>
          </div>

          <!-- 2. Số task hôm nay -->
          <div class="flex flex-col justify-between h-[100px] border-t pt-5 md:border-t-0 md:pt-0 md:border-l border-slate-200 md:pl-6">
            <span class="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Số task hôm nay</span>
            <div class="flex items-baseline gap-1.5 my-auto">
              <span class="text-2xl font-mono font-extrabold text-slate-800">{{ todayStats.total }}</span>
              <span class="text-xs text-slate-400 font-semibold">công việc</span>
            </div>
            <span class="text-xs text-slate-500 truncate">
              <strong class="text-violet-700">{{ todayStats.completed }}</strong> đã làm · <strong class="text-slate-500">{{ todayStats.notDone }}</strong> chưa làm
            </span>
          </div>

          <!-- 3. Biểu đồ piechart số lượng task hôm nay -->
          <div class="flex items-center justify-between h-[100px] border-t pt-5 md:border-t-0 md:pt-0 md:border-l border-slate-200 md:pl-6">
            <div class="flex flex-col justify-between h-full py-0.5 min-w-0 pr-3">
              <span class="text-[10px] font-black uppercase tracking-widest text-slate-400 block truncate">Tỷ lệ hôm nay</span>
              <div class="my-auto">
                <span class="text-2xl font-mono font-extrabold text-slate-800 leading-none">{{ todayStats.percent }}%</span>
              </div>
              <span class="block text-xs text-slate-500 truncate">
                <strong class="text-violet-700">{{ todayStats.completed }}</strong>/{{ todayStats.total }} hoàn thành
              </span>
            </div>
            <div class="relative w-20 h-20 shrink-0">
              <Doughnut :data="pieChartData" :options="pieChartOptions" />
              <div class="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                <span class="text-xs font-mono font-black text-slate-800">{{ todayStats.percent }}%</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Project Cards Grid: 3 cards per row -->
      <div v-if="projectStore.projects.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="project in projectStore.projects"
          :key="project.id"
          @click="navigateToProject(project.id)"
          class="border border-slate-200 bg-white hover:border-violet-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group overflow-hidden"
        >
          <!-- Color Bar on top -->
          <div class="h-1.5 w-full" :style="{ backgroundColor: project.color }"></div>

          <div class="p-5 flex-1 flex flex-col justify-between">
            <div>
              <!-- Header & Status Badge -->
              <div class="flex items-start justify-between gap-2 mb-2">
                <h2 class="text-base font-bold text-slate-800 group-hover:text-violet-700 transition-colors line-clamp-1">
                  {{ project.title }}
                </h2>
                <span
                  class="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border shrink-0"
                  :class="{
                    'bg-violet-50 text-violet-700 border-violet-200': project.status === 'active',
                    'bg-emerald-50 text-emerald-700 border-emerald-200': project.status === 'completed',
                    'bg-slate-100 text-slate-500 border-slate-200': project.status === 'archived'
                  }"
                >
                  {{ project.status === 'active' ? 'Đang chạy' : project.status === 'completed' ? 'Hoàn thành' : 'Lưu trữ' }}
                </span>
              </div>

              <!-- Description -->
              <p class="text-xs text-slate-500 line-clamp-2 min-h-[32px] mb-4">
                {{ project.description || 'Chưa có mô tả cho dự án này.' }}
              </p>
            </div>

            <!-- Progress & Metadata -->
            <div>
              <div class="mb-3">
                <div class="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  <span>Tiến độ</span>
                  <span class="text-violet-700 font-mono">{{ getProjectStats(project.id).percent }}%</span>
                </div>
                <div class="h-1.5 bg-slate-100 w-full overflow-hidden">
                  <div
                    class="h-full transition-all duration-300"
                    :style="{
                      width: `${getProjectStats(project.id).percent}%`,
                      backgroundColor: project.color
                    }"
                  ></div>
                </div>
              </div>

              <!-- Badges Info -->
              <div class="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-3 border-t border-slate-100">
                <span class="flex items-center gap-1">
                  <Layers class="w-3.5 h-3.5 text-slate-400" />
                  <strong>{{ getProjectStats(project.id).phaseCount }}</strong> giai đoạn
                </span>
                <span class="flex items-center gap-1">
                  <CheckCircle2 class="w-3.5 h-3.5 text-slate-400" />
                  <strong>{{ getProjectStats(project.id).completedTaskCount }}/{{ getProjectStats(project.id).taskCount }}</strong> công việc
                </span>
                <span v-if="project.targetDate" class="flex items-center gap-1 text-slate-400 font-mono text-[10px]">
                  <Calendar class="w-3 h-3" /> Hạn: {{ project.targetDate }}
                </span>
              </div>
            </div>
          </div>

          <!-- Bottom Action Buttons -->
          <div class="bg-slate-50 px-5 py-2.5 border-t border-slate-100 flex items-center justify-between">
            <div class="flex items-center gap-1">
              <button
                @click="(e) => openEditModal(project, e)"
                class="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                title="Chỉnh sửa dự án"
              >
                <Edit2 class="w-3.5 h-3.5" />
              </button>
              <button
                @click="(e) => deleteProject(project.id, e)"
                class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Xóa dự án"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
            <span class="text-xs font-bold text-violet-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Xem chi tiết <ArrowRight class="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="border border-slate-200 bg-white p-12 text-center flex flex-col items-center gap-3">
        <div class="w-12 h-12 bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100 mb-1">
          <FolderKanban class="w-6 h-6" />
        </div>
        <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wide">Chưa có dự án nào</h3>
        <p class="text-xs text-slate-400 max-w-md">
          Bắt đầu tạo dự án đầu tiên để phân rã công việc thành các giai đoạn, công việc và nhiệm vụ con cần hoàn thành mỗi ngày.
        </p>
        <button
          @click="openCreateModal"
          class="mt-2 flex items-center gap-2 h-9 px-4 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors"
          style="border-radius: 0"
        >
          <Plus class="w-4 h-4" /> Tạo dự án ngay
        </button>
      </div>
    </div>

    <!-- Create / Edit Project Modal with AntD zoom animation -->
    <Transition name="antd-modal">
      <div
        v-if="isModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] px-4"
        @click.self="isModalOpen = false"
      >
        <div class="antd-modal-content bg-white border border-slate-200 w-full max-w-md shadow-2xl">
          <div class="border-b border-slate-200 px-6 py-4 flex items-center justify-between bg-slate-50">
            <h3 class="text-xs font-black uppercase tracking-widest text-slate-800">
              {{ editingProject ? 'Chỉnh sửa Dự án' : 'Tạo Dự án Mới' }}
            </h3>
            <button @click="isModalOpen = false" class="text-slate-400 hover:text-slate-700 text-sm font-bold">&times;</button>
          </div>

          <form @submit.prevent="saveProject" class="p-6 flex flex-col gap-4">
            <!-- Title -->
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Tên dự án *</label>
              <input
                v-model="formTitle"
                type="text"
                required
                class="w-full h-10 border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-violet-500"
                placeholder="Nhập tên dự án..."
              />
            </div>

            <!-- Color selection -->
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Màu chủ đề</label>
              <div class="flex items-center gap-2">
                <button
                  v-for="c in COLOR_OPTIONS"
                  :key="c"
                  type="button"
                  @click="formColor = c"
                  class="w-7 h-7 transition-all flex items-center justify-center"
                  :style="{ backgroundColor: c }"
                  :class="formColor === c ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : 'hover:opacity-80'"
                ></button>
              </div>
            </div>

            <!-- Description -->
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Mô tả mục tiêu</label>
              <textarea
                v-model="formDescription"
                rows="2"
                class="w-full border border-slate-200 p-2.5 text-xs font-medium text-slate-700 outline-none focus:border-violet-500 resize-none"
                placeholder="Mục tiêu hoặc ghi chú của dự án..."
              ></textarea>
            </div>

            <!-- Date Range -->
            <div class="grid grid-cols-2 gap-3">
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Ngày bắt đầu</label>
                <input
                  v-model="formStartDate"
                  type="date"
                  class="h-9 border border-slate-200 px-2 text-xs font-semibold text-slate-700 outline-none focus:border-violet-500"
                />
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Hạn chót (Deadline)</label>
                <input
                  v-model="formTargetDate"
                  type="date"
                  class="h-9 border border-slate-200 px-2 text-xs font-semibold text-slate-700 outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <!-- Status -->
            <div v-if="editingProject" class="flex flex-col gap-1.5">
              <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Trạng thái</label>
              <select
                v-model="formStatus"
                class="h-9 border border-slate-200 px-2 text-xs font-bold text-slate-700 outline-none focus:border-violet-500 bg-white"
              >
                <option value="active">Đang thực hiện (Active)</option>
                <option value="completed">Đã hoàn thành (Completed)</option>
                <option value="archived">Lưu trữ (Archived)</option>
              </select>
            </div>

            <!-- Buttons -->
            <div class="flex justify-end gap-2 mt-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                @click="isModalOpen = false"
                class="h-9 px-4 text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                class="h-9 px-4 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors"
              >
                Lưu dự án
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </main>
</template>
