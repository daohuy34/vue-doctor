/**
 * Store Coupling Rule
 *
 * Detects stores with excessive dependencies.
 * Store-to-store dependencies can create tight coupling and circular dependency risks.
 */

import { getRuleOption } from '../../utils/rule-options';
import type { Rule, RuleContext } from '../../types/rule';
import type { ProjectContext } from '../../core/project';
import { getFanOut } from '../../core/project';

export interface StoreCouplingOptions {
    /** Maximum number of imports before warning (default: 5) */
    maxImports?: number;
    /** Severity level: info, warning, error (default: warning) */
    severity?: 'info' | 'warning' | 'error';
}

export const storeCouplingRule: Rule<StoreCouplingOptions> = {
    name: 'store-coupling',

    meta: {
        severity: 'warning',
        category: 'Architecture',
        description:
            'Detect stores with excessive dependencies. ' +
            'Store-to-store coupling can lead to circular dependencies and make state management harder to trace.',
        recommended: false,
    },

    async check(context: RuleContext & { projectContext?: ProjectContext }, options?: StoreCouplingOptions) {
        const maxImports = getRuleOption(context, 'store-coupling', 'maxImports', 5);
        const severity = getRuleOption(context, 'store-coupling', 'severity', 'warning') as 'info' | 'warning' | 'error';

        // Rule only works with project context
        if (!context.projectContext) {
            return [];
        }

        // Only apply to stores
        const filePath = context.filePath;
        const isStore =
            filePath.includes('/stores/') ||
            filePath.includes('/store/') ||
            filePath.includes('/state/');

        if (!isStore) {
            return [];
        }

        // Get the fan-out (number of imports) for this file
        const fanOut = getFanOut(context.projectContext, filePath);

        if (fanOut <= maxImports) {
            return [];
        }

        return [
            {
                rule: 'store-coupling',
                severity,

                file: filePath,
                line: 1,
                column: 1,

                message: `Store has ${fanOut} dependencies (max recommended: ${maxImports})`,

                suggestion: buildSuggestion(fanOut, maxImports),
            },
        ];
    },
};

function buildSuggestion(fanOut: number, maxImports: number): string {
    const excess = fanOut - maxImports;

    if (excess <= 2) {
        return 'Consider using event-based communication between stores or extracting shared state into a separate store.';
    }

    return 'This store has too many dependencies. Consider using a shared state store, event bus, or composables to reduce coupling.';
}
