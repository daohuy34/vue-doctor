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
            isKeyNamed(property.key, 'props')
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

function countObjectProperty(node: any, key: string): number {
    if (!node || node.type !== 'ObjectExpression') {
        return 0;
    }

    const property = node.properties.find((entry: any) => {
        return (
            (entry.type === 'ObjectProperty' || entry.type === 'ObjectMethod') &&
            isKeyNamed(entry.key, key)
        );
    });

    if (!property || property.value.type !== 'ObjectExpression') {
        return 0;
    }

    return countProperties(property.value);
}

function countMethods(node: any): number {
    if (!node || node.type !== 'ObjectExpression') {
        return 0;
    }

    const methodsProperty = node.properties.find((property: any) => {
        return (
            (property.type === 'ObjectProperty' || property.type === 'ObjectMethod') &&
            isKeyNamed(property.key, 'methods')
        );
    });

    if (!methodsProperty || methodsProperty.value.type !== 'ObjectExpression') {
        return 0;
    }

    return countProperties(methodsProperty.value);
}

function countWatchers(node: any): number {
    if (!node || node.type !== 'ObjectExpression') {
        return 0;
    }

    return countObjectProperty(node, 'watch');
}

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

export const excessiveComponentResponsibilityRule: Rule = {
    name: 'excessive-component-responsibility',

    meta: {
        severity: 'warning',
        category: 'AI',
        description: 'Warn when a component appears to have multiple responsibilities.',
        recommended: true,
    },

    async check(context) {
        const maxScore = getRuleOption(
            context,
            'excessive-component-responsibility',
            'maxScore',
            12,
        );

        if (!context.scriptAst) {
            return [];
        }

        let propsCount = 0;
        let watcherCount = 0;
        let methodsCount = 0;
        const templateNodes = countElementNodes(context.descriptor.template?.ast);

        traverse(context.scriptAst as any, {
            ExportDefaultDeclaration(path: any) {
                const declaration = path.node.declaration;

                if (declaration?.type === 'ObjectExpression') {
                    propsCount = Math.max(propsCount, extractPropsCountFromOptions(declaration));
                    watcherCount = Math.max(watcherCount, countWatchers(declaration));
                    methodsCount = Math.max(methodsCount, countMethods(declaration));
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
                        propsCount = Math.max(propsCount, extractPropsCountFromOptions(firstArg));
                        watcherCount = Math.max(watcherCount, countWatchers(firstArg));
                        methodsCount = Math.max(methodsCount, countMethods(firstArg));
                    }
                }

                propsCount = Math.max(propsCount, extractPropsCountFromCall(path.node));

                if (callee?.type === 'Identifier' && callee.name === 'watch') {
                    watcherCount += 1;
                }

                if (callee?.type === 'Identifier' && callee.name === 'watchEffect') {
                    watcherCount += 1;
                }
            },
        });

        const score = propsCount + methodsCount + watcherCount + Math.ceil(templateNodes / 25);

        if (score <= maxScore) {
            return [];
        }

        return [
            {
                rule: 'excessive-component-responsibility',
                severity: 'warning',
                file: context.filePath,
                message: `Component may have multiple responsibilities (score ${score} > ${maxScore}).`,
                suggestion:
                    'Split the component into smaller responsibilities and move shared behavior into composables or child components.',
            },
        ];
    },
};
