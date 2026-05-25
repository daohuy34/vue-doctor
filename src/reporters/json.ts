import type { Issue } from '../types/issue'

export function jsonReporter(issues: Issue[]) {
    const payload = issues.map((issue) => ({
        file: issue.file,
        rule: issue.rule,
        severity: issue.severity,
        category: issue.category ?? '',
        message: issue.message,
        line: issue.line ?? 0,
    }))

    console.log(JSON.stringify(payload, null, 2))
}