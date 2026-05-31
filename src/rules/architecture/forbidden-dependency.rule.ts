/**
 * Forbidden Dependency Rule
 *
 * Detects specific forbidden dependencies between files or layers.
 * Useful for enforcing project-specific architectural rules.
 */

import { getRuleOption } from '../../utils/rule-options';
import type { Rule, RuleContext } from '../../types/rule';
import type { ProjectContext } from '../../core/project';
import {
    detectLayer,
    LayerNames,
    type Layer,
} from '../../core/layers';

export interface ForbiddenDependencyOptions {
    /** List of forbidden file patterns (e.g., 'pages/* -> components/*') */
    files?: string[];
    /** List of forbidden layer pairs (e.g., 'ui -> utils') */
    layers?: Array<{ from: string; to: string }>;
    /** Severity level (default: error) */
    severity?: 'info' | 'warning' | 'error';
}

export const forbiddenDependencyRule: Rule<ForbiddenDependencyOptions> = {
    name: 'forbidden-dependency',

    meta: {
        severity: 'error',
        category: 'Architecture',
        description:
            'Detect specific forbidden dependencies. ' +
            'Use this to enforce project-specific architectural rules.',
        recommended: false,
    },

    async check(context: RuleContext & { projectContext?: ProjectContext }) {
        // Rule only works with project context
        if (!context.projectContext) {
            return [];
        }

        const severity = getRuleOption(
            context,
            'forbidden-dependency',
            'severity',
            'error'
        ) as 'info' | 'warning' | 'error';

        const filePath = context.filePath;

        // Get imports of this file
        const imports = context.projectContext.importGraph.get(filePath);
        if (!imports || imports.size === 0) {
            return [];
        }

        const issues = [];

        for (const importPath of imports) {
            // Check forbidden layer pairs
            const layerIssue = checkForbiddenLayer(context, filePath, importPath, severity);
            if (layerIssue) {
                issues.push(layerIssue);
            }

            // Check forbidden file patterns
            const patternIssue = checkForbiddenPattern(
                context,
                filePath,
                importPath,
                severity
            );
            if (patternIssue) {
                issues.push(patternIssue);
            }
        }

        return issues;
    },
};

function checkForbiddenLayer(
    context: RuleContext & { projectContext?: ProjectContext },
    fromFile: string,
    toFile: string,
    severity: 'info' | 'warning' | 'error'
) {
    const forbiddenLayers = getRuleOption<Array<{ from: string; to: string }>>(
        context,
        'forbidden-dependency',
        'layers',
        []
    );

    if (!forbiddenLayers || forbiddenLayers.length === 0) {
        return null;
    }

    const fromLayer = detectLayer(fromFile);
    const toLayer = detectLayer(toFile);

    if (!fromLayer || !toLayer) {
        return null;
    }

    const isForbidden = forbiddenLayers.some(
        (rule) =>
            rule.from.toLowerCase() === fromLayer &&
            rule.to.toLowerCase() === toLayer
    );

    if (isForbidden) {
        return {
            rule: 'forbidden-dependency',
            severity,

            file: fromFile,
            line: 1,
            column: 1,

            message: `Forbidden dependency: ${LayerNames[fromLayer]} → ${LayerNames[toLayer]}`,

            suggestion: `Remove this dependency or restructure the architecture.`,
        };
    }

    return null;
}

function checkForbiddenPattern(
    context: RuleContext & { projectContext?: ProjectContext },
    fromFile: string,
    toFile: string,
    severity: 'info' | 'warning' | 'error'
) {
    const forbiddenPatterns = getRuleOption<string[]>(
        context,
        'forbidden-dependency',
        'files',
        []
    );

    if (!forbiddenPatterns || forbiddenPatterns.length === 0) {
        return null;
    }

    const normalizedFrom = fromFile.replace(/\\/g, '/');
    const normalizedTo = toFile.replace(/\\/g, '/');

    for (const pattern of forbiddenPatterns) {
        if (matchesPattern(normalizedFrom, normalizedTo, pattern)) {
            return {
                rule: 'forbidden-dependency',
                severity,

                file: fromFile,
                line: 1,
                column: 1,

                message: `Forbidden dependency: ${fromFile} → ${toFile}`,

                suggestion: `This dependency violates project rules: ${pattern}`,
            };
        }
    }

    return null;
}

function matchesPattern(fromFile: string, toFile: string, pattern: string): boolean {
    // Pattern format: "source -> target" or "source => target"
    const parts = pattern.split(/\s*(?:->|=>)\s*/);
    if (parts.length !== 2) {
        return false;
    }

    const [sourcePattern, targetPattern] = parts;

    return (
        matchesGlob(fromFile, sourcePattern) && matchesGlob(toFile, targetPattern)
    );
}

function matchesGlob(filePath: string, pattern: string): boolean {
    // Simple glob matching
    const regex = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');

    return new RegExp(`^${regex}$`).test(filePath);
}
