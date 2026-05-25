import { describe, it, expect } from 'vitest';
import { noDebuggerRule } from '../../src/rules/vue/no-debugger.rule';
import { createContext } from '../helpers';

describe('no-debugger', () => {
    it('detects debugger statements', async () => {
        const ctx = createContext(`
<script setup>
const value = 1;
debugger;
</script>
`);

        const issues = await noDebuggerRule.check(ctx);

        expect(issues).toHaveLength(1);
        expect(issues[0].rule).toBe('no-debugger');
        expect(issues[0].message).toBe('Unexpected debugger statement.');
    });

    it('passes when no debugger is present', async () => {
        const ctx = createContext(`
<script setup>
const value = 1;
</script>
`);

        const issues = await noDebuggerRule.check(ctx);

        expect(issues).toHaveLength(0);
    });
});
