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

function countObjectWatchers(node: any): number {
    if (!node || node.type !== 'ObjectExpression') {
        return 0;
    }

    const watchProperty = node.properties.find((property: any) => {
        return (
            (property.type === 'ObjectProperty' || property.type === 'ObjectMethod') &&
            isKeyNamed(property.key, 'watch')
        );
    });

    if (!watchProperty || watchProperty.value.type !== 'ObjectExpression') {
        return 0;
    }

    return watchProperty.value.properties.filter((property: any) => {
        return (
            property.type === 'ObjectProperty' ||
            property.type === 'ObjectMethod'
        );
    }).length;
}

function isWatchCall(callee: any): boolean {
    if (!callee) {
        return false;
    }

    if (callee.type === 'Identifier') {
        return callee.name === 'watch';
    }

    return callee.type === 'MemberExpression' && callee.property?.name === 'watch';
}

function isWatchEffectCall(callee: any): boolean {
    if (!callee) {
        return false;
    }

    if (callee.type === 'Identifier') {
        return callee.name === 'watchEffect';
    }

    return (
        callee.type === 'MemberExpression' &&
        callee.property?.name === 'watchEffect'
    );
}

export const excessiveWatchersRule: Rule = {
    name: 'excessive-watchers',

    meta: {
        severity: 'warning',
        category: 'Maintainability',
        description: 'Warn when a component declares too many watchers.',
        recommended: true,
    },

    async check(context) {
        const maxWatchers = getRuleOption(
            context,
            'excessive-watchers',
            'maxWatchers',
            10,
        );

        if (!context.scriptAst) {
            return [];
        }

        let watcherCount = 0;

        traverse(context.scriptAst as any, {
            ExportDefaultDeclaration(path: any) {
                const declaration = path.node.declaration;

                if (declaration?.type === 'ObjectExpression') {
                    watcherCount = Math.max(
                        watcherCount,
                        countObjectWatchers(declaration),
                    );
                }
            },

            CallExpression(path: any) {
                const callee = path.node.callee;

                if (isWatchCall(callee) || isWatchEffectCall(callee)) {
                    watcherCount += 1;
                }

                if (
                    callee?.type === 'Identifier' &&
                    ['defineComponent', 'defineNuxtComponent'].includes(callee.name)
                ) {
                    const firstArg = path.node.arguments[0];

                    if (firstArg?.type === 'ObjectExpression') {
                        watcherCount = Math.max(
                            watcherCount,
                            countObjectWatchers(firstArg),
                        );
                    }
                }
            },
        });

        if (watcherCount <= maxWatchers) {
            return [];
        }

        return [
            {
                rule: 'excessive-watchers',
                severity: 'warning',
                file: context.filePath,
                message: `Component contains excessive watchers (${watcherCount} > ${maxWatchers}).`,
                suggestion:
                    'Consolidate related listeners and move watcher-heavy logic into composables.'
,
            },
        ];
    },
};
