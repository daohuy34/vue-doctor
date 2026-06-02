# GitHub Action for Vue Doctor

Example workflow for integrating Vue Doctor into your CI/CD pipeline.

## Basic Usage

Create `.github/workflows/vue-doctor.yml`:

```yaml
name: Vue Doctor

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  vue-doctor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run Vue Doctor
        run: npx vue-doctor check --reporter stylish

      - name: Upload SARIF results
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: results.sarif
          category: vue-doctor
```

## With SARIF Upload

Upload results to GitHub Security tab:

```yaml
name: Vue Doctor SARIF

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
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run Vue Doctor SARIF
        run: npx vue-doctor check --reporter sarif --output results.sarif

      - name: Upload SARIF to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif
          category: vue-doctor/${{ github.sha }}

      - name: Fail on errors
        if: ${{ runner.os == 'Linux' }}
        run: |
          if [ -f results.sarif ]; then
            errors=$(cat results.sarif | jq '[.runs[0].results[] | select(.level == "error")] | length')
            if [ "$errors" -gt "0" ]; then
              echo "Found $errors errors in Vue Doctor analysis"
              exit 1
            fi
          fi
```

## With Baseline

For gradual adoption:

```yaml
name: Vue Doctor Baseline

on:
  push:
    branches: [main]

jobs:
  vue-doctor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate baseline
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        run: npx vue-doctor baseline

      - name: Check with baseline
        run: npx vue-doctor check --reporter stylish
```

## Configuration

Add to `package.json`:

```json
{
  "vueDoctor": {
    "reporter": "sarif",
    "failOn": "error",
    "include": ["src/**/*.vue", "src/**/*.ts"],
    "exclude": ["src/**/*.spec.ts", "src/**/*.test.ts"]
  }
}
```

## Outputs

| Output | Description |
|--------|-------------|
| `results.sarif` | SARIF format for GitHub Security |
| Exit code | 0 = success, 1 = issues found |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GITHUB_ACTIONS` | Running in GitHub Actions |
| `GITHUB_SHA` | Current commit SHA |
| `GITHUB_REF` | Git ref |
| `GITHUB_RUN_ID` | Run ID |
| `GITHUB_REPOSITORY` | Repository name |
