import { describe, it, expect } from 'vitest';
import { noDocumentInSsrRule } from '../../src/rules/nuxt/no-document-in-ssr.rule';
import { createContext } from '../helpers';

describe('no-document-in-ssr', () => {
    it('detects document usage', async () => {
        const ctx = createContext(`
<script setup>
const node = document.querySelector('#app');
</script>
`);

        const issues = await noDocumentInSsrRule.check(ctx);

        expect(issues).toHaveLength(1);
        expect(issues[0].rule).toBe('no-document-in-ssr');
    });

    it('passes when document is not used', async () => {
        const ctx = createContext(`
<script setup>
const title = 'hello';
</script>
`);

        const issues = await noDocumentInSsrRule.check(ctx);

        expect(issues).toHaveLength(0);
    });
});
