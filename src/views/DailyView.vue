<script setup lang="ts">
import { useRouter } from 'vue-router'
import DailyTaskView from '@/components/DailyTaskView.vue'

const router = useRouter()

function handleStartTimer(taskId: string) {
  router.push(`/timer/${taskId}`)
}
</script>

<template>
  <DailyTaskView @start-timer="handleStartTimer" />
</template>
