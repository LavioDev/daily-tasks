export interface StorageBreakdownItem {
  key: string
  label: string
  bytes: number
  count: number
}

export interface StorageStats {
  usedBytes: number
  usedFormatted: string
  projectBytes: number
  projectFormatted: string
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

const KNOWN_STORAGE_KEYS = [
  'dailytasks_projects',
  'dailytasks_phases',
  'dailytasks_tasks',
  'dailytasks_subtasks',
  'dailytasks_checklist',
  'dailytasks_daily_tasks',
  'dailytasks_daily_entries'
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
  let projectBytes = 0
  const breakdown: StorageBreakdownItem[] = []

  // 1. Projects
  let projectCount = 0
  let projectBytesSum = 0
  try {
    const raw = localStorage.getItem('dailytasks_projects')
    if (raw) {
      projectBytesSum = (raw.length + 'dailytasks_projects'.length) * 2
      projectBytes += projectBytesSum
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) projectCount = parsed.length
    }
  } catch (e) {
    console.error('Error reading dailytasks_projects', e)
  }
  breakdown.push({
    key: 'projects',
    label: 'Dự án (Projects)',
    bytes: projectBytesSum,
    count: projectCount
  })

  // 2. Phases
  let phaseCount = 0
  let phaseBytesSum = 0
  try {
    const raw = localStorage.getItem('dailytasks_phases')
    if (raw) {
      phaseBytesSum = (raw.length + 'dailytasks_phases'.length) * 2
      projectBytes += phaseBytesSum
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) phaseCount = parsed.length
    }
  } catch (e) {
    console.error('Error reading dailytasks_phases', e)
  }
  breakdown.push({
    key: 'phases',
    label: 'Giai đoạn (Phases)',
    bytes: phaseBytesSum,
    count: phaseCount
  })

  // 3. Tasks breakdown (monthly habits, daily tasks, project tasks)
  let monthlyCount = 0
  let dailyCount = 0
  let projectTaskCount = 0
  let tasksTotalBytes = 0

  try {
    const rawTasks = localStorage.getItem('dailytasks_tasks')
    if (rawTasks) {
      tasksTotalBytes = (rawTasks.length + 'dailytasks_tasks'.length) * 2
      projectBytes += tasksTotalBytes
      const parsed = JSON.parse(rawTasks)
      if (Array.isArray(parsed)) {
        for (const t of parsed) {
          if (t && (t.type === 'project' || t.projectId)) {
            projectTaskCount++
          } else if (t && t.type === 'daily') {
            dailyCount++
          } else {
            monthlyCount++
          }
        }
      }
    }
  } catch (e) {
    console.error('Error reading dailytasks_tasks', e)
  }

  // Also account for legacy dailytasks_daily_tasks if not yet migrated
  try {
    const rawLegacyDaily = localStorage.getItem('dailytasks_daily_tasks')
    if (rawLegacyDaily) {
      const b = (rawLegacyDaily.length + 'dailytasks_daily_tasks'.length) * 2
      projectBytes += b
      tasksTotalBytes += b
      const parsed = JSON.parse(rawLegacyDaily)
      if (Array.isArray(parsed)) {
        dailyCount += parsed.length
      }
    }
  } catch (e) {
    console.error('Error reading legacy dailytasks_daily_tasks', e)
  }

  const totalTasksCount = monthlyCount + dailyCount + projectTaskCount
  const monthlyRatio = totalTasksCount > 0 ? monthlyCount / totalTasksCount : 0.5
  const dailyRatio = totalTasksCount > 0 ? dailyCount / totalTasksCount : 0.5
  const projectTaskRatio = totalTasksCount > 0 ? projectTaskCount / totalTasksCount : 0

  breakdown.push({
    key: 'tasks_monthly',
    label: 'Thói quen tháng (Habits)',
    bytes: Math.round(tasksTotalBytes * monthlyRatio),
    count: monthlyCount
  })

  breakdown.push({
    key: 'tasks_daily',
    label: 'Công việc hàng ngày',
    bytes: Math.round(tasksTotalBytes * dailyRatio),
    count: dailyCount
  })

  breakdown.push({
    key: 'tasks_project',
    label: 'Công việc theo Dự án',
    bytes: Math.round(tasksTotalBytes * projectTaskRatio),
    count: projectTaskCount
  })

  // 4. Subtasks
  let subtaskCount = 0
  let subtaskBytes = 0
  try {
    const rawSubtasks = localStorage.getItem('dailytasks_subtasks')
    if (rawSubtasks) {
      subtaskBytes = (rawSubtasks.length + 'dailytasks_subtasks'.length) * 2
      projectBytes += subtaskBytes
      const parsed = JSON.parse(rawSubtasks)
      if (Array.isArray(parsed)) subtaskCount = parsed.length
    }
  } catch (e) {
    console.error('Error reading dailytasks_subtasks', e)
  }
  breakdown.push({
    key: 'subtasks',
    label: 'Nhiệm vụ con (Subtasks)',
    bytes: subtaskBytes,
    count: subtaskCount
  })

  // 5. Checklist entries (dailytasks_checklist)
  let checklistCount = 0
  let checklistBytes = 0

  try {
    const rawChecklist = localStorage.getItem('dailytasks_checklist')
    if (rawChecklist) {
      checklistBytes += (rawChecklist.length + 'dailytasks_checklist'.length) * 2
      const parsed = JSON.parse(rawChecklist)
      if (Array.isArray(parsed)) {
        checklistCount += parsed.length
      }
    }

    const rawLegacyEntries = localStorage.getItem('dailytasks_daily_entries')
    if (rawLegacyEntries) {
      checklistBytes += (rawLegacyEntries.length + 'dailytasks_daily_entries'.length) * 2
      const parsed = JSON.parse(rawLegacyEntries)
      if (Array.isArray(parsed)) {
        checklistCount += parsed.length
      }
    }
  } catch (e) {
    console.error('Error reading checklist entries', e)
  }

  projectBytes += checklistBytes
  breakdown.push({
    key: 'checklist',
    label: 'Lịch sử check-in tiến độ',
    bytes: checklistBytes,
    count: checklistCount
  })

  // 6. Aggregate all other non-project keys into a single "Khác" item
  let otherBytes = 0
  let otherCount = 0

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && !KNOWN_STORAGE_KEYS.includes(k)) {
        const val = localStorage.getItem(k) || ''
        const bytes = (k.length + val.length) * 2
        otherBytes += bytes
        otherCount++
      }
    }
  } catch (e) {
    console.error('Error scanning other localStorage keys', e)
  }

  if (otherBytes > 0 || otherCount > 0) {
    breakdown.push({
      key: 'other',
      label: 'Khác',
      bytes: otherBytes,
      count: otherCount
    })
  }

  const totalUsedBytes = projectBytes + otherBytes
  const percentage = Math.min(100, parseFloat(((totalUsedBytes / LOCAL_STORAGE_LIMIT_BYTES) * 100).toFixed(2)))

  return {
    usedBytes: totalUsedBytes,
    usedFormatted: formatBytes(totalUsedBytes),
    projectBytes,
    projectFormatted: formatBytes(projectBytes),
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
  for (const k of KNOWN_STORAGE_KEYS) {
    const raw = localStorage.getItem(k)
    if (raw) {
      try {
        data[k] = JSON.parse(raw)
      } catch {
        data[k] = raw
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

    for (const k of KNOWN_STORAGE_KEYS) {
      if (parsed[k] !== undefined) {
        localStorage.setItem(k, JSON.stringify(parsed[k]))
      }
    }
    return true
  } catch (error) {
    console.error('Import failed', error)
    return false
  }
}

export function clearAllDailyTasksData(): void {
  for (const k of KNOWN_STORAGE_KEYS) {
    localStorage.removeItem(k)
  }
}
