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
│   ├── router/                     # Vue Router configuration
│   │   └── index.ts                # Routes: /monthly, /daily, /projects, /projects/:projectId, /timer/:taskId
│   ├── stores/                     # Pinia stores
│   │   ├── checklistStore.ts       # Unified daily check-in entries & subtask auto-completion
│   │   ├── dailyTaskStore.ts       # Daily tasks proxy store
│   │   ├── monthStore.ts           # Shared month and day selection state
│   │   ├── projectStore.ts         # Projects & Phases state management
│   │   ├── subtaskStore.ts         # Subtasks CRUD & reordering
│   │   └── taskStore.ts            # Unified task definitions (monthly, daily, project)
│   ├── types/                      # TypeScript type definitions
│   │   └── index.ts                # Project, Phase, Task, Subtask, and ChecklistEntry models
│   ├── utils/                      # Utility functions
│   │   └── storage.ts              # LocalStorage statistics, quota calculation, backup/import
│   ├── views/                      # Routed page views
│   │   ├── DailyView.vue           # /daily route page
│   │   ├── MonthlyView.vue         # /monthly route page
│   │   ├── ProjectDetailView.vue   # /projects/:projectId route page (Phases -> Tasks -> Subtasks)
│   │   ├── ProjectsView.vue        # /projects route page
│   │   └── TimerPage.vue           # /timer/:taskId route page
│   ├── App.vue                     # Root coordinator component with RouterView
│   ├── env.d.ts                    # Vite client types
│   └── main.ts                     # App entry point (Vue, Pinia, Router)
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
1. **`Project`**:
   - `id`: Unique identifier (`crypto.randomUUID()` with fallback)
   - `title`: Project title
   - `description?`: Project overview/goals
   - `color`: Brand accent color
   - `status`: `'active' | 'completed' | 'archived'`
   - `startDate?`: `YYYY-MM-DD`
   - `targetDate?`: `YYYY-MM-DD`
   - `order`: Sorting order
   - `createdAt`: ISO Date String

2. **`Phase`**:
   - `id`: Unique identifier
   - `projectId`: Foreign key to associated Project
   - `title`: Phase title
   - `description?`: Phase details
   - `startDate?`: `YYYY-MM-DD`
   - `endDate?`: `YYYY-MM-DD`
   - `order`: Phase sequence order
   - `createdAt`: ISO Date String

3. **`Task`**:
   - `id`: Unique identifier
   - `title`: Task title
   - `color`: Brand color (default purple `#7c3aed`)
   - `createdAt`: ISO Date String
   - `type?`: Task classification flag (`'monthly'` | `'daily'` | `'project'`)
   - `projectId?`: Foreign key to Project
   - `phaseId?`: Foreign key to Phase
   - `duration?`: Target duration in minutes (optional)
   - `timeSpent?`: Total accumulated focus time in seconds (optional)
   - `dueDate?`: Target due date `YYYY-MM-DD`

4. **`Subtask`**:
   - `id`: Unique identifier
   - `taskId`: Foreign key to parent Task
   - `title`: Subtask title
   - `order`: Sequence order
   - `duration?`: Target duration in minutes
   - `timeSpent?`: Accumulated focus time
   - `createdAt`: ISO Date String

5. **`ChecklistEntry`**:
   - `id`: Unique identifier
   - `taskId`: Associated parent task identifier
   - `subtaskId?`: Associated subtask identifier (when check-in applies to subtask)
   - `date`: Date string formatted as `YYYY-MM-DD`
   - `progress`: `0` or `100` (completion state)
   - `completedAt?`: ISO Date String when completed

### LocalStorage Keys
- `dailytasks_projects`: Projects collection (managed by `projectStore`)
- `dailytasks_phases`: Project Phases collection (managed by `projectStore`)
- `dailytasks_tasks`: Unified task repository for monthly habits, daily tasks, and project tasks (managed by `taskStore`)
- `dailytasks_subtasks`: Subtasks collection (managed by `subtaskStore`)
- `dailytasks_checklist`: Unified completion history across all tasks & subtasks with auto-completion logic (managed by `checklistStore`)

---

## 4. Application Routes & Pages (Vue Router)

1. **`/monthly` (Monthly Habit Tracker - `MonthlyView.vue`):**
   - Header: Navigation switcher + `MonthSelector` (month 1-12 & year dropdowns) + Storage capacity gauge button.
   - Body: `MonthlyChartsView` (Line chart + 2 Doughnut charts) and `MonthlyHabitGrid` (2D habit matrix with sticky columns/header/footer).
   - Root `/` redirects to `/monthly`.
2. **`/daily` (Daily Tasks - `DailyView.vue`):**
   - Header: Navigation switcher + Storage capacity gauge button.
   - Body: `DailyTaskView` (Day navigation, progress bar, add task, edit modal, delete, and timer launcher).
3. **`/projects` (Projects Management - `ProjectsView.vue`):**
   - Header: Navigation switcher + Storage capacity gauge button.
   - Body: Projects overview dashboard, quick stats cards, project grid with progress bars and deadline badges, create/edit project modal.
4. **`/projects/:projectId` (Project Detail & Phases - `ProjectDetailView.vue`):**
   - Header: Navigation switcher + Storage capacity gauge button.
   - Body: Project hero card, date navigator, Phase accordions with nested Tasks & Subtasks.
   - Auto-completion: Checking all subtasks of a task on a date automatically completes the parent task (`progress: 100`).
5. **`/timer/:taskId` (Focus Timer - `TimerPage.vue`):**
   - Header: Hidden for immersive focus.
   - Focused dark-mode interface (`bg-slate-900`).
   - SVG circular progress indicator supporting countdown or stopwatch.
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
