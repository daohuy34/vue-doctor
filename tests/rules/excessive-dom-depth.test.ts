import { describe, it, expect } from 'vitest';
import { excessiveDomDepthRule } from '../../src/rules/vue/excessive-dom-depth.rule';
import { createContext } from '../helpers';

describe('excessive-dom-depth', () => {
    it('detects templates whose DOM depth exceeds the threshold', async () => {
        const deepMarkup = '<div>'.repeat(7) + 'deep' + '</div>'.repeat(7);

        const ctx = createContext(`
<template>
${deepMarkup}
</template>
`);

        const issues = await excessiveDomDepthRule.check(ctx);

        expect(issues).toHaveLength(1);
        expect(issues[0].rule).toBe('excessive-dom-depth');
    });

    it('passes when the DOM depth stays within the threshold', async () => {
        const ctx = createContext(`
<template>
<div>
  <div>
    <div>
      <div>
        <div>
          <div></div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>
`);

        const issues = await excessiveDomDepthRule.check(ctx);

        expect(issues).toHaveLength(0);
    });
});
