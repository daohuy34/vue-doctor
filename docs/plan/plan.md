# Vue Doctor Roadmap

## Vision

Become the standard architecture analyzer for Vue & Nuxt applications.

Target:

- Individual developers
- Startup teams
- Enterprise Vue projects

---

# v1.3 - Project Graph Engine

Goal:

Understand relationships between files instead of analyzing files independently.

## Features

- Project dependency graph
- Component graph
- Composable graph
- Store graph

## New Commands

```bash
vue-doctor graph
```

Output:

```text
Pages: 25
Components: 162
Stores: 12
Composables: 43
```

---

# v1.4 - Dependency Analysis

Goal:

Detect unhealthy dependencies.

## Rules

### component-coupling

Too many imported components.

### composable-coupling

Too many imported composables.

### store-coupling

Store depends on too many stores.

### circular-import

Circular dependencies.

---

# v1.5 - Feature Boundary Analysis

Goal:

Prevent architecture decay.

## Rules

### feature-leakage

Feature imports another feature's internal implementation.

### layer-violation

UI layer imports infrastructure layer directly.

### forbidden-dependency

Disallowed module relationships.

---

# v1.6 - Nuxt Analyzer

Goal:

Understand Nuxt-specific architecture issues.

## Rules

### page-complexity

Large page components.

### async-data-abuse

Too many useAsyncData calls.

### duplicate-fetch

Same API called from multiple locations.

### hydration-risk

Potential SSR hydration problems.

---

# v1.7 - Pinia Analyzer

Goal:

Detect unhealthy stores.

## Rules

### store-bloat

Too many states.

### store-god-object

Store doing too much.

### cross-store-dependency

Store dependency chains.

### circular-store-dependency

Circular store references.

---

# v1.8 - Architecture Insights

Goal:

Provide project-wide metrics.

## Metrics

### Architecture Score

0-100 score.

### Dependency Health

Project dependency quality.

### Maintainability Score

Long-term maintenance risk.

### Technical Debt Index

Estimated architecture debt.

---

# v2.0 - Architecture Dashboard

Goal:

Visualize architecture health.

## Features

Generate:

```bash
vue-doctor report
```

Produces:

```text
architecture-report.html
```

### Dashboard Sections

- Architecture Score
- Component Health
- Store Health
- Dependency Graph
- Rule Violations
- Trend Analysis

---

# v2.1 - GitHub Integration

Goal:

Become CI/CD friendly.

## Features

- GitHub Action
- SARIF Output
- PR Comments
- Architecture Diff

Example:

```yaml
- uses: vue-doctor/action@v1
```

---

# v2.2 - Team & Enterprise

## Features

- Rule Profiles
- Team Standards
- Shared Config
- Architecture Policies

Example:

```json
{
  "forbiddenDependencies": [
    {
      "from": "features/order",
      "to": "features/product/internal"
    }
  ]
}
```

---

# Long-term Vision

Vue Doctor should answer:

- Is this project maintainable?
- Is architecture getting worse?
- Which components are becoming risky?
- Which stores should be split?
- Which dependencies should be removed?

Instead of only answering:

- Is there a console.log here?