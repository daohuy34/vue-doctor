# Vue Doctor Roadmap

Current Status

Implemented Rules:

- no-console
- no-deep-watch
- no-large-component
- no-mutate-props
- no-side-effect-in-computed
- no-unused-component-data
- no-v-html
- no-v-if-with-v-for
- require-key-in-v-for

Target Platforms:

- Vue 2
- Vue 3
- Nuxt 2
- Nuxt 3

Primary Goal:

Become a static analysis tool focused on Vue-specific code quality, performance, maintainability and SSR issues.

---

# Phase 1 - Universal Vue Rules

Goal:

Increase rule coverage from 9 rules to 20+ rules.

All rules in this phase must support:

- Vue 2
- Vue 3
- Nuxt 2
- Nuxt 3

Do NOT implement Composition API specific rules yet.

---

## Milestone 1.1 - Debug & Safety

### Rule: no-debugger

Detect:

```js
debugger;
```

Report:

```txt
Unexpected debugger statement.
```

Severity:

```txt
warning
```

Files:

- JS
- TS
- Vue SFC

Tests:

- debugger exists
- no debugger

---

### Rule: no-empty-catch

Detect:

```js
try {
} catch (e) {
}
```

Report:

```txt
Empty catch block detected.
```

Severity:

```txt
warning
```

Tests:

- empty catch
- catch with code

---

Definition of Done:

- Rule implemented
- Unit tests added
- Documentation added
- README updated

---

## Milestone 1.2 - Component Complexity

### Rule: excessive-props

Detect:

Options API:

```js
props: {
  a: String,
  b: String,
  ...
}
```

Composition API:

```ts
defineProps({
  ...
})
```

Threshold:

```txt
> 15 props
```

Report:

```txt
Component has too many props.
```

Severity:

```txt
warning
```

Config:

```json
{
  "maxProps": 15
}
```

---

### Rule: excessive-watchers

Detect:

Vue 2:

```js
watch: {
}
```

Vue 3:

```ts
watch(...)
watchEffect(...)
```

Threshold:

```txt
> 10 watchers
```

Report:

```txt
Component contains excessive watchers.
```

Severity:

```txt
warning
```

Config:

```json
{
  "maxWatchers": 10
}
```

---

### Rule: excessive-computed-properties

Threshold:

```txt
> 20 computed properties
```

Severity:

```txt
info
```

---

Definition of Done:

- All thresholds configurable
- Tests for threshold exceeded
- Tests for threshold not exceeded

---

## Milestone 1.3 - Template Quality

### Rule: no-large-template

Count:

- template lines
- html nodes

Default thresholds:

```txt
500 template lines
or
300 html nodes
```

Report:

```txt
Template is too large.
```

---

### Rule: excessive-dom-depth

Detect:

```html
<div>
  <div>
    <div>
      <div>
        <div>
```

Threshold:

```txt
depth > 6
```

Report:

```txt
Template nesting is too deep.
```

---

### Rule: excessive-v-for-nesting

Detect:

```html
v-for
  v-for
    v-for
```

Threshold:

```txt
3 nested loops
```

Report:

```txt
Nested v-for detected.
```

---

Definition of Done:

- Template parser reused
- All rules tested
- Performance impact measured

---

# Phase 2 - Nuxt & SSR Rules

Goal:

Become the best Vue/Nuxt SSR analyzer.

---

## Milestone 2.1 - Browser API in SSR

### Rule: no-window-in-ssr

Detect:

```ts
window.location.href
```

Outside:

- onMounted
- client-only guards

Report:

```txt
window is not available during SSR.
```

Severity:

```txt
error
```

---

### Rule: no-document-in-ssr

Detect:

```ts
document.querySelector()
```

Severity:

```txt
error
```

---

### Rule: no-localstorage-in-ssr

Detect:

```ts
localStorage.getItem()
```

Severity:

```txt
error
```

---

### Rule: no-sessionstorage-in-ssr

Detect:

```ts
sessionStorage.getItem()
```

Severity:

```txt
error
```

---

Definition of Done:

- Nuxt 2 samples
- Nuxt 3 samples
- SSR-safe false positives minimized

---

# Phase 3 - AI Generated Code Detection

Goal:

Create rules that ESLint does not provide.

This is Vue Doctor's unique selling point.

---

## Milestone 3.1 - Monster Component Detection

### Rule: ai-monster-component

Calculate score using:

- LOC
- Props
- Watchers
- Computed
- Methods
- Refs

Example:

```txt
LOC: 1200
Props: 18
Watchers: 14
Computed: 22
```

Report:

```txt
Component appears excessively complex.
```

Severity:

```txt
warning
```

---

### Rule: excessive-reactive-state

Detect:

```ts
ref()
reactive()
```

Threshold:

```txt
> 25 reactive variables
```

Report:

```txt
Too much reactive state in a single component.
```

---

### Rule: excessive-component-responsibility

Score based on:

- props
- methods
- watchers
- template size

Report:

```txt
Component may have multiple responsibilities.
```

---

Definition of Done:

- Scoring system documented
- Threshold configurable
- False positive examples covered

---

# Phase 4 - Engine Improvements

Goal:

Improve ecosystem and adoption.

---

## Milestone 4.1 - Severity System

Add:

```txt
info
warning
error
critical
```

All rules must declare severity.

Example:

```txt
no-console -> warning
require-key-in-v-for -> error
no-v-html -> critical
```

---

## Milestone 4.2 - Rule Categories

Add categories:

```txt
security
performance
maintainability
ssr
best-practice
ai
```

Output example:

```txt
[security] no-v-html
[performance] excessive-watchers
```

---

## Milestone 4.3 - JSON Reporter V2

Output:

```json
{
  "file": "",
  "rule": "",
  "severity": "",
  "category": "",
  "message": "",
  "line": 0
}
```

---

# Phase 5 - Ecosystem

## VSCode Extension

Features:

- run on save
- diagnostics
- quick navigation

---

## GitHub Action

Command:

```bash
vue-doctor check
```

Support:

- PR comments
- annotations

---

## Autofix API

Introduce:

```ts
fix()
```

inside rule interface.

Only safe fixes allowed.

Examples:

- remove debugger
- remove console.log