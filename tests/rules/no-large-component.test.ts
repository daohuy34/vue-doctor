import { describe, it, expect } from 'vitest';
import { noLargeComponentRule } from '../../src/rules/vue/no-large-component.rule';
import { createContext } from '../helpers';

describe('no-large-component', () => {
    it('detects component exceeding 500 lines', async () => {
        const lines = Array(501).fill('<div>line</div>').join('\n');
        const source = `<template>\n${lines}\n</template>`;
        const ctx = createContext(source);
        const issues = await noLargeComponentRule.check(ctx);
        expect(issues).toHaveLength(1);
        expect(issues[0].rule).toBe('no-large-component');
        expect(issues[0].message).toContain('exceeds');
    });

    it('passes component under 500 lines', async () => {
        const ctx = createContext(`
<template>
  <div>small component</div>
</template>
<script setup>
const msg = 'hello';
</script>
`);
        const issues = await noLargeComponentRule.check(ctx);
        expect(issues).toHaveLength(0);
    });

    it('passes component at exactly 499 lines', async () => {
        const lines = Array(495).fill('// line').join('\n');
        const source = `<script setup>\n${lines}\n</script>`;
        const ctx = createContext(source);
        const issues = await noLargeComponentRule.check(ctx);
        expect(issues).toHaveLength(0);
    });
});
