import { getRuleOption } from '../../utils/rule-options';
import { getAssetIssues } from '../../core/asset-analyzer';
import type { Rule } from '../../types/rule';

export const noLargeAssetRule: Rule = {
    name: 'no-large-asset',

    meta: {
        severity: 'warning',

        category: 'performance',

        description:
            'Warn when static assets (images, SVGs, fonts) exceed the configured size threshold. ' +
            'Large assets increase bundle size and slow down page load times.',

        recommended: true,
    },

    async check(context) {
        const maxSizeKb = getRuleOption(context, 'no-large-asset', 'maxSizeKb', 50);

        // Get project root from file path
        const projectRoot = context.filePath.split('/src/')[0]?.split('/')[0] || process.cwd();

        const issues = getAssetIssues(projectRoot, { maxSizeKb });

        return issues.map((issue) => ({
            rule: 'no-large-asset',

            severity: 'warning',

            file: issue.file,

            line: issue.line,

            column: 1,

            message: issue.message,

            suggestion: issue.suggestion,
        }));
    },
};
