import chalk from 'chalk';

import type { Issue } from '../types/issue';

export function stylishReporter(issues: Issue[]) {
    if (!issues.length) {
        console.log(chalk.green('✔ No issues found'));

        return;
    }

    console.log('');

    for (const issue of issues) {
        const location =
            issue.line != null
                ? `${issue.file}:${issue.line}:${issue.column}`
                : issue.file;

        const severityColor =
            issue.severity === 'error'
                ? chalk.red
                : issue.severity === 'warning'
                  ? chalk.yellow
                  : chalk.blue;

        console.log(severityColor(`⚠ ${issue.rule}`));

        console.log(chalk.gray(location));
        console.log(issue.message);

        if (issue.suggestion) {
            console.log(chalk.cyan(`Suggestion: ${issue.suggestion}`));
        }

        console.log('');

        const warnings = issues.filter((i) => i.severity === 'warning').length;

        const errors = issues.filter((i) => i.severity === 'error').length;

        console.log(chalk.yellow(`Warnings: ${warnings}`));

        console.log(chalk.red(`Errors: ${errors}`));
    }
}
