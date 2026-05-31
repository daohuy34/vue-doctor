import { traverse } from '../../utils/ast';
import type { Rule } from '../../types/rule';
import { toFileLine } from '../../utils/line-utils';

export const noEmptyCatchRule: Rule = {
    name: 'no-empty-catch',

    meta: {
        severity: 'warning',
        category: 'Best Practices',
        description: 'Disallow empty catch blocks.',
        recommended: true,
    },

    async check(context) {
        if (!context.scriptAst) {
            return [];
        }

        const issues = [];

        traverse(context.scriptAst as any, {
            CatchClause(path) {
                if (path.node.body.body.length > 0) {
                    return;
                }

                issues.push({
                    rule: 'no-empty-catch',
                    severity: 'warning',
                    file: context.filePath,
                    line: toFileLine(path.node.loc?.start.line, context.scriptStartLine),
                    column: path.node.loc?.start.column,
                    message: 'Empty catch block detected.',
                    suggestion:
                        'Handle the error or rethrow it so failures are not silently swallowed.',
                });
            },
        });

        return issues;
    },
};
