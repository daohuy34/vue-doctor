import type { Issue } from '../types/issue'

export function githubReporter(issues: Issue[]) {
  const grouped = new Map<string, Issue[]>()

  for (const issue of issues) {
    if (!grouped.has(issue.file)) {
      grouped.set(issue.file, [])
    }
    grouped.get(issue.file)!.push(issue)
  }

  for (const [file, fileIssues] of grouped) {
    for (const issue of fileIssues) {
      const level =
        issue.severity === 'error' ? 'error' : 'warning'

      console.log(
        `::${level} file=${file},line=${issue.line ?? 1},col=${issue.column ?? 1}::${issue.message}`
      )
    }
  }
}