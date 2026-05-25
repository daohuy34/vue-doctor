import { getRuleOption } from '../../utils/rule-options';
import type { Rule } from '../../types/rule';

export const noLargeComponentRule: Rule = {
    name: 'no-large-component',

    meta: {
        severity: 'warning',
        category: 'Maintainability',
        description: 'Detect oversized Vue Single File Components.',

        recommended: true,
    },

    async check(context) {
        const maxLines = getRuleOption(context, 'no-large-component', 'maxLines', 500);
        const lines = context.source.split('\n').length;

        if (lines < maxLines) {
            return [];
        }

        return [
            {
                rule: 'no-large-component',
                severity: 'warning',

                file: context.filePath,

                message: `Component exceeds recommended size (${lines} LOC)`,

                suggestion:
                    'Consider splitting UI, composables, or business logic into smaller modules.',
            },
        ];
    },
};
