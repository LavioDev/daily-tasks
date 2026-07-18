<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, ChevronLeft, ChevronRight, Edit2, Plus, Trash2 } from '@lucide/vue'
import { useTaskStore } from '@/stores/taskStore'
import { useChecklistStore } from '@/stores/checklistStore'
import type { Task } from '@/types'

const taskStore = useTaskStore()
const checklistStore = useChecklistStore()
const selectedDate = ref(toDateInput(new Date()))
const newTaskTitle = ref('')
const editingTaskId = ref<string | null>(null)
const editingTitle = ref('')

const displayDate = computed(() => new Intl.DateTimeFormat('vi-VN', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
}).format(new Date(`${selectedDate.value}T00:00:00`)))

const completedCount = computed(() => taskStore.tasks.filter(task => isCompleted(task.id)).length)
const completionPercent = computed(() => taskStore.tasks.length ? Math.round((completedCount.value / taskStore.tasks.length) * 100) : 0)

function toDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function isCompleted(taskId: string) {
  return checklistStore.entries.some(entry => entry.taskId === taskId && entry.date === selectedDate.value && entry.progress === 100)
}

function changeDay(offset: number) {
  const date = new Date(`${selectedDate.value}T00:00:00`)
  date.setDate(date.getDate() + offset)
  selectedDate.value = toDateInput(date)
}

function addTask() {
  if (!newTaskTitle.value.trim()) return
  taskStore.addTask(newTaskTitle.value)
  newTaskTitle.value = ''
}

function startEdit(task: Task) { editingTaskId.value = task.id; editingTitle.value = task.title }
function saveEdit(task: Task) { if (editingTitle.value.trim()) taskStore.updateTaskTitle(task.id, editingTitle.value); editingTaskId.value = null }
function removeTask(task: Task) { taskStore.deleteTask(task.id); checklistStore.deleteEntriesForTask(task.id) }
</script>

<template>
  <main class="flex-1 bg-slate-50 px-4 py-6 sm:px-6 lg:px-10">
    <div class="mx-auto max-w-3xl">
      <section class="border border-slate-200 bg-white">
        <div class="border-b border-slate-200 px-5 py-5 sm:px-7">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p class="text-[10px] font-black uppercase tracking-widest text-violet-600">Danh sách trong ngày</p><h1 class="mt-1 text-xl font-bold capitalize text-slate-800">{{ displayDate }}</h1></div>
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
        <form @submit.prevent="addTask" class="flex h-14 items-center gap-3 border-b border-slate-200 bg-slate-50 px-5 sm:px-7">
          <span class="h-5 w-1 bg-slate-300"></span><input v-model="newTaskTitle" type="text" placeholder="Thêm công việc vào danh sách..." class="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400" />
          <button type="submit" :disabled="!newTaskTitle.trim()" class="flex h-7 w-7 items-center justify-center bg-violet-600 text-white transition-colors hover:bg-violet-700 disabled:bg-slate-300"><Plus class="h-4 w-4" /></button>
        </form>
        <div v-if="taskStore.tasks.length" class="divide-y divide-slate-200">
          <article v-for="task in taskStore.tasks" :key="task.id" class="group flex min-h-16 items-center gap-3 px-5 py-3 transition-colors hover:bg-violet-50/30 sm:px-7" :class="isCompleted(task.id) ? 'bg-slate-50/70' : 'bg-white'">
            <button @click="checklistStore.toggleEntry(task.id, selectedDate)" class="flex h-6 w-6 shrink-0 items-center justify-center border-2 transition-all" :class="isCompleted(task.id) ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-300 bg-white hover:border-violet-500'" :title="isCompleted(task.id) ? 'Đánh dấu chưa hoàn thành' : 'Đánh dấu hoàn thành'"><Check v-if="isCompleted(task.id)" class="h-4 w-4" /></button>
            <span class="h-6 w-1 shrink-0" :style="{ backgroundColor: task.color }"></span>
            <input v-if="editingTaskId === task.id" v-model="editingTitle" @keyup.enter="saveEdit(task)" @keyup.esc="editingTaskId = null" @blur="saveEdit(task)" class="min-w-0 flex-1 border-b border-violet-400 bg-violet-50 px-1 py-1 text-sm font-semibold text-slate-800 outline-none" autofocus />
            <span v-else @dblclick="startEdit(task)" class="min-w-0 flex-1 cursor-default text-sm font-semibold" :class="isCompleted(task.id) ? 'text-slate-400 line-through' : 'text-slate-800'">{{ task.title }}</span>
            <div class="flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100"><button @click="startEdit(task)" class="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Đổi tên"><Edit2 class="h-3.5 w-3.5" /></button><button @click="removeTask(task)" class="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500" title="Xóa công việc"><Trash2 class="h-3.5 w-3.5" /></button></div>
          </article>
        </div>
        <div v-else class="flex flex-col items-center gap-2 px-5 py-20 text-center"><span class="text-3xl">📋</span><p class="text-sm font-medium text-slate-500">Chưa có công việc nào cho danh sách của bạn.</p><p class="text-xs text-slate-400">Thêm công việc ở ô phía trên để bắt đầu thực hiện mỗi ngày.</p></div>
      </section>
    </div>
  </main>
</template>
