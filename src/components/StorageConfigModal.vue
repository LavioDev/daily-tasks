<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  Settings,
  HardDrive,
  Download,
  Upload,
  Trash2,
  X,
  RefreshCw,
  AlertTriangle,
  CheckCircle2
} from '@lucide/vue'
import {
  getLocalStorageStats,
  getOriginStorageEstimate,
  exportAllData,
  importAllData,
  clearAllDailyTasksData,
  type StorageStats
} from '@/utils/storage'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'data-changed'): void
}>()

const stats = ref<StorageStats>(getLocalStorageStats())
const browserOriginQuota = ref<{ usageBytes: number; quotaBytes: number; percentage: number } | null>(null)
const showClearConfirm = ref(false)
const notificationMessage = ref<string | null>(null)
const notificationType = ref<'success' | 'error'>('success')
const fileInput = ref<HTMLInputElement | null>(null)

async function refreshStats() {
  stats.value = getLocalStorageStats()
  browserOriginQuota.value = await getOriginStorageEstimate()
}

onMounted(() => {
  refreshStats()
})

function showNotification(message: string, type: 'success' | 'error' = 'success') {
  notificationMessage.value = message
  notificationType.value = type
  setTimeout(() => {
    notificationMessage.value = null
  }, 3500)
}

function handleExport() {
  exportAllData()
  showNotification('Đã xuất dữ liệu sao lưu (JSON) thành công!')
}

function triggerImport() {
  if (fileInput.value) {
    fileInput.value.value = ''
    fileInput.value.click()
  }
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target?.result as string
    if (content) {
      const success = importAllData(content)
      if (success) {
        refreshStats()
        showNotification('Khôi phục dữ liệu thành công! Đang tải lại...', 'success')
        emit('data-changed')
        setTimeout(() => {
          window.location.reload()
        }, 800)
      } else {
        showNotification('Tệp sao lưu không hợp lệ. Vui lòng kiểm tra lại.', 'error')
      }
    }
  }
  reader.readAsText(file)
}

function handleClearAll() {
  clearAllDailyTasksData()
  showClearConfirm.value = false
  refreshStats()
  showNotification('Đã xóa toàn bộ dữ liệu ứng dụng.', 'success')
  emit('data-changed')
  setTimeout(() => {
    window.location.reload()
  }, 800)
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4 animate-in fade-in duration-150"
    @click.self="emit('close')"
  >
    <div
      class="bg-white border border-slate-200 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-150 overflow-hidden flex flex-col max-h-[90vh]"
    >
      <!-- Modal Header -->
      <div class="border-b border-slate-200 px-6 py-4 flex items-center justify-between bg-slate-50">
        <div class="flex items-center gap-2">
          <Settings class="w-4 h-4 text-violet-600" />
          <h2 class="text-xs font-black uppercase tracking-widest text-slate-800">
            Cài đặt & Quản lý dung lượng
          </h2>
        </div>
        <button
          @click="emit('close')"
          class="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          title="Đóng"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Toast Notification -->
      <div
        v-if="notificationMessage"
        class="px-6 py-2.5 text-xs font-bold flex items-center gap-2 border-b"
        :class="notificationType === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'"
      >
        <CheckCircle2 v-if="notificationType === 'success'" class="w-4 h-4 shrink-0" />
        <AlertTriangle v-else class="w-4 h-4 shrink-0" />
        <span>{{ notificationMessage }}</span>
      </div>

      <!-- Modal Body -->
      <div class="p-6 overflow-y-auto space-y-6">
        <!-- Storage Overview Card -->
        <div class="border border-slate-200 bg-slate-50/50 p-4 space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <HardDrive class="w-4 h-4 text-violet-600" />
              <span class="text-xs font-black uppercase tracking-widest text-slate-700">Dung lượng LocalStorage</span>
            </div>
            <span class="text-xs font-extrabold text-violet-700 font-mono">
              {{ stats.percentage }}% đã dùng
            </span>
          </div>

          <!-- Progress Bar -->
          <div class="h-2.5 bg-slate-200 w-full overflow-hidden">
            <div
              class="h-full bg-violet-600 transition-all duration-500"
              :style="{ width: `${Math.max(stats.percentage, 0.5)}%` }"
            ></div>
          </div>

          <div class="flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>Đã sử dụng: <strong class="text-slate-800 font-mono">{{ stats.usedFormatted }}</strong></span>
            <span>Giới hạn ước tính: <strong class="text-slate-800 font-mono">~{{ stats.quotaFormatted }}</strong></span>
          </div>

          <div v-if="browserOriginQuota" class="pt-2 border-t border-slate-200 text-[10px] text-slate-400 flex justify-between">
            <span>Tổng bộ nhớ trình duyệt cấp cho trang web:</span>
            <span class="font-mono font-bold text-slate-600">{{ browserOriginQuota.percentage }}%</span>
          </div>
        </div>

        <!-- Breakdown Section -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Chi tiết dữ liệu lưu trữ</span>
            <button
              @click="refreshStats"
              class="text-[10px] font-bold text-violet-600 hover:text-violet-800 flex items-center gap-1"
            >
              <RefreshCw class="w-3 h-3" /> Làm mới
            </button>
          </div>
          <div class="border border-slate-200 divide-y divide-slate-100 bg-white">
            <div
              v-for="item in stats.breakdown"
              :key="item.key"
              class="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-slate-50/80 transition-colors"
            >
              <div class="flex flex-col">
                <span class="font-bold text-slate-700">{{ item.label }}</span>
                <span class="text-[10px] text-slate-400 font-mono">{{ item.key }}</span>
              </div>
              <div class="text-right">
                <span class="font-mono font-bold text-slate-800">{{ (item.bytes / 1024).toFixed(2) }} KB</span>
                <span class="block text-[10px] text-slate-400">({{ item.count }} mục)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Backup & Actions Section -->
        <div class="space-y-2">
          <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Quản lý & Sao lưu</span>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <!-- Export Button -->
            <button
              @click="handleExport"
              class="flex items-center justify-center gap-2 px-3 py-2.5 border border-slate-200 bg-white hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 text-xs font-bold text-slate-700 transition-colors"
            >
              <Download class="w-3.5 h-3.5" />
              <span>Sao lưu dữ liệu (JSON)</span>
            </button>

            <!-- Import Button -->
            <button
              @click="triggerImport"
              class="flex items-center justify-center gap-2 px-3 py-2.5 border border-slate-200 bg-white hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 text-xs font-bold text-slate-700 transition-colors"
            >
              <Upload class="w-3.5 h-3.5" />
              <span>Khôi phục dữ liệu</span>
            </button>
            <input
              ref="fileInput"
              type="file"
              accept=".json"
              class="hidden"
              @change="handleFileSelect"
            />
          </div>

          <!-- Clear Storage Area -->
          <div class="pt-2">
            <div v-if="!showClearConfirm">
              <button
                @click="showClearConfirm = true"
                class="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
              >
                <Trash2 class="w-3.5 h-3.5" />
                <span>Xóa toàn bộ dữ liệu & Đặt lại</span>
              </button>
            </div>
            <div v-else class="border border-red-200 bg-red-50 p-3 space-y-2">
              <p class="text-xs font-bold text-red-800 flex items-center gap-1.5">
                <AlertTriangle class="w-4 h-4 text-red-600 shrink-0" />
                Bạn có chắc chắn muốn xóa toàn bộ công việc và thói quen đã lưu?
              </p>
              <div class="flex items-center justify-end gap-2 pt-1">
                <button
                  @click="showClearConfirm = false"
                  class="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100"
                >
                  Hủy bỏ
                </button>
                <button
                  @click="handleClearAll"
                  class="px-3 py-1.5 bg-red-600 text-white text-xs font-bold hover:bg-red-700"
                >
                  Xác nhận xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="border-t border-slate-200 px-6 py-3 bg-slate-50 flex justify-end">
        <button
          @click="emit('close')"
          class="px-4 py-1.5 bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition-colors"
        >
          Đóng
        </button>
      </div>
    </div>
  </div>
</template>
