import { describe, it, expect } from 'vitest';
import { noLargeTemplateRule } from '../../src/rules/vue/no-large-template.rule';
import { createContext } from '../helpers';

describe('no-large-template', () => {
    it('detects templates with too many HTML nodes', async () => {
        const nodes = Array.from({ length: 301 }, () => '<div></div>').join('\n');
        const ctx = createContext(`
<template>
${nodes}
</template>
`);

        const issues = await noLargeTemplateRule.check(ctx);

        expect(issues).toHaveLength(1);
        expect(issues[0].rule).toBe('no-large-template');
    });

    it('passes when template is within the threshold', async () => {
        const ctx = createContext(`
<template>
<div>small</div>
</template>
`);

        const issues = await noLargeTemplateRule.check(ctx);

        expect(issues).toHaveLength(0);
    });
});
