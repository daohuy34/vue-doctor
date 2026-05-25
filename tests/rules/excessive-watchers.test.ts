import { describe, it, expect } from 'vitest';
import { excessiveWatchersRule } from '../../src/rules/vue/excessive-watchers.rule';
import { createContext } from '../helpers';

describe('excessive-watchers', () => {
    it('detects components with excessive watcher usage', async () => {
        const watchers = Array.from({ length: 11 }, () => 'watchEffect(() => {})').join('\n');
        const ctx = createContext(`
<script setup>
${watchers}
</script>
`);

        const issues = await excessiveWatchersRule.check(ctx);

        expect(issues).toHaveLength(1);
        expect(issues[0].rule).toBe('excessive-watchers');
        expect(issues[0].message).toContain('11');
    });

    it('passes when watcher count is within the threshold', async () => {
        const watchers = Array.from({ length: 10 }, () => 'watchEffect(() => {})').join('\n');
        const ctx = createContext(`
<script setup>
${watchers}
</script>
`);

        const issues = await excessiveWatchersRule.check(ctx);

        expect(issues).toHaveLength(0);
    });
});
