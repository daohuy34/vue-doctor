import { describe, it, expect } from 'vitest';
import { excessiveVForNestingRule } from '../../src/rules/vue/excessive-v-for-nesting.rule';
import { createContext } from '../helpers';

describe('excessive-v-for-nesting', () => {
    it('detects nested v-for loops beyond the threshold', async () => {
        const ctx = createContext(`
<template>
<div v-for="a in items">
  <div v-for="b in items">
    <div v-for="c in items">
      <div v-for="d in items"></div>
    </div>
  </div>
</div>
</template>
`);

        const issues = await excessiveVForNestingRule.check(ctx);

        expect(issues).toHaveLength(1);
        expect(issues[0].rule).toBe('excessive-v-for-nesting');
    });

    it('passes when nesting stays within the threshold', async () => {
        const ctx = createContext(`
<template>
<div v-for="a in items">
  <div v-for="b in items">
    <div v-for="c in items"></div>
  </div>
</div>
</template>
`);

        const issues = await excessiveVForNestingRule.check(ctx);

        expect(issues).toHaveLength(0);
    });
});
