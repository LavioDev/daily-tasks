<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, Trash2, Edit2 } from '@lucide/vue'
import { useTaskStore } from '@/stores/taskStore'
import { useChecklistStore } from '@/stores/checklistStore'
import MonthSelector from '@/components/MonthSelector.vue'
import MonthlyCompletionChart from '@/components/charts/MonthlyCompletionChart.vue'
import MonthlyPieChart from '@/components/charts/MonthlyPieChart.vue'
import type { Task } from '@/types'

const taskStore = useTaskStore()
const checklistStore = useChecklistStore()

// Auto-focus directive
const vFocus = { mounted: (el: HTMLElement) => (el as HTMLInputElement).focus() }

// Selected month/year
const selectedMonthYear = ref({
  year: new Date().getFullYear(),
  month: new Date().getMonth()
})

// Selected day for the daily pie chart (defaults to today)
const selectedDayNum = ref<number>(new Date().getDate())

const newTaskTitle = ref('')
const editingTaskId = ref<string | null>(null)
const editingTitle = ref('')

// Computed days array [1..N]
const daysInMonth = computed(() =>
  new Date(selectedMonthYear.value.year, selectedMonthYear.value.month + 1, 0).getDate()
)

// Watch daysInMonth to ensure selectedDayNum is within valid range
import { watch } from 'vue'
watch(daysInMonth, (newVal) => {
  if (selectedDayNum.value > newVal) {
    selectedDayNum.value = newVal
  }
})

const days = computed(() => Array.from({ length: daysInMonth.value }, (_, i) => i + 1))

// Today highlight
const currentDayNum = computed(() => {
  const now = new Date()
  if (
    now.getFullYear() === selectedMonthYear.value.year &&
    now.getMonth() === selectedMonthYear.value.month
  ) return now.getDate()
  return -1
})

function getDayStr(dayNum: number): string {
  const y = selectedMonthYear.value.year
  const m = String(selectedMonthYear.value.month + 1).padStart(2, '0')
  const d = String(dayNum).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isChecked(taskId: string, dayNum: number): boolean {
  const date = getDayStr(dayNum)
  return checklistStore.entries.some(e => e.taskId === taskId && e.date === date && e.progress === 100)
}

function handleToggle(taskId: string, dayNum: number) {
  checklistStore.toggleEntry(taskId, getDayStr(dayNum))
}

// Task CRUD
function handleAddTask() {
  if (!newTaskTitle.value.trim()) return
  taskStore.addTask(newTaskTitle.value.trim())
  newTaskTitle.value = ''
}

function handleDelete(task: Task) {
  taskStore.deleteTask(task.id)
  checklistStore.deleteEntriesForTask(task.id)
}

function startEdit(task: Task) {
  editingTaskId.value = task.id
  editingTitle.value = task.title
}

function saveEdit(task: Task) {
  if (editingTitle.value.trim()) taskStore.updateTaskTitle(task.id, editingTitle.value.trim())
  editingTaskId.value = null
}

// Computations for statistics & charts
const dailyRates = computed(() => {
  const totalTasks = taskStore.tasks.length
  const rates = []
  
  for (let d = 1; d <= daysInMonth.value; d++) {
    const dateStr = getDayStr(d)
    const checkedCount = checklistStore.entries.filter(
      (e) => e.date === dateStr && e.progress === 100
    ).length
    
    rates.push({
      dayNum: d,
      rate: totalTasks > 0 ? Math.round((checkedCount / totalTasks) * 100) : 0
    })
  }
  return rates
})

const monthStats = computed(() => {
  const total = taskStore.tasks.length
  const maxPossible = total * daysInMonth.value
  let ticks = 0
  for (const d of days.value) {
    const date = getDayStr(d)
    ticks += checklistStore.entries.filter(e => e.date === date && e.progress === 100).length
  }
  return {
    total,
    ticks,
    percent: maxPossible > 0 ? Math.round((ticks / maxPossible) * 100) : 0
  }
})

// Calculate percentage of tasks completed on the selected day
const selectedDayPercent = computed(() => {
  const total = taskStore.tasks.length
  if (total === 0) return 0
  const date = getDayStr(selectedDayNum.value)
  const checkedCount = checklistStore.entries.filter(
    (e) => e.date === date && e.progress === 100
  ).length
  return Math.round((checkedCount / total) * 100)
})

// Task-level completion % for the selected month
function taskMonthPercent(taskId: string): number {
  const checked = days.value.filter(d => isChecked(taskId, d)).length
  return daysInMonth.value > 0 ? Math.round((checked / daysInMonth.value) * 100) : 0
}

// Weekday name for header
const weekdayOfDay = computed(() => (dayNum: number) => {
  const d = new Date(selectedMonthYear.value.year, selectedMonthYear.value.month, dayNum)
  return d.getDay() // 0=Sun, 6=Sat
})

function isWeekend(dayNum: number): boolean {
  const dow = weekdayOfDay.value(dayNum)
  return dow === 0 || dow === 6
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col" style="font-family:'Inter',system-ui,sans-serif">

    <!-- ═══ HEADER (Minimal - Month Selector Only) ═══ -->
    <header class="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-center shrink-0">
      <MonthSelector v-model="selectedMonthYear" />
    </header>

    <!-- ═══ CHART SECTION ═══ -->
    <section class="bg-white border-b border-slate-200 px-6 py-5 shrink-0">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
        <!-- Daily Rates Line Chart (Span 3) -->
        <div class="md:col-span-3 flex flex-col gap-2">
          <h2 class="text-xs font-black text-slate-700 uppercase tracking-widest">
            Biểu đồ hoàn thành theo ngày (%)
          </h2>
          <MonthlyCompletionChart :daily-rates="dailyRates" />
        </div>

        <!-- Selected Day's Pie Chart (Span 1) -->
        <div class="flex flex-col items-center justify-center gap-2 border-t pt-6 md:border-t-0 md:pt-0 md:border-l border-slate-200 md:pl-6 h-full">
          <h2 class="text-xs font-black text-slate-700 uppercase tracking-widest text-center">
            Ngày {{ selectedDayNum }}/{{ selectedMonthYear.month + 1 }}
          </h2>
          <MonthlyPieChart :percent="selectedDayPercent" :label="`Ngày ${selectedDayNum}`" />
        </div>

        <!-- Monthly Doughnut/Pie Chart (Span 1) -->
        <div class="flex flex-col items-center justify-center gap-2 border-t pt-6 md:border-t-0 md:pt-0 md:border-l border-slate-200 md:pl-6 h-full">
          <h2 class="text-xs font-black text-slate-700 uppercase tracking-widest text-center">
            Hiệu suất tháng
          </h2>
          <MonthlyPieChart :percent="monthStats.percent" label="Tháng này" />
        </div>
      </div>
    </section>

    <!-- ═══ HABIT GRID ═══ -->
    <section class="flex-1 overflow-x-auto grid-scroll bg-white">
      <table class="border-collapse" style="width: max-content; min-width: 100%">

        <!-- ── HEADER ROW ── -->
        <thead class="sticky top-0 z-30 bg-white">
          <tr class="border-b-2 border-slate-300">
            <!-- Task name header cell -->
            <th scope="col"
              class="sticky left-0 z-40 bg-slate-800 text-left px-4 py-2.5 border-r-2 border-slate-300 min-w-[220px] w-[220px]"
            >
              <span class="text-[10px] font-black uppercase tracking-widest text-slate-300">Công việc</span>
            </th>

            <!-- Day number headers -->
            <th
              v-for="d in days" :key="d"
              scope="col"
              @click="selectedDayNum = d"
              class="text-center py-2.5 w-[44px] min-w-[44px] border-r border-slate-200 relative cursor-pointer hover:bg-slate-100 transition-colors select-none"
              :class="[
                d === selectedDayNum 
                  ? 'bg-violet-100 text-violet-750 font-black' 
                  : d === currentDayNum 
                    ? 'bg-violet-50/80 text-violet-650' 
                    : 'text-slate-500',
                isWeekend(d) && d !== selectedDayNum ? 'bg-slate-100/50' : 'bg-white'
              ]"
            >
              <span
                class="block text-xs font-bold leading-none"
                :class="d === currentDayNum ? 'text-violet-600 font-extrabold' : isWeekend(d) ? 'text-slate-400' : 'text-slate-500'"
              >{{ d }}</span>
              <!-- Current day indicator -->
              <span v-if="d === currentDayNum"
                class="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-violet-600 rounded-full"
              ></span>
            </th>

            <!-- % column -->
            <th scope="col"
              class="sticky right-0 z-40 bg-slate-800 text-center px-3 py-2.5 min-w-[56px] w-[56px] border-l-2 border-slate-300"
            >
              <span class="text-[10px] font-black uppercase tracking-widest text-slate-300">%</span>
            </th>
          </tr>
        </thead>

        <!-- ── TASK ROWS ── -->
        <tbody>
          <tr
            v-for="task in taskStore.tasks" :key="task.id"
            class="border-b border-slate-200 group hover:bg-violet-50/20 transition-colors"
          >
            <!-- Task Name (sticky left) -->
            <td class="sticky left-0 z-20 bg-white group-hover:bg-violet-50/20 border-r-2 border-slate-300 px-4 py-0 min-w-[220px] w-[220px] transition-colors h-11">
              <div class="flex items-center justify-between h-full gap-2">
                <div class="flex items-center gap-2 min-w-0 flex-1">
                  <!-- Color bar on left edge -->
                  <span class="w-1 h-5 shrink-0 self-center" :style="{ backgroundColor: task.color }"></span>

                  <!-- Inline editing -->
                  <input v-if="editingTaskId === task.id"
                    v-model="editingTitle"
                    v-focus
                    @keyup.enter="saveEdit(task)"
                    @keyup.esc="editingTaskId = null"
                    @blur="saveEdit(task)"
                    class="text-sm font-semibold text-slate-800 bg-violet-50 border border-violet-450 px-2 py-0.5 w-full focus:outline-none"
                    style="border-radius:0"
                  />
                  <span v-else
                    class="text-sm font-semibold text-slate-800 truncate select-none cursor-default"
                    @dblclick="startEdit(task)"
                    :title="task.title"
                  >
                    {{ task.title }}
                  </span>
                </div>

                <!-- Edit/Delete actions on hover -->
                <div class="opacity-0 group-hover:opacity-100 transition-opacity flex items-center shrink-0 gap-0.5">
                  <button @click="startEdit(task)"
                    class="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                    title="Đổi tên (hoặc nhấp đúp)"
                  >
                    <Edit2 class="w-3 h-3" />
                  </button>
                  <button @click="handleDelete(task)"
                    class="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Xóa thói quen"
                  >
                    <Trash2 class="w-3 h-3" />
                  </button>
                </div>
              </div>
            </td>

            <!-- Day toggle cells -->
            <td
              v-for="d in days" :key="d"
              class="border-r border-slate-200 w-[44px] min-w-[44px] p-0 h-11 transition-colors"
              :class="[
                d === selectedDayNum 
                  ? 'bg-violet-100/30' 
                  : d === currentDayNum 
                    ? 'bg-violet-50/40' 
                    : '',
                isWeekend(d) && d !== selectedDayNum ? 'bg-slate-50/65' : ''
              ]"
            >
              <button
                @click="handleToggle(task.id, d)"
                class="w-full h-full flex items-center justify-center text-[11px] font-black transition-all select-none animate-in fade-in duration-75"
                :style="isChecked(task.id, d)
                  ? { backgroundColor: task.color, color: '#fff' }
                  : { color: 'transparent' }"
                :class="isChecked(task.id, d) ? 'cell-check-anim' : 'hover:bg-slate-100'"
                :title="`${task.title} · Ngày ${d}`"
              >
                ✓
              </button>
            </td>

            <!-- % completion for this task in this month (sticky right) -->
            <td class="sticky right-0 z-20 bg-white group-hover:bg-violet-50/20 border-l-2 border-slate-300 text-center px-2 min-w-[56px] w-[56px] h-11 transition-colors">
              <span class="text-xs font-black"
                :class="taskMonthPercent(task.id) === 100 ? 'text-violet-700 font-extrabold' : taskMonthPercent(task.id) > 50 ? 'text-violet-550 font-bold' : 'text-slate-400'"
              >
                {{ taskMonthPercent(task.id) }}%
              </span>
            </td>
          </tr>

          <!-- ── ADD TASK ROW ── -->
          <tr class="border-b border-slate-200 bg-slate-50/80">
            <td class="sticky left-0 z-20 bg-slate-50/80 border-r-2 border-slate-300 px-4 py-0 min-w-[220px] w-[220px] h-11">
              <form @submit.prevent="handleAddTask" class="flex items-center gap-2 h-full">
                <span class="w-1 h-5 shrink-0 bg-slate-300"></span>
                <input
                  v-model="newTaskTitle"
                  type="text"
                  placeholder="Thêm thói quen mới..."
                  class="text-sm font-medium text-slate-700 bg-transparent placeholder-slate-400 focus:outline-none w-full border-b border-transparent focus:border-violet-400 py-0.5 transition-colors"
                  @keyup.enter="handleAddTask"
                />
                <button v-if="newTaskTitle.trim()" type="submit"
                  class="shrink-0 w-6 h-6 bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 transition-colors"
                  style="border-radius: 0;"
                >
                  <Plus class="w-3.5 h-3.5" />
                </button>
              </form>
            </td>
            <td
              v-for="d in days" :key="d"
              class="border-r border-slate-200 w-[44px] min-w-[44px] h-11 transition-colors"
              :class="[
                d === selectedDayNum 
                  ? 'bg-violet-100/10' 
                  : d === currentDayNum 
                    ? 'bg-violet-50/20' 
                    : '',
                isWeekend(d) && d !== selectedDayNum ? 'bg-slate-100/40' : ''
              ]"
            ></td>
            <td class="sticky right-0 z-20 bg-slate-50/80 border-l-2 border-slate-300 min-w-[56px] w-[56px] h-11"></td>
          </tr>

          <!-- ── EMPTY STATE (no tasks) ── -->
          <tr v-if="taskStore.tasks.length === 0">
            <td :colspan="daysInMonth + 2"
              class="text-center py-16 text-sm text-slate-400 font-medium bg-white"
            >
              <div class="flex flex-col items-center gap-2">
                <span class="text-3xl">📋</span>
                <span>Chưa có thói quen nào. Thêm thói quen đầu tiên của bạn ở dòng trên!</span>
              </div>
            </td>
          </tr>
        </tbody>

        <!-- ── FOOTER: Daily totals row ── -->
        <tfoot v-if="taskStore.tasks.length > 0">
          <tr class="border-t-2 border-slate-300 bg-slate-50">
            <td class="sticky left-0 z-20 bg-slate-100 border-r-2 border-slate-300 px-4 py-2 min-w-[220px] w-[220px]">
              <span class="text-[10px] font-black uppercase tracking-widest text-slate-500">Tổng trong ngày</span>
            </td>
            <td
              v-for="d in days" :key="d"
              @click="selectedDayNum = d"
              class="border-r border-slate-200 w-[44px] min-w-[44px] text-center py-2 cursor-pointer hover:bg-slate-100 transition-colors select-none"
              :class="[
                d === selectedDayNum 
                  ? 'bg-violet-100/40 text-violet-750 font-black' 
                  : d === currentDayNum 
                    ? 'bg-violet-50/40' 
                    : '',
                isWeekend(d) && d !== selectedDayNum ? 'bg-slate-50' : 'bg-slate-50'
              ]"
            >
              <span class="text-[10px] font-black"
                :class="(() => {
                  const date = getDayStr(d)
                  const checked = checklistStore.entries.filter(e => e.date === date && e.progress === 100).length
                  const total = taskStore.tasks.length
                  if (checked === 0) return 'text-slate-300'
                  if (checked === total) return 'text-violet-700 font-extrabold'
                  return 'text-violet-500 font-bold'
                })()"
              >
                {{
                  checklistStore.entries.filter(e => e.date === getDayStr(d) && e.progress === 100).length
                }}/{{ taskStore.tasks.length }}
              </span>
            </td>
            <td class="sticky right-0 z-20 bg-slate-100 border-l-2 border-slate-300 min-w-[56px] w-[56px]"></td>
          </tr>
        </tfoot>

      </table>
    </section>

  </div>
</template>

<style scoped>
/* Ensure sticky cells have solid backgrounds to cover scrolled content */
td.sticky, th.sticky {
  isolation: isolate;
}
</style>
