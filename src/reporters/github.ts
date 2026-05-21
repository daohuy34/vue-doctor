import type { Issue } from '../types/issue'

export function githubReporter(issues: Issue[]) {
  for (const issue of issues) {
    const level =
      issue.severity === 'error'
        ? 'error'
        : 'warning'

    const file = issue.file
    const line = issue.line ?? 1
    const col = issue.column ?? 1

    // format 1: GitHub annotation (CI correct)
    console.log(
      `::${level} file=${file},line=${line},col=${col}::${issue.message}`
    )

    // optional debug readable format (LOCAL only)
    console.log(
      `${file}:${line}:${col} - ${issue.message}`
    )
  }
}