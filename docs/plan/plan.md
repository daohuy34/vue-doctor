# Phase 4 - CI/CD First

## Context

Vue Doctor currently supports:

- Vue 2
- Vue 3
- Nuxt 2
- Nuxt 3

The project already contains 25+ rules.

The next goal is NOT adding more rules.

The next goal is making Vue Doctor production-ready for CI/CD usage.

---

# Milestone 4.1 - Severity System

## Objective

Every rule must have severity metadata.

Supported severities:

```ts
type Severity =
  | 'info'
  | 'warning'
  | 'error'
  | 'critical'
```

---

## Tasks

### Task 1

Update Rule interface.

Current:

```ts
interface Rule {
  name: string
  check(): Finding[]
}
```

Target:

```ts
interface Rule {
  name: string
  severity: Severity
  category: RuleCategory
  check(): Finding[]
}
```

---

### Task 2

Add severity to all built-in rules.

Examples:

```ts
noVHtmlRule
=> critical

noWindowInSsrRule
=> error

noDocumentInSsrRule
=> error

noLocalStorageInSsrRule
=> error

noSessionStorageInSsrRule
=> error

requireKeyInVForRule
=> error

noMutatePropsRule
=> error

noConsoleRule
=> warning

excessiveWatchersRule
=> warning

excessiveComputedPropertiesRule
=> info
```

---

### Task 3

Update reporters.

Output example:

```txt
[critical] no-v-html
[warning] excessive-watchers
```

---

## Done Criteria

- All rules have severity
- Reporters display severity
- Tests pass

---

# Milestone 4.2 - Rule Categories

## Objective

Group findings by category.

---

## Categories

```ts
type RuleCategory =
  | 'security'
  | 'ssr'
  | 'performance'
  | 'maintainability'
  | 'best-practice'
  | 'ai'
```

---

## Tasks

Add category to every rule.

Examples:

```txt
security
 └─ no-v-html

ssr
 ├─ no-window-in-ssr
 ├─ no-document-in-ssr
 ├─ no-localstorage-in-ssr
 └─ no-sessionstorage-in-ssr

performance
 ├─ excessive-watchers
 ├─ excessive-dom-depth
 └─ excessive-v-for-nesting

ai
 ├─ ai-monster-component
 ├─ excessive-reactive-state
 └─ excessive-component-responsibility
```

---

## Done Criteria

CLI output example:

```txt
[security][critical] no-v-html

Avoid using v-html.
```

---

# Milestone 4.3 - Exit Codes

## Objective

Allow CI pipelines to fail.

---

## Tasks

Implement exit codes.

```txt
0 = success

1 = findings found

2 = runtime error
```

---

## Examples

Clean project:

```bash
vue-doctor check
```

Exit:

```txt
0
```

---

Project with findings:

```txt
1
```

---

Parser crash:

```txt
2
```

---

## Done Criteria

Automated tests added.

---

# Milestone 4.4 - Fail-On Severity

## Objective

Allow CI to fail only above a given threshold.

---

## New CLI Option

```bash
vue-doctor check \
  --fail-on warning
```

---

## Supported Values

```txt
info
warning
error
critical
```

---

## Examples

```bash
vue-doctor check \
  --fail-on error
```

Only:

```txt
error
critical
```

trigger failure.

---

## Done Criteria

Integration tests added.

---

# Milestone 4.5 - JSON Reporter V2

## Objective

Produce stable machine-readable output.

---

## New Schema

```json
{
  "summary": {
    "files": 15,
    "findings": 6
  },
  "findings": [
    {
      "rule": "no-v-html",
      "severity": "critical",
      "category": "security",
      "file": "src/App.vue",
      "line": 22,
      "message": "Avoid using v-html."
    }
  ]
}
```

---

## Tasks

- Create schema
- Update reporter
- Add tests

---

## Done Criteria

Schema documented.

---

# Milestone 4.6 - Changed Files Mode

## Objective

Support Pull Request analysis.

---

## New Option

```bash
vue-doctor check \
  --changed
```

---

## Behaviour

Read:

```bash
git diff
```

Analyze only changed files.

---

## Tasks

- detect changed files
- fallback when git unavailable
- tests

---

## Done Criteria

Only modified files are analyzed.

---

# Milestone 4.7 - GitHub Annotation Reporter

## Objective

Show findings directly in GitHub Actions.

---

## New Reporter

```bash
vue-doctor check \
  --reporter github
```

---

## Output

```txt
::warning file=src/App.vue,line=20::
Avoid deep watch usage.
```

---

## Tasks

Implement GitHub workflow commands.

Reference:

warning

```txt
::warning
```

error

```txt
::error
```

---

## Done Criteria

Findings appear inline in GitHub Actions.

---

# Milestone 4.8 - Official GitHub Action

## Objective

Publish first-party GitHub Action.

---

## New Repository

vue-doctor-action

---

## Usage

```yaml
- uses: daohuy/vue-doctor-action@v1
```

---

## Inputs

```yaml
with:
  path: src
  fail-on: error
  reporter: github
```

---

## Internal Behaviour

Execute:

```bash
npx vue-doctor check
```

with provided options.

---

## Done Criteria

Action published.

Action tested.

README includes usage examples.

---

# Definition of Done

Phase 4 is complete when:

- Severity system exists
- Categories exist
- Exit codes exist
- Fail-on severity exists
- JSON reporter stable
- Changed files mode exists
- GitHub annotation reporter exists
- Official GitHub Action published

No new rules should be added during Phase 4.