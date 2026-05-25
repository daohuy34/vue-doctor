import { describe, it, expect } from 'vitest';
import { noSessionStorageInSsrRule } from '../../src/rules/nuxt/no-sessionstorage-in-ssr.rule';
import { createContext } from '../helpers';

describe('no-sessionstorage-in-ssr', () => {
    it('detects sessionStorage usage', async () => {
        const ctx = createContext(`
<script setup>
const token = sessionStorage.getItem('token');
</script>
`);

        const issues = await noSessionStorageInSsrRule.check(ctx);

        expect(issues).toHaveLength(1);
        expect(issues[0].rule).toBe('no-sessionstorage-in-ssr');
    });

    it('passes when sessionStorage is not used', async () => {
        const ctx = createContext(`
<script setup>
const token = 'abc';
</script>
`);

        const issues = await noSessionStorageInSsrRule.check(ctx);

        expect(issues).toHaveLength(0);
    });
});
