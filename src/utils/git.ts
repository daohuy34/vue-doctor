import { execSync } from 'node:child_process'

export function getChangedFiles() {
  const output = execSync(
    'git diff --name-only HEAD~1',
    {
      encoding: 'utf-8'
    }
  )

  return output
    .split('\n')
    .map((file) => file.trim())
    .filter(Boolean)
    .filter((file) => {
      return (
        file.endsWith('.vue') ||
        file.endsWith('.ts') ||
        file.endsWith('.js')
      )
    })
}