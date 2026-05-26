import { describe, expect, it } from 'vitest';

import { getFailureExitCode, shouldFail } from '../../src/cli/check-utils';

describe('check-utils', () => {
    it('fails warnings when threshold is warning', () => {
        expect(
            shouldFail(
                [
                    { rule: 'no-console', severity: 'warning', file: 'src/App.vue' },
                ],
                'warning',
            ),
        ).toBe(true);
    });

    it('does not fail warnings when threshold is error', () => {
        expect(
            shouldFail(
                [
                    { rule: 'no-console', severity: 'warning', file: 'src/App.vue' },
                ],
                'error',
            ),
        ).toBe(false);
    });

    it('returns exit code 2 for error-level failures', () => {
        expect(
            getFailureExitCode(
                [
                    { rule: 'no-console', severity: 'error', file: 'src/App.vue' },
                ],
                'warning',
            ),
        ).toBe(2);
    });

    it('returns exit code 0 when issues are below threshold', () => {
        expect(
            getFailureExitCode(
                [
                    { rule: 'no-console', severity: 'warning', file: 'src/App.vue' },
                ],
                'error',
            ),
        ).toBe(0);
    });
});
