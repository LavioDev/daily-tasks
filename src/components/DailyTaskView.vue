<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, ChevronLeft, ChevronRight, Edit2, Plus, Trash2, Timer } from '@lucide/vue'
import { useDailyTaskStore } from '@/stores/dailyTaskStore'
import type { Task } from '@/types'

const dailyTaskStore = useDailyTaskStore()
const selectedDate = ref(toDateInput(new Date()))
const newTaskTitle = ref('')

// Edit Modal State
const isEditModalOpen = ref(false)
const editingTask = ref<Task | null>(null)
const editTitle = ref('')
const editDuration = ref<number | null>(null)

const emit = defineEmits<{
  (e: 'start-timer', taskId: string): void
}>()

const displayDate = computed(() => new Intl.DateTimeFormat('vi-VN', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
}).format(new Date(`${selectedDate.value}T00:00:00`)))

const filteredTasks = computed(() => {
  return dailyTaskStore.tasks.filter(task => task.createdAt && task.createdAt.startsWith(selectedDate.value))
})

const completedCount = computed(() => filteredTasks.value.filter(task => isCompleted(task.id)).length)
const completionPercent = computed(() => filteredTasks.value.length ? Math.round((completedCount.value / filteredTasks.value.length) * 100) : 0)

function toDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function isCompleted(taskId: string) {
  return dailyTaskStore.entries.some(entry => entry.taskId === taskId && entry.date === selectedDate.value && entry.progress === 100)
}

function changeDay(offset: number) {
  const date = new Date(`${selectedDate.value}T00:00:00`)
  date.setDate(date.getDate() + offset)
  selectedDate.value = toDateInput(date)
}

function addTask() {
  if (!newTaskTitle.value.trim()) return
  dailyTaskStore.addTask(newTaskTitle.value, selectedDate.value)
  newTaskTitle.value = ''
}

function startEdit(task: Task) {
  editingTask.value = task
  editTitle.value = task.title
  editDuration.value = task.duration !== undefined ? task.duration : null
  isEditModalOpen.value = true
}

function saveEdit() {
  if (editingTask.value && editTitle.value.trim()) {
    const rawVal = editDuration.value
    const durationValue = (rawVal === null || rawVal === undefined || String(rawVal).trim() === '' || isNaN(Number(rawVal)))
      ? null
      : Number(rawVal)

    dailyTaskStore.updateTask(editingTask.value.id, {
      title: editTitle.value.trim(),
      duration: durationValue
    })
    isEditModalOpen.value = false
    editingTask.value = null
  }
}

function removeTask(task: Task) {
  dailyTaskStore.deleteTask(task.id)
}

function formatDuration(seconds: number): string {
  if (!seconds) return '0s'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m > 0) {
    return `${m}p ${s}s`
  }
  return `${s}s`
}
</script>

<template>
  <main class="flex-1 bg-slate-50 px-4 py-6 sm:px-6 lg:px-10">
    <div class="mx-auto max-w-3xl">
      <!-- Card 1: Header & Progress -->
      <div class="border border-slate-200 bg-white px-5 py-5 sm:px-7 mb-4">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <!-- <p class="text-[10px] font-black uppercase tracking-widest text-violet-600">Danh sách trong ngày</p> -->
            <h1 class="mt-1 text-xl font-bold capitalize text-slate-800 uppercase">Danh sách trong ngày</h1>
          </div>
          <div class="flex items-center gap-1 self-start sm:self-auto">
            <button @click="changeDay(-1)" class="p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800" title="Ngày trước"><ChevronLeft class="h-4 w-4" /></button>
            <input v-model="selectedDate" type="date" class="h-8 border border-slate-200 px-2 text-xs font-semibold text-slate-700 outline-none focus:border-violet-500" />
            <button @click="changeDay(1)" class="p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800" title="Ngày sau"><ChevronRight class="h-4 w-4" /></button>
            <button @click="selectedDate = toDateInput(new Date())" class="ml-1 h-8 border border-violet-200 px-3 text-xs font-bold text-violet-700 hover:bg-violet-50">Hôm nay</button>
          </div>
        </div>
        <div class="mt-5 flex items-end gap-4">
          <div class="mb-1 flex-1"><div class="mb-1 flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400"><span>Tiến độ hôm nay</span><span class="text-violet-600">{{ completionPercent }}%</span></div><div class="h-1.5 bg-slate-100"><div class="h-full bg-violet-600 transition-all" :style="{ width: `${completionPercent}%` }"></div></div></div>
        </div>
      </div>

      <!-- Card 2: Task Input & List -->
      <section class="border border-slate-200 bg-white">
        <form @submit.prevent="addTask" class="flex h-14 items-center gap-3 border-b border-slate-200 bg-slate-50 px-5 sm:px-7">
          <span class="h-5 w-1 bg-slate-300"></span><input v-model="newTaskTitle" type="text" placeholder="Thêm công việc vào danh sách..." class="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400" />
          <button type="submit" :disabled="!newTaskTitle.trim()" class="flex h-7 w-7 items-center justify-center bg-violet-600 text-white transition-colors hover:bg-violet-700 disabled:bg-slate-300"><Plus class="h-4 w-4" /></button>
        </form>
        <div v-if="filteredTasks.length" class="divide-y divide-slate-200">
          <article v-for="task in filteredTasks" :key="task.id" class="group flex min-h-16 items-center gap-3 px-5 py-3 transition-colors hover:bg-violet-50/30 sm:px-7" :class="isCompleted(task.id) ? 'bg-slate-50/70' : 'bg-white'">
            <button @click="dailyTaskStore.toggleEntry(task.id, selectedDate)" class="flex h-6 w-6 shrink-0 items-center justify-center border-2 transition-all" :class="isCompleted(task.id) ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-300 bg-white hover:border-violet-500'" :title="isCompleted(task.id) ? 'Đánh dấu chưa hoàn thành' : 'Đánh dấu hoàn thành'"><Check v-if="isCompleted(task.id)" class="h-4 w-4" /></button>
            <span class="h-6 w-1 shrink-0" :style="{ backgroundColor: task.color }"></span>
            
            <span @dblclick="startEdit(task)" class="flex-1 min-w-0 truncate cursor-default text-sm font-semibold" :class="isCompleted(task.id) ? 'text-slate-400 line-through' : 'text-slate-800'">
              {{ task.title }}
            </span>

            <div class="flex items-center shrink-0 gap-2">
              <!-- Duration display -->
              <span v-if="task.duration || task.timeSpent" class="text-[10px] font-black uppercase tracking-widest text-slate-400">
                <template v-if="task.timeSpent">{{ formatDuration(task.timeSpent) }}</template>
                <template v-if="task.duration"> / {{ task.duration }}p</template>
              </span>

              <!-- Vertical separator line -->
              <div v-if="task.duration || task.timeSpent" class="h-4 w-[1px] bg-slate-200 mx-1"></div>

              <!-- Action buttons -->
              <div class="flex items-center gap-0.5">
                <button @click="emit('start-timer', task.id)" class="p-1.5 text-slate-400 hover:bg-violet-50 hover:text-violet-600 transition-colors animate-in fade-in duration-75" title="Đếm giờ">
                  <Timer class="h-3.5 w-3.5" />
                </button>
                <button @click="startEdit(task)" class="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors" title="Đổi tên / Thời gian">
                  <Edit2 class="h-3.5 w-3.5" />
                </button>
                <button @click="removeTask(task)" class="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors" title="Xóa công việc">
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </article>
        </div>
        <div v-else class="flex flex-col items-center gap-2 px-5 py-20 text-center"><span class="text-3xl">📋</span><p class="text-sm font-medium text-slate-500">Chưa có công việc nào cho danh sách của bạn.</p><p class="text-xs text-slate-400">Thêm công việc ở ô phía trên để bắt đầu thực hiện mỗi ngày.</p></div>
      </section>
    </div>

    <!-- Edit Modal -->
    <div v-if="isEditModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
      <div class="bg-white border border-slate-200 w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <div class="border-b border-slate-200 px-6 py-4">
          <h3 class="text-sm font-black uppercase tracking-widest text-slate-700">Chỉnh sửa công việc</h3>
        </div>
        <form @submit.prevent="saveEdit" class="p-6 flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Tên công việc</label>
            <input 
              v-model="editTitle" 
              type="text" 
              required
              class="w-full h-10 border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-violet-500"
              placeholder="Nhập tên công việc..."
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Thời gian thực hiện (phút)</label>
            <input 
              v-model.number="editDuration" 
              type="number" 
              min="1"
              class="w-full h-10 border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-violet-500"
              placeholder="Không giới hạn thời gian (để trống)"
            />
          </div>
          <div class="flex justify-end gap-3 mt-2">
            <button 
              type="button" 
              @click="isEditModalOpen = false" 
              class="h-10 px-4 text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            >
              Hủy
            </button>
            <button 
              type="submit" 
              class="h-10 px-4 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors"
            >
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  </main>
</template>
