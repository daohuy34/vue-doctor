/**
 * Layer Violation Rule
 *
 * Detects when a file depends on another file in a higher (not allowed) layer.
 * This helps maintain architectural boundaries.
 */

import { getRuleOption } from '../../utils/rule-options';
import type { Rule, RuleContext } from '../../types/rule';
import type { ProjectContext } from '../../core/project';
import {
    detectLayer,
    isValidLayerDependency,
    LayerNames,
    type Layer,
} from '../../core/layers';

export interface LayerViolationOptions {
    /** Custom layer hierarchy */
    hierarchy?: string[];
    /** Severity level (default: warning) */
    severity?: 'info' | 'warning' | 'error';
}

export const layerViolationRule: Rule<LayerViolationOptions> = {
    name: 'layer-violation',

    meta: {
        severity: 'warning',
        category: 'Architecture',
        description:
            'Detect architectural layer violations. ' +
            'Files in higher layers should not depend on files in lower layers.',
        recommended: false,
    },

    async check(context: RuleContext & { projectContext?: ProjectContext }) {
        // Rule only works with project context
        if (!context.projectContext) {
            return [];
        }

        const severity = getRuleOption(context, 'layer-violation', 'severity', 'warning') as
            | 'info'
            | 'warning'
            | 'error';

        const filePath = context.filePath;
        const fromLayer = detectLayer(filePath);

        if (!fromLayer) {
            return [];
        }

        // Get imports of this file
        const imports = context.projectContext.importGraph.get(filePath);
        if (!imports || imports.size === 0) {
            return [];
        }

        const issues = [];

        for (const importPath of imports) {
            // Check if import is internal (relative or alias)
            if (!isInternalImport(importPath)) {
                continue;
            }

            const toLayer = detectLayer(importPath);
            if (!toLayer) {
                continue;
            }

            // Check if this is a layer violation
            if (!isValidLayerDependency(fromLayer, toLayer)) {
                issues.push({
                    rule: 'layer-violation',
                    severity,

                    file: filePath,
                    line: 1,
                    column: 1,

                    message: `${LayerNames[fromLayer]} imports from ${LayerNames[toLayer]}`,

                    suggestion: buildSuggestion(fromLayer, toLayer),
                });
            }
        }

        return issues;
    },
};

function isInternalImport(importPath: string): boolean {
    // Relative imports
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
        return true;
    }

    // Alias imports
    if (importPath.startsWith('@/') || importPath.startsWith('~/')) {
        return true;
    }

    return false;
}

function buildSuggestion(fromLayer: Layer, toLayer: Layer): string {
    return `Consider restructuring to follow the dependency rule: ${LayerNames[fromLayer]} should not depend on ${LayerNames[toLayer]}.`;
}
