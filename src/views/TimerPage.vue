<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useTaskStore } from '@/stores/taskStore'
import TimerView from '@/components/TimerView.vue'

const props = defineProps<{
  taskId: string
}>()

const router = useRouter()
const taskStore = useTaskStore()

function handleBack() {
  const task = taskStore.tasks.find(item => item.id === props.taskId)
  router.push(task?.schedule ? { path: '/daily', query: { date: task.schedule.date } } : '/daily')
}
</script>

<template>
  <TimerView :task-id="props.taskId" @back="handleBack" />
</template>
