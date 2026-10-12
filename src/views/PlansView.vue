<script setup lang="ts">
import { computed, ref } from 'vue'
import { CalendarDays, Edit2, FolderPlus, Plus, Target, Trash2, X } from '@lucide/vue'
import { usePlanStore } from '@/stores/planStore'
import type { PlanNode } from '@/types'

const planStore = usePlanStore()
const isModalOpen = ref(false)
const editingPlan = ref<PlanNode | null>(null)
const title = ref('')
const description = ref('')
const startDate = ref('')
const targetDate = ref('')
const errorMessage = ref('')
const plans = computed(() => planStore.roots)
const totalNodes = computed(() => planStore.nodes.length)

function openCreate() {
  editingPlan.value = null
  title.value = ''
  description.value = ''
  startDate.value = ''
  targetDate.value = ''
  errorMessage.value = ''
  isModalOpen.value = true
}

function openEdit(plan: PlanNode, event?: Event) {
  event?.stopPropagation()
  editingPlan.value = plan
  title.value = plan.title
  description.value = plan.description || ''
  startDate.value = plan.startDate || ''
  targetDate.value = plan.targetDate || ''
  errorMessage.value = ''
  isModalOpen.value = true
}

function savePlan() {
  if (!title.value.trim()) {
    errorMessage.value = 'Vui lòng nhập tên kế hoạch.'
    return
  }
  if (startDate.value && targetDate.value && targetDate.value < startDate.value) {
    errorMessage.value = 'Hạn hoàn thành không được trước ngày bắt đầu.'
    return
  }
  const fields = {
    title: title.value,
    description: description.value,
    startDate: startDate.value,
    targetDate: targetDate.value
  }
  if (editingPlan.value) {
    planStore.updateNode(editingPlan.value.id, fields)
  } else {
    planStore.addRoot(fields)
    isModalOpen.value = false
    return
  }
  isModalOpen.value = false
}

function deletePlan(plan: PlanNode, event?: Event) {
  event?.stopPropagation()
  const count = 1 + planStore.getDescendantIds(plan.id).length
  if (!window.confirm(`Xóa toàn bộ nhánh “${plan.title}”, gồm ${count} kế hoạch?`)) return
  planStore.deleteNode(plan.id)
}

function formatDate(value?: string) {
  if (!value) return ''
  const [year = 2000, month = 1, day = 1] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(year, month - 1, day))
}
</script>

<template>
  <main class="flex-1 bg-slate-50 px-4 py-6 sm:px-6 lg:px-10">
    <div class="mx-auto max-w-6xl">
      <header class="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-[10px] font-black uppercase tracking-widest text-violet-600">Mục tiêu dài hạn</p>
          <h1 class="mt-1 text-2xl font-bold text-slate-800">Kế hoạch</h1>
          <p class="mt-1 text-sm text-slate-500">Tạo và quản lý các mục tiêu dài hạn của bạn.</p>
        </div>
        <button @click="openCreate" class="flex h-10 items-center gap-2 bg-violet-600 px-4 text-xs font-bold text-white hover:bg-violet-700"><Plus class="h-4 w-4" />Kế hoạch mới</button>
      </header>

      <section v-if="plans.length" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article v-for="plan in plans" :key="plan.id" class="group border border-slate-200 bg-white p-5 transition-colors hover:border-violet-300">
          <div class="block w-full text-left">
            <div class="mb-4 flex h-10 w-10 items-center justify-center bg-violet-50 text-violet-700"><Target class="h-5 w-5" /></div>
            <h2 class="line-clamp-2 min-h-10 text-base font-bold text-slate-800">{{ plan.title }}</h2>
            <p v-if="plan.description" class="mt-1 min-h-10 text-xs leading-5 text-slate-500">{{ plan.description }}</p>
            <p v-else class="mt-1 min-h-10 text-xs text-slate-400">Chưa có mô tả</p>
            <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-semibold text-slate-400">
              <span v-if="plan.targetDate" class="flex items-center gap-1"><CalendarDays class="h-3.5 w-3.5" />Hạn {{ formatDate(plan.targetDate) }}</span>
              <span>{{ planStore.getDescendantIds(plan.id).length }} kế hoạch con</span>
            </div>
            <div class="mt-4">
              <div class="mb-1 flex justify-between text-[10px] font-black uppercase tracking-wide text-slate-400">
                <span>Tiến độ</span>
                <span class="text-violet-700">{{ planStore.getProgress(plan.id).percent }}% · {{ planStore.getProgress(plan.id).completed }}/{{ planStore.getProgress(plan.id).total }}</span>
              </div>
              <div class="h-1.5 bg-slate-100"><div class="h-full bg-violet-600" :style="{ width: `${planStore.getProgress(plan.id).percent}%` }"></div></div>
            </div>
          </div>
          <footer class="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
            <div class="flex items-center gap-1">
              <button @click="planStore.moveSibling(plan.id, -1)" class="flex h-7 w-7 items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700" :disabled="plans[0]?.id === plan.id" title="Đưa lên" aria-label="Đưa kế hoạch lên">↑</button>
              <button @click="planStore.moveSibling(plan.id, 1)" class="flex h-7 w-7 items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700" :disabled="plans[plans.length - 1]?.id === plan.id" title="Đưa xuống" aria-label="Đưa kế hoạch xuống">↓</button>
              <button @click="openEdit(plan, $event)" class="flex h-7 w-7 items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Sửa kế hoạch"><Edit2 class="h-3.5 w-3.5" /></button>
              <button @click="deletePlan(plan, $event)" class="flex h-7 w-7 items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600" title="Xóa kế hoạch"><Trash2 class="h-3.5 w-3.5" /></button>
            </div>
          </footer>
        </article>
      </section>

      <section v-else class="flex min-h-80 flex-col items-center justify-center border border-dashed border-slate-300 bg-white px-6 text-center">
        <div class="mb-4 flex h-12 w-12 items-center justify-center bg-violet-50 text-violet-700"><FolderPlus class="h-6 w-6" /></div>
        <h2 class="text-base font-bold text-slate-800">Bắt đầu với một mục tiêu lớn</h2>
        <p class="mt-1 max-w-md text-sm text-slate-500">Tạo kế hoạch dài hạn đầu tiên để bắt đầu theo dõi tiến độ.</p>
        <button @click="openCreate" class="mt-5 flex h-10 items-center gap-2 bg-violet-600 px-4 text-xs font-bold text-white hover:bg-violet-700"><Plus class="h-4 w-4" />Tạo kế hoạch đầu tiên</button>
      </section>
      <p v-if="totalNodes" class="mt-4 text-[10px] font-medium text-slate-400">{{ plans.length }} kế hoạch dài hạn · {{ totalNodes }} mục tiêu</p>
    </div>

    <Transition name="antd-modal">
      <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6 backdrop-blur-[2px]" @click.self="isModalOpen = false">
        <section class="antd-modal-content w-full max-w-lg border border-slate-200 bg-white shadow-xl" role="dialog" aria-modal="true" :aria-label="editingPlan ? 'Sửa kế hoạch' : 'Tạo kế hoạch dài hạn'">
          <header class="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
            <div><p class="text-[10px] font-black uppercase tracking-widest text-violet-600">Kế hoạch dài hạn</p><h2 class="mt-1 text-sm font-black uppercase tracking-wide text-slate-800">{{ editingPlan ? 'Sửa kế hoạch' : 'Tạo kế hoạch mới' }}</h2></div>
            <button @click="isModalOpen = false" class="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Đóng"><X class="h-4 w-4" /></button>
          </header>
          <form @submit.prevent="savePlan" class="flex flex-col gap-4 p-5 sm:p-6">
            <label class="flex flex-col gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Tên kế hoạch
              <input v-model="title" required maxlength="120" autofocus class="h-10 border border-slate-200 px-3 text-sm font-semibold normal-case tracking-normal text-slate-700 outline-none focus:border-violet-500" placeholder="Ví dụ: Học tiếng Trung" />
            </label>
            <label class="flex flex-col gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Mô tả
              <textarea v-model="description" rows="3" maxlength="500" class="resize-y border border-slate-200 px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-700 outline-none focus:border-violet-500" placeholder="Mục tiêu hoặc lý do bạn muốn đạt được..."></textarea>
            </label>
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="flex flex-col gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Ngày bắt đầu
                <input v-model="startDate" type="date" class="h-10 border border-slate-200 px-3 text-sm font-semibold normal-case tracking-normal text-slate-700 outline-none focus:border-violet-500" />
              </label>
              <label class="flex flex-col gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Hạn hoàn thành
                <input v-model="targetDate" type="date" :min="startDate || undefined" class="h-10 border border-slate-200 px-3 text-sm font-semibold normal-case tracking-normal text-slate-700 outline-none focus:border-violet-500" />
              </label>
            </div>
            <p v-if="errorMessage" class="text-xs font-semibold text-red-600">{{ errorMessage }}</p>
            <footer class="flex justify-end gap-2 pt-2">
              <button type="button" @click="isModalOpen = false" class="h-10 px-4 text-xs font-bold text-slate-500 hover:bg-slate-100">Hủy</button>
              <button type="submit" class="h-10 bg-violet-600 px-4 text-xs font-bold text-white hover:bg-violet-700">{{ editingPlan ? 'Lưu thay đổi' : 'Tạo kế hoạch' }}</button>
            </footer>
          </form>
        </section>
      </div>
    </Transition>
  </main>
</template>
