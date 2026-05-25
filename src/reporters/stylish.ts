import type { Issue } from '../types/issue';

export function stylishReporter(issues: Issue[]) {
    if (!issues.length) {
        console.log('✔ No issues found');

        return;
    }

    const groupedByFile = new Map<string, Issue[]>();

    for (const issue of issues) {
        if (!groupedByFile.has(issue.file)) {
            groupedByFile.set(issue.file, []);
        }

        groupedByFile.get(issue.file)!.push(issue);
    }

    for (const [file, fileIssues] of groupedByFile) {
        console.log(`\n${file}`);

        const groupedByRule = new Map<string, Issue[]>();

        for (const issue of fileIssues) {
            if (!groupedByRule.has(issue.rule)) {
                groupedByRule.set(issue.rule, []);
            }

            groupedByRule.get(issue.rule)!.push(issue);
        }

        for (const [rule, items] of groupedByRule) {
            const first = items[0];

            const icon =
                first.severity === 'critical' || first.severity === 'error'
                    ? '✖'
                    : '⚠';

            const count = items.length;

            console.log(`  ${icon} ${rule} (${count} occurrences)`);

            for (const item of items) {
                const line = item.line ?? 1;
                const column = item.column ?? 1;

                console.log(`     ${item.message}:${line}:${column}`);
            }
        }
    }

    const warnings = issues.filter((i) => i.severity === 'warning').length;

    const errors = issues.filter(
        (i) => i.severity === 'error' || i.severity === 'critical',
    ).length;

    console.log('\nSummary:');

    console.log(`Warnings: ${warnings}`);

    console.log(`Errors: ${errors}`);
}
