import { describe, it, expect } from 'vitest';
import { excessiveComputedPropertiesRule } from '../../src/rules/vue/excessive-computed-properties.rule';
import { createContext } from '../helpers';

describe('excessive-computed-properties', () => {
    it('detects components with excessive computed properties', async () => {
        const computed = Array.from({ length: 21 }, (_, index) => `c${index}() { return ${index}; }`).join(', ');
        const ctx = createContext(`
<script>
export default {
  computed: {
    ${computed}
  }
}
</script>
`);

        const issues = await excessiveComputedPropertiesRule.check(ctx);

        expect(issues).toHaveLength(1);
        expect(issues[0].rule).toBe('excessive-computed-properties');
        expect(issues[0].message).toContain('21');
    });

    it('passes when computed properties are within the threshold', async () => {
        const computed = Array.from({ length: 20 }, (_, index) => `c${index}() { return ${index}; }`).join(', ');
        const ctx = createContext(`
<script>
export default {
  computed: {
    ${computed}
  }
}
</script>
`);

        const issues = await excessiveComputedPropertiesRule.check(ctx);

        expect(issues).toHaveLength(0);
    });
});
