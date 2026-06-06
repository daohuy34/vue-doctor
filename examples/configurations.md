# Vue Doctor - Configuration Examples

This directory contains example configurations for different project types and use cases.

## Example Configurations

### 1. Basic Configuration (default)
```javascript
// vue-doctor.config.js
export default {
  profile: 'recommended',
}
```

### 2. Strict Mode (Enterprise)
```javascript
// vue-doctor.config.js
export default {
  profile: 'strict',
  rules: {
    'no-console': 'error',
    'no-large-component': {
      enabled: true,
      severity: 'error',
      options: { maxSize: 200 },
    },
  },
  thresholds: {
    maxComponentSize: 200,
    maxFanOut: 5,
    maxCircularDepth: 1,
  },
  failOn: 'error',
  failOnWarning: true,
}
```

### 3. Minimal Mode (Quick Iterations)
```javascript
// vue-doctor.config.js
export default {
  profile: 'minimal',
  rules: {
    'no-window-in-ssr': 'error',
    'no-document-in-ssr': 'error',
  },
}
```

### 4. Feature-Sirst Architecture
```javascript
// vue-doctor.config.js
export default {
  profile: 'recommended',
  boundaries: [
    { name: 'auth', pattern: 'src/features/auth/**' },
    { name: 'checkout', pattern: 'src/features/checkout/**' },
    { name: 'products', pattern: 'src/features/products/**' },
    { name: 'shared', pattern: 'src/shared/**', allowedBy: '*' },
  ],
  sharedModuleThreshold: 30,
}
```

### 5. Nuxt 3 Project
```javascript
// vue-doctor.config.js
export default {
  profile: 'recommended',
  rules: {
    'no-window-in-ssr': 'error',
    'no-localstorage-in-ssr': 'error',
    'hydration-risk': 'warning',
  },
}
```

### 6. Monorepo Workspace
```javascript
// vue-doctor.config.js
export default {
  profile: 'recommended',
  rules: {
    'layer-violation': 'error',
    'feature-leakage': 'error',
  },
  boundaries: [
    { name: 'ui', pattern: 'packages/ui/**' },
    { name: 'utils', pattern: 'packages/utils/**', allowedBy: '*' },
    { name: 'app', pattern: 'apps/web/**' },
  ],
}
```

### 7. Extending Base Config
```javascript
// vue-doctor.config.js
export default {
  extends: './base-vue-doctor.config.js',
  rules: {
    'no-console': 'off',  // Disable noisy rule
    'ai-monster-component': {
      enabled: true,
      severity: 'warning',
      options: { maxScore: 20 },
    },
  },
}
```

## CI/CD Examples

### GitHub Actions with SARIF
```yaml
name: Architecture Analysis

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  vue-doctor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - name: Run Vue Doctor
        run: npx vue-doctor check --reporter sarif --output results.sarif
      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif
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
    expire_in: 1 week
```

### Pre-commit Hook
```bash
# .husky/pre-commit
npx vue-doctor check --cache
```

## Package.json Integration
```json
{
  "scripts": {
    "lint:arch": "vue-doctor check",
    "lint:arch:strict": "vue-doctor check --profile strict",
    "report": "vue-doctor report --html --open"
  },
  "vueDoctor": {
    "profile": "recommended",
    "failOn": "warning"
  }
}
```
