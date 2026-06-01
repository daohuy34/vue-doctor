# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-06-01

### Breaking Changes

- **Major version bump** - New architecture analysis system
- All new features below are available

### Added

- **Nuxt Performance Rules**
  - `async-data-abuse` - detects excessive async data fetching
  - `duplicate-fetch` - detects duplicate API calls
  - `hydration-risk` - detects SSR hydration mismatch patterns

- **Nuxt Detection Improvements**
  - Enhanced page complexity detection
  - Better async data call counting
  - API endpoint normalization for duplicate detection

### Nuxt Rules

Total 7 Nuxt-specific rules:
- `no-window-in-ssr`
- `no-document-in-ssr`
- `no-localstorage-in-ssr`
- `no-sessionstorage-in-ssr`
- `page-complexity`
- `async-data-abuse`
- `duplicate-fetch`
- `hydration-risk`

### Configuration

```javascript
// vue-doctor.config.js
export default {
  rules: {
    'async-data-abuse': {
      maxAsyncCalls: 3
    },
    'hydration-risk': {
      severity: 'warning'
    }
  }
}
```

### Documentation

- Added `docs/rules/async-data-abuse.md`
- Added `docs/rules/duplicate-fetch.md`
- Added `docs/rules/hydration-risk.md`

### Tests

- Total test coverage: 294 tests

## [1.9.0] - 2026-06-01

### Added

- **Nuxt Detection System**
  - `src/core/nuxt.ts` - Nuxt framework detection
  - Nuxt 2/3 version detection
  - Directory structure detection (pages/, layouts/, components/, etc.)
  - Auto-import configuration detection

- **Nuxt Rules**
  - `page-complexity` rule - detects large Nuxt page components
  - Configurable maxLines threshold (default: 300)
  - Detects multiple asyncData/fetch calls
  - Detects excessive computed properties

### Configuration

```javascript
// vue-doctor.config.js
export default {
  rules: {
    'page-complexity': {
      maxLines: 300,
      maxAsyncCalls: 3,
      severity: 'warning'
    }
  }
}
```

### Tests

- Added `nuxt.test.ts`
- Total test coverage: 294 tests

## [1.8.0] - 2026-05-31

### Added

- **Feature Boundary Detection**
  - `src/core/features.ts` - Feature module detection
  - Detects `features/`, `modules/`, `domains/` directories
  - Public API detection (index.ts, public.ts, api.ts)
  - Cross-feature import analysis

- **Feature Rules**
  - `feature-leakage` rule - detects internal module imports across features
  - Features should only use public APIs of other features

### Architecture Rules

Total 8 architecture rules:
- `no-circular-dependency`
- `component-coupling`
- `composable-coupling`
- `store-coupling`
- `layer-violation`
- `forbidden-dependency`
- `feature-leakage`

### Configuration

```javascript
// vue-doctor.config.js
export default {
  rules: {
    'feature-leakage': {
      patterns: ['features/', 'modules/'],
      ignore: ['node_modules/'],
      severity: 'warning'
    }
  }
}
```

### Documentation

- Added `docs/rules/feature-leakage.md`

### Tests

- Added `features.test.ts` (20 tests)
- Total test coverage: 292 tests

## [1.7.0] - 2026-05-31

### Added

- **Layer System** - Architecture Boundary Analysis
  - `src/core/layers.ts` - Layer definitions and utilities
  - 6 layers: UI, Business, Service, Utils, Types, Config
  - Automatic layer detection by path patterns
  - Layer hierarchy validation

- **Layer Rules**
  - `layer-violation` rule - detects architectural layer violations
  - `forbidden-dependency` rule - detects specific forbidden dependencies
  - Configurable layer hierarchies
  - Custom forbidden dependency patterns

- **Architecture Categories**
  - UI Layer: components/, pages/, layouts/, views/
  - Business Layer: composables/, stores/, hooks/
  - Service Layer: services/, api/, clients/
  - Utils Layer: utils/, helpers/, formatters/

### Configuration

```javascript
// vue-doctor.config.js
export default {
  rules: {
    'layer-violation': {
      hierarchy: ['ui', 'business', 'service', 'utils'],
      severity: 'warning'
    },
    'forbidden-dependency': {
      layers: [
        { from: 'utils', to: 'ui' },
        { from: 'business', to: 'ui' }
      ],
      files: ['pages/* -> pages/*'],
      severity: 'error'
    }
  }
}
```

### Documentation

- Added `docs/rules/layer-violation.md`
- Added `docs/rules/forbidden-dependency.md`

### Tests

- Added `layers.test.ts` (22 tests)
- Total test coverage: 272 tests

## [1.6.0] - 2026-05-31

### Added

- **Circular Dependency Detection**
  - Tarjan's Strongly Connected Components algorithm
  - `no-circular-dependency` rule (error severity)
  - Detects 2-node, 3-node, and multi-node cycles
  - Self-referencing module detection

- **Coupling Rules**
  - `component-coupling` rule - detects high fan-out components
  - `composable-coupling` rule - detects overly coupled composables
  - `store-coupling` rule - detects store-to-store coupling
  - Configurable thresholds via options

- **Dependency Analysis Utilities**
  - `findCircularDependencies()` - SCC algorithm
  - `getFanIn()` / `getFanOut()` - coupling metrics
  - `isInCircularDependency()` - cycle detection
  - `getCircularDepsSummary()` - formatted output

### Configuration

- **Severity Configuration**: All rules support configurable severity (`info`, `warning`, `error`)
- **Threshold Configuration**: Coupling rules support `maxImports` threshold
- **Performance Cache**: Cycle detection results are cached for faster re-analysis

### Documentation

- Added `docs/rules/no-circular-dependency.md`
- Added `docs/rules/component-coupling.md`
- Added `docs/rules/composable-coupling.md`
- Added `docs/rules/store-coupling.md`

### Architecture Category

New rules added to 'Architecture' category:
- `no-circular-dependency`
- `component-coupling`
- `composable-coupling`
- `store-coupling`

### Tests

- Added `circular-deps.test.ts` (21 tests)
- Added `circular-deps-integration.test.ts` (12 tests)
- Added `coupling.test.ts` (14 tests)
- Total test coverage: 250 tests

## [1.5.0] - 2026-05-31

### Added

- **CLI Graph Command** (`vue-doctor graph`)
  - `--type` filter (page, component, store, composable, all)
  - `--depth` giới hạn độ sâu
  - `--format` output (text, tree, json, stats)
  - `--filter` pattern matching
  - Hierarchical tree view for nested components
  - Statistics summary output

### Improved

- Enhanced import parsing for alias paths (`@/`, `~/`)
- Better dynamic import detection (`import()`, `await import()`, `defineAsyncComponent`)
- Improved barrel file (index.ts) re-export handling
- Fixed comment stripping in import extraction
- Improved regex patterns for edge cases

### Tests

- Added `path-resolution.test.ts` (20 tests)
- Added `barrel-files.test.ts` (18 tests)
- Added `graph-integration.test.ts` (10 tests)
- Fixed line number mapping in `no-console` rule
- Total test coverage: 203 tests (100% pass rate)

### Documentation

- Updated README with graph command examples
- Added CHANGELOG.md

## [1.4.0] - 2026-05-30

### Added

- Component Graph Builder
- Advanced import parser
- Component usage tracker
- Graph visualization utilities

### Added

- Store graph analysis
- Composable graph tracking
- Dynamic import detection
- Integration tests for graph system
