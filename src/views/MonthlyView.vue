<script setup lang="ts">
import { useMonthStore } from '@/stores/monthStore'
import MonthlyChartsView from '@/components/MonthlyChartsView.vue'
import MonthlyHabitGrid from '@/components/MonthlyHabitGrid.vue'

const monthStore = useMonthStore()
</script>

<template>
  <div class="flex flex-col flex-1">
    <!-- ═══ CHART SECTION ═══ -->
    <MonthlyChartsView
      :selected-month-year="monthStore.selectedMonthYear"
      :selected-day-num="monthStore.selectedDayNum"
    />

    <!-- ═══ HABIT GRID ═══ -->
    <MonthlyHabitGrid
      :selected-month-year="monthStore.selectedMonthYear"
      v-model:selected-day-num="monthStore.selectedDayNum"
    />
  </div>
</template>
