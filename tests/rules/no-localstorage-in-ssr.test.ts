import { describe, it, expect } from 'vitest';
import { noLocalStorageInSsrRule } from '../../src/rules/nuxt/no-localstorage-in-ssr.rule';
import { createContext } from '../helpers';

describe('no-localstorage-in-ssr', () => {
    it('detects localStorage usage', async () => {
        const ctx = createContext(`
<script setup>
const theme = localStorage.getItem('theme');
</script>
`);

        const issues = await noLocalStorageInSsrRule.check(ctx);

        expect(issues).toHaveLength(1);
        expect(issues[0].rule).toBe('no-localstorage-in-ssr');
    });

    it('passes when localStorage is not used', async () => {
        const ctx = createContext(`
<script setup>
const theme = 'dark';
</script>
`);

        const issues = await noLocalStorageInSsrRule.check(ctx);

        expect(issues).toHaveLength(0);
    });
});
