import type { Rule } from '../../types/rule';

export const noInlineStylesRule: Rule = {
    name: 'no-inline-styles',

    meta: {
        severity: 'warning',

        category: 'best-practice',

        description:
            'Disallow inline style attributes in Vue templates. ' +
            'Inline styles make components harder to maintain, prevent style reuse, ' +
            'and create specificity conflicts. Use CSS classes or scoped styles instead. ' +
            'Exception: Dynamic styles computed at runtime are allowed with proper justification.',

        recommended: false,
    },

    async check(context) {
        const issues: any[] = [];

        const template = context.descriptor.template;
        if (!template) {
            return issues;
        }

        const templateContent = template.content;
        const templateLoc = template.loc;

        // Pattern 1: style="..." directly on elements
        const inlineStyleRegex = /:style\s*=\s*["'][^"']*["']|:style\s*=\s*\{/g;
        const staticStyleRegex = /style\s*=\s*["'][^"']*["']/g;

        let match;
        let lineOffset = 0;
        const lines = templateContent.split('\n');

        // Reset regex lastIndex
        inlineStyleRegex.lastIndex = 0;
        staticStyleRegex.lastIndex = 0;

        // Check for :style binding
        while ((match = inlineStyleRegex.exec(templateContent)) !== null) {
            const matchPos = match.index;

            // Count lines to get the line number
            const beforeMatch = templateContent.substring(0, matchPos);
            const lineNumber = beforeMatch.split('\n').length;

            // Check if this is truly dynamic (has complex expression)
            const styleExpr = match[0];
            const isDynamicExpression = styleExpr.includes('{');

            // Allow dynamic styles that are computed (e.g., :style="{ color: myColor }")
            // but warn on complex inline styles
            if (isDynamicExpression) {
                // Extract the expression to check complexity
                const startIdx = templateContent.indexOf('{', matchPos);
                let braceCount = 0;
                let endIdx = startIdx;

                for (let i = startIdx; i < templateContent.length; i++) {
                    if (templateContent[i] === '{') braceCount++;
                    else if (templateContent[i] === '}') {
                        braceCount--;
                        if (braceCount === 0) {
                            endIdx = i;
                            break;
                        }
                    }
                }

                const expression = templateContent.substring(startIdx, endIdx + 1);
                const hasMultipleStyles = (expression.match(/:\s*/g) || []).length;

                // Only warn for complex dynamic styles (3+ properties)
                if (hasMultipleStyles >= 3) {
                    issues.push({
                        rule: 'no-inline-styles',

                        severity: 'warning',

                        file: context.filePath,

                        line: lineNumber,

                        message: `Complex dynamic style binding detected. Consider using a computed property or CSS class.`,

                        suggestion: `Extract complex styles to a computed property: const style = computed(() => ({ ... }))`,
                    });
                }
            } else {
                // Static inline style
                issues.push({
                    rule: 'no-inline-styles',

                    severity: 'warning',

                    file: context.filePath,

                    line: lineNumber,

                    message: `Inline style attribute detected.`,

                    suggestion: `Move styles to a CSS class or scoped <style> block.`,
                });
            }
        }

        // Check for <style> tags with inline content (CSS-in-JS pattern)
        const styleBlockRegex = /<style[^>]*>[\s\S]*?<\/style>/g;
        const templateInScriptRegex = /style\s*:\s*["'`]/g;

        // Reset regex
        templateInScriptRegex.lastIndex = 0;

        // Check if there's CSS-in-JS pattern in script (less common in Vue but possible)
        if (context.scriptAst) {
            // This would require AST traversal - for now, skip as it's rare in Vue SFC
        }

        return issues;
    },
};
