import { describe, it, expect } from 'vitest';
import { noConsoleRule } from '../../src/rules/vue/no-console.rule';
import { createContext } from '../helpers';

describe('no-console', () => {
    it('detects console.log', async () => {
        const ctx = createContext(`
<script setup>
console.log('hello');
</script>
`);
        const issues = await noConsoleRule.check(ctx);
        expect(issues).toHaveLength(1);
        expect(issues[0].rule).toBe('no-console');
        expect(issues[0].message).toContain('console usage');
    });

    it('detects console.warn and console.error', async () => {
        const ctx = createContext(`
<script setup>
console.warn('warning');
console.error('error');
</script>
`);
        const issues = await noConsoleRule.check(ctx);
        expect(issues).toHaveLength(2);
    });

    it('detects console in Options API', async () => {
        const ctx = createContext(`
<script>
export default {
    mounted() {
        console.log('mounted');
    }
}
</script>
`);
        const issues = await noConsoleRule.check(ctx);
        expect(issues).toHaveLength(1);
    });

    it('passes when no console usage', async () => {
        const ctx = createContext(`
<script setup>
const msg = 'hello';
</script>
`);
        const issues = await noConsoleRule.check(ctx);
        expect(issues).toHaveLength(0);
    });

    it('passes when no script block', async () => {
        const ctx = createContext(`
<template>
  <div>hello</div>
</template>
`);
        const issues = await noConsoleRule.check(ctx);
        expect(issues).toHaveLength(0);
    });

    it('maps console locations to full-file line numbers', async () => {
        const ctx = createContext(`
<script setup>
console.log('hello');
</script>
`);
        const issues = await noConsoleRule.check(ctx);

        expect(issues).toHaveLength(1);
        expect(issues[0].line).toBe(2);
    });
});
