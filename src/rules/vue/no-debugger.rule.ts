import { traverse } from '../../utils/ast';
import { createLineRemovalFix } from '../../utils/fix';
import type { Rule } from '../../types/rule';
import { toFileLine } from '../../utils/line-utils';

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
                    line: toFileLine(path.node.loc?.start.line, context.scriptStartLine),
                    column: path.node.loc?.start.column,
                    message: 'Unexpected debugger statement.',
                    suggestion:
                        'Remove debugger statements before shipping production code.',
                });
            },
        });

        return issues;
    },

    async fix(context, issue) {
        if (!issue.line) {
            return null;
        }

        return createLineRemovalFix(context.source, issue.line);
    },
};
