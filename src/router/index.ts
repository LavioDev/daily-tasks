import { createRouter, createWebHistory } from 'vue-router'
import MonthlyView from '@/views/MonthlyView.vue'
import DailyView from '@/views/DailyView.vue'
import ProjectsView from '@/views/ProjectsView.vue'
import ProjectDetailView from '@/views/ProjectDetailView.vue'
import TimerPage from '@/views/TimerPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/monthly'
    },
    {
      path: '/monthly',
      name: 'monthly',
      component: MonthlyView
    },
    {
      path: '/daily',
      name: 'daily',
      component: DailyView
    },
    {
      path: '/projects',
      name: 'projects',
      component: ProjectsView
    },
    {
      path: '/projects/:projectId',
      name: 'project-detail',
      component: ProjectDetailView
    },
    {
      path: '/timer/:taskId',
      name: 'timer',
      component: TimerPage,
      props: true
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/monthly'
    }
  ]
})

export default router
