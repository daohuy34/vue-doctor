# Vue Doctor - Architecture Best Practices

A guide to maintaining a healthy Vue/Nuxt architecture using Vue Doctor.

## Table of Contents

1. [Component Design](#1-component-design)
2. [State Management](#2-state-management)
3. [Feature Architecture](#3-feature-architecture)
4. [SSR Best Practices](#4-ssr-best-practices)
5. [Performance](#5-performance)

---

## 1. Component Design

### Target Scores

| Metric | Target | Warning Threshold |
|--------|--------|-------------------|
| Component Size | < 200 LOC | > 400 LOC |
| Props Count | < 8 | > 12 |
| Computed Properties | < 10 | > 15 |
| Watchers | < 3 | > 5 |

### Good Component Pattern

```vue
<!-- UserCard.vue - ~80 LOC -->
<script setup lang="ts">
interface Props {
  user: User
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md'
})

const avatarSize = computed(() => {
  const sizes = { sm: 24, md: 40, lg: 64 }
  return sizes[props.size]
})
</script>
```

### Anti-Patterns to Avoid

```vue
<!-- BAD: God Component (~800 LOC) -->
<script>
// Should be split into:
// - UserCardHeader.vue
// - UserCardBody.vue
// - UserCardActions.vue
</script>
```

### Vue Doctor Rules

```javascript
rules: {
  'no-large-component': {
    enabled: true,
    severity: 'warning',
    options: { maxSize: 300 }
  },
  'ai-monster-component': {
    enabled: true,
    severity: 'error',
    options: { maxScore: 25 }
  },
  'excessive-props': {
    enabled: true,
    severity: 'warning',
    options: { maxProps: 8 }
  }
}
```

---

## 2. State Management

### Store Best Practices

| Metric | Target | Warning Threshold |
|--------|--------|-------------------|
| Store Size | < 300 LOC | > 500 LOC |
| State Keys | < 20 | > 30 |
| Getters | < 10 | > 15 |

### Good Store Pattern

```typescript
// stores/auth.ts - Focused store (~150 LOC)
export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)

  // Getters
  const isAuthenticated = computed(() => !!token.value)
  const userName = computed(() => user.value?.name ?? 'Guest')

  // Actions
  async function login(credentials: LoginCredentials) {
    const { data } = await api.post('/auth/login', credentials)
    token.value = data.token
    user.value = data.user
  }

  function logout() {
    token.value = null
    user.value = null
  }

  return { user, token, isAuthenticated, userName, login, logout }
})
```

### Vue Doctor Rules for Pinia

```javascript
rules: {
  'store-bloat': {
    enabled: true,
    severity: 'warning',
    options: { maxSize: 400 }
  },
  'store-god-object': {
    enabled: true,
    severity: 'error',
    options: { maxResponsibilities: 10 }
  }
}
```

---

## 3. Feature Architecture

### Feature-Based Structure

```
src/
├── features/
│   ├── auth/
│   │   ├── components/
│   │   ├── composables/
│   │   ├── stores/
│   │   └── types.ts
│   ├── checkout/
│   │   ├── components/
│   │   ├── composables/
│   │   ├── stores/
│   │   └── types.ts
│   └── products/
│       ├── components/
│       ├── composables/
│       ├── stores/
│       └── types.ts
├── shared/
│   ├── components/
│   ├── composables/
│   └── utils/
└── layouts/
```

### Feature Boundary Configuration

```javascript
boundaries: [
  { name: 'auth', pattern: 'features/auth/**' },
  { name: 'checkout', pattern: 'features/checkout/**' },
  { name: 'products', pattern: 'features/products/**' },
  { name: 'shared', pattern: 'shared/**', allowedBy: '*' },
]
```

### Layer Architecture

```
┌─────────────────────────────────────┐
│  Pages (Routes)                      │
├─────────────────────────────────────┤
│  Components (Views)                  │
├─────────────────────────────────────┤
│  Composables (Logic)                 │
├─────────────────────────────────────┤
│  Stores (State)                     │
├─────────────────────────────────────┤
│  Services (API)                     │
├─────────────────────────────────────┤
│  Utils (Helpers)                    │
└─────────────────────────────────────┘
```

**Rules:**
- Pages can import Components, Composables, Stores, Services, Utils
- Components can import Composables, Stores, Utils
- Composables can import Stores, Services, Utils
- Never import Pages from anywhere

### Vue Doctor Rules

```javascript
rules: {
  'layer-violation': 'error',
  'feature-leakage': 'warning',
  'forbidden-dependency': {
    enabled: true,
    severity: 'error',
    options: {
      patterns: [
        { from: 'components', to: 'pages' }
      ]
    }
  }
}
```

---

## 4. SSR Best Practices

### SSR Unsafe Patterns

```typescript
// ❌ BAD - Runs on both client and server
onMounted(() => {
  const user = localStorage.getItem('user')  // SSR Error!
  window.scrollTo(0, 0)  // SSR Error!
})

// ✅ GOOD - Client-only
onMounted(() => {
  if (import.meta.client) {
    const user = localStorage.getItem('user')
    window.scrollTo(0, 0)
  }
})

// ✅ BETTER - Use composables
const { user } = useLocalStorage('user')

// ✅ BEST - Use Nuxt composables
const { data } = await useFetch('/api/user')
```

### Hydration Risk Scoring

| Pattern | Risk Score | Severity |
|---------|-----------|----------|
| `window` | +15 | High |
| `document` | +15 | High |
| `localStorage` | +10 | Medium |
| `sessionStorage` | +10 | Medium |
| `navigator` | +10 | Medium |
| `Date.now()` | +8 | Low |
| `Math.random()` | +8 | Low |

### Score Thresholds

| Score | Risk Level | Action |
|-------|-----------|--------|
| 0-30 | Low | ✅ OK |
| 31-60 | Medium | ⚠️ Review |
| 61-80 | High | 🔧 Fix needed |
| 81+ | Critical | 🚨 Must fix |

### Vue Doctor SSR Rules

```javascript
rules: {
  'no-window-in-ssr': 'error',
  'no-document-in-ssr': 'error',
  'no-localstorage-in-ssr': 'error',
  'no-sessionstorage-in-ssr': 'error',
  'hydration-risk': 'warning'
}
```

---

## 5. Performance

### Async Data Patterns

```typescript
// ❌ BAD - Sequential (Waterfall)
const user = await useAsyncData('user', () => fetch('/api/user'))
const products = await useAsyncData('products', () => fetch('/api/products'))
const cart = await useAsyncData('cart', () => fetch('/api/cart'))

// ✅ GOOD - Parallel
const [user, products, cart] = await Promise.all([
  useAsyncData('user', () => fetch('/api/user')),
  useAsyncData('products', () => fetch('/api/products')),
  useAsyncData('cart', () => fetch('/api/cart')),
])
```

### Reactivity Best Practices

```typescript
// ❌ BAD - Deep watch (expensive)
watch(state, (newVal) => { ... }, { deep: true })

// ✅ GOOD - Shallow watch
watch(state, (newVal) => { ... })

// ✅ BETTER - Computed when possible
const filteredItems = computed(() => 
  items.value.filter(item => item.active)
)
```

### Vue Doctor Performance Rules

```javascript
rules: {
  'no-deep-watch': 'warning',
  'async-data-abuse': 'warning',
  'duplicate-fetch': 'warning',
  'excessive-watchers': 'warning',
  'excessive-reactive-state': 'warning'
}
```

---

## Architecture Score Targets

| Score | Rating | Action |
|-------|--------|--------|
| 90-100 | 🟢 Excellent | Keep it up! |
| 80-89 | 🟢 Good | Minor improvements |
| 70-79 | 🟡 Fair | Address warnings |
| 60-69 | 🟠 Poor | Priority fixes needed |
| <60 | 🔴 Critical | Major refactoring |

### Score Breakdown

| Category | Weight | What to Improve |
|----------|--------|-----------------|
| Issues | 40% | Fix errors and warnings |
| Dependency | 25% | Reduce coupling, eliminate cycles |
| Maintainability | 20% | Split large components, reduce complexity |
| Component Health | 15% | Improve individual file scores |

---

## Quick Wins Checklist

- [ ] Fix all `error` severity issues first
- [ ] Split components > 400 LOC
- [ ] Resolve circular dependencies
- [ ] Fix SSR unsafe patterns (window, document, localStorage)
- [ ] Remove `console.log` statements
- [ ] Reduce component fan-out (> 15 dependencies)
- [ ] Address feature leakage violations
- [ ] Enable and run `--fix` for auto-fixable issues

Run `vue-doctor check` regularly to maintain your score!
