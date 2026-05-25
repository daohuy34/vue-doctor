import { traverse } from '../../utils/ast';
import { getRuleOption } from '../../utils/rule-options';
import type { Rule } from '../../types/rule';

function isKeyNamed(node: any, name: string): boolean {
    if (!node) {
        return false;
    }

    if (node.type === 'Identifier') {
        return node.name === name;
    }

    if (node.type === 'StringLiteral') {
        return node.value === name;
    }

    return false;
}

function countObjectComputed(node: any): number {
    if (!node || node.type !== 'ObjectExpression') {
        return 0;
    }

    const computedProperty = node.properties.find((property: any) => {
        return (
            (property.type === 'ObjectProperty' || property.type === 'ObjectMethod') &&
            isKeyNamed(property.key, 'computed')
        );
    });

    if (!computedProperty || computedProperty.value.type !== 'ObjectExpression') {
        return 0;
    }

    return computedProperty.value.properties.filter((property: any) => {
        return (
            property.type === 'ObjectProperty' ||
            property.type === 'ObjectMethod'
        );
    }).length;
}

export const excessiveComputedPropertiesRule: Rule = {
    name: 'excessive-computed-properties',

    meta: {
        severity: 'info',
        category: 'Maintainability',
        description: 'Warn when a component declares too many computed properties.',
        recommended: true,
    },

    async check(context) {
        const maxComputed = getRuleOption(
            context,
            'excessive-computed-properties',
            'maxComputed',
            20,
        );

        if (!context.scriptAst) {
            return [];
        }

        let computedCount = 0;

        traverse(context.scriptAst as any, {
            ExportDefaultDeclaration(path: any) {
                const declaration = path.node.declaration;

                if (declaration?.type === 'ObjectExpression') {
                    computedCount = Math.max(
                        computedCount,
                        countObjectComputed(declaration),
                    );
                }
            },

            CallExpression(path: any) {
                if (
                    path.node.callee?.type === 'Identifier' &&
                    ['defineComponent', 'defineNuxtComponent'].includes(
                        path.node.callee.name,
                    )
                ) {
                    const firstArg = path.node.arguments[0];

                    if (firstArg?.type === 'ObjectExpression') {
                        computedCount = Math.max(
                            computedCount,
                            countObjectComputed(firstArg),
                        );
                    }
                }
            },
        });

        if (computedCount <= maxComputed) {
            return [];
        }

        return [
            {
                rule: 'excessive-computed-properties',
                severity: 'info',
                file: context.filePath,
                message: `Component contains excessive computed properties (${computedCount} > ${maxComputed}).`,
                suggestion:
                    'Extract derived state into separate composables or smaller components.',
            },
        ];
    },
};
