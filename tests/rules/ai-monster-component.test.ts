import { describe, it, expect } from 'vitest';
import { aiMonsterComponentRule } from '../../src/rules/vue/ai-monster-component.rule';
import { createContext } from '../helpers';

describe('ai-monster-component', () => {
    it('detects an excessively complex component', async () => {
        const ctx = createContext(`
<script>
export default {
  props: {
    a: String,
    b: String,
    c: String,
    d: String,
  },
  data() {
    return {
      stateA: 1,
      stateB: 2,
    };
  },
  computed: {
    one() { return this.a; },
    two() { return this.b; },
    three() { return this.c; },
  },
  watch: {
    a() {},
    b() {},
    c() {},
  },
  methods: {
    first() {},
    second() {},
  },
};
</script>
<template>
  <div></div>
</template>
`);

        const issues = await aiMonsterComponentRule.check(ctx);

        expect(issues).toHaveLength(1);
        expect(issues[0].rule).toBe('ai-monster-component');
    });

    it('passes for a simple component', async () => {
        const ctx = createContext(`
<script setup>
const title = ref('hello');
</script>
<template>
  <div>{{ title }}</div>
</template>
`);

        const issues = await aiMonsterComponentRule.check(ctx);

        expect(issues).toHaveLength(0);
    });
});
