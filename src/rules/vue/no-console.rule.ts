import { traverse } from '../../utils/ast';
import { createLineRemovalFix, isSafeConsoleStatement } from '../../utils/fix';
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

        const issues: any[] = [];
        const scriptStartLine = context.scriptStartLine;

        traverse(context.scriptAst as any, {
            MemberExpression(path: any) {
                const object = path.node.object;

                if (object.type === 'Identifier' && object.name === 'console') {
                    const scriptLine = path.node.loc?.start.line ?? 1;
                    const fileLine = scriptLine + scriptStartLine - 1;

                    issues.push({
                        rule: 'no-console',

                        severity: 'warning',

                        file: context.filePath,

                        line: fileLine,
                        column: path.node.loc?.start.column,

                        message: 'console usage detected.',

                        suggestion: 'Remove console logs before production.',
                    });
                }
            },
        });

        return issues;
    },

    async fix(context, issue) {
        if (!issue.line) {
            return null;
        }

        if (!isSafeConsoleStatement(context.source, issue.line)) {
            return null;
        }

        return createLineRemovalFix(context.source, issue.line);
    },
};
