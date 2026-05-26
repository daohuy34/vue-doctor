import { describe, expect, it, vi } from 'vitest';

import { jsonReporter } from '../../src/reporters/json';

describe('jsonReporter', () => {
    it('prints a versioned payload with line and column metadata', () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

        jsonReporter([
            {
                rule: 'no-console',
                severity: 'warning',
                category: 'vue',
                file: 'src/App.vue',
                line: 12,
                column: 4,
                message: 'console usage detected.',
            },
        ]);

        expect(log).toHaveBeenCalledTimes(1);
        const payload = JSON.parse(log.mock.calls[0][0] as string);

        expect(payload.version).toBe(2);
        expect(payload.issues[0]).toEqual({
            file: 'src/App.vue',
            rule: 'no-console',
            severity: 'warning',
            category: 'vue',
            message: 'console usage detected.',
            line: 12,
            column: 4,
        });

        log.mockRestore();
    });
});
