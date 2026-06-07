import type { Rule } from '../../types/rule';

export const preferScriptSetupRule: Rule = {
    name: 'prefer-script-setup',

    meta: {
        severity: 'info',

        category: 'best-practice',

        description:
            'Prefer <script setup> syntax for Vue 3 components. ' +
            '<script setup> provides better performance, less boilerplate, ' +
            'and enables compile-time optimizations. Use Options API only when ' +
            'you need features not supported in Composition API.',

        recommended: true,
    },

    async check(context) {
        const issues: any[] = [];

        const hasScriptSetup = context.descriptor.scriptSetup !== null;
        const hasScript = context.descriptor.script !== null;

        // Check if using Options API without <script setup>
        if (hasScript && !hasScriptSetup) {
            const scriptContent = context.descriptor.script?.content ?? '';

            // Skip if it's a type definition file or only has imports/exports
            if (!scriptContent.includes('export default') && !scriptContent.includes('export = ')) {
                return issues;
            }

            // Check for Options API patterns
            const optionsApiPatterns = [
                { pattern: /\bdata\s*\(/, reason: 'data() function' },
                { pattern: /\bmethods\s*:/, reason: 'methods option' },
                { pattern: /\bcomputed\s*:/, reason: 'computed option' },
                { pattern: /\bwatch\s*:/, reason: 'watch option' },
                { pattern: /\blifecycle\s*:/, reason: 'lifecycle hooks' },
                { pattern: /\bprops\s*:/, reason: 'props option' },
                { pattern: /\bemits\s*:/, reason: 'emits option' },
                { pattern: /\bsetup\s*\([^)]*\)\s*{/, reason: 'setup() function' },
            ];

            for (const { pattern, reason } of optionsApiPatterns) {
                if (pattern.test(scriptContent)) {
                    const scriptLine = context.descriptor.script?.loc.start.line ?? 1;

                    issues.push({
                        rule: 'prefer-script-setup',

                        severity: 'info',

                        file: context.filePath,

                        line: scriptLine,

                        message: `Consider using <script setup> instead of Options API.`,

                        suggestion: `Convert this component to use <script setup> syntax for better performance and cleaner code.`,
                    });

                    break;
                }
            }
        }

        // Suggest <script setup> for files that have both (migration scenario)
        if (hasScriptSetup && hasScript) {
            const scriptContent = context.descriptor.script?.content ?? '';
            const scriptSetupContent = context.descriptor.scriptSetup?.content ?? '';

            // Check if script content could be migrated to script setup
            const canMigrate =
                !scriptContent.includes('name:') &&
                !scriptContent.includes('inheritAttrs') &&
                !scriptContent.includes('components:') &&
                !scriptContent.includes('directives:');

            if (canMigrate && scriptContent.includes('export default')) {
                issues.push({
                    rule: 'prefer-script-setup',

                    severity: 'info',

                    file: context.filePath,

                    line: context.descriptor.script?.loc.start.line ?? 1,

                    message: `This component uses both <script> and <script setup>. Consider consolidating to only <script setup>.`,

                    suggestion: `Move the Options API code to <script setup> for cleaner code.`,
                });
            }
        }

        return issues;
    },
};
