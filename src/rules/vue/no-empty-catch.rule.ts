import { traverse } from '../../utils/ast';
import type { Rule } from '../../types/rule';
import { toFileLine } from '../../utils/line-utils';
import { getLineBounds } from '../../utils/fix';

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
                    _catchClause: path.node,
                });
            },
        });

        return issues;
    },

    async fix(context, issue) {
        const catchClause = (issue as any)._catchClause;
        if (!catchClause) {
            return null;
        }

        const line = toFileLine(catchClause.loc?.start.line, context.scriptStartLine);
        const bounds = getLineBounds(context.source, line);

        if (!bounds) {
            return null;
        }

        const indent = '  ';
        const comment = '// TODO: Handle this error appropriately';

        return {
            description: 'Add error handling comment to catch block',
            replacements: [{
                start: bounds.start,
                end: bounds.end + bounds.delimiter,
                text: `${bounds.start > 0 && context.source[bounds.start - 1] !== '\n' ? '\n' : ''}${indent}${comment}${bounds.delimiter > 0 ? '\n' + context.source.slice(bounds.start, bounds.end + bounds.delimiter) : ''}`,
            }],
        };
    },
};
