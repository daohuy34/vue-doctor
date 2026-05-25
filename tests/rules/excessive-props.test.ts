import { describe, it, expect } from 'vitest';
import { excessivePropsRule } from '../../src/rules/vue/excessive-props.rule';
import { createContext } from '../helpers';

describe('excessive-props', () => {
    it('detects components with too many props', async () => {
        const props = Array.from({ length: 16 }, (_, index) => `p${index}: String`).join(', ');
        const ctx = createContext(`
<script setup>
defineProps({ ${props} })
</script>
`);

        const issues = await excessivePropsRule.check(ctx);

        expect(issues).toHaveLength(1);
        expect(issues[0].rule).toBe('excessive-props');
        expect(issues[0].message).toContain('16');
    });

    it('passes when prop count is within the threshold', async () => {
        const props = Array.from({ length: 15 }, (_, index) => `p${index}: String`).join(', ');
        const ctx = createContext(`
<script setup>
defineProps({ ${props} })
</script>
`);

        const issues = await excessivePropsRule.check(ctx);

        expect(issues).toHaveLength(0);
    });
});
