import type { VueDoctorConfig } from '../types/config';
import type { Severity } from '../types/issue';

export const severityRank: Record<Severity, number> = {
    info: 0,
    warning: 1,
    error: 2,
    critical: 3,
};

export function resolveFailOn(
    config: VueDoctorConfig,
    cliFailOn?: Severity,
): Severity | undefined {
    if (cliFailOn) {
        return cliFailOn;
    }

    if (config.failOn) {
        return config.failOn;
    }

    if (config.failOnWarning === false) {
        return undefined;
    }

    return 'warning';
}

export function shouldFail(
    issues: Array<{ severity: Severity }>,
    failOn?: Severity,
): boolean {
    if (!failOn) {
        return false;
    }

    return issues.some(
        (issue) => severityRank[issue.severity] >= severityRank[failOn],
    );
}

export function getFailureExitCode(
    issues: Array<{ severity: Severity }>,
    failOn?: Severity,
): 0 | 1 | 2 {
    if (!issues.length) {
        return 0;
    }

    if (!failOn) {
        return issues.some(
            (issue) => issue.severity === 'error' || issue.severity === 'critical',
        )
            ? 2
            : 0;
    }

    const failingIssues = issues.filter(
        (issue) => severityRank[issue.severity] >= severityRank[failOn],
    );

    if (!failingIssues.length) {
        return 0;
    }

    return failingIssues.some(
        (issue) => issue.severity === 'error' || issue.severity === 'critical',
    )
        ? 2
        : 1;
}
