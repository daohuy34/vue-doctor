import { describe, it, expect } from 'vitest';
import { noWindowInSsrRule } from '../../src/rules/nuxt/no-window-in-ssr.rule';
import { createContext } from '../helpers';

describe('no-window-in-ssr', () => {
    it('detects window usage', async () => {
        const ctx = createContext(`
<script setup>
const href = window.location.href;
</script>
`);

        const issues = await noWindowInSsrRule.check(ctx);

        expect(issues).toHaveLength(1);
        expect(issues[0].rule).toBe('no-window-in-ssr');
    });

    it('ignores document and localStorage usage', async () => {
        const ctx = createContext(`
<script setup>
const node = document.querySelector('#app');
const theme = localStorage.getItem('theme');
</script>
`);

        const issues = await noWindowInSsrRule.check(ctx);

        expect(issues).toHaveLength(0);
    });
});
