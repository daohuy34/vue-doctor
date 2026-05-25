import { describe, it, expect } from 'vitest';
import { noEmptyCatchRule } from '../../src/rules/vue/no-empty-catch.rule';
import { createContext } from '../helpers';

describe('no-empty-catch', () => {
    it('detects empty catch blocks', async () => {
        const ctx = createContext(`
<script setup>
try {
    doSomething();
} catch (error) {
}
</script>
`);

        const issues = await noEmptyCatchRule.check(ctx);

        expect(issues).toHaveLength(1);
        expect(issues[0].rule).toBe('no-empty-catch');
        expect(issues[0].message).toBe('Empty catch block detected.');
    });

    it('passes when catch handles the error', async () => {
        const ctx = createContext(`
<script setup>
try {
    doSomething();
} catch (error) {
    console.error(error);
}
</script>
`);

        const issues = await noEmptyCatchRule.check(ctx);

        expect(issues).toHaveLength(0);
    });
});
