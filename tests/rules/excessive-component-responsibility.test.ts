import { describe, it, expect } from 'vitest';
import { excessiveComponentResponsibilityRule } from '../../src/rules/vue/excessive-component-responsibility.rule';
import { createContext } from '../helpers';

function buildTemplate(count: number): string {
    const items = Array.from({ length: count }, (_, index) => `<div class="item-${index}"></div>`).join('\n');

    return `<template>\n${items}\n</template>`;
}

describe('excessive-component-responsibility', () => {
    it('detects components with too many responsibilities', async () => {
        const ctx = createContext(`
<script>
export default {
  props: {
    a: String,
    b: String,
    c: String,
  },
  watch: {
    a() {},
    b() {},
  },
  methods: {
    first() {},
    second() {},
    third() {},
    fourth() {},
    fifth() {},
  },
};
</script>
${buildTemplate(60)}
`);

        const issues = await excessiveComponentResponsibilityRule.check(ctx);

        expect(issues).toHaveLength(1);
        expect(issues[0].rule).toBe('excessive-component-responsibility');
    });

    it('passes for a focused component', async () => {
        const ctx = createContext(`
<script>
export default {
  props: {
    title: String,
  },
  watch: {
    title() {},
  },
  methods: {
    save() {},
  },
};
</script>
${buildTemplate(10)}
`);

        const issues = await excessiveComponentResponsibilityRule.check(ctx);

        expect(issues).toHaveLength(0);
    });
});
