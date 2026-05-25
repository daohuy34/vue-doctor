import { getRuleOption } from '../../utils/rule-options';
import type { Rule } from '../../types/rule';

function countElementNodes(node: any): number {
    if (!node) {
        return 0;
    }

    let count = 0;

    if (node.type === 1) {
        count += 1;
    }

    if (Array.isArray(node.children)) {
        for (const child of node.children) {
            count += countElementNodes(child);
        }
    }

    if (Array.isArray(node.branches)) {
        for (const branch of node.branches) {
            count += countElementNodes(branch);
        }
    }

    return count;
}

export const noLargeTemplateRule: Rule = {
    name: 'no-large-template',

    meta: {
        severity: 'warning',
        category: 'Maintainability',
        description: 'Warn when a template is too large or too deeply nested.',
        recommended: true,
    },

    async check(context) {
        const template = context.descriptor.template;

        if (!template) {
            return [];
        }

        const maxLines = getRuleOption(context, 'no-large-template', 'maxLines', 500);
        const maxNodes = getRuleOption(context, 'no-large-template', 'maxNodes', 300);

        const templateLines = template.content.split(/\r?\n/).length;
        const htmlNodes = countElementNodes(template.ast);

        if (templateLines <= maxLines && htmlNodes <= maxNodes) {
            return [];
        }

        return [
            {
                rule: 'no-large-template',
                severity: 'warning',
                file: context.filePath,
                message: 'Template is too large.',
                suggestion:
                    'Split the template into smaller components or move repeated markup into child components.',
            },
        ];
    },
};
