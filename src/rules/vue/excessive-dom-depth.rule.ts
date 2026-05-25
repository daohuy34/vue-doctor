import { getRuleOption } from '../../utils/rule-options';
import type { Rule } from '../../types/rule';

function maxDomDepth(node: any, currentDepth = 0): number {
    if (!node) {
        return currentDepth;
    }

    const nextDepth = node.type === 1 ? currentDepth + 1 : currentDepth;
    let maxDepth = nextDepth;

    if (Array.isArray(node.children)) {
        for (const child of node.children) {
            maxDepth = Math.max(maxDepth, maxDomDepth(child, nextDepth));
        }
    }

    if (Array.isArray(node.branches)) {
        for (const branch of node.branches) {
            maxDepth = Math.max(maxDepth, maxDomDepth(branch, nextDepth));
        }
    }

    return maxDepth;
}

export const excessiveDomDepthRule: Rule = {
    name: 'excessive-dom-depth',

    meta: {
        severity: 'warning',
        category: 'Maintainability',
        description: 'Warn when template nesting exceeds a configured depth.',
        recommended: true,
    },

    async check(context) {
        const template = context.descriptor.template;

        if (!template?.ast) {
            return [];
        }

        const maxDepth = getRuleOption(
            context,
            'excessive-dom-depth',
            'maxDepth',
            6,
        );

        const depth = maxDomDepth(template.ast, 0);

        if (depth <= maxDepth) {
            return [];
        }

        return [
            {
                rule: 'excessive-dom-depth',
                severity: 'warning',
                file: context.filePath,
                message: 'Template nesting is too deep.',
                suggestion:
                    'Extract deeply nested markup into child components or simplify the structure.',
            },
        ];
    },
};
