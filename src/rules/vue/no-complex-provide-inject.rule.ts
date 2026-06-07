import { traverse } from '../../utils/ast';
import type { Rule } from '../../types/rule';

export const noComplexProvideInjectRule: Rule = {
    name: 'no-complex-provide-inject',

    meta: {
        severity: 'warning',

        category: 'best-practice',

        description:
            'Detect overly complex provide/inject patterns. ' +
            'Deep provide/inject chains make data flow difficult to trace and debug. ' +
            'Consider using Pinia stores, composables, or a centralized state management solution. ' +
            'Ideal: Provide at the component level, inject at one level deep.',

        recommended: false,
    },

    async check(context) {
        const issues: any[] = [];

        if (!context.scriptAst) {
            return issues;
        }

        const scriptAst = context.scriptAst as any;
        const scriptStartLine = context.scriptStartLine;

        let injectCount = 0;
        let provideCount = 0;
        let totalProvideKeys = 0;
        let firstProvideLine = 0;

        // Track provide calls and count injects
        traverse(scriptAst, {
            'CallExpression'(path: any) {
                const callee = path.node.callee;
                if (!callee || callee.type !== 'Identifier') return;

                if (callee.name === 'inject' || callee.name === 'useInject') {
                    injectCount++;
                }

                if (callee.name === 'provide' || callee.name === 'useProvide') {
                    provideCount++;

                    if (firstProvideLine === 0) {
                        firstProvideLine = (path.node.loc?.start.line ?? 1) + scriptStartLine - 1;
                    }

                    const args = path.node.arguments;
                    if (args.length >= 1) {
                        // Count keys in provide call
                        if (args[0].type === 'StringLiteral') {
                            totalProvideKeys += 1;
                        } else if (args[0].type === 'ObjectExpression') {
                            totalProvideKeys += args[0].properties.filter(
                                (p: any) => p.type === 'ObjectProperty'
                            ).length;
                        }
                    }
                }
            },
        });

        // Only report ONE issue at the component level
        if (provideCount > 0 || injectCount > 0) {
            const line = firstProvideLine || 1;

            // Determine the primary issue
            if (injectCount >= 7) {
                issues.push({
                    rule: 'no-complex-provide-inject',

                    severity: 'warning',

                    file: context.filePath,

                    line,

                    message: `${injectCount} inject() calls detected. Deep provide/inject chains are hard to trace.`,

                    suggestion: `Consider using a centralized store (Pinia) instead of deeply nested provide/inject.`,
                });
            } else if (totalProvideKeys >= 8) {
                issues.push({
                    rule: 'no-complex-provide-inject',

                    severity: 'warning',

                    file: context.filePath,

                    line,

                    message: `Component provides ${totalProvideKeys} keys via ${provideCount} provide() call(s). This indicates a complex dependency structure.`,

                    suggestion: `Refactor to use composables or Pinia stores for better maintainability.`,
                });
            } else if (totalProvideKeys >= 5 && injectCount >= 3) {
                issues.push({
                    rule: 'no-complex-provide-inject',

                    severity: 'warning',

                    file: context.filePath,

                    line,

                    message: `Complex provide/inject pattern: ${provideCount} provides, ${injectCount} injects, ${totalProvideKeys} total keys.`,

                    suggestion: `Consider consolidating to use Pinia or composables for better maintainability.`,
                });
            }
        }

        return issues;
    },
};
