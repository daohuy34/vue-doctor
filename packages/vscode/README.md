# Vue Doctor VS Code Extension

Vue Doctor integration for VS Code.

## Features

- Real-time diagnostics for Vue/Nuxt files
- Inline error/warning highlighting
- Quick fix actions
- Status bar showing project health
- Command palette integration

## Installation

```bash
cd packages/vscode
npm install
npm run compile
code --install-extension out/vue-doctor.vsix
```

## Development

```bash
# Watch mode
npm run watch

# Run tests
npm test
```

## Commands

- `Vue Doctor: Run Analysis` - Run analysis on all files
- `Vue Doctor: Show Dashboard` - Open the web dashboard
- `Vue Doctor: Show Metrics` - Show architecture metrics
- `Vue Doctor: Fix Issues` - Apply auto-fixes

## Configuration

```json
{
  "vueDoctor.enable": true,
  "vueDoctor.profile": "recommended",
  "vueDoctor.autoFix": false,
  "vueDoctor.runOnSave": true,
  "vueDoctor.failOn": "error"
}
```
