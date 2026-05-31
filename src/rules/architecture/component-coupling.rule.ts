/**
 * Component Coupling Rule
 *
 * Detects components with excessive dependencies (high fan-out).
 * High coupling makes components harder to test, reuse, and maintain.
 */

import { getRuleOption } from '../../utils/rule-options';
import type { Rule, RuleContext } from '../../types/rule';
import type { ProjectContext } from '../../core/project';
import { getFanOut } from '../../core/project';

export interface ComponentCouplingOptions {
    /** Maximum number of imports before warning (default: 10) */
    maxImports?: number;
    /** Include dynamic imports in count (default: true) */
    countDynamic?: boolean;
    /** Severity level: info, warning, error (default: warning) */
    severity?: 'info' | 'warning' | 'error';
}

export const componentCouplingRule: Rule<ComponentCouplingOptions> = {
    name: 'component-coupling',

    meta: {
        severity: 'warning',
        category: 'Architecture',
        description:
            'Detect components with excessive dependencies. ' +
            'High coupling indicates a component may have too many responsibilities, ' +
            'making it harder to test and maintain.',
        recommended: false,
    },

    async check(context: RuleContext & { projectContext?: ProjectContext }, options?: ComponentCouplingOptions) {
        const maxImports = getRuleOption(context, 'component-coupling', 'maxImports', 10);
        const severity = getRuleOption(context, 'component-coupling', 'severity', 'warning') as 'info' | 'warning' | 'error';

        // Rule only works with project context
        if (!context.projectContext) {
            return [];
        }

        // Get the fan-out (number of imports) for this file
        const fanOut = getFanOut(context.projectContext, context.filePath);

        if (fanOut <= maxImports) {
            return [];
        }

        return [
            {
                rule: 'component-coupling',
                severity,

                file: context.filePath,
                line: 1,
                column: 1,

                message: `Component has ${fanOut} dependencies (max recommended: ${maxImports})`,

                suggestion: buildSuggestion(fanOut, maxImports),
            },
        ];
    },
};

function buildSuggestion(fanOut: number, maxImports: number): string {
    const excess = fanOut - maxImports;

    if (excess <= 3) {
        return 'Consider extracting some logic into composables or shared utilities.';
    }

    if (excess <= 7) {
        return 'This component may have too many responsibilities. Consider splitting it into smaller components or using a facade pattern.';
    }

    return 'This component is highly coupled. Consider a major refactor: extract domain logic, use a service layer, or split into focused modules.';
}
