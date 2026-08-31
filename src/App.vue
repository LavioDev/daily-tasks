<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, RouterLink, RouterView } from 'vue-router'
import { CalendarDays, ListChecks, FolderKanban, Settings } from '@lucide/vue'
import MonthSelector from '@/components/MonthSelector.vue'
import StorageConfigModal from '@/components/StorageConfigModal.vue'
import { useMonthStore } from '@/stores/monthStore'
import { getLocalStorageStats } from '@/utils/storage'

const route = useRoute()
const monthStore = useMonthStore()

// Config & Storage Modal State
const isConfigOpen = ref(false)
const storagePercentage = ref<number>(0)

function refreshStorage() {
  storagePercentage.value = getLocalStorageStats().percentage
}

onMounted(() => {
  refreshStorage()
  window.addEventListener('storage', refreshStorage)
})

onUnmounted(() => {
  window.removeEventListener('storage', refreshStorage)
})

// Active view route helpers
const isTimerView = computed(() => route.path.startsWith('/timer'))
const isMonthlyView = computed(() => route.path.startsWith('/monthly') || route.path === '/')
const isDailyView = computed(() => route.path.startsWith('/daily'))
const isProjectsView = computed(() => route.path.startsWith('/projects'))
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col" style="font-family:'Inter',system-ui,sans-serif">

    <!-- ═══ HEADER (Nav + Month Selector + Config Storage Button) ═══ -->
    <header
      v-if="!isTimerView"
      class="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 animate-in fade-in duration-150"
    >
      <nav class="flex items-center gap-1" aria-label="Chế độ xem">
        <RouterLink
          to="/monthly"
          class="flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors"
          :class="isMonthlyView ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'"
        >
          <CalendarDays class="w-4 h-4" /> Theo tháng
        </RouterLink>
        <RouterLink
          to="/daily"
          class="flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors"
          :class="isDailyView ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'"
        >
          <ListChecks class="w-4 h-4" /> Hôm nay
        </RouterLink>
        <RouterLink
          to="/projects"
          class="flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors"
          :class="isProjectsView ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'"
        >
          <FolderKanban class="w-4 h-4" /> Dự án
        </RouterLink>
      </nav>

      <!-- Right Header Actions -->
      <div class="flex items-center gap-2.5">
        <!-- Month Selector is only shown on the Monthly page -->
        <MonthSelector v-if="isMonthlyView" v-model="monthStore.selectedMonthYear" />
        
        <!-- Config & Storage Capacity Button -->
        <button
          @click="() => { refreshStorage(); isConfigOpen = true }"
          class="h-9 px-3 flex items-center gap-2 border border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400 text-slate-700 transition-colors select-none"
          style="border-radius:0"
          title="Cài đặt & Quản lý dung lượng bộ nhớ"
        >
          <Settings class="w-3.5 h-3.5 text-violet-600 shrink-0" />
          <span class="hidden sm:inline text-xs font-semibold text-slate-500">Dung lượng:</span>
          <span class="text-xs font-extrabold text-violet-700 font-mono">{{ storagePercentage }}%</span>
        </button>
      </div>
    </header>

    <!-- Storage & Settings Modal -->
    <StorageConfigModal
      :is-open="isConfigOpen"
      @close="isConfigOpen = false"
      @data-changed="refreshStorage"
    />

    <!-- Routed Page Content -->
    <RouterView />
  </div>
</template>
