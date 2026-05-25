import { traverse } from '../../utils/ast';
import type { Rule } from '../../types/rule';

export const noDebuggerRule: Rule = {
    name: 'no-debugger',

    meta: {
        severity: 'warning',
        category: 'Best Practices',
        description: 'Disallow debugger statements in Vue components.',
        recommended: true,
    },

    async check(context) {
        if (!context.scriptAst) {
            return [];
        }

        const issues = [];

        traverse(context.scriptAst as any, {
            DebuggerStatement(path) {
                issues.push({
                    rule: 'no-debugger',
                    severity: 'warning',
                    file: context.filePath,
                    line: path.node.loc?.start.line,
                    column: path.node.loc?.start.column,
                    message: 'Unexpected debugger statement.',
                    suggestion:
                        'Remove debugger statements before shipping production code.',
                });
            },
        });

        return issues;
    },
};
