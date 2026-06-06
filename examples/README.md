# Vue Doctor - Examples

This directory contains examples and guides for using Vue Doctor effectively.

## Contents

### [Configuration Examples](./configurations.md)
Ready-to-use configuration files for:
- Basic setup
- Strict mode (enterprise)
- Minimal mode (quick iterations)
- Feature-first architecture
- Nuxt 3 projects
- Monorepo workspaces
- CI/CD integration

### [Best Practices Guide](./best-practices.md)
Comprehensive guide covering:
- Component design principles
- State management patterns
- Feature architecture
- SSR best practices
- Performance optimization
- Architecture score targets

## Quick Examples

### Basic Check
```bash
vue-doctor check
```

### Generate Report
```bash
vue-doctor report --html --open
```

### View Dependency Graph
```bash
vue-doctor graph --type component --hotspots
```

### Detect Architecture Smells
```bash
vue-doctor smell
```

### Strict Mode
```bash
vue-doctor check --profile strict
```

### With Cache (Faster)
```bash
vue-doctor check --cache
```

### CI Mode (SARIF)
```bash
vue-doctor check --reporter sarif --output results.sarif
```

## Score Interpretation

| Score | Rating | Meaning |
|-------|--------|---------|
| 90-100 | Excellent | Production-ready architecture |
| 80-89 | Good | Minor improvements needed |
| 70-79 | Fair | Address warnings |
| 60-69 | Poor | Priority fixes needed |
| <60 | Critical | Major refactoring required |

## Common Workflows

### Daily Development
```bash
# Quick check before commit
vue-doctor check --cache

# View current score
vue-doctor report

# Check for new issues only
vue-doctor check --baseline
```

### Weekly Review
```bash
# Full analysis
vue-doctor check

# Generate HTML report
vue-doctor report --html --open

# View trends
vue-doctor trend
```

### Pre-Release
```bash
# Strict analysis
vue-doctor check --profile strict --fail-on warning

# Architecture smell check
vue-doctor smell

# Full metrics
vue-doctor metrics --boundaries --coupling --shared
```
