<script setup lang="ts">
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps<{
  percent: number
  label?: string
}>()

const chartData = computed(() => {
  return {
    labels: ['Hoàn thành', 'Chưa hoàn thành'],
    datasets: [
      {
        data: [props.percent, Math.max(0, 100 - props.percent)],
        backgroundColor: ['#7c3aed', '#f1f5f9'], // violet-600, slate-100
        borderColor: ['#7c3aed', '#e2e8f0'],
        borderWidth: 1,
        hoverOffset: 2
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '75%',
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: '#0f172a',
      titleColor: '#f8fafc',
      bodyColor: '#cbd5e1',
      borderColor: '#1e293b',
      borderWidth: 1,
      padding: 8,
      cornerRadius: 0,
      titleFont: { family: 'Inter', size: 10 },
      bodyFont: { family: 'Inter', size: 10 },
      callbacks: {
        label: (context: any) => ` ${context.label}: ${context.parsed}%`
      }
    }
  }
}
</script>

<template>
  <div class="relative w-32 h-32 mx-auto">
    <Doughnut :data="chartData" :options="chartOptions" />
    <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
      <span class="text-xl font-black text-slate-800 leading-none">{{ percent }}%</span>
      <span class="text-[8px] text-slate-400 font-extrabold uppercase mt-1 tracking-wider text-center px-2">
        {{ label || 'Hoàn thành' }}
      </span>
    </div>
  </div>
</template>
