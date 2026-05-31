/**
 * No Circular Dependency Rule
 *
 * Detects circular dependencies in the project graph.
 * Circular dependencies make code harder to test, understand, and maintain.
 */

import { getRuleOption } from '../../utils/rule-options';
import type { Rule, RuleContext } from '../../types/rule';
import type { ProjectContext, CircularDependency } from '../../core/project';
import { isFileInCircularDep, getCircularDepsForFile } from '../../core/project';

export interface NoCircularDependencyOptions {
    /** Severity level (default: error) */
    severity?: 'info' | 'warning' | 'error';
}

export const noCircularDependencyRule: Rule<NoCircularDependencyOptions> = {
    name: 'no-circular-dependency',

    meta: {
        severity: 'error',
        category: 'Architecture',
        description: 'Detect circular dependencies between modules.',
        recommended: true,
    },

    async check(context: RuleContext & { projectContext?: ProjectContext }) {
        // Rule only works with project context
        if (!context.projectContext) {
            return [];
        }

        // Get severity from config or use default
        const severity = getRuleOption(context, 'no-circular-dependency', 'severity', 'error') as 'info' | 'warning' | 'error';

        // Check if this file is part of a circular dependency
        if (!isFileInCircularDep(context.projectContext, context.filePath)) {
            return [];
        }

        // Get all cycles involving this file
        const cycles = getCircularDepsForFile(context.projectContext, context.filePath);

        return cycles.map((cycle) => createCircularDepIssue(context, cycle, severity));
    },
};

function createCircularDepIssue(
    context: RuleContext,
    cycle: CircularDependency,
    severity: 'info' | 'warning' | 'error',
): Rule['check'] extends (...args: any[]) => infer R ? R : never {
    // Format the cycle path
    const cyclePath = cycle.path.map((node) => {
        // Get just the filename for display
        const parts = node.split('/');
        return parts[parts.length - 1];
    });

    return {
        rule: 'no-circular-dependency',
        severity,

        file: context.filePath,
        line: 1,
        column: 1,

        message: buildCycleMessage(cyclePath),
        suggestion: buildSuggestion(cycle),
    };
}

function buildCycleMessage(cyclePath: string[]): string {
    if (cyclePath.length === 2 && cyclePath[0] === cyclePath[1]) {
        return `Module imports itself (self-reference)`;
    }

    return `Circular dependency detected: ${cyclePath.join(' → ')}`;
}

function buildSuggestion(cycle: CircularDependency): string {
    if (cycle.length === 1) {
        return 'Remove the self-reference import in this file.';
    }

    return `Consider using dependency injection or event-based communication to break this cycle.`;
}
