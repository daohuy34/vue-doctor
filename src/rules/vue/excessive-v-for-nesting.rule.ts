import { getRuleOption } from '../../utils/rule-options';
import type { Rule } from '../../types/rule';

function maxForNesting(node: any): number {
    if (!node) {
        return 0;
    }

    if (node.type === 11) {
        let maxChildDepth = 0;

        if (Array.isArray(node.children)) {
            for (const child of node.children) {
                maxChildDepth = Math.max(maxChildDepth, maxForNesting(child));
            }
        }

        return 1 + maxChildDepth;
    }

    let maxDepth = 0;

    if (Array.isArray(node.children)) {
        for (const child of node.children) {
            maxDepth = Math.max(maxDepth, maxForNesting(child));
        }
    }

    if (Array.isArray(node.branches)) {
        for (const branch of node.branches) {
            maxDepth = Math.max(maxDepth, maxForNesting(branch));
        }
    }

    return maxDepth;
}

export const excessiveVForNestingRule: Rule = {
    name: 'excessive-v-for-nesting',

    meta: {
        severity: 'warning',
        category: 'Maintainability',
        description: 'Warn when templates contain too many nested v-for loops.',
        recommended: true,
    },

    async check(context) {
        const template = context.descriptor.template;

        if (!template?.ast) {
            return [];
        }

        const maxNesting = getRuleOption(
            context,
            'excessive-v-for-nesting',
            'maxNesting',
            3,
        );

        const nesting = maxForNesting(template.ast);

        if (nesting <= maxNesting) {
            return [];
        }

        return [
            {
                rule: 'excessive-v-for-nesting',
                severity: 'warning',
                file: context.filePath,
                message: 'Nested v-for detected.',
                suggestion:
                    'Flatten nested loops or render a smaller subset in child components.',
            },
        ];
    },
};
