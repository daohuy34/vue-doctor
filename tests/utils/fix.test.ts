import { describe, expect, it } from 'vitest';

import { applyFixes, createLineRemovalFix, isSafeConsoleStatement } from '../../src/utils/fix';

describe('fix helpers', () => {
    it('removes a targeted line and preserves surrounding content', () => {
        const source = 'const first = 1;\nconsole.log("hi");\nconst second = 2;\n';

        const fix = createLineRemovalFix(source, 2);

        expect(fix).not.toBeNull();

        const next = applyFixes(source, fix!.replacements);

        expect(next).toBe('const first = 1;\nconst second = 2;\n');
    });

    it('treats direct console calls as safe autofix candidates', () => {
        const source = 'console.log("hi");\n';

        expect(isSafeConsoleStatement(source, 1)).toBe(true);
    });

    it('treats assignments involving console as unsafe autofix candidates', () => {
        const source = 'const value = console.log("hi");\n';

        expect(isSafeConsoleStatement(source, 1)).toBe(false);
    });
});
