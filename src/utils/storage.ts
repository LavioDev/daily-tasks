export interface StorageBreakdownItem {
  key: string
  label: string
  bytes: number
  count: number
}

export interface StorageStats {
  usedBytes: number
  usedFormatted: string
  quotaBytes: number
  quotaFormatted: string
  percentage: number
  breakdown: StorageBreakdownItem[]
  originQuota?: {
    usageBytes: number
    quotaBytes: number
    percentage: number
  }
}

// Typical localStorage quota across modern browsers is ~5MB (5,242,880 bytes)
export const LOCAL_STORAGE_LIMIT_BYTES = 5 * 1024 * 1024

const KNOWN_KEYS: { key: string; label: string }[] = [
  { key: 'dailytasks_tasks', label: 'Thói quen tháng (Habits)' },
  { key: 'dailytasks_checklist', label: 'Lịch sử check-in tháng' },
  { key: 'dailytasks_daily_tasks', label: 'Công việc hàng ngày' },
  { key: 'dailytasks_daily_entries', label: 'Lịch sử check-in ngày' }
]

export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export function getLocalStorageStats(): StorageStats {
  let totalBytes = 0
  const breakdown: StorageBreakdownItem[] = []

  // Check known keys
  for (const item of KNOWN_KEYS) {
    try {
      const raw = localStorage.getItem(item.key)
      if (raw !== null) {
        // String size in UTF-16 is roughly length * 2 bytes plus key size
        const bytes = (raw.length + item.key.length) * 2
        totalBytes += bytes

        let count = 0
        try {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) {
            count = parsed.length
          } else if (typeof parsed === 'object' && parsed !== null) {
            count = Object.keys(parsed).length
          }
        } catch {
          count = 0
        }

        breakdown.push({
          key: item.key,
          label: item.label,
          bytes,
          count
        })
      } else {
        breakdown.push({
          key: item.key,
          label: item.label,
          bytes: 0,
          count: 0
        })
      }
    } catch (e) {
      console.error(`Error reading ${item.key}`, e)
    }
  }

  // Check any other keys in localStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && !KNOWN_KEYS.some(item => item.key === k)) {
        const val = localStorage.getItem(k) || ''
        const bytes = (k.length + val.length) * 2
        totalBytes += bytes
        breakdown.push({
          key: k,
          label: `Khác (${k})`,
          bytes,
          count: 1
        })
      }
    }
  } catch (e) {
    console.error('Error scanning localStorage keys', e)
  }

  const percentage = Math.min(100, parseFloat(((totalBytes / LOCAL_STORAGE_LIMIT_BYTES) * 100).toFixed(2)))

  return {
    usedBytes: totalBytes,
    usedFormatted: formatBytes(totalBytes),
    quotaBytes: LOCAL_STORAGE_LIMIT_BYTES,
    quotaFormatted: formatBytes(LOCAL_STORAGE_LIMIT_BYTES, 0),
    percentage,
    breakdown
  }
}

export async function getOriginStorageEstimate(): Promise<{ usageBytes: number; quotaBytes: number; percentage: number } | null> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate()
      const usage = estimate.usage || 0
      const quota = estimate.quota || 1
      const percentage = Math.min(100, parseFloat(((usage / quota) * 100).toFixed(2)))
      return {
        usageBytes: usage,
        quotaBytes: quota,
        percentage
      }
    } catch (e) {
      console.error('Error getting navigator.storage estimate', e)
    }
  }
  return null
}

export function exportAllData(): void {
  const data: Record<string, any> = {}
  for (const item of KNOWN_KEYS) {
    const raw = localStorage.getItem(item.key)
    if (raw) {
      try {
        data[item.key] = JSON.parse(raw)
      } catch {
        data[item.key] = raw
      }
    }
  }

  const jsonStr = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const dateStr = new Date().toISOString().split('T')[0]
  a.href = url
  a.download = `daily-tasks-backup-${dateStr}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function importAllData(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString)
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Invalid JSON format')
    }

    for (const item of KNOWN_KEYS) {
      if (parsed[item.key] !== undefined) {
        localStorage.setItem(item.key, JSON.stringify(parsed[item.key]))
      }
    }
    return true
  } catch (error) {
    console.error('Import failed', error)
    return false
  }
}

export function clearAllDailyTasksData(): void {
  for (const item of KNOWN_KEYS) {
    localStorage.removeItem(item.key)
  }
}
