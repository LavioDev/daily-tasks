# Project Guidelines & Constraints

This document outlines technical constraints, operational boundaries, and verification workflows for agents maintaining the **Daily Tasks** project.

---

## 1. Technical Constraints & Data Safety

1. **Client-only Architecture:**
   - The application runs entirely within the client browser.
   - All data resides in `localStorage`. Any updates to data interfaces in `src/types/index.ts` must maintain backward compatibility with existing stored JSON objects.
2. **Path Aliasing:**
   - Always use `@/` to import from `./src` (e.g., `import { useTaskStore } from '@/stores/taskStore'`).
3. **Chart.js Module Registration:**
   - Ensure all Chart.js controllers, elements, scales, and plugins are properly registered in `src/components/charts/` to prevent runtime chart initialization errors.

---

## 2. Agent Workflow & Feature Delivery

When implementing modifications:

1. **Scope Identification:** Determine the affected Views (`MonthlyHabitGrid`, `DailyTaskView`, `TimerView`, `MonthlyChartsView`) and Stores (`taskStore`, `checklistStore`, `dailyTaskStore`).
2. **Type Safety:** Update interfaces in `src/types/index.ts` before modifying component state.
3. **Implementation:** Adhere to `<script setup lang="ts">`, `@lucide/vue` icons, and Tailwind utility standards.
4. **Verification & Build:**
   - Run type checking: `npm run type-check` (or `npx vue-tsc --build`).
   - Verify production build: `npm run build`.

---

## 3. Project Commands Reference

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the local Vite development server (default: port 5173) |
| `npm run build` | Performs type check and builds optimized production bundles into `dist/` |
| `npm run preview` | Serves the production build locally for verification |
| `npm run type-check` | Executes `vue-tsc` across the entire codebase |
