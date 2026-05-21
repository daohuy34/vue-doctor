import type { Issue } from '../types/issue'

export function githubReporter(
  issues: Issue[]
) {
  for (const issue of issues) {
    const level =
      issue.severity === 'error'
        ? 'error'
        : 'warning'

    const line = issue.line ?? 1
    const column = issue.column ?? 1

    console.log(
      `::${level} file=${issue.file},line=${line},col=${column}::${issue.message}`
    )
  }
}