import { traverse } from '../../utils/ast';
import { getRuleOption } from '../../utils/rule-options';
import type { Rule } from '../../types/rule';

function isPropKey(node: any, name: string): boolean {
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

function countProperties(node: any): number {
    if (!node || node.type !== 'ObjectExpression') {
        return 0;
    }

    return node.properties.filter((property: any) => {
        return (
            property.type === 'ObjectProperty' ||
            property.type === 'ObjectMethod'
        );
    }).length;
}

function countPropsValue(value: any): number {
    if (!value) {
        return 0;
    }

    if (value.type === 'ArrayExpression') {
        return value.elements.filter(Boolean).length;
    }

    if (value.type === 'ObjectExpression') {
        return countProperties(value);
    }

    return 0;
}

function extractPropsCountFromOptions(node: any): number {
    if (!node || node.type !== 'ObjectExpression') {
        return 0;
    }

    const propsProperty = node.properties.find((property: any) => {
        return (
            (property.type === 'ObjectProperty' || property.type === 'ObjectMethod') &&
            isPropKey(property.key, 'props')
        );
    });

    if (!propsProperty) {
        return 0;
    }

    return countPropsValue(propsProperty.value);
}

function extractPropsCountFromCall(node: any): number {
    if (!node || node.type !== 'CallExpression') {
        return 0;
    }

    const callee = node.callee;
    const isDefineProps =
        callee?.type === 'Identifier' && callee.name === 'defineProps';

    if (!isDefineProps) {
        return 0;
    }

    if (!node.arguments.length) {
        return 0;
    }

    return countPropsValue(node.arguments[0]);
}

export const excessivePropsRule: Rule = {
    name: 'excessive-props',

    meta: {
        severity: 'warning',
        category: 'Maintainability',
        description: 'Warn when a component declares too many props.',
        recommended: true,
    },

    async check(context) {
        const maxProps = getRuleOption(context, 'excessive-props', 'maxProps', 15);

        if (!context.scriptAst) {
            return [];
        }

        let propsCount = 0;

        traverse(context.scriptAst as any, {
            ExportDefaultDeclaration(path: any) {
                const declaration = path.node.declaration;

                if (declaration?.type === 'ObjectExpression') {
                    propsCount = Math.max(
                        propsCount,
                        extractPropsCountFromOptions(declaration),
                    );
                }
            },

            CallExpression(path: any) {
                const callee = path.node.callee;

                if (
                    callee?.type === 'Identifier' &&
                    ['defineComponent', 'defineNuxtComponent'].includes(callee.name)
                ) {
                    const firstArg = path.node.arguments[0];

                    if (firstArg?.type === 'ObjectExpression') {
                        propsCount = Math.max(
                            propsCount,
                            extractPropsCountFromOptions(firstArg),
                        );
                    }
                }

                propsCount = Math.max(
                    propsCount,
                    extractPropsCountFromCall(path.node),
                );
            },
        });

        if (propsCount <= maxProps) {
            return [];
        }

        return [
            {
                rule: 'excessive-props',
                severity: 'warning',
                file: context.filePath,
                message: `Component has too many props (${propsCount} > ${maxProps}).`,
                suggestion:
                    'Split the component API into smaller props groups or move unrelated props into child components.',
            },
        ];
    },
};
