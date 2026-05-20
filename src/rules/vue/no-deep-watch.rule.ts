import type { ObjectExpression } from '@babel/types';

import { traverse } from '../../utils/ast';

import type { Rule } from '../../types/rule';

export const noDeepWatchRule: Rule = {
    name: 'no-deep-watch',

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
            CallExpression(path) {
                const callee = path.node.callee;

                if (callee.type !== 'Identifier' || callee.name !== 'watch') {
                    return;
                }

                const options = path.node.arguments[2];

                if (!options || options.type !== 'ObjectExpression') {
                    return;
                }

                const hasDeep = (options as ObjectExpression).properties.some(
                    (property: any) => {
                        if (property.type !== 'ObjectProperty') {
                            return false;
                        }

                        return (
                            property.key.type === 'Identifier' &&
                            property.key.name === 'deep' &&
                            property.value.type === 'BooleanLiteral' &&
                            property.value.value === true
                        );
                    },
                );

                if (!hasDeep) {
                    return;
                }

                issues.push({
                    rule: 'no-deep-watch',

                    severity: 'warning',

                    file: context.filePath,

                    line: path.node.loc?.start.line,
                    column: path.node.loc?.start.column,

                    message: 'Deep watch detected.',

                    suggestion:
                        'Avoid deep watch on large objects because it may hurt performance.',
                });
            },
        });

        return issues;
    },
};
