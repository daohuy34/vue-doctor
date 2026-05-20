import chalk from 'chalk'

import type { Issue } from '../types/issue'

export function stylishReporter(issues: Issue[]) {
  if (!issues.length) {
    console.log(chalk.green('✔ No issues found'))

    return
  }

  console.log('')

  for (const issue of issues) {
    const severityColor =
      issue.severity === 'error'
        ? chalk.red
        : issue.severity === 'warning'
          ? chalk.yellow
          : chalk.blue

    console.log(severityColor(`⚠ ${issue.rule}`))

    console.log(chalk.gray(issue.file))

    console.log(issue.message)

    if (issue.suggestion) {
      console.log(chalk.cyan(`Suggestion: ${issue.suggestion}`))
    }

    console.log('')
  }
}