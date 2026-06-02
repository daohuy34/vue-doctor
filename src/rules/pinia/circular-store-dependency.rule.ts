/**
 * Circular Store Dependency Rule (Pinia)
 *
 * Detects circular dependencies between Pinia stores.
 * Circular store dependencies cause initialization issues and tight coupling.
 */

import { getRuleOption } from '../../utils/rule-options';
import { type Rule, type RuleContext } from '../../types/rule';
import {
    extractStoreDependencies,
    hasCircularStoreDependency,
    extractStoreName,
} from '../../utils/pinia-detector';

export interface CircularStoreDependencyOptions {
    /** Severity level (default: error) */
    severity?: 'info' | 'warning' | 'error';
}

export const circularStoreDependencyRule: Rule<CircularStoreDependencyOptions> = {
    name: 'circular-store-dependency',

    meta: {
        severity: 'error',
        category: 'Architecture',
        description:
            'Detect circular dependencies between Pinia stores. ' +
            'Circular store dependencies cause initialization issues and tight coupling.',
        recommended: true,
    },

    async check(context: RuleContext) {
        const severity = getRuleOption(
            context,
            'circular-store-dependency',
            'severity',
            'error'
        ) as 'info' | 'warning' | 'error';

        const filePath = context.filePath;
        const source = context.source;

        // Get store name
        const storeName = extractStoreName(source);
        if (!storeName) {
            return [];
        }

        // Extract dependencies
        const dependencies = extractStoreDependencies(source, filePath);

        // Check for circular dependencies
        // Note: This would need the full dependency graph from project context
        // For now, we check if this store imports itself
        const hasSelfReference = dependencies.some(
            (dep) => dep.targetStore === storeName
        );

        if (hasSelfReference) {
            return [
                {
                    rule: 'circular-store-dependency',
                    severity: 'error',

                    file: filePath,
                    line: 1,
                    column: 1,

                    message: `Store '${storeName}' imports itself, creating a circular dependency`,

                    suggestion: 'Remove the self-referencing import.',
                },
            ];
        }

        // For detecting full circular chains, we'd need project-level analysis
        // This is handled by the general circular-dependency rule for all files

        return [];
    },
};
