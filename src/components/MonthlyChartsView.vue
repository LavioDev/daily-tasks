<script setup lang="ts">
import { computed } from 'vue'
import { useTaskStore } from '@/stores/taskStore'
import { useChecklistStore } from '@/stores/checklistStore'
import MonthlyCompletionChart from '@/components/charts/MonthlyCompletionChart.vue'
import MonthlyPieChart from '@/components/charts/MonthlyPieChart.vue'

const props = defineProps<{
  selectedMonthYear: { year: number; month: number }
  selectedDayNum: number
}>()

const taskStore = useTaskStore()
const checklistStore = useChecklistStore()

// Computed days in month
const daysInMonth = computed(() =>
  new Date(props.selectedMonthYear.year, props.selectedMonthYear.month + 1, 0).getDate()
)

const days = computed(() => Array.from({ length: daysInMonth.value }, (_, i) => i + 1))

function getDayStr(dayNum: number): string {
  const y = props.selectedMonthYear.year
  const m = String(props.selectedMonthYear.month + 1).padStart(2, '0')
  const d = String(dayNum).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Helper to get total tasks and checked count for a specific date
function getStatsForDate(dateStr: string) {
  const habits = taskStore.monthlyTasks
  const dailyTasksOnDate = taskStore.dailyTasks.filter(
    (t) => t.createdAt && t.createdAt.startsWith(dateStr)
  )
  const projectTasksOnDate = taskStore.projectTasks.filter(
    (t) => (t.dueDate && t.dueDate === dateStr) || (t.createdAt && t.createdAt.startsWith(dateStr))
  )
  const applicableTaskIds = new Set([
    ...habits.map((t) => t.id),
    ...dailyTasksOnDate.map((t) => t.id),
    ...projectTasksOnDate.map((t) => t.id)
  ])
  const total = applicableTaskIds.size

  const checked = checklistStore.entries.filter(
    (e) => e.date === dateStr && e.progress === 100 && applicableTaskIds.has(e.taskId) && !e.subtaskId
  ).length

  return { total, checked }
}

// Computations for statistics & charts
const dailyRates = computed(() => {
  const rates = []
  for (let d = 1; d <= daysInMonth.value; d++) {
    const dateStr = getDayStr(d)
    const { total, checked } = getStatsForDate(dateStr)
    rates.push({
      dayNum: d,
      rate: total > 0 ? Math.round((checked / total) * 100) : 0
    })
  }
  return rates
})

const monthStats = computed(() => {
  let totalTasksCount = 0
  let totalCheckedCount = 0

  for (const d of days.value) {
    const dateStr = getDayStr(d)
    const { total, checked } = getStatsForDate(dateStr)
    totalTasksCount += total
    totalCheckedCount += checked
  }

  return {
    total: totalTasksCount,
    ticks: totalCheckedCount,
    percent: totalTasksCount > 0 ? Math.round((totalCheckedCount / totalTasksCount) * 100) : 0
  }
})

// Calculate percentage of tasks completed on the selected day
const selectedDayPercent = computed(() => {
  const dateStr = getDayStr(props.selectedDayNum)
  const { total, checked } = getStatsForDate(dateStr)
  return total > 0 ? Math.round((checked / total) * 100) : 0
})
</script>

<template>
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
</template>
