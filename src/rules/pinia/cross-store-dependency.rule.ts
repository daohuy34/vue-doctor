/**
 * Cross-Store Dependency Rule (Pinia)
 *
 * Detects when stores depend on other stores.
 * Cross-store dependencies can create tight coupling.
 */

import { getRuleOption } from '../../utils/rule-options';
import { type Rule, type RuleContext } from '../../types/rule';
import {
    extractStoreDependencies,
} from '../../utils/pinia-detector';

export interface CrossStoreDependencyOptions {
    /** Severity level (default: warning) */
    severity?: 'info' | 'warning' | 'error';
}

export const crossStoreDependencyRule: Rule<CrossStoreDependencyOptions> = {
    name: 'cross-store-dependency',

    meta: {
        severity: 'warning',
        category: 'Architecture',
        description:
            'Detect when Pinia stores depend on other stores. ' +
            'Cross-store dependencies can create tight coupling and circular dependency risks.',
        recommended: false,
    },

    async check(context: RuleContext) {
        const severity = getRuleOption(
            context,
            'cross-store-dependency',
            'severity',
            'warning'
        ) as 'info' | 'warning' | 'error';

        const filePath = context.filePath;
        const source = context.source;

        // Extract store dependencies
        const dependencies = extractStoreDependencies(source, filePath);

        if (dependencies.length === 0) {
            return [];
        }

        return dependencies.map((dep) => ({
            rule: 'cross-store-dependency',
            severity,

            file: filePath,
            line: 1,
            column: 1,

            message: `Store '${dep.sourceStore}' depends on store '${dep.targetStore}'`,

            suggestion: buildSuggestion(dep.sourceStore, dep.targetStore),
        }));
    },
};

function buildSuggestion(sourceStore: string, targetStore: string): string {
    return `Consider using events or a shared composable instead of direct store-to-store dependency. ` +
        `Alternatively, merge related state into a single store or use dependency injection.`;
}
