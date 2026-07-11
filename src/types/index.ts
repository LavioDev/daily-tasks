export interface Task {
  id: string
  title: string
  color: string
  createdAt: string
}

export interface ChecklistEntry {
  id: string
  taskId: string
  date: string              // 'YYYY-MM-DD'
  progress: number          // 0 or 100
  completedAt?: string | null
}
