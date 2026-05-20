import { traverse } from '../../utils/ast';
import type { Rule } from '../../types/rule';

export const noConsoleRule: Rule = {
    name: 'no-console',

    meta: {
        severity: 'warning',

        category: 'vue',

        description: 'Detect console usage inside Vue components.',

        recommended: true,
    },

    async check(context) {
        if (!context.scriptAst) {
            return [];
        }

        const issues = [];

        traverse(context.scriptAst as any, {
            MemberExpression(path) {
                const object = path.node.object;

                if (object.type === 'Identifier' && object.name === 'console') {
                    issues.push({
                        rule: 'no-console',

                        severity: 'warning',

                        file: context.filePath,

                        line: path.node.loc?.start.line,
                        column: path.node.loc?.start.column,

                        message: 'console usage detected.',

                        suggestion: 'Remove console logs before production.',
                    });
                }
            },
        });

        return issues;
    },
};
