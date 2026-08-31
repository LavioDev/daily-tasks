# Daily Tasks - Workspace Rules & Agent Instructions

This document provides development rules, architectural overview, and guidelines for AI Agents working on the **Daily Tasks** project.

---

## 1. Project Overview

- **Project Name:** Daily Tasks (`dailytasks`)
- **Purpose:** A client-side web application for daily task checklist tracking, monthly habit tracking via an interactive matrix grid, performance analytics charts (Chart.js / vue-chartjs), and a focus timer/stopwatch interface.
- **Tech Stack:**
  - **Framework:** Vue 3 (Composition API with `<script setup lang="ts">`)
  - **Build Tool:** Vite 8
  - **State Management:** Pinia 3 (`defineStore` with setup syntax)
  - **Styling:** Tailwind CSS 3.4 + `@lucide/vue` icon library
  - **Data Visualization:** Chart.js 4 + `vue-chartjs` 5 (Line Chart, Doughnut Chart)
  - **Type Checking:** TypeScript 6 + `vue-tsc`
  - **Persistence:** LocalStorage (Client-side browser storage)

---

## 2. Directory Layout

```text
daily-tasks/
├── .agent/                         # AI Agent rules, skills, and configuration
│   ├── rules/                      # Detailed code standards and architecture
│   │   ├── architecture.md         # Component hierarchy, data flow, stores
│   │   ├── code-style.md           # Vue 3 / TS / Tailwind standards
│   │   └── project-guidelines.md   # Constraints and operational guidelines
│   └── skills/                     # Development workflows and runbooks
│       └── daily-tasks-workflow/
│           └── SKILL.md
├── .vscode/                        # Recommended VS Code extensions
├── public/                         # Public static assets
├── src/                            # Main application source code
│   ├── assets/                     # Styles, SVGs, and base CSS
│   │   ├── base.css
│   │   ├── logo.svg
│   │   └── main.css                # Tailwind directives, animations, scrollbars
│   ├── components/                 # Vue components
│   │   ├── charts/                 # Chart.js visualization components
│   │   │   ├── MonthlyCompletionChart.vue  # Daily progress line chart
│   │   │   └── MonthlyPieChart.vue         # Completion percentage doughnut chart
│   │   ├── icons/                  # SVG Icon components
│   │   ├── DailyTaskView.vue       # Daily task list and progress view
│   │   ├── MonthlyChartsView.vue   # Summary dashboard for 3 monthly charts
│   │   ├── MonthlyHabitGrid.vue    # Monthly habit matrix grid with sticky rows/cols
│   │   ├── MonthSelector.vue       # Month and year selector dropdowns
│   │   ├── StorageConfigModal.vue  # Storage gauge, backup export/import & reset modal
│   │   └── TimerView.vue           # Focus countdown and stopwatch screen
│   ├── stores/                     # Pinia stores
│   │   ├── checklistStore.ts       # Monthly habit daily check-in entries
│   │   ├── dailyTaskStore.ts       # Daily tasks, durations, and timer state
│   │   └── taskStore.ts            # Monthly habit definitions
│   ├── types/                      # TypeScript type definitions
│   │   └── index.ts                # Task and ChecklistEntry models
│   ├── utils/                      # Utility functions
│   │   └── storage.ts              # LocalStorage statistics, quota calculation, backup/import
│   ├── App.vue                     # Root coordinator component
│   ├── env.d.ts                    # Vite client types
│   └── main.ts                     # App entry point (Vue + Pinia initialization)
├── index.html                      # Root HTML template
├── package.json                    # Dependencies and scripts
├── postcss.config.js               # PostCSS configuration
├── tailwind.config.js              # Tailwind CSS configuration
├── tsconfig.app.json               # Client-side TypeScript configuration
├── tsconfig.json                   # Base TypeScript configuration
├── tsconfig.node.json              # Node/Vite TypeScript configuration
└── vite.config.ts                  # Vite configuration (@ alias pointing to ./src)
```

---

## 3. Data Architecture & State Management

### Data Models (`src/types/index.ts`)
1. **`Task`**:
   - `id`: Unique identifier (`crypto.randomUUID()` with fallback)
   - `title`: Task / habit title
   - `color`: Brand color (default purple `#7c3aed`)
   - `createdAt`: ISO Date String (e.g., `YYYY-MM-DDTHH:mm:ss.sss`)
   - `duration?`: Target duration in minutes (optional)
   - `timeSpent?`: Total accumulated focus time in seconds (optional)

2. **`ChecklistEntry`**:
   - `id`: Unique identifier
   - `taskId`: Associated task identifier
   - `date`: Date string formatted as `YYYY-MM-DD`
   - `progress`: `0` or `100` (completion state)
   - `completedAt?`: ISO Date String when completed

### LocalStorage Keys
- `dailytasks_tasks`: Monthly habit list (managed by `taskStore`)
- `dailytasks_checklist`: Monthly habit completion history (managed by `checklistStore`)
- `dailytasks_daily_tasks`: Daily task entries (managed by `dailyTaskStore`)
- `dailytasks_daily_entries`: Daily task completion history (managed by `dailyTaskStore`)

---

## 4. View Modes in `App.vue`

1. **`activeView === 'monthly'` (Monthly Habit Tracker):**
   - Header: View mode switcher + `MonthSelector` (month 1-12 & year selection).
   - Body: `MonthlyChartsView` (Line chart + 2 Doughnut charts) and `MonthlyHabitGrid` (2D habit matrix with sticky columns/header/footer).
2. **`activeView === 'daily'` (Daily Tasks):**
   - Header: View mode switcher.
   - Body: `DailyTaskView` (Day navigation, progress bar, add task, edit modal, delete, and timer launcher).
3. **`activeView === 'timer'` (Focus Timer):**
   - Focused dark-mode interface (`bg-slate-900`).
   - SVG circular progress indicator supporting countdown (when `duration` is specified) or stopwatch.
   - Controls: Reset, Play/Pause, and Mark Complete (automatically updates `timeSpent` and checklist status).

---

## 5. Engineering Standards & Rules

1. **Vue 3 SFC Standard:**
   - Always use `<script setup lang="ts">`.
   - Use Pinia Setup Stores (`defineStore('name', () => { ... })`).
   - Clean up interval timers and DOM listeners inside `onUnmounted`.
2. **UI & Styling:**
   - Unified primary color: Violet (`violet-600` / `#7c3aed`, `bg-violet-50`, `text-violet-700`).
   - Neutral palette: `bg-slate-50`, `text-slate-800` / `text-slate-500`, `border-slate-200` / `border-slate-300`.
   - Typography: Clean `Inter, system-ui, sans-serif` with uppercase tracking-widest section badges.
3. **Storage Safety:**
   - Wrap all LocalStorage operations in `try-catch` blocks and invoke `handleQuotaError`.
4. **Backward Compatibility:**
   - Maintain compatibility with existing user data stored in LocalStorage.
