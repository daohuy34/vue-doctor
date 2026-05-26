import { describe, expect, it, vi } from 'vitest';

import { stylishReporter } from '../../src/reporters/stylish';

describe('stylishReporter', () => {
    it('prints line and column for each issue', () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

        stylishReporter([
            {
                rule: 'no-console',
                severity: 'warning',
                category: 'vue',
                file: 'src/App.vue',
                line: 6,
                column: 8,
                message: 'console usage detected.',
            },
        ]);

        const output = log.mock.calls.map((call) => call[0]).join('\n');

        expect(output).toContain('src/App.vue');
        expect(output).toContain('6:8');
        expect(output).toContain('console usage detected.');

        log.mockRestore();
    });
});
