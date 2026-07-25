<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { CalendarDays, ListChecks } from '@lucide/vue'
import MonthSelector from '@/components/MonthSelector.vue'
import DailyTaskView from '@/components/DailyTaskView.vue'
import MonthlyChartsView from '@/components/MonthlyChartsView.vue'
import MonthlyHabitGrid from '@/components/MonthlyHabitGrid.vue'
import TimerView from '@/components/TimerView.vue'

const activeView = ref<'monthly' | 'daily' | 'timer'>('monthly')
const activeTimerTaskId = ref<string | null>(null)

// Selected month/year
const selectedMonthYear = ref({
  year: new Date().getFullYear(),
  month: new Date().getMonth()
})

// Selected day for the daily pie chart (defaults to today)
const selectedDayNum = ref<number>(new Date().getDate())

// Computed days array [1..N]
const daysInMonth = computed(() =>
  new Date(selectedMonthYear.value.year, selectedMonthYear.value.month + 1, 0).getDate()
)

// Watch daysInMonth to ensure selectedDayNum is within valid range
watch(daysInMonth, (newVal) => {
  if (selectedDayNum.value > newVal) {
    selectedDayNum.value = newVal
  }
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col" style="font-family:'Inter',system-ui,sans-serif">

    <!-- ═══ HEADER (Minimal - Month Selector Only) ═══ -->
    <header v-if="activeView !== 'timer'" class="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 animate-in fade-in duration-150">
      <nav class="flex items-center gap-1" aria-label="Chế độ xem">
        <button @click="activeView = 'monthly'" class="flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors" :class="activeView === 'monthly' ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'">
          <CalendarDays class="w-4 h-4" /> Theo tháng
        </button>
        <button @click="activeView = 'daily'" class="flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors" :class="activeView === 'daily' ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'">
          <ListChecks class="w-4 h-4" /> Hôm nay
        </button>
      </nav>
      <MonthSelector v-if="activeView === 'monthly'" v-model="selectedMonthYear" />
      <div v-else class="w-[166px]"></div>
    </header>

    <TimerView 
      v-if="activeView === 'timer' && activeTimerTaskId" 
      :task-id="activeTimerTaskId" 
      @back="activeView = 'daily'" 
    />
    <DailyTaskView 
      v-else-if="activeView === 'daily'" 
      @start-timer="(id) => { activeTimerTaskId = id; activeView = 'timer' }" 
    />
    <template v-else>
      <!-- ═══ CHART SECTION ═══ -->
      <MonthlyChartsView
        :selected-month-year="selectedMonthYear"
        :selected-day-num="selectedDayNum"
      />

      <!-- ═══ HABIT GRID ═══ -->
      <MonthlyHabitGrid
        :selected-month-year="selectedMonthYear"
        v-model:selected-day-num="selectedDayNum"
      />
    </template>
  </div>
</template>
