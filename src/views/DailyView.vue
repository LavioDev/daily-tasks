<script setup lang="ts">
import { useRouter } from 'vue-router'
import WeeklyCalendarView from '@/components/WeeklyCalendarView.vue'

const router = useRouter()

function handleStartTimer(taskId: string) {
  router.push(`/timer/${taskId}`)
}
</script>

<template>
  <WeeklyCalendarView @start-timer="handleStartTimer" />
</template>
