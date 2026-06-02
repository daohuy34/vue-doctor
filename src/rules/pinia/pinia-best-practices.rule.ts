/**
 * Pinia Best Practices Rule
 *
 * Detects Pinia best practice violations.
 */

import { getRuleOption } from '../../utils/rule-options';
import { type Rule, type RuleContext } from '../../types/rule';
import {
    checkBestPractices,
    isPiniaStore,
} from '../../utils/pinia-detector';

export interface PiniaBestPracticesOptions {
    /** Severity level (default: warning) */
    severity?: 'info' | 'warning' | 'error';
}

export const piniaBestPracticesRule: Rule<PiniaBestPracticesOptions> = {
    name: 'pinia-best-practices',

    meta: {
        severity: 'warning',
        category: 'Best Practices',
        description:
            'Detect Pinia best practice violations. ' +
            'Follow Pinia best practices for better maintainability.',
        recommended: false,
    },

    async check(context: RuleContext) {
        const severity = getRuleOption(
            context,
            'pinia-best-practices',
            'severity',
            'warning'
        ) as 'info' | 'warning' | 'error';

        const filePath = context.filePath;
        const source = context.source;

        // Only check Pinia stores
        if (!isPiniaStore(source)) {
            return [];
        }

        // Check for best practice violations
        const violations = checkBestPractices(source);

        if (violations.length === 0) {
            return [];
        }

        return violations.map((violation) => ({
            rule: 'pinia-best-practices',
            severity,

            file: filePath,
            line: violation.line ?? 1,
            column: 1,

            message: violation.message,

            suggestion: getSuggestion(violation.type),
        }));
    },
};

function getSuggestion(type: string): string {
    switch (type) {
        case 'direct-mutation':
            return 'Use this.$patch() or actions to update state instead of direct assignment.';
        case 'async-in-state':
            return 'Move async code to actions. State should only return synchronous values.';
        case 'side-effect-getter':
            return 'Getters should be pure. Move side effects to actions.';
        case 'no-types':
            return 'Add TypeScript types for better type safety.';
        default:
            return 'Review Pinia best practices.';
    }
}
