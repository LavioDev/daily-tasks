<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue'
import { Play, Pause, RotateCcw, Check, ChevronLeft } from '@lucide/vue'
import { useTaskStore } from '@/stores/taskStore'
import { useChecklistStore } from '@/stores/checklistStore'

const props = defineProps<{
  taskId: string
}>()

const emit = defineEmits<{
  (e: 'back'): void
}>()

const taskStore = useTaskStore()
const checklistStore = useChecklistStore()
const task = computed(() => taskStore.tasks.find(t => t.id === props.taskId))

if (!task.value) {
  emit('back')
}

const isRunning = ref(false)
const isCountdown = computed(() => !!task.value?.duration)

// Timer value states
const targetSeconds = computed(() => (task.value?.duration || 0) * 60)
const initialTimeSpent = task.value?.timeSpent || 0

// Current state (in seconds)
const currentSeconds = ref(isCountdown.value 
  ? Math.max(0, targetSeconds.value - initialTimeSpent)
  : initialTimeSpent
)

let timerInterval: any = null

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  
  const mStr = String(m).padStart(2, '0')
  const sStr = String(s).padStart(2, '0')
  
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${mStr}:${sStr}`
  }
  return `${mStr}:${sStr}`
}

// Progress for the circle ring (0 to 100)
const progressPercent = computed(() => {
  if (!isCountdown.value || targetSeconds.value === 0) return 0
  const elapsed = targetSeconds.value - currentSeconds.value
  return Math.min(100, (elapsed / targetSeconds.value) * 100)
})

// Dashoffset for SVG circle
const strokeDashoffset = computed(() => {
  const circumference = 2 * Math.PI * 90 // radius = 90 => circumference = 565.48
  return circumference - (progressPercent.value / 100) * circumference
})

function startTimer() {
  if (isRunning.value) return
  isRunning.value = true
  
  timerInterval = setInterval(() => {
    if (isCountdown.value) {
      if (currentSeconds.value > 0) {
        currentSeconds.value--
        // Update timeSpent in store incrementally
        saveTimeSpent()
      } else {
        pauseTimer()
        // Auto complete or alert when finished
        alert(`Thời gian thực hiện công việc "${task.value?.title}" đã kết thúc!`)
      }
    } else {
      currentSeconds.value++
      saveTimeSpent()
    }
  }, 1000)
}

function pauseTimer() {
  if (!isRunning.value) return
  isRunning.value = false
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  saveTimeSpent()
}

function toggleTimer() {
  if (isRunning.value) {
    pauseTimer()
  } else {
    startTimer()
  }
}

function resetTimer() {
  pauseTimer()
  if (isCountdown.value) {
    currentSeconds.value = targetSeconds.value
  } else {
    currentSeconds.value = 0
  }
  saveTimeSpent(0)
}

function saveTimeSpent(customSeconds?: number) {
  const currentTask = task.value
  if (!currentTask) return
  
  let calculatedTimeSpent = 0
  if (customSeconds !== undefined) {
    calculatedTimeSpent = customSeconds
  } else {
    if (isCountdown.value) {
      calculatedTimeSpent = Math.max(0, targetSeconds.value - currentSeconds.value)
    } else {
      calculatedTimeSpent = currentSeconds.value
    }
  }
  
  taskStore.updateTask(currentTask.id, {
    timeSpent: calculatedTimeSpent
  })
}

function handleComplete() {
  pauseTimer()
  const currentTask = task.value
  if (currentTask) {
    // Save final time spent
    saveTimeSpent()
    
    // Toggle checklist entry to checked (progress = 100)
    const taskDate = currentTask.createdAt.split('T')[0] || ''
    const alreadyCompleted = checklistStore.isTaskCompleted(currentTask.id, taskDate)
    if (!alreadyCompleted) {
      checklistStore.toggleEntry(currentTask.id, taskDate)
    }
  }
  emit('back')
}

function handleBack() {
  pauseTimer()
  emit('back')
}

onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval)
  }
})
</script>

<template>
  <main class="flex-1 bg-slate-900 text-white flex flex-col items-center justify-center px-6 py-10 min-h-[calc(100vh-60px)]">
    <div class="max-w-md w-full flex flex-col items-center relative">
      
      <!-- Back Button -->
      <button @click="handleBack" 
        class="absolute -top-12 left-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-xs font-bold"
      >
        <ChevronLeft class="w-4 h-4" /> Quay lại
      </button>

      <!-- Task Title Display -->
      <div class="text-center mb-8 mt-4">
        <span class="text-[10px] font-black uppercase tracking-widest text-violet-400">Đang thực hiện</span>
        <h1 class="text-2xl font-extrabold text-white mt-1 select-none">{{ task?.title }}</h1>
        <p v-if="task?.duration" class="text-xs text-slate-400 mt-2">
          Thời gian mục tiêu: <span class="font-bold text-violet-300">{{ task.duration }} phút</span>
        </p>
      </div>

      <!-- Timer circle visualization -->
      <div class="relative w-64 h-64 flex items-center justify-center mb-10 select-none">
        
        <!-- Background circle -->
        <svg class="absolute w-full h-full transform -rotate-90" viewBox="0 0 200 200">
          <circle 
            cx="100" 
            cy="100" 
            r="90" 
            fill="transparent" 
            stroke="#1e293b" 
            stroke-width="8" 
          />
          <!-- Active progress circle -->
          <circle 
            v-if="isCountdown"
            cx="100" 
            cy="100" 
            r="90" 
            fill="transparent" 
            stroke="#7c3aed" 
            stroke-width="8" 
            stroke-linecap="round"
            :stroke-dasharray="2 * Math.PI * 90" 
            :stroke-dashoffset="strokeDashoffset"
            class="transition-all duration-300"
            :class="{ 'drop-shadow-[0_0_8px_rgba(124,58,237,0.5)]': isRunning }"
          />
          <!-- Pulsing dot or static border for stopwatch -->
          <circle 
            v-else
            cx="100" 
            cy="100" 
            r="90" 
            fill="transparent" 
            stroke="#7c3aed" 
            stroke-width="8" 
            class="transition-all duration-1000"
            :class="{ 'opacity-50 animate-pulse drop-shadow-[0_0_8px_rgba(124,58,237,0.5)]': isRunning }"
          />
        </svg>

        <!-- Digital Timer text display inside the circle -->
        <div class="flex flex-col items-center justify-center z-10">
          <span 
            class="text-4xl font-mono font-black tracking-tight tabular-nums transition-colors duration-350"
            :class="isRunning ? 'text-violet-400 font-extrabold' : 'text-slate-100'"
          >
            {{ formatTime(currentSeconds) }}
          </span>
          <span class="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">
            {{ isRunning ? 'Đang đếm' : 'Tạm dừng' }}
          </span>
        </div>
      </div>

      <!-- Control Buttons -->
      <div class="flex items-center justify-center gap-6 w-full max-w-sm mb-4">
        <!-- Reset Button -->
        <button 
          @click="resetTimer"
          class="flex items-center justify-center w-12 h-12 rounded-full border border-slate-700 bg-slate-800 text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-700 transition-all shadow-md"
          title="Đặt lại bộ đếm"
        >
          <RotateCcw class="w-5 h-5" />
        </button>

        <!-- Play/Pause Button -->
        <button 
          @click="toggleTimer"
          class="flex items-center justify-center w-20 h-20 rounded-full text-white transition-all shadow-lg scale-100 hover:scale-105 active:scale-95"
          :class="isRunning 
            ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/30' 
            : 'bg-violet-600 hover:bg-violet-500 shadow-violet-950/40'"
          :title="isRunning ? 'Tạm dừng' : 'Bắt đầu'"
        >
          <Pause v-if="isRunning" class="w-8 h-8" />
          <Play v-else class="w-8 h-8 translate-x-0.5" />
        </button>

        <!-- Complete Button -->
        <button 
          @click="handleComplete"
          class="flex items-center justify-center w-12 h-12 rounded-full border border-emerald-800 bg-emerald-950 text-emerald-400 hover:text-emerald-200 hover:border-emerald-500 hover:bg-emerald-900 transition-all shadow-md"
          title="Đánh dấu hoàn thành"
        >
          <Check class="w-5 h-5" />
        </button>
      </div>

    </div>
  </main>
</template>

<style scoped>
/* Circular progress transition */
circle {
  transition: stroke-dashoffset 0.5s ease;
}
</style>
