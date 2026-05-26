# Vue Doctor

Static Analysis and Architecture Analysis for Vue & Nuxt applications.

Vue Doctor helps identify maintainability issues, SSR risks, and architectural smells before they become technical debt.

Unlike traditional linters, Vue Doctor focuses on code quality, project health, and long-term maintainability.

---

## Why Vue Doctor?

Most linters focus on syntax and style:

- Semicolons
- Formatting
- Variable naming
- Console statements

Vue Doctor focuses on issues that affect real-world Vue applications:

- Oversized components
- Deep watchers
- SSR unsafe APIs
- Excessive reactive state
- Architecture smells
- Maintainability risks

---

## Installation

```bash
npm install -D @daohuy34/vue-doctor
```

or

```bash
npx @daohuy34/vue-doctor check
```

---

## Usage

Analyze the current project:

```bash
vue-doctor check
```

Analyze a specific directory:

```bash
vue-doctor check src
```

Create a baseline:

```bash
vue-doctor baseline
```

Use an existing baseline:

```bash
vue-doctor check --baseline
```

---

## Example Output

```text
src/components/ProductEditor.vue

✖ no-large-component
    Component exceeds recommended size (624 LOC)

✖ no-deep-watch
    Deep watch detected

⚠ no-window-in-ssr
    window usage detected in SSR context

Summary

Files scanned: 124
Issues found: 18
Warnings: 9
Errors: 9
```

---

## What Vue Doctor Detects

### Maintainability

- Large components
- Excessive reactive state
- Deep watchers
- Large composables

### SSR Safety

- window usage in SSR
- document usage in SSR
- localStorage usage in SSR
- sessionStorage usage in SSR

### Vue Best Practices

- Risky watch patterns
- Performance-related anti-patterns
- Component structure issues

---

## Current Rules

### Maintainability

- no-large-component
- no-deep-watch

### SSR

- no-window-in-ssr
- no-document-in-ssr
- no-local-storage-in-ssr
- no-session-storage-in-ssr

### AI Analysis

- ai-monster-component

---

## Baseline Support

Ignore existing issues and focus only on newly introduced problems.

Create baseline:

```bash
vue-doctor baseline
```

Run with baseline:

```bash
vue-doctor check --baseline
```

This is useful for gradually improving large existing projects.

---

## Cache Support

Vue Doctor caches file analysis results to speed up subsequent runs.

Generated automatically:

```text
.vue-doctor-cache.json
```

---

## CI/CD Example

GitHub Actions:

```yaml
name: Vue Doctor

on:
  pull_request:

jobs:
  analyze:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - run: npm ci
      - run: npx @daohuy34/vue-doctor check
```

---

## Philosophy

ESLint answers:

> Is this code valid?

Vue Doctor answers:

> Is this code maintainable?

Use both together.

---

## License

MIT