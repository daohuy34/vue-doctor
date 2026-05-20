import type { Issue } from '../types/issue';

export function githubReporter(issues: Issue[]) {
    for (const issue of issues) {
        const level = issue.severity === 'error' ? 'error' : 'warning';

        console.log(
            `::${level} file=${issue.file},line=${issue.line},col=${issue.column}::${issue.message}`,
        );
    }
}
