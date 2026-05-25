import { describe, it, expect } from 'vitest';
import { excessiveReactiveStateRule } from '../../src/rules/vue/excessive-reactive-state.rule';
import { createContext } from '../helpers';

describe('excessive-reactive-state', () => {
    it('detects too many reactive declarations', async () => {
        const refs = Array.from({ length: 26 }, (_, index) => `const item${index} = ref(${index});`).join('\n');

        const ctx = createContext(`
<script setup>
${refs}
</script>
`);

        const issues = await excessiveReactiveStateRule.check(ctx);

        expect(issues).toHaveLength(1);
        expect(issues[0].rule).toBe('excessive-reactive-state');
    });

    it('passes when reactive state stays within the threshold', async () => {
        const ctx = createContext(`
<script setup>
const user = reactive({ name: 'Ada' });
const count = ref(1);
</script>
`);

        const issues = await excessiveReactiveStateRule.check(ctx);

        expect(issues).toHaveLength(0);
    });
});
