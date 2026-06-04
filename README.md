# Vue Doctor

![npm](https://img.shields.io/npm/v/@daohuy34/vue-doctor)
![CI](https://github.com/daohuy34/vue-doctor/workflows/CI/badge.svg)
![Tests](https://img.shields.io/badge/tests-203%20passing-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Node](https://img.shields.io/badge/Node-18%2B-green)

**Static Analysis & Architecture Intelligence for Vue & Nuxt applications.**

Vue Doctor helps detect maintainability issues, SSR risks, and architectural smells before they become technical debt.

Unlike traditional linters that focus on syntax/style, Vue Doctor focuses on **code quality**, **project health**, and **long-term maintainability**.

---

## Table of Contents

- [Why Vue Doctor?](#why-vue-doctor)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Commands](#commands)
  - [check](#check---comprehensive-analysis)
  - [graph](#graph---dependency-graph)
  - [metrics](#metrics---architecture-metrics)
  - [report](#report---architecture-score-report)
  - [smell](#smell---architecture-smell-detection)
  - [rules](#rules---rule-list)
  - [fix](#fix---auto-fix)
  - [baseline](#baseline---baseline-comparison)
  - [nuxt](#nuxt---nuxt-analysis)
  - [init](#init---initialize-configuration)
  - [dashboard](#dashboard---visual-dashboard)
  - [asset](#asset---asset-analysis)
- [Rules](#rules-1)
- [Configuration](#configuration)
- [CI/CD Integration](#cicd-integration)
- [VSCode Extension](#vscode-extension)

---

## Why Vue Doctor?

### Traditional Linters (ESLint, Prettier)
- Semicolons
- Formatting
- Variable naming
- Console statements

### Vue Doctor
- **Oversized components** - Components that need to be split
- **Deep watchers** - Watch performance issues
- **SSR unsafe APIs** - Browser APIs in SSR context
- **Excessive reactive state** - State bloat
- **Circular dependencies** - Dependency hell
- **Layer violations** - Architecture violations
- **Architecture smells** - God components, smart component abuse
- **Feature leakage** - Feature cross-imports
- **Hotspots** - Files that need urgent refactoring

---

## Installation

```bash
# npm
npm install -D @daohuy34/vue-doctor

# yarn
yarn add -D @daohuy34/vue-doctor

# pnpm
pnpm add -D @daohuy34/vue-doctor
```

### Global install (for CLI usage)

```bash
npm install -g @daohuy34/vue-doctor
```

### Run without install

```bash
npx @daohuy34/vue-doctor check
```

---

## Quick Start

### 1. Initialize configuration

```bash
npx vue-doctor init
```

Creates a `vue-doctor.config.js` file with default configuration.

### 2. Run analysis

```bash
# Analyze entire project
vue-doctor check

# Specify directories
vue-doctor check src

# Multiple directories
vue-doctor check src pages components
```

### 3. View results

```
src/components/ProductEditor.vue

✖ no-large-component
    Component exceeds recommended size (624 LOC)

✖ no-deep-watch
    Deep watch detected

⚠ no-window-in-ssr
    window usage detected in SSR context

Summary
────────────────────────────────────────
Files scanned: 124
Issues found: 18
Warnings: 9
Errors: 9
```

---

## Commands

### `check` - Comprehensive Analysis

Analyzes the entire project and reports issues.

```bash
vue-doctor check [paths...] [options]

# Options:
#   --baseline        Use baseline to ignore existing issues
#   --reporter        Output format: stylish, json, html, sarif
#   --output          Output file for reporter
#   --profile         Profile: strict, recommended, minimal
#   --cache           Use cache
#   --fix             Auto-fix some issues
```

**Examples:**

```bash
# Standard check
vue-doctor check

# JSON output
vue-doctor check --reporter json --output results.json

# SARIF for GitHub
vue-doctor check --reporter sarif --output results.sarif

# Strict mode
vue-doctor check --profile strict

# With cache
vue-doctor check --cache
```

---

### `graph` - Dependency Graph

Displays the project dependency graph.

```bash
vue-doctor graph [options]

# Options:
#   --type            Filter by type: component, page, store, composable
#   --format          Format: text, tree, json, stats
#   --filter          Pattern filter: "components/"
#   --depth           Display depth: 1-5
#   --no-color        No colors
#   --hotspots        Show top hotspots
#   --cycles          Show circular dependencies
#   --orphans         Show orphan nodes
```

**Examples:**

```bash
# Default tree view
vue-doctor graph

# Components only
vue-doctor graph --type component

# JSON output
vue-doctor graph --format json

# Filter pattern
vue-doctor graph --filter "features/"

# Depth limit
vue-doctor graph --depth 2

# Combine options
vue-doctor graph --type component --format tree --depth 3
```

**Output:**

```
src/
├── components/
│   ├── AppHeader.vue
│   │   └── uses: composables/useAuth.ts
│   ├── ProductList.vue
│   │   └── uses: stores/product.ts, composables/useProducts.ts
│   └── UserAvatar.vue
├── pages/
│   ├── index.vue
│   │   └── uses: composables/useAuth.ts, stores/cart.ts
│   └── products/
│       └── [id].vue
└── stores/
    ├── auth.ts
    └── product.ts
```

---

### `metrics` - Architecture Metrics

View project architecture metrics.

```bash
vue-doctor metrics [options]

# Options:
#   --json            JSON output
#   --boundaries      Analyze feature boundary violations
#   --routes          Analyze route complexity
#   --shared          Analyze shared modules
#   --coupling        Analyze feature coupling
```

**Output:**

```
┌─────────────────────────────────────────────────────────────────┐
│                   Architecture Metrics                          │
├─────────────────────────────────────────────────────────────────┤
│  Components        │  23                                        │
│  Pages             │  12                                        │
│  Composables       │  18                                        │
│  Stores            │  5                                         │
├─────────────────────────────────────────────────────────────────┤
│  Coupling          │  3.2 avg deps/component                    │
│  Depth             │  2.1 max nesting                           │
│  Circular Deps     │  0                                          │
├─────────────────────────────────────────────────────────────────┤
│  Shared Module Use │  12.4%                                      │
│  Orphan Files      │  3                                          │
│  Feature Leakage   │  2 violations                               │
└─────────────────────────────────────────────────────────────────┘
```

---

### `report` - Architecture Score Report

Calculate and track architecture scores over time.

```bash
vue-doctor report [options]

# Options:
#   --json            JSON output
#   --delta           Show changes from previous run
#   --save            Save to history
#   --html            Generate HTML report
#   --open            Open HTML report in browser
#   --output          Output file path
#   --history         Show score history
```

**Output:**

```
┌─────────────────────────────────────────────────────────────────┐
│                Architecture Score: 87/100                       │
├─────────────────────────────────────────────────────────────────┤
│  Category              │  Score  │  Status                      │
├─────────────────────────────────────────────────────────────────┤
│  Architecture          │  92     │  ✅ Excellent                │
│  Maintainability       │  85     │  ✅ Good                     │
│  Performance           │  88     │  ✅ Good                     │
│  SSR Safety            │  100    │  ✅ Excellent                │
└─────────────────────────────────────────────────────────────────┘

Architecture Debt: ~4.5 hours
```

---

### `smell` - Architecture Smell Detection

Detect architectural smells: God Components, Smart Component Abuse, Service Layer Violations.

```bash
vue-doctor smell [options]

# Options:
#   --json            JSON output
#   --only            Only detect specific types:
#                     god-component, god-composable, smart-component,
#                     service-layer, drift
```

**Output:**

```
╔════════════════════════════════════════════════════════════════════╗
║               Architecture Smell Report                        ║
╚════════════════════════════════════════════════════════════════════╝

🔴 God Components (Excessively Complex)
───────────────────────────────────────

🔴 Dashboard.vue ERROR
   • LOC: 1247 (> 800)
   • Imports: 34 (> 20)
   • Methods: 45 (> 20)
   • Computed: 28 (> 15)

   Suggestion: Split into smaller components or extract logic to composables

⚠️  God Composables (Too Many Responsibilities)
──────────────────────────────────────────────
⚠️  usePayment.ts
   • LOC: 678 (> 500)
   • Returns: 35 (> 20)

   Suggestion: Split into smaller composables (useXForm, useXData, useXState)
```

---

### `rules` - Rule List

List all available rules.

```bash
vue-doctor rules [options]

# Options:
#   --json            JSON output
#   --category        Filter by category
#   --severity        Filter by severity
```

---

### `fix` - Auto Fix

Automatically fix some fixable issues.

```bash
vue-doctor fix [paths...]

# Options:
#   --dry-run         Preview changes
#   --force           Force overwrite
```

---

### `baseline` - Baseline Comparison

Create or use a baseline to ignore existing issues.

```bash
# Create baseline
vue-doctor baseline

# Use baseline
vue-doctor check --baseline
```

**Use case:** When adopting Vue Doctor into an existing project, create a baseline to focus on new issues instead of fixing everything at once.

---

### `nuxt` - Nuxt Analysis

Deep analyze Nuxt-specific issues.

```bash
vue-doctor nuxt [options]

# Options:
#   --json            JSON output
#   --async          Analyze async data patterns
#   --hydration       Analyze hydration risks
#   --apis           Analyze API usage
```

Checks:
- Nuxt auto-imports
- Page complexity
- Hydration risks
- SSR safety
- API route patterns

---

### `init` - Initialize Configuration

Create a default configuration file.

```bash
vue-doctor init [--profile strict|recommended|minimal]
```

Creates `vue-doctor.config.js`:

```javascript
export default {
  profile: 'recommended',
  rules: {},
  thresholds: {},
  reporter: 'stylish',
}
```

---

### `dashboard` - Visual Dashboard

Open an interactive dashboard in the browser.

```bash
vue-doctor dashboard
```

---

### `trend` - Score Trends

View history of architecture score changes.

```bash
vue-doctor trend
```

---

### `asset` - Asset Analysis

Analyze static asset sizes (images, SVGs, fonts).

```bash
vue-doctor asset [options]

# Options:
#   --json            JSON output
#   --threshold <kb>  Size threshold in KB (default: 50)
#   --dirs <dirs>     Directories to scan (comma-separated)
```

**Output:**

```
Asset Analysis
════════════════════════════════════════════════════════════

Summary:
  Images:  12
  Fonts:    3
  Videos:   1
  ──────────────────
  Total:    16
  Total Size: 245 KB

⚠ Large Assets (>50KB): 2
  128.5 KB  images/hero-banner.png
  78.2 KB   images/product-360.webp
```

---

## Rules

### Performance (7 rules)

| Rule | Severity | Description |
|------|----------|-------------|
| `no-deep-watch` | warning | Avoid deep watch causing performance issues |
| `no-large-asset` | warning | Asset (image/svg/font) too large |
| `page-complexity` | warning | Detect overly complex pages |
| `async-data-abuse` | warning | Too many async data calls |
| `duplicate-fetch` | warning | Duplicate API calls |
| `excessive-watchers` | warning | Too many watchers |
| `excessive-v-for-nesting` | warning | Nested v-for too deep |

### Maintainability (9 rules)

| Rule | Severity | Description |
|------|----------|-------------|
| `no-large-component` | warning | Component > 400 LOC |
| `no-large-template` | warning | Template too large |
| `no-unused-component-data` | warning | Unused reactive properties |
| `excessive-props` | warning | Too many props |
| `excessive-computed-properties` | info | Too many computed |
| `excessive-dom-depth` | warning | DOM nesting too deep |
| `store-bloat` | warning | Pinia store too large |
| `ai-monster-component` | warning | Component too complex |
| `excessive-reactive-state` | warning | Too much reactive state |

### SSR Safety (5 rules)

| Rule | Severity | Description |
|------|----------|-------------|
| `no-window-in-ssr` | error | window in SSR context |
| `no-document-in-ssr` | error | document in SSR context |
| `no-localstorage-in-ssr` | error | localStorage in SSR context |
| `no-sessionstorage-in-ssr` | error | sessionStorage in SSR context |
| `hydration-risk` | warning | SSR/hydration mismatch patterns |

### Architecture (7 rules)

| Rule | Severity | Description |
|------|----------|-------------|
| `no-circular-dependency` | error | Circular dependencies |
| `layer-violation` | warning | Layer architecture violations |
| `forbidden-dependency` | error | Forbidden dependency patterns |
| `feature-leakage` | warning | Feature internal imports |
| `component-coupling` | warning | High fan-out components |
| `composable-coupling` | warning | High fan-out composables |
| `store-coupling` | warning | Store-to-store coupling |

### Pinia (5 rules)

| Rule | Severity | Description |
|------|----------|-------------|
| `store-god-object` | warning | Store with too many responsibilities |
| `cross-store-dependency` | warning | Cross-store dependencies |
| `circular-store-dependency` | error | Circular store dependencies |
| `pinia-best-practices` | warning | Best practice violations |

### Best Practices (4 rules)

| Rule | Severity | Description |
|------|----------|-------------|
| `no-mutate-props` | error | Mutating props directly |
| `no-side-effect-in-computed` | error | Side effects in computed |
| `no-v-html` | critical | v-html with dynamic content (XSS) |
| `no-console` | warning | Console statements |

### Template (3 rules)

| Rule | Severity | Description |
|------|----------|-------------|
| `no-v-if-with-v-for` | error | v-if + v-for on same element |
| `require-key-in-v-for` | error | Missing :key in v-for |
| `no-debugger` | warning | Debugger statements |

---

## Configuration

### Configuration File

Create `vue-doctor.config.js` in the project root:

```javascript
export default {
  // Profile: strict, recommended, minimal
  profile: 'recommended',

  // Override specific rules
  rules: {
    'no-large-component': {
      enabled: true,
      severity: 'warning',
      options: { maxSize: 400 },
    },
    'ai-monster-component': {
      enabled: true,
      severity: 'warning',
      options: { maxScore: 25 },
    },
  },

  // Custom thresholds
  thresholds: {
    maxComponentSize: 400,
    maxFanOut: 10,
    maxCircularDepth: 3,
    maxStoreSize: 500,
  },

  // Feature boundaries
  boundaries: [
    { name: 'auth', pattern: 'features/auth/**' },
    { name: 'dashboard', pattern: 'features/dashboard/**' },
  ],

  // Shared module threshold
  sharedModuleThreshold: 50,

  // Reporter
  reporter: 'stylish',

  // Fail on severity
  failOn: 'error',

  // Fail on warnings
  failOnWarning: false,
}
```

### Profiles

| Profile | Description |
|---------|-------------|
| `strict` | Maximum quality for enterprise projects |
| `recommended` | Balanced for most projects |
| `minimal` | Lightweight for quick iterations |

### Package.json Configuration

```json
{
  "vueDoctor": {
    "profile": "recommended",
    "failOn": "warning"
  }
}
```

### Extends Configuration

```javascript
// vue-doctor.config.js
export default {
  extends: './base-vue-doctor.config.js',
  rules: {
    // Override
    'no-large-component': 'off',
  },
}
```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Vue Doctor Analysis

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      security-events: write

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Run Vue Doctor
        run: npx vue-doctor check --reporter sarif --output results.sarif

      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif
          category: vue-doctor
```

### GitLab CI

```yaml
vue-doctor:
  image: node:20
  script:
    - npm ci
    - npx vue-doctor check --reporter json --output report.json
  artifacts:
    reports:
      json: report.json
```

### CircleCI

```yaml
- run:
    name: Vue Doctor
    command: npm run vue-doctor
```

### Pre-commit Hook

```bash
# .husky/pre-commit
npx vue-doctor check --cache
```

---

## VSCode Extension

Install from VSCode Marketplace: **Vue Doctor**

### Features

- Real-time diagnostics
- Hover for rule details
- Click to fix
- Inline violations

### Configuration

```json
{
  "vueDoctor.enable": true,
  "vueDoctor.profile": "recommended",
  "vueDoctor.runOnSave": true,
  "vueDoctor.autoFixOnSave": false
}
```

---

## Architecture Score

Vue Doctor calculates architecture scores from 0-100:

| Score | Rating |
|-------|--------|
| 90-100 | Excellent |
| 80-89 | Good |
| 70-79 | Fair |
| 60-69 | Poor |
| <60 | Critical |

### Scoring Categories

- **Architecture (30%)**: Circular deps, layer violations, feature leakage
- **Maintainability (30%)**: Component size, complexity, coupling
- **Performance (20%)**: Watchers, reactivity, rendering
- **SSR Safety (20%)**: Browser APIs in SSR context

---

## Cache System

Vue Doctor automatically caches results to speed up subsequent runs.

### Cache Location

```
.vue-doctor-cache.json
```

### Disable Cache

```bash
vue-doctor check --no-cache
```

### Clear Cache

```bash
rm .vue-doctor-cache.json
```

---

## Troubleshooting

### "Cannot find module"

```bash
npm install
```

### Slow on large projects

```bash
# Use cache
vue-doctor check --cache

# Limit scan
vue-doctor check src/components
```

### Too many false positives

```javascript
// vue-doctor.config.js
export default {
  rules: {
    'no-console': 'off',  // Disable annoying rule
  },
}
```

---

## Philosophy

**ESLint answers:**

> Is this code valid?

**Vue Doctor answers:**

> Is this code maintainable?

Use both together for comprehensive analysis.

---

## License

MIT
