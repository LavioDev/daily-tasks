<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

const props = defineProps<{
  dailyRates: { dayNum: number; rate: number }[]
}>()

const chartData = computed(() => {
  const labels = props.dailyRates.map((item) => String(item.dayNum))
  const values = props.dailyRates.map((item) => item.rate)

  return {
    labels,
    datasets: [
      {
        label: 'Tỷ lệ hoàn thành trung bình',
        data: values,
        borderColor: '#7c3aed', // violet-600
        backgroundColor: (context: any) => {
          const chart = context.chart
          const { ctx, chartArea } = chart
          if (!chartArea) return 'rgba(124, 58, 237, 0.08)'
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
          gradient.addColorStop(0, 'rgba(124, 58, 237, 0.2)')
          gradient.addColorStop(1, 'rgba(124, 58, 237, 0.0)')
          return gradient
        },
        fill: true,
        tension: 0.3,
        borderWidth: 2,
        pointBackgroundColor: '#7c3aed',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        pointRadius: 3,
        pointHoverRadius: 5
      }
    ]
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false
  },
  scales: {
    y: {
      min: 0,
      max: 100,
      grid: { color: '#f1f5f9' },
      border: { color: '#e2e8f0' },
      ticks: {
        color: '#94a3b8',
        font: { family: 'Inter', size: 10 },
        callback: (v: any) => `${v}%`,
        stepSize: 25
      }
    },
    x: {
      grid: { display: false },
      border: { color: '#e2e8f0' },
      ticks: {
        color: '#94a3b8',
        font: { family: 'Inter', size: 10 },
        maxRotation: 0
      }
    }
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#0f172a',
      titleColor: '#f8fafc',
      bodyColor: '#cbd5e1',
      borderColor: '#1e293b',
      borderWidth: 1,
      padding: 10,
      cornerRadius: 0,
      titleFont: { family: 'Inter', size: 11 },
      bodyFont: { family: 'Inter', size: 11 },
      callbacks: {
        title: (items: any) => `Ngày ${items[0]?.label}`,
        label: (ctx: any) => ` Hoàn thành: ${ctx.parsed.y}%`
      }
    }
  }
}))
</script>

<template>
  <div class="h-44 w-full">
    <div v-if="dailyRates.length === 0" class="h-full flex items-center justify-center text-sm text-slate-400 font-medium">
      Thêm công việc để hiển thị biểu đồ
    </div>
    <Line v-else :data="chartData" :options="chartOptions" />
  </div>
</template>
