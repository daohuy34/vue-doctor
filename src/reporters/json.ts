import type { Issue } from '../types/issue'

function normalizeColumn(column?: number) {
    if (column === undefined) {
        return 1
    }

    return column === 0 ? 1 : column
}

export function jsonReporter(issues: Issue[]) {
    const payload = {
        version: 2,
        summary: {
            total: issues.length,
            warnings: issues.filter((issue) => issue.severity === 'warning').length,
            errors: issues.filter(
                (issue) =>
                    issue.severity === 'error' || issue.severity === 'critical',
            ).length,
        },
        issues: issues.map((issue) => ({
            file: issue.file,
            rule: issue.rule,
            severity: issue.severity,
            category: issue.category ?? '',
            message: issue.message,
            line: issue.line ?? 1,
            column: normalizeColumn(issue.column),
        })),
    }

    console.log(JSON.stringify(payload, null, 2))
}