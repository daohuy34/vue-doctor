# Vue Doctor

![npm](https://img.shields.io/npm/v/@daohuy34/vue-doctor)
![CI](https://github.com/daohuy34/vue-doctor/workflows/CI/badge.svg)
![Tests](https://img.shields.io/badge/tests-203%20passing-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Node](https://img.shields.io/badge/Node-18%2B-green)

**Static Analysis & Architecture Intelligence for Vue & Nuxt applications.**

Vue Doctor giúp phát hiện các vấn đề về maintainability, SSR risks, và architectural smells trước khi chúng trở thành technical debt.

Không giống như traditional linters tập trung vào syntax/style, Vue Doctor tập trung vào **chất lượng code**, **sức khỏe project**, và **khả năng bảo trì dài hạn**.

---

## Mục lục

- [Tại sao nên dùng Vue Doctor?](#tại-sao-nên-dùng-vue-doctor)
- [Cài đặt](#cài-đặt)
- [Quick Start](#quick-start)
- [Commands](#commands)
  - [check](#check---phân-tích-toàn-diện)
  - [graph](#graph---xem-dependency-graph)
  - [metrics](#metrics---chỉ-số-kiến-trúc)
  - [report](#report---báo-cáo-điểm-số-kiến-trúc)
  - [smell](#smell---phát-hiện-architecture-smells)
  - [rules](#rules---danh-sách-rules)
  - [fix](#fix---tự-động-sửa)
  - [baseline](#baseline---so-sánh-với-baseline)
  - [nuxt](#nuxt---phân-tích-nuxt)
  - [init](#init---khởi-tạo-cấu-hình)
  - [dashboard](#dashboard---giao-diện-trực-quan)
- [Rules](#rules-1)
- [Configuration](#cấu-hình)
- [CI/CD Integration](#cicd-integration)
- [VSCode Extension](#vscode-extension)

---

## Tại sao nên dùng Vue Doctor?

### Traditional Linters (ESLint, Prettier)
- Semicolons
- Formatting
- Variable naming
- Console statements

### Vue Doctor
- **Oversized components** - Component quá lớn cần tách
- **Deep watchers** - Watch performance issues
- **SSR unsafe APIs** - Browser APIs trong SSR context
- **Excessive reactive state** - State bloat
- **Circular dependencies** - Dependency hell
- **Layer violations** - Kiến trúc bị vi phạm
- **Architecture smells** - God components, smart component abuse
- **Feature leakage** - Feature cross-import
- **Hotspots** - Files cần refactor gấp

---

## Cài đặt

```bash
# npm
npm install -D @daohuy34/vue-doctor

# yarn
yarn add -D @daohuy34/vue-doctor

# pnpm
pnpm add -D @daohuy34/vue-doctor
```

### Global install (cho CLI usage)

```bash
npm install -g @daohuy34/vue-doctor
```

### Run without install

```bash
npx @daohuy34/vue-doctor check
```

---

## Quick Start

### 1. Khởi tạo cấu hình

```bash
npx vue-doctor init
```

Tạo file `vue-doctor.config.js` với cấu hình mặc định.

### 2. Chạy phân tích

```bash
# Phân tích toàn bộ project
vue-doctor check

# Chỉ định thư mục
vue-doctor check src

# Với nhiều thư mục
vue-doctor check src pages components
```

### 3. Xem kết quả

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

### `check` - Phân tích toàn diện

Phân tích toàn bộ project và báo cáo issues.

```bash
vue-doctor check [paths...] [options]

# Options:
#   --baseline        Sử dụng baseline để bỏ qua existing issues
#   --reporter        Định dạng output: stylish, json, html, sarif
#   --output          File output cho reporter
#   --profile         Profile: strict, recommended, minimal
#   --cache           Sử dụng cache
#   --fix             Tự động sửa một số issues
```

**Ví dụ:**

```bash
# Standard check
vue-doctor check

# JSON output
vue-doctor check --reporter json --output results.json

# SARIF for GitHub
vue-doctor check --reporter sarif --output results.sarif

# Strict mode
vue-doctor check --profile strict

# Với cache
vue-doctor check --cache
```

---

### `graph` - Xem Dependency Graph

Hiển thị dependency graph của project.

```bash
vue-doctor graph [options]

# Options:
#   --type            Filter theo type: component, page, store, composable
#   --format          Định dạng: text, tree, json, stats
#   --filter          Pattern filter: "components/"
#   --depth           Độ sâu hiển thị: 1-5
#   --no-color        Không màu
```

**Ví dụ:**

```bash
# Tree view mặc định
vue-doctor graph

# Chỉ components
vue-doctor graph --type component

# JSON output
vue-doctor graph --format json

# Filter pattern
vue-doctor graph --filter "features/"

# Depth limit
vue-doctor graph --depth 2

# Combine
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

### `metrics` - Chỉ số Kiến trúc

Xem các chỉ số kiến trúc của project.

```bash
vue-doctor metrics [options]

# Options:
#   --json            JSON output
#   --trend           Hiển thị xu hướng
#   --boundaries      Phân tích feature boundary violations
#   --routes          Phân tích route complexity
#   --shared          Phân tích shared modules
#   --coupling        Phân tích feature coupling
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

### `report` - Báo cáo Điểm số Kiến trúc

Tính toán và theo dõi điểm số kiến trúc theo thời gian.

```bash
vue-doctor report [options]

# Options:
#   --json            JSON output
#   --delta           Hiển thị thay đổi so với lần trước
#   --save            Lưu vào history
#   --html            Generate HTML report
#   --open            Mở HTML report trong browser
#   --output          Output file path
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

### `smell` - Phát hiện Architecture Smells

Phát hiện các mùi kiến trúc: God Components, Smart Component Abuse, Service Layer Violations.

```bash
vue-doctor smell [options]

# Options:
#   --json            JSON output
#   --only            Chỉ detect type cụ thể:
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

### `rules` - Danh sách Rules

Liệt kê tất cả available rules.

```bash
vue-doctor rules [options]

# Options:
#   --json            JSON output
#   --category        Filter theo category
#   --severity        Filter theo severity
```

---

### `fix` - Tự động Sửa

Tự động sửa một số issues có thể fix được.

```bash
vue-doctor fix [paths...]

# Options:
#   --dry-run         Xem trước thay đổi
#   --force           Force overwrite
```

---

### `baseline` - So sánh với Baseline

Tạo hoặc sử dụng baseline để bỏ qua existing issues.

```bash
# Tạo baseline
vue-doctor baseline

# Sử dụng baseline
vue-doctor check --baseline
```

**Use case:** Khi adopt Vue Doctor vào project có sẵn, tạo baseline để tập trung vào issues mới thay vì fix tất cả cùng lúc.

---

### `nuxt` - Phân tích Nuxt

Phân tích sâu Nuxt-specific issues.

```bash
vue-doctor nuxt [options]

# Options:
#   --json            JSON output
```

Kiểm tra:
- Nuxt auto-imports
- Page complexity
- Hydration risks
- SSR safety
- API routes patterns

---

### `init` - Khởi tạo Cấu hình

Tạo file cấu hình mặc định.

```bash
vue-doctor init [--profile strict|recommended|minimal]
```

Tạo `vue-doctor.config.js`:

```javascript
export default {
  profile: 'recommended',
  rules: {},
  thresholds: {},
  reporter: 'stylish',
}
```

---

### `dashboard` - Giao diện Trực quan

Mở dashboard tương tác trên browser.

```bash
vue-doctor dashboard
```

---

### `trend` - Xu hướng Điểm số

Xem lịch sử thay đổi điểm số kiến trúc.

```bash
vue-doctor trend
```

---

### `asset` - Phân tích Assets

Phân tích kích thước static assets (images, SVGs, fonts).

```bash
vue-doctor asset [options]

# Options:
#   --json            JSON output
#   --threshold <kb>  Ngưỡng size (KB), mặc định: 50
#   --dirs <dirs>    Thư mục cần scan (comma-separated)
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
| `no-deep-watch` | warning | Tránh deep watch gây performance issues |
| `no-large-asset` | warning | Asset (image/svg/font) quá lớn |
| `page-complexity` | warning | Phát hiện page quá phức tạp |
| `async-data-abuse` | warning | Quá nhiều async data calls |
| `duplicate-fetch` | warning | Duplicate API calls |
| `excessive-watchers` | warning | Quá nhiều watchers |
| `excessive-v-for-nesting` | warning | Nested v-for quá sâu |

### Maintainability (9 rules)

| Rule | Severity | Description |
|------|----------|-------------|
| `no-large-component` | warning | Component > 400 LOC |
| `no-large-template` | warning | Template quá lớn |
| `no-unused-component-data` | warning | Unused reactive properties |
| `excessive-props` | warning | Quá nhiều props |
| `excessive-computed-properties` | info | Quá nhiều computed |
| `excessive-dom-depth` | warning | DOM nesting quá sâu |
| `store-bloat` | warning | Pinia store quá lớn |
| `ai-monster-component` | warning | Component quá phức tạp |
| `excessive-reactive-state` | warning | Quá nhiều reactive state |

### SSR Safety (5 rules)

| Rule | Severity | Description |
|------|----------|-------------|
| `no-window-in-ssr` | error | window trong SSR context |
| `no-document-in-ssr` | error | document trong SSR context |
| `no-localstorage-in-ssr` | error | localStorage trong SSR context |
| `no-sessionstorage-in-ssr` | error | sessionStorage trong SSR context |
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
| `store-god-object` | warning | Store quá nhiều responsibilities |
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

## Cấu hình

### File cấu hình

Tạo `vue-doctor.config.js` trong project root:

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
| `strict` | Maximum quality cho enterprise projects |
| `recommended` | Balanced cho hầu hết projects |
| `minimal` | Lightweight cho quick iterations |

### Cấu hình trong package.json

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

Cài đặt từ VSCode Marketplace: **Vue Doctor**

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

Vue Doctor tính điểm kiến trúc từ 0-100:

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

Vue Doctor tự động cache kết quả để tăng tốc subsequent runs.

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
# Sử dụng cache
vue-doctor check --cache

# Giới hạn scan
vue-doctor check src/components
```

### Too many false positives

```javascript
// vue-doctor.config.js
export default {
  rules: {
    'no-console': 'off',  // Tắt rule gây phiền
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
