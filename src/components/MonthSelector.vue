<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from '@lucide/vue'

const props = defineProps<{
  modelValue: { year: number; month: number }
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: { year: number; month: number }): void
}>()

const monthsVi = [
  'Tháng 1','Tháng 2','Tháng 3','Tháng 4',
  'Tháng 5','Tháng 6','Tháng 7','Tháng 8',
  'Tháng 9','Tháng 10','Tháng 11','Tháng 12'
]

const years = computed(() => {
  const y = new Date().getFullYear()
  return Array.from({ length: 11 }, (_, i) => y - 5 + i)
})

function prevMonth() {
  let m = props.modelValue.month - 1
  let y = props.modelValue.year
  if (m < 0) { m = 11; y-- }
  emit('update:modelValue', { year: y, month: m })
}

function nextMonth() {
  let m = props.modelValue.month + 1
  let y = props.modelValue.year
  if (m > 11) { m = 0; y++ }
  emit('update:modelValue', { year: y, month: m })
}
</script>

<template>
  <div class="flex items-center gap-0 border border-slate-300 bg-white" style="border-radius:0">
    <button @click="prevMonth"
      class="px-3 h-9 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 border-r border-slate-300 transition-colors"
    >
      <ChevronLeft class="w-4 h-4" />
    </button>

    <select
      :value="modelValue.month"
      @change="e => emit('update:modelValue', { year: modelValue.year, month: parseInt((e.target as HTMLSelectElement).value, 10) })"
      class="h-9 px-3 text-sm font-bold text-slate-800 bg-white border-0 border-r border-slate-300 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-violet-500 cursor-pointer appearance-none min-w-[90px]"
    >
      <option v-for="(name, i) in monthsVi" :key="i" :value="i">{{ name }}</option>
    </select>

    <select
      :value="modelValue.year"
      @change="e => emit('update:modelValue', { year: parseInt((e.target as HTMLSelectElement).value, 10), month: modelValue.month })"
      class="h-9 px-3 text-sm font-bold text-slate-800 bg-white border-0 border-r border-slate-300 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-violet-500 cursor-pointer appearance-none"
    >
      <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
    </select>

    <button @click="nextMonth"
      class="px-3 h-9 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
    >
      <ChevronRight class="w-4 h-4" />
    </button>
  </div>
</template>
