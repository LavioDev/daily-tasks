---
name: daily-tasks-workflow
description: >-
  Runbook and step-by-step workflow guide for maintaining, refactoring, and developing new features for the Daily Tasks Vue 3 application.
---

# Daily Tasks Development Workflow

Use this skill when developing, debugging, or extending the **Daily Tasks** codebase.

---

## 1. Feature Implementation Runbooks

### 1.1. Adding a New Field to Task
1. **Update Data Interfaces:**
   - Edit `src/types/index.ts`.
   - Add the new field (e.g., `category?: string`, `priority?: 'low' | 'medium' | 'high'`).
   - Keep the field optional or provide default values to prevent breaking existing `localStorage` data.
2. **Update Store Actions:**
   - Monthly Habits: Update `src/stores/taskStore.ts` in `addTask()` and update actions.
   - Daily Tasks: Update `src/stores/dailyTaskStore.ts` in `addTask()` and `updateTask()`.
3. **Update UI Components:**
   - Modify the corresponding view (`DailyTaskView.vue`, `MonthlyHabitGrid.vue`, or `TimerView.vue`).
   - Use compatible icons from `@lucide/vue`.

### 1.2. Adding or Customizing Charts
1. Create the chart component under `src/components/charts/` (e.g., `MonthlyBarChart.vue`).
2. Register necessary Chart.js modules (e.g., `BarElement`, `CategoryScale`, `LinearScale`, `Tooltip`, `Legend`).
3. Use `computed` properties to transform Pinia store data into Chart.js dataset formats.
4. Integrate the component into `MonthlyChartsView.vue` or the target view.

### 1.3. Adding a New View Mode
1. Open `src/App.vue`.
2. Update the `activeView` union type (e.g., `ref<'monthly' | 'daily' | 'timer' | 'analytics'>('monthly')`).
3. Add the navigation tab in `<header>` using `@lucide/vue` icons.
4. Mount the new component within `<template>` using `v-if` / `v-else-if` conditional blocks.

---

## 2. Verification Checklist

Before completing changes:
1. Ensure TypeScript compiles without errors (`npm run type-check`).
2. Verify LocalStorage safety (handle null or malformed data gracefully).
3. Confirm active timers are cleared (`clearInterval` in `onUnmounted`).
4. Validate responsive design across mobile and desktop viewport sizes.
