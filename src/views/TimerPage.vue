<script setup lang="ts">
import { useRouter } from 'vue-router'
import TimerView from '@/components/TimerView.vue'

const props = defineProps<{
  taskId: string
}>()

const router = useRouter()

function handleBack() {
  router.push('/daily')
}
</script>

<template>
  <TimerView :task-id="props.taskId" @back="handleBack" />
</template>
