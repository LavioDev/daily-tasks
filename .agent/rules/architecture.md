# Project Architecture: Daily Tasks

This document details the system architecture, component hierarchy, data flow, and storage mechanism of the **Daily Tasks** web application.

---

## 1. System Architecture Overview

```mermaid
graph TD
    App[App.vue - View Coordinator & Header]
    Router[Vue Router - src/router/index.ts]
    
    subgraph Routes [Application Routes]
        MonthlyRoute[/monthly -> MonthlyView.vue]
        DailyRoute[/daily -> DailyView.vue]
        TimerRoute[/timer/:taskId -> TimerPage.vue]
    end

    subgraph MonthlyComponents [Monthly View Components]
        MonthSelector[MonthSelector.vue]
        MonthlyCharts[MonthlyChartsView.vue]
        HabitGrid[MonthlyHabitGrid.vue]
        CompletionChart[MonthlyCompletionChart.vue - Line]
        PieChart[MonthlyPieChart.vue - Doughnut]
    end

    subgraph DailyComponents [Daily View Components]
        DailyList[DailyTaskView.vue]
        TaskModal[Task Edit Modal]
    end

    subgraph Stores [Pinia State Management]
        TaskStore[taskStore.ts - Monthly Habits]
        ChecklistStore[checklistStore.ts - Habit Check-ins]
        DailyTaskStore[dailyTaskStore.ts - Daily Tasks & Timer State]
        MonthStore[monthStore.ts - Month & Day Selection]
    end

    subgraph Storage [LocalStorage Persistence]
        LS_Tasks[(dailytasks_tasks)]
        LS_Checklist[(dailytasks_checklist)]
        LS_DailyTasks[(dailytasks_daily_tasks)]
        LS_DailyEntries[(dailytasks_daily_entries)]
    end

    App --> Router
    Router --> MonthlyRoute
    Router --> DailyRoute
    Router --> TimerRoute

    MonthlyRoute --> MonthlyCharts
    MonthlyRoute --> HabitGrid
    MonthlyCharts --> CompletionChart
    MonthlyCharts --> PieChart

    DailyRoute --> DailyList
    DailyList --> TaskModal
    DailyList -.->|navigate /timer/:id| TimerRoute

    HabitGrid <--> TaskStore
    HabitGrid <--> ChecklistStore
    MonthlyCharts <--> TaskStore
    MonthlyCharts <--> ChecklistStore

    DailyList <--> DailyTaskStore
    TimerView <--> DailyTaskStore

    TaskStore <--> LS_Tasks
    ChecklistStore <--> LS_Checklist
    DailyTaskStore <--> LS_DailyTasks
    DailyTaskStore <--> LS_DailyEntries
```

---

## 2. Component Subsystems

### 2.1. `App.vue` (Root Coordinator)
- **Role:** Coordinates the top-level active view (`activeView: 'monthly' | 'daily' | 'timer'`), current month/year selection (`selectedMonthYear: { year, month }`), the highlighted day for the daily pie chart (`selectedDayNum`), and the storage capacity config modal state (`isConfigOpen`).
- **UI:** Minimal top header containing the view mode switcher buttons, embedded `MonthSelector`, and the real-time **Storage Capacity Button** (`StorageConfigModal.vue`) displaying used % of browser storage.

### 2.2. Monthly Habit Tracker Group
1. **`MonthSelector.vue`:**
   - Previous/next month navigation buttons and two native `<select>` dropdowns for month (1–12) and year.
2. **`MonthlyChartsView.vue`:**
   - Aggregates habit completion rates for each day of the selected month.
   - Houses three chart widgets:
     - Line Chart (`MonthlyCompletionChart.vue`): Daily average completion curve from day 1 to end of the month.
     - Selected Day Doughnut (`MonthlyPieChart.vue`): Completion percentage for `selectedDayNum`.
     - Monthly Performance Doughnut (`MonthlyPieChart.vue`): Overall month completion rate.
3. **`MonthlyHabitGrid.vue`:**
   - 2D Habit Matrix: Habits (rows) × Days in month (columns).
   - Sticky grid layout: Sticky left column for habit titles, sticky top header for day numbers, sticky right column for individual habit month %, and sticky footer for daily total checks.
   - Supports inline task renaming on double-click and quick-add row.

### 2.3. Daily Tasks Group
1. **`DailyTaskView.vue`:**
   - Date picker with Previous/Next day buttons and a "Today" shortcut.
   - Daily progress bar with dynamic completion percentage.
   - Task list with completion checkmarks, target duration display, and spent time.
   - Edit modal for updating title and target duration in minutes.
   - Timer launch button to switch to `TimerView`.

### 2.4. Projects & Phases Management Group
1. **`ProjectsView.vue`:**
   - Projects dashboard overview with status cards and statistics.
   - Project cards displaying completion rate (based on task checks), deadline date, phase count, and task count.
   - Create/edit project modal with curated color palette and date pickers.
2. **`ProjectDetailView.vue`:**
   - Project detail hero card and date picker for daily check-ins.
   - Phase sections (ordered sequence) with Phase progress bar and phase management actions.
   - Nested Task & Subtask items:
     - Task row with checkbox, duration, timer trigger, and subtask expander.
     - Subtask list with individual daily check-in boxes.
     - **Auto-completion**: Checking all subtasks of a task on a date automatically marks the parent task as complete (`progress: 100`). Unchecking any subtask sets the parent task back to incomplete.

### 2.5. Focus Timer Group
1. **`TimerView.vue`:**
   - Dedicated dark interface (`bg-slate-900`).
   - Circular SVG progress ring:
     - **Countdown Mode** (when `duration` is set): Progress ring smoothly decreases based on remaining time.
     - **Stopwatch Mode** (when no `duration` is set): Continuous pulse ring indicator.
   - Automatically synchronizes `timeSpent` to `taskStore` every second.
   - Complete button (Check icon) finalizes elapsed time and marks the task as completed.

---

## 3. State Management & Storage Architecture

### 3.1. `useProjectStore` (`src/stores/projectStore.ts`)
- **State:** `projects: Ref<Project[]>`, `phases: Ref<Phase[]>`
- **Purpose:** Manages projects and their chronological phases with cascade deletion.
- **LocalStorage:** Synced to `dailytasks_projects` and `dailytasks_phases`.

### 3.2. `useTaskStore` (`src/stores/taskStore.ts`)
- **State:** `tasks: Ref<Task[]>`
- **Purpose:** Unified repository for all task types (`type: 'monthly' | 'daily' | 'project'`).
- **Getters:** `monthlyTasks`, `dailyTasks`, `projectTasks`, `getTasksByProject(id)`, `getTasksByPhase(id)`.
- **LocalStorage:** Synced to `dailytasks_tasks`.

### 3.3. `useSubtaskStore` (`src/stores/subtaskStore.ts`)
- **State:** `subtasks: Ref<Subtask[]>`
- **Purpose:** Manages fine-grained subtasks belonging to parent tasks.
- **LocalStorage:** Synced to `dailytasks_subtasks`.

### 3.4. `useChecklistStore` (`src/stores/checklistStore.ts`)
- **State:** `entries: Ref<ChecklistEntry[]>`
- **Purpose:** Stores daily check-in progress (0 or 100) for tasks and subtasks.
- **Auto-completion logic:** Automatically synchronizes parent task status when all subtasks are checked.
- **LocalStorage:** Synced to `dailytasks_checklist`.
