import { getRuleOption } from '../../utils/rule-options';
import type { Rule } from '../../types/rule';

function hasVForDirective(node: any): boolean {
    return Boolean(
        node?.type === 1 &&
            node.props?.some((prop: any) => prop.type === 7 && prop.name === 'for'),
    );
}

function maxForNesting(node: any, currentDepth = 0): number {
    if (!node) {
        return currentDepth;
    }

    const nextDepth = hasVForDirective(node) ? currentDepth + 1 : currentDepth;
    let maxDepth = nextDepth;

    if (Array.isArray(node.children)) {
        for (const child of node.children) {
            maxDepth = Math.max(maxDepth, maxForNesting(child, nextDepth));
        }
    }

    if (Array.isArray(node.branches)) {
        for (const branch of node.branches) {
            maxDepth = Math.max(maxDepth, maxForNesting(branch, nextDepth));
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
