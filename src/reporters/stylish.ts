import type { Issue } from '../types/issue'

export function stylishReporter(issues: Issue[]) {
  if (!issues.length) {
    console.log('✔ No issues found')
    return
  }

  const grouped = new Map<string, Issue[]>()

  for (const issue of issues) {
    const file = issue.file

    if (!grouped.has(file)) {
      grouped.set(file, [])
    }

    grouped.get(file)!.push(issue)
  }

  for (const [file, fileIssues] of grouped) {
    console.log('\n' + file)

    for (const issue of fileIssues) {
      const icon =
        issue.severity === 'error' ? '✖' : '⚠'

      console.log(
        `  ${icon} ${issue.rule}`
      )

      console.log(
        `    ${issue.message}`
      )
    }
  }

  const warnings = issues.filter(i => i.severity === 'warning').length
  const errors = issues.filter(i => i.severity === 'error').length

  console.log('\nSummary:')
  console.log(`Warnings: ${warnings}`)
  console.log(`Errors: ${errors}`)
}