import { getRuleOption } from '../../utils/rule-options';
import type { Rule } from '../../types/rule';

function countReactiveCalls(source: string): number {
    const matches = source.match(/\b(ref|reactive)\s*\(/g);

    return matches ? matches.length : 0;
}

export const excessiveReactiveStateRule: Rule = {
    name: 'excessive-reactive-state',

    meta: {
        severity: 'warning',
        category: 'AI',
        description: 'Warn when a component declares too much reactive state.',
        recommended: true,
    },

    async check(context) {
        const maxReactive = getRuleOption(
            context,
            'excessive-reactive-state',
            'maxReactive',
            25,
        );

        const reactiveCount = countReactiveCalls(context.source);

        if (reactiveCount <= maxReactive) {
            return [];
        }

        return [
            {
                rule: 'excessive-reactive-state',
                severity: 'warning',
                file: context.filePath,
                message: `Too much reactive state in a single component (${reactiveCount} > ${maxReactive}).`,
                suggestion:
                    'Extract shared reactive state into composables or split the component into smaller pieces.',
            },
        ];
    },
};
