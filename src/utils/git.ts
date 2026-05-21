import { execSync } from 'node:child_process'

export function getChangedFiles() {
  try {
    // GitHub Actions / CI safe
    const output = execSync(
      'git diff --name-only origin/main...HEAD',
      { encoding: 'utf-8' }
    )

    return parseFiles(output)
  } catch (e) {
    // fallback for shallow clone / no base
    const output = execSync(
      'git diff --name-only HEAD',
      { encoding: 'utf-8' }
    )

    return parseFiles(output)
  }
}

function parseFiles(output: string) {
  return output
    .split('\n')
    .map(f => f.trim())
    .filter(Boolean)
    .filter(f =>
      f.endsWith('.vue') ||
      f.endsWith('.ts') ||
      f.endsWith('.js')
    )
}