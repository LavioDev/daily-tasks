export type TaskType = 'monthly' | 'daily' | 'project'
export type ProjectStatus = 'active' | 'completed' | 'archived'

export interface Project {
  id: string
  title: string
  description?: string
  color: string
  status: ProjectStatus
  startDate?: string       // YYYY-MM-DD
  targetDate?: string      // YYYY-MM-DD
  order: number
  createdAt: string        // ISO string
}

export interface Phase {
  id: string
  projectId: string
  title: string
  description?: string
  startDate?: string       // YYYY-MM-DD
  endDate?: string         // YYYY-MM-DD
  order: number
  isMarked?: boolean       // Đánh dấu đã hoàn thành / skip phase
  createdAt: string        // ISO string
}

export interface Task {
  id: string
  title: string
  color: string
  createdAt: string
  type?: TaskType          // 'monthly' | 'daily' | 'project'
  projectId?: string       // ID của Project liên kết
  phaseId?: string         // ID của Phase liên kết
  duration?: number | null // Phút mục tiêu
  timeSpent?: number       // Giây đã đếm giờ
  dueDate?: string         // Hạn hoàn thành YYYY-MM-DD
}

export interface Subtask {
  id: string
  taskId: string           // ID Task cha
  title: string
  order: number
  duration?: number | null
  timeSpent?: number
  createdAt: string
}

export interface ChecklistEntry {
  id: string
  taskId: string
  subtaskId?: string | null // Lưu ID của subtask nếu đây là check-in cho subtask
  date: string              // 'YYYY-MM-DD'
  progress: number          // 0 hoặc 100
  completedAt?: string | null
}
