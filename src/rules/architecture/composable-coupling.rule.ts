/**
 * Composable Coupling Rule
 *
 * Detects composables with excessive dependencies.
 * Composable functions should be focused and reusable.
 */

import { getRuleOption } from '../../utils/rule-options';
import type { Rule, RuleContext } from '../../types/rule';
import type { ProjectContext } from '../../core/project';
import { getFanOut } from '../../core/project';

export interface ComposableCouplingOptions {
    /** Maximum number of imports before warning (default: 8) */
    maxImports?: number;
    /** Severity level: info, warning, error (default: warning) */
    severity?: 'info' | 'warning' | 'error';
}

export const composableCouplingRule: Rule<ComposableCouplingOptions> = {
    name: 'composable-coupling',

    meta: {
        severity: 'warning',
        category: 'Architecture',
        description:
            'Detect composables with excessive dependencies. ' +
            'Highly coupled composables may indicate code that should be split ' +
            'or dependencies that could be extracted.',
        recommended: false,
    },

    async check(context: RuleContext & { projectContext?: ProjectContext }, options?: ComposableCouplingOptions) {
        const maxImports = getRuleOption(context, 'composable-coupling', 'maxImports', 8);
        const severity = getRuleOption(context, 'composable-coupling', 'severity', 'warning') as 'info' | 'warning' | 'error';

        // Rule only works with project context
        if (!context.projectContext) {
            return [];
        }

        // Only apply to composables
        const filePath = context.filePath;
        if (!filePath.includes('/composables/') && !filePath.includes('/composable/')) {
            return [];
        }

        // Get the fan-out (number of imports) for this file
        const fanOut = getFanOut(context.projectContext, filePath);

        if (fanOut <= maxImports) {
            return [];
        }

        return [
            {
                rule: 'composable-coupling',
                severity,

                file: filePath,
                line: 1,
                column: 1,

                message: `Composable has ${fanOut} dependencies (max recommended: ${maxImports})`,

                suggestion: buildSuggestion(fanOut, maxImports),
            },
        ];
    },
};

function buildSuggestion(fanOut: number, maxImports: number): string {
    const excess = fanOut - maxImports;

    if (excess <= 2) {
        return 'Consider consolidating imports or extracting common dependencies into a shared utility.';
    }

    return 'This composable is highly coupled. Consider splitting it into smaller, focused composables or using dependency injection.';
}
