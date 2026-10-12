<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, ChevronLeft, ChevronRight, Clock3, Plus, Timer, Trash2, X } from '@lucide/vue'
import { useRoute } from 'vue-router'
import { useDailyTaskStore } from '@/stores/dailyTaskStore'
import { useChecklistStore } from '@/stores/checklistStore'
import type { Task } from '@/types'

const emit = defineEmits<{ (event: 'start-timer', taskId: string): void }>()
const route = useRoute()
const dailyStore = useDailyTaskStore()
const checklistStore = useChecklistStore()

const DAY_START = 5 * 60
const DAY_END = 24 * 60
const SLOT_MINUTES = 30
const PIXELS_PER_HOUR = 50
const GRID_HEIGHT = ((DAY_END - DAY_START) / 60) * PIXELS_PER_HOUR

function toDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function parseDate(value: string) {
  const [year = 1970, month = 1, day = 1] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function mondayOf(date: Date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return monday
}

function validDate(value: unknown): value is string {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(parseDate(value).getTime())
    && toDateInput(parseDate(value)) === value
}

const today = toDateInput(new Date())
const initialDate = validDate(route.query.date) ? route.query.date : today
const selectedDate = ref(initialDate)
const weekStart = computed(() => mondayOf(parseDate(selectedDate.value)))
const weekDates = computed(() => Array.from({ length: 7 }, (_, index) => {
  const date = new Date(weekStart.value)
  date.setDate(date.getDate() + index)
  return toDateInput(date)
}))
const weekLabel = computed(() => {
  const first = weekStart.value
  const last = new Date(first)
  last.setDate(last.getDate() + 6)
  const monthYear = new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' })
  if (first.getMonth() === last.getMonth() && first.getFullYear() === last.getFullYear()) {
    return `${first.getDate()} – ${last.getDate()} ${monthYear.format(last)}`
  }
  return `${new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'short' }).format(first)} – ${new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' }).format(last)}`
})

watch(() => route.query.date, value => {
  if (validDate(value)) selectedDate.value = value
})

const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']
const hours = Array.from({ length: 19 }, (_, index) => index + 5)
const scheduledTasks = computed(() => dailyStore.tasks.filter(task => task.schedule))

interface PositionedEvent {
  task: Task
  lane: number
  laneCount: number
}

const eventsByDate = computed(() => {
  const result = new Map<string, PositionedEvent[]>()
  for (const date of weekDates.value) {
    const events = scheduledTasks.value
      .filter(task => task.schedule?.date === date)
      .sort((a, b) => a.schedule!.startMinute - b.schedule!.startMinute || a.schedule!.endMinute - b.schedule!.endMinute)

    const positioned: PositionedEvent[] = []
    let cluster: Task[] = []
    let clusterEnd = -1
    const placeCluster = () => {
      if (!cluster.length) return
      const laneEnds: number[] = []
      const clusterEvents: Array<{ task: Task; lane: number }> = []
      for (const task of cluster) {
        const schedule = task.schedule!
        let lane = laneEnds.findIndex(end => end <= schedule.startMinute)
        if (lane === -1) lane = laneEnds.length
        laneEnds[lane] = schedule.endMinute
        clusterEvents.push({ task, lane })
      }
      for (const item of clusterEvents) positioned.push({ ...item, laneCount: laneEnds.length })
      cluster = []
      clusterEnd = -1
    }

    for (const task of events) {
      const schedule = task.schedule!
      if (cluster.length && schedule.startMinute >= clusterEnd) placeCluster()
      cluster.push(task)
      clusterEnd = Math.max(clusterEnd, schedule.endMinute)
    }
    placeCluster()
    result.set(date, positioned)
  }
  return result
})

function displayDayName(index: number) { return dayNames[index] }
function dayNumber(date: string) { return parseDate(date).getDate() }
function isToday(date: string) { return date === today }
function isCompleted(task: Task) { return checklistStore.isTaskCompleted(task.id, task.schedule!.date) }
function formatTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}
function eventStyle(event: PositionedEvent) {
  const schedule = event.task.schedule!
  const top = ((schedule.startMinute - DAY_START) / 60) * PIXELS_PER_HOUR
  const height = ((schedule.endMinute - schedule.startMinute) / 60) * PIXELS_PER_HOUR
  const gap = 3
  return {
    top: `${top + 2}px`,
    height: `${Math.max(12, height - 4)}px`,
    left: `calc(${(event.lane / event.laneCount) * 100}% + ${gap}px)`,
    width: `calc(${100 / event.laneCount}% - ${gap * 2}px)`
  }
}

const isModalOpen = ref(false)
const editingTask = ref<Task | null>(null)
const title = ref('')
const eventDate = ref(selectedDate.value)
const startMinute = ref(DAY_START)
const endMinute = ref(DAY_START + 60)
const endAtMidnight = ref(false)
const errorMessage = ref('')
const startTime = computed({
  get: () => formatTime(startMinute.value),
  set: (value: string) => {
    const [hour = 0, minute = 0] = value.split(':').map(Number)
    startMinute.value = hour * 60 + minute
  }
})
const endTime = computed({
  get: () => endAtMidnight.value ? '' : formatTime(endMinute.value),
  set: (value: string) => {
    if (!value) return
    const [hour = 0, minute = 0] = value.split(':').map(Number)
    endMinute.value = hour * 60 + minute
    endAtMidnight.value = false
  }
})

function openNewEvent(date: string, start = DAY_START) {
  editingTask.value = null
  title.value = ''
  eventDate.value = date
  startMinute.value = start
  endMinute.value = Math.min(DAY_END, start + 60)
  endAtMidnight.value = endMinute.value === DAY_END
  errorMessage.value = ''
  isModalOpen.value = true
}

function openEditEvent(task: Task) {
  if (!task.schedule) return
  editingTask.value = task
  title.value = task.title
  eventDate.value = task.schedule.date
  startMinute.value = task.schedule.startMinute
  endMinute.value = task.schedule.endMinute
  endAtMidnight.value = task.schedule.endMinute === DAY_END
  errorMessage.value = ''
  isModalOpen.value = true
}

function onStartChange() {
  if (endAtMidnight.value || startMinute.value >= DAY_END - 15) {
    endAtMidnight.value = true
    endMinute.value = DAY_END
  } else if (endMinute.value <= startMinute.value) {
    endMinute.value = startMinute.value + 15
  }
}

function saveEvent() {
  if (!title.value.trim()) {
    errorMessage.value = 'Vui lòng nhập tên lịch.'
    return
  }
  if (!validDate(eventDate.value) || startMinute.value < DAY_START || startMinute.value >= DAY_END || endMinute.value > DAY_END || endMinute.value <= startMinute.value) {
    errorMessage.value = 'Chọn ngày và khoảng giờ hợp lệ từ 05:00 đến 24:00.'
    return
  }
  const schedule = { date: eventDate.value, startMinute: startMinute.value, endMinute: endMinute.value }
  if (editingTask.value) {
    dailyStore.updateTask(editingTask.value.id, { title: title.value.trim() })
    dailyStore.updateSchedule(editingTask.value.id, schedule)
  } else {
    dailyStore.addScheduledTask(title.value.trim(), schedule)
  }
  selectedDate.value = eventDate.value
  isModalOpen.value = false
}

function deleteEvent() {
  if (!editingTask.value) return
  if (!window.confirm(`Xóa lịch “${editingTask.value.title}”?`)) return
  dailyStore.deleteTask(editingTask.value.id)
  isModalOpen.value = false
}

function toggleComplete(task: Task) {
  checklistStore.toggleEntry(task.id, task.schedule!.date)
}

function startTimer(task: Task) {
  isModalOpen.value = false
  emit('start-timer', task.id)
}

function changeWeek(offset: number) {
  const date = parseDate(selectedDate.value)
  date.setDate(date.getDate() + offset * 7)
  selectedDate.value = toDateInput(date)
}

function jumpToToday() { selectedDate.value = today }
function openSlot(date: string, slotIndex: number) { openNewEvent(date, DAY_START + slotIndex * SLOT_MINUTES) }
</script>

<template>
  <main class="flex-1 bg-slate-50 px-3 py-5 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-[1600px]">
      <section class="mb-4 border border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p class="text-[10px] font-black uppercase tracking-widest text-violet-600">Lịch tuần</p>
            <h1 class="mt-1 text-xl font-bold capitalize text-slate-800">{{ weekLabel }}</h1>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button @click="changeWeek(-1)" class="flex h-9 w-9 items-center justify-center border border-slate-200 text-slate-500 hover:bg-slate-50" title="Tuần trước"><ChevronLeft class="h-4 w-4" /></button>
            <button @click="changeWeek(1)" class="flex h-9 w-9 items-center justify-center border border-slate-200 text-slate-500 hover:bg-slate-50" title="Tuần sau"><ChevronRight class="h-4 w-4" /></button>
            <input v-model="selectedDate" type="date" aria-label="Chọn ngày trong tuần" class="h-8 border border-slate-200 px-2 text-xs font-semibold text-slate-700 outline-none focus:border-violet-500" />
            <button @click="jumpToToday" class="h-9 border border-violet-200 px-3 text-xs font-bold text-violet-700 hover:bg-violet-50">Hôm nay</button>
            <button @click="openNewEvent(selectedDate)" class="flex h-9 items-center gap-2 bg-violet-600 px-3 text-xs font-bold text-white hover:bg-violet-700"><Plus class="h-4 w-4" />Thêm lịch</button>
          </div>
        </div>
      </section>

      <section class="overflow-hidden border border-slate-200 bg-white">
        <div class="grid-scroll max-h-[calc(100vh-205px)] min-h-[440px] overflow-auto">
          <div class="min-w-[1120px]">
            <div class="sticky top-0 z-30 grid grid-cols-[64px_repeat(7,minmax(140px,1fr))] border-b border-slate-200 bg-white">
              <div class="sticky left-0 z-40 flex h-14 items-center justify-center border-r border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400">Giờ</div>
              <div v-for="(date, index) in weekDates" :key="date" class="flex h-14 flex-col items-center justify-center border-r border-slate-200 last:border-r-0" :class="isToday(date) ? 'bg-violet-50' : ''">
                <span class="text-[10px] font-bold uppercase tracking-wide" :class="isToday(date) ? 'text-violet-700' : 'text-slate-500'">{{ displayDayName(index) }}</span>
                <span class="mt-0.5 flex h-6 w-6 items-center justify-center text-sm font-bold" :class="isToday(date) ? 'bg-violet-600 text-white' : 'text-slate-800'">{{ dayNumber(date) }}</span>
              </div>
            </div>

            <div class="grid grid-cols-[64px_repeat(7,minmax(140px,1fr))]">
              <div class="sticky left-0 z-20 border-r border-slate-200 bg-white" :style="{ height: `${GRID_HEIGHT}px` }">
                <div v-for="hour in hours" :key="hour" class="relative border-t border-slate-200 text-right" :style="{ height: `${PIXELS_PER_HOUR}px` }">
                  <span class="absolute right-2 top-0 z-10 translate-y-1/2 bg-white pl-1 text-[10px] font-semibold text-slate-500">{{ String(hour).padStart(2, '0') }}:00</span>
                </div>
                <span class="absolute bottom-0 right-2 translate-y-1/2 bg-white pl-1 text-[10px] font-semibold text-slate-500">24:00</span>
              </div>

              <div v-for="date in weekDates" :key="date" class="relative border-r border-slate-200 last:border-r-0" :style="{ height: `${GRID_HEIGHT}px` }">
                <div class="absolute inset-0" :style="{ backgroundSize: `100% ${PIXELS_PER_HOUR / 2}px`, backgroundImage: 'linear-gradient(to bottom, transparent calc(100% - 1px), #e2e8f0 100%)' }"></div>
                <div class="absolute inset-0 grid grid-rows-[repeat(38,25px)]">
                  <button v-for="slot in 38" :key="slot" @click="openSlot(date, slot - 1)" class="border-b border-slate-100/80 hover:bg-violet-50/50" :aria-label="`Thêm lịch ${formatTime(DAY_START + (slot - 1) * SLOT_MINUTES)} ngày ${date}`"></button>
                </div>
                <div class="pointer-events-none absolute inset-0 z-10">
                  <article v-for="event in eventsByDate.get(date) || []" :key="event.task.id" class="pointer-events-auto absolute overflow-hidden border-l-[3px] shadow-sm" :style="eventStyle(event)" :class="isCompleted(event.task) ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : 'border-violet-600 bg-violet-50 text-violet-950'" @click="openEditEvent(event.task)">
                    <div class="flex h-full min-w-0 items-start gap-1 px-1.5 py-1 sm:gap-1.5 sm:px-2">
                      <button @click.stop="toggleComplete(event.task)" class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border" :class="isCompleted(event.task) ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-400 bg-white/80 text-transparent hover:border-violet-600'" :title="isCompleted(event.task) ? 'Đánh dấu chưa xong' : 'Đánh dấu đã xong'"><Check class="h-3 w-3" /></button>
                      <div class="min-w-0 flex-1 leading-tight">
                        <p class="truncate text-[10px] font-bold sm:text-xs" :class="isCompleted(event.task) ? 'line-through opacity-75' : ''">{{ event.task.title }}</p>
                        <p class="mt-0.5 flex items-center gap-1 text-[9px] font-semibold opacity-70 sm:text-[10px]"><Clock3 class="h-3 w-3 shrink-0" />{{ formatTime(event.task.schedule!.startMinute) }}–{{ formatTime(event.task.schedule!.endMinute) }}</p>
                      </div>
                      <button @click.stop="emit('start-timer', event.task.id)" class="shrink-0 p-0.5 opacity-60 hover:bg-white/80 hover:opacity-100" title="Mở Focus Timer"><Timer class="h-3.5 w-3.5" /></button>
                    </div>
                  </article>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p class="border-t border-slate-200 px-4 py-2 text-[10px] font-medium text-slate-400">Bấm vào ô trống để thêm lịch · Bấm vào lịch để chỉnh sửa</p>
      </section>
    </div>

    <Transition name="antd-modal">
      <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6 backdrop-blur-[2px]" @click.self="isModalOpen = false" @keydown.esc="isModalOpen = false">
        <section class="antd-modal-content w-full max-w-lg border border-slate-200 bg-white shadow-xl" role="dialog" aria-modal="true" :aria-label="editingTask ? 'Chỉnh sửa lịch' : 'Thêm lịch'">
          <header class="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
            <div>
              <p class="text-[10px] font-black uppercase tracking-widest text-violet-600">Calendar</p>
              <h2 class="mt-1 text-sm font-black uppercase tracking-wide text-slate-800">{{ editingTask ? 'Chỉnh sửa lịch' : 'Thêm lịch mới' }}</h2>
            </div>
            <button @click="isModalOpen = false" class="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Đóng"><X class="h-4 w-4" /></button>
          </header>
          <form @submit.prevent="saveEvent" class="flex flex-col gap-4 p-5 sm:p-6">
            <label class="flex flex-col gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Tên lịch
              <input v-model="title" required maxlength="120" autofocus class="h-10 border border-slate-200 px-3 text-sm font-semibold normal-case tracking-normal text-slate-700 outline-none focus:border-violet-500" placeholder="Nhập tên lịch..." />
            </label>
            <label class="flex flex-col gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Ngày
              <input v-model="eventDate" required type="date" class="h-10 border border-slate-200 px-3 text-sm font-semibold normal-case tracking-normal text-slate-700 outline-none focus:border-violet-500" />
            </label>
            <div class="grid grid-cols-2 gap-3">
              <label class="flex flex-col gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Bắt đầu
                <span class="relative">
                  <Clock3 class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-600" />
                  <input v-model="startTime" type="time" min="05:00" max="23:45" step="60" required @change="onStartChange" class="h-10 w-full border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold normal-case tracking-normal text-slate-700 accent-violet-600 outline-none transition-colors hover:border-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
                </span>
              </label>
              <label class="flex flex-col gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Kết thúc
                <span class="relative">
                  <Clock3 class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-600" />
                  <input v-model="endTime" type="time" :min="formatTime(startMinute + 15)" max="23:59" step="60" :disabled="endAtMidnight || startMinute >= DAY_END - 15" :required="!endAtMidnight" class="h-10 w-full border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold normal-case tracking-normal text-slate-700 accent-violet-600 outline-none transition-colors hover:border-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400" />
                </span>
              </label>
            </div>
            <label class="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <input v-model="endAtMidnight" type="checkbox" :disabled="startMinute >= DAY_END - 15" class="h-4 w-4 accent-violet-600" @change="endMinute = endAtMidnight ? DAY_END : Math.min(DAY_END - 15, startMinute + 60)" />
              Kết thúc lúc 24:00
            </label>
            <div v-if="editingTask" class="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
              <button type="button" @click="toggleComplete(editingTask)" class="flex h-9 items-center gap-2 px-2 text-xs font-bold" :class="isCompleted(editingTask) ? 'text-emerald-700' : 'text-slate-500 hover:text-violet-700'">
                <span class="flex h-5 w-5 items-center justify-center border" :class="isCompleted(editingTask) ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white'"><Check class="h-3.5 w-3.5" /></span>
                {{ isCompleted(editingTask) ? 'Đã xong' : 'Đánh dấu đã xong' }}
              </button>
              <button type="button" @click="startTimer(editingTask)" class="flex h-9 items-center gap-2 px-2 text-xs font-bold text-violet-700 hover:bg-violet-50"><Timer class="h-4 w-4" />Focus Timer</button>
            </div>
            <p v-if="errorMessage" class="text-xs font-semibold text-red-600">{{ errorMessage }}</p>
            <footer class="mt-1 flex flex-wrap items-center justify-between gap-2">
              <button v-if="editingTask" type="button" @click="deleteEvent" class="flex h-10 items-center gap-2 px-3 text-xs font-bold text-red-600 hover:bg-red-50"><Trash2 class="h-4 w-4" />Xóa lịch</button>
              <span v-else></span>
              <div class="ml-auto flex gap-2">
                <button type="button" @click="isModalOpen = false" class="h-10 px-4 text-xs font-bold text-slate-500 hover:bg-slate-100">Hủy</button>
                <button type="submit" class="h-10 bg-violet-600 px-4 text-xs font-bold text-white hover:bg-violet-700">{{ editingTask ? 'Lưu thay đổi' : 'Tạo lịch' }}</button>
              </div>
            </footer>
          </form>
        </section>
      </div>
    </Transition>
  </main>
</template>
