# Vue Doctor

A lightweight static analysis tool for Vue.js projects.

Vue Doctor helps detect common code quality, performance, and SSR issues in Vue applications before they reach production.

---

## Features

- Analyze Vue Single File Components (`.vue`)
- Detect common anti-patterns
- Support Vue 2 and Vue 3 projects
- Incremental analysis with cache
- Baseline support for legacy projects
- GitHub Actions integration
- Custom plugin system
- Multiple reporters (stylish, json, github)

---

## Installation

### Global

```bash
npm install -g vue-doctor
```

### Local

```bash
npm install --save-dev vue-doctor
```

Run with:

```bash
npx vue-doctor check
```

---

## Quick Start

Analyze an entire project:

```bash
vue-doctor check
```

Analyze only changed files:

```bash
vue-doctor check --changed
```

JSON output:

```bash
vue-doctor check --reporter json
```

GitHub Actions output:

```bash
vue-doctor check --reporter github
```

---

## Example Output

```text
src/components/UserProfile.vue

  ⚠ no-console
    console usage detected.

  ✖ no-deep-watch
    Deep watch detected.

Summary:
Warnings: 1
Errors: 1
```

---

## Configuration

Create a file:

```text
vue-doctor.config.ts
```

Example:

```ts
export default {
    rules: {
        'no-console': 'warning',
        'no-deep-watch': 'error',
        'no-large-component': 'warning',
    },

    failOnWarning: false,
};
```

### Rule Levels

| Value | Description |
|---------|---------|
| warning | Report as warning |
| error | Report as error |
| off | Disable rule |

Example:

```ts
export default {
    rules: {
        'no-console': 'off',
    },
};
```

---

## Built-in Rules

### no-console

Detects console usage in application code.

Category: Best Practices

---

### no-deep-watch

Detects Vue watchers using:

```ts
watch(data, callback, {
    deep: true,
});
```

Category: Performance

---

### no-large-component

Detects oversized Vue Single File Components.

Category: Maintainability

Default threshold: 500 LOC

---

### no-window-in-ssr

Detects browser-only APIs that may break SSR.

Examples:

```ts
window
document
localStorage
```

Category: SSR

---

## Rule Documentation

List available rules:

```bash
vue-doctor rules
```

Example:

```text
Available rules:

• no-console (Best Practices)
• no-deep-watch (Performance)
• no-large-component (Maintainability)
• no-window-in-ssr (SSR)
```

Show rule details:

```bash
vue-doctor rule no-console
```

Example:

```text
Rule: no-console

Category:
Best Practices

Default Severity:
warning

Description:
Detect console usage in application code.
```

---

## Baseline

Useful for large legacy projects.

Generate baseline:

```bash
vue-doctor baseline
```

This creates:

```text
.vue-doctor-baseline.json
```

Known issues inside the baseline file will be ignored in future scans.

---

## Cache

Vue Doctor automatically caches analysis results.

Cache file:

```text
.vue-doctor-cache.json
```

Delete cache manually if needed:

```bash
rm .vue-doctor-cache.json
```

---

## GitHub Actions

Example workflow:

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

      - run: npm install

      - run: npm run build

      - run: node dist/index.js check --reporter github --changed
```

---

## Custom Rules

Example:

```ts
import type { Rule } from './src/types/rule';

const customRule: Rule = {
    name: 'test-rule',

    meta: {
        severity: 'warning',
        category: 'Custom',
        description: 'Example custom rule',
        recommended: false,
    },

    async check(ctx) {
        return [
            {
                rule: 'test-rule',
                severity: 'warning',
                file: ctx.filePath,
                line: 1,
                column: 1,
                message: 'plugin works',
            },
        ];
    },
};

export default [customRule];
```

Register plugin:

```ts
import customRules from './custom-rules';

export default {
    plugins: [customRules],
};
```

---

## Commands

```bash
vue-doctor check
vue-doctor check --changed
vue-doctor check --reporter json
vue-doctor check --reporter github

vue-doctor baseline

vue-doctor rules
vue-doctor rule <name>
```

---

## Roadmap

### Current

- Rule Engine
- Vue SFC Parser
- Baseline
- Cache
- GitHub Reporter
- Plugin API

### Planned

- Auto Fix
- VS Code Extension
- Nuxt-specific Rules
- Pinia Rules
- Composition API Best Practices
- HTML Template Analysis

---

## License

MIT