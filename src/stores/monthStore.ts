import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export const useMonthStore = defineStore('month', () => {
  const selectedMonthYear = ref({
    year: new Date().getFullYear(),
    month: new Date().getMonth()
  })

  const selectedDayNum = ref<number>(new Date().getDate())

  const daysInMonth = computed(() =>
    new Date(selectedMonthYear.value.year, selectedMonthYear.value.month + 1, 0).getDate()
  )

  watch(daysInMonth, (newVal) => {
    if (selectedDayNum.value > newVal) {
      selectedDayNum.value = newVal
    }
  })

  return {
    selectedMonthYear,
    selectedDayNum,
    daysInMonth
  }
})
