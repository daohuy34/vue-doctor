import chalk from 'chalk'

import type { Issue } from '../types/issue'

export function stylishReporter(
  issues: Issue[]
) {
  if (!issues.length) {
    console.log(
      chalk.green('✔ No issues found')
    )

    return
  }

  for (const issue of issues) {
    const icon =
      issue.severity === 'error'
        ? chalk.red('✖')
        : chalk.yellow('⚠')

    const location =
      issue.line != null
        ? `${issue.file}:${issue.line}:${issue.column}`
        : issue.file

    console.log(
      `${icon} ${issue.rule}`
    )

    console.log(
      chalk.gray(location)
    )

    console.log(issue.message)

    if (issue.suggestion) {
      console.log(
        chalk.gray(
          `Suggestion: ${issue.suggestion}`
        )
      )
    }

    console.log()
  }

  const warnings = issues.filter(
    (i) => i.severity === 'warning'
  ).length

  const errors = issues.filter(
    (i) => i.severity === 'error'
  ).length

  console.log(
    chalk.yellow(
      `Warnings: ${warnings}`
    )
  )

  console.log(
    chalk.red(
      `Errors: ${errors}`
    )
  )
}