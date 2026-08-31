# Code Style & Engineering Standards

This document establishes the coding conventions, formatting rules, and implementation patterns for the **Daily Tasks** codebase.

---

## 1. Vue 3 & TypeScript Standards

### 1.1. Single-File Component (SFC) Structure
Every `.vue` component should adhere to the following block structure:
```vue
<script setup lang="ts">
// 1. Imports (vue, lucide/vue, pinia stores, components, types)
// 2. Props & Emits definitions
// 3. Store bindings & Reactive state (ref, reactive)
// 4. Computed properties
// 5. Watchers & Lifecycle hooks (onMounted, onUnmounted)
// 6. Methods / Event handlers
</script>

<template>
  <!-- Semantic HTML & Tailwind CSS classes -->
</template>

<style scoped>
/* Scoped styles only when Tailwind utilities are insufficient */
</style>
```

### 1.2. Typed Props & Emits
- Use type-based declarations for `defineProps` and `defineEmits`:
```ts
const props = defineProps<{
  taskId: string
  selectedDate?: string
}>()

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'update:modelValue', val: number): void
}>()
```

### 1.3. Composition API Best Practices
- Derive reactive state via `computed` rather than manual state synchronization.
- Delegate data mutations through Pinia store actions.
- Always clear active timers (`setInterval`, `setTimeout`) within `onUnmounted`.

---

## 2. Tailwind CSS & UI Design System

### 2.1. Color Palette
- **Primary Brand Accent:** Violet (`violet-600` `#7c3aed`, hover `violet-700`, light active `violet-100` / `violet-50`, text `violet-700` / `text-violet-400`).
- **Neutrals / Slate Backgrounds:**
  - Main view background: `bg-slate-50`
  - Card & Grid background: `bg-white`
  - Dark Mode (Timer): `bg-slate-900`, `bg-slate-800`
  - Borders: `border-slate-200`, `border-slate-300`, `border-slate-700`
  - Primary text: `text-slate-800`, `text-slate-700`
  - Secondary text: `text-slate-500`, `text-slate-400`
- **Semantic Accents:**
  - Completed / Success: `emerald-600` / `emerald-950`
  - Destructive / Delete: `red-500` / `hover:bg-red-50`
  - Pause State: `amber-600`

### 2.2. Typography & Form Elements
- **Font Family:** `'Inter', system-ui, sans-serif`
- **Section Badges / Micro-labels:** `text-[10px] font-black uppercase tracking-widest text-slate-400` (or `text-violet-600`).
- **Borders & Radii:** Clean, sharp corners (`border-radius: 0`) for tables, headers, and form inputs; circular `rounded-full` exclusively for action buttons and timer rings.

---

## 3. State Management & Pinia Store Patterns

1. **Setup Store Pattern:** Always use `defineStore('storeId', () => { ... })`.
2. **Deep LocalStorage Watchers:** Use `{ deep: true }` when watching state collections.
3. **Storage Quota Safety:** Implement `handleQuotaError` across all stores to safeguard against storage limits:
```ts
function handleQuotaError(e: any) {
  if (e instanceof DOMException && (
    e.name === 'QuotaExceededError' ||
    e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
  )) {
    alert('Browser storage is full. Some progress may not be saved.')
  }
}
```
4. **UUID Generation:**
```ts
id: typeof crypto !== 'undefined' && crypto.randomUUID 
  ? crypto.randomUUID() 
  : Math.random().toString(36).substring(2, 11)
```

---

## 4. Date & Time Formats

1. **Date Strings:** Format strictly as `YYYY-MM-DD` (e.g., `2026-08-31`).
2. **Date Input Helper:**
```ts
function toDateInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
```
3. **Timer Display:**
   - Under 1 hour: `mm:ss` (e.g., `25:00`, `04:59`)
   - Over 1 hour: `hh:mm:ss` (e.g., `01:15:30`)
