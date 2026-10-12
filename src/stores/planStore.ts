import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { PlanNode } from '@/types'

const STORAGE_KEY = 'dailytasks_plan_nodes'

type PlanFields = Pick<PlanNode, 'title' | 'description' | 'startDate' | 'targetDate'>

export const usePlanStore = defineStore('plans', () => {
  const nodes = ref<PlanNode[]>(loadNodes())
  const roots = computed(() => nodes.value
    .filter(node => node.parentId === null)
    .sort((a, b) => a.order - b.order))

  watch(nodes, value => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } catch (error) {
      console.error('Failed to save plans to localStorage', error)
      handleQuotaError(error)
    }
  }, { deep: true })

  function getNode(id: string) {
    return nodes.value.find(node => node.id === id)
  }

  function getChildren(parentId: string) {
    return nodes.value.filter(node => node.parentId === parentId).sort((a, b) => a.order - b.order)
  }

  function getDescendantIds(id: string): string[] {
    const result: string[] = []
    const pending = [id]
    while (pending.length) {
      const parentId = pending.pop()!
      for (const child of getChildren(parentId)) {
        result.push(child.id)
        pending.push(child.id)
      }
    }
    return result
  }

  function getRootId(id: string): string | undefined {
    let node = getNode(id)
    if (!node) return undefined
    while (node.parentId) {
      const parent = getNode(node.parentId)
      if (!parent) return undefined
      node = parent
    }
    return node.id
  }

  function getProgress(id: string) {
    const leaves: PlanNode[] = []
    const pending = [id]
    while (pending.length) {
      const currentId = pending.pop()!
      const children = getChildren(currentId)
      if (!children.length) {
        const node = getNode(currentId)
        if (node) leaves.push(node)
      } else {
        pending.push(...children.map(child => child.id))
      }
    }
    const completed = leaves.filter(node => !!node.completedAt).length
    return { completed, total: leaves.length, percent: leaves.length ? Math.round((completed / leaves.length) * 100) : 0 }
  }

  function isLeaf(id: string) {
    return getChildren(id).length === 0
  }

  function addRoot(fields: PlanFields) {
    return createNode(null, fields)
  }

  function addChild(parentId: string, fields: PlanFields) {
    const parent = getNode(parentId)
    if (!parent) return undefined
    if (!getChildren(parentId).length) parent.completedAt = null
    return createNode(parentId, fields)
  }

  function createNode(parentId: string | null, fields: PlanFields) {
    const siblings = parentId ? getChildren(parentId) : roots.value
    const node: PlanNode = {
      id: createId(),
      parentId,
      title: fields.title.trim(),
      description: fields.description?.trim() || '',
      startDate: fields.startDate || undefined,
      targetDate: fields.targetDate || undefined,
      order: siblings.length ? Math.max(...siblings.map(sibling => sibling.order)) + 1 : 0,
      completedAt: null,
      createdAt: new Date().toISOString()
    }
    nodes.value.push(node)
    return node
  }

  function updateNode(id: string, fields: PlanFields) {
    const node = getNode(id)
    if (!node) return false
    node.title = fields.title.trim()
    node.description = fields.description?.trim() || ''
    node.startDate = fields.startDate || undefined
    node.targetDate = fields.targetDate || undefined
    return true
  }

  function setCompleted(id: string, completed: boolean) {
    const node = getNode(id)
    if (!node || !isLeaf(id)) return false
    node.completedAt = completed ? new Date().toISOString() : null
    return true
  }

  function moveNode(id: string, newParentId: string) {
    const node = getNode(id)
    const newParent = getNode(newParentId)
    if (!node || !newParent || node.parentId === null || node.parentId === newParentId) return false
    const descendants = getDescendantIds(id)
    if (descendants.includes(newParentId) || getRootId(id) !== getRootId(newParentId)) return false

    const oldParent = getNode(node.parentId)
    node.parentId = newParentId
    if (oldParent && !getChildren(oldParent.id).some(child => child.id !== id)) oldParent.completedAt = null
    newParent.completedAt = null
    normalizeSiblingOrder(oldParent?.id ?? null)
    normalizeSiblingOrder(newParentId)
    return true
  }

  function moveSibling(id: string, direction: -1 | 1) {
    const node = getNode(id)
    if (!node) return false
    const siblings = node.parentId ? getChildren(node.parentId) : roots.value
    const index = siblings.findIndex(sibling => sibling.id === id)
    const swapIndex = index + direction
    if (index < 0 || swapIndex < 0 || swapIndex >= siblings.length) return false
    const currentOrder = siblings[index]!.order
    siblings[index]!.order = siblings[swapIndex]!.order
    siblings[swapIndex]!.order = currentOrder
    return true
  }

  function deleteNode(id: string) {
    const node = getNode(id)
    if (!node) return 0
    const removedIds = new Set([id, ...getDescendantIds(id)])
    nodes.value = nodes.value.filter(item => !removedIds.has(item.id))
    if (node.parentId) {
      const parent = getNode(node.parentId)
      if (parent && !getChildren(parent.id).length) parent.completedAt = null
      normalizeSiblingOrder(node.parentId)
    } else {
      normalizeSiblingOrder(null)
    }
    return removedIds.size
  }

  function normalizeSiblingOrder(parentId: string | null) {
    const siblings = parentId ? getChildren(parentId) : roots.value
    siblings.forEach((node, index) => { node.order = index })
  }

  return {
    nodes,
    roots,
    getNode,
    getChildren,
    getDescendantIds,
    getRootId,
    getProgress,
    isLeaf,
    addRoot,
    addChild,
    updateNode,
    setCompleted,
    moveNode,
    moveSibling,
    deleteNode
  }
})

function loadNodes(): PlanNode[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    const ids = new Set<string>()
    const nodes: PlanNode[] = []
    parsed.forEach((value: unknown, index: number) => {
      if (!value || typeof value !== 'object') return
      const candidate = value as Partial<PlanNode>
      if (typeof candidate.id !== 'string' || ids.has(candidate.id) || typeof candidate.title !== 'string') return
      ids.add(candidate.id)
      nodes.push({
        id: candidate.id,
        parentId: typeof candidate.parentId === 'string' ? candidate.parentId : null,
        title: candidate.title,
        description: typeof candidate.description === 'string' ? candidate.description : '',
        startDate: typeof candidate.startDate === 'string' ? candidate.startDate : undefined,
        targetDate: typeof candidate.targetDate === 'string' ? candidate.targetDate : undefined,
        order: typeof candidate.order === 'number' && Number.isFinite(candidate.order) ? candidate.order : index,
        completedAt: typeof candidate.completedAt === 'string' ? candidate.completedAt : null,
        createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString()
      })
    })

    const byId = new Map(nodes.map(node => [node.id, node]))
    for (const node of nodes) {
      if (node.parentId && !byId.has(node.parentId)) node.parentId = null
      const seen = new Set([node.id])
      let parentId = node.parentId
      while (parentId) {
        if (seen.has(parentId)) {
          node.parentId = null
          break
        }
        seen.add(parentId)
        parentId = byId.get(parentId)?.parentId ?? null
      }
    }
    return nodes
  } catch (error) {
    console.error('Failed to load plans from localStorage', error)
    return []
  }
}

function createId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 11)
}

function handleQuotaError(error: unknown) {
  if (error instanceof DOMException && (
    error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
  )) {
    alert('Bộ nhớ trình duyệt (localStorage) đã đầy. Kế hoạch của bạn có thể không được lưu.')
  }
}
