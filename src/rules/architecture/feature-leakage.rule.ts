/**
 * Feature Leakage Rule
 *
 * Detects when a feature imports internal modules of another feature.
 * Features should only import from the public API of other features.
 */

import { getRuleOption } from '../../utils/rule-options';
import type { Rule, RuleContext } from '../../types/rule';
import type { ProjectContext } from '../../core/project';
import {
    detectFeatureLeakage,
    detectFeature,
    isPublicApi,
    type FeatureLeakage,
    type FeatureConfig,
} from '../../core/features';

export interface FeatureLeakageOptions {
    /** Feature directory patterns */
    patterns?: string[];
    /** Directories to ignore */
    ignore?: string[];
    /** Severity level (default: warning) */
    severity?: 'info' | 'warning' | 'error';
}

export const featureLeakageRule: Rule<FeatureLeakageOptions> = {
    name: 'feature-leakage',

    meta: {
        severity: 'warning',
        category: 'Architecture',
        description:
            'Detect when features import internal modules of other features. ' +
            'Features should only use the public API of other features.',
        recommended: false,
    },

    async check(context: RuleContext & { projectContext?: ProjectContext }) {
        // Rule only works with project context
        if (!context.projectContext) {
            return [];
        }

        const severity = getRuleOption(
            context,
            'feature-leakage',
            'severity',
            'warning'
        ) as 'info' | 'warning' | 'error';

        // Get config
        const patterns = getRuleOption<string[]>(
            context,
            'feature-leakage',
            'patterns',
            ['features/', 'modules/', 'domains/']
        );
        const ignore = getRuleOption<string[]>(
            context,
            'feature-leakage',
            'ignore',
            ['node_modules/', 'dist/', 'build/']
        );

        const config: FeatureConfig = { patterns, ignore };

        const filePath = context.filePath;
        const sourceFeature = detectFeature(filePath, config);

        if (!sourceFeature) {
            return [];
        }

        // Get imports of this file
        const imports = context.projectContext.importGraph.get(filePath);
        if (!imports || imports.size === 0) {
            return [];
        }

        const issues = [];

        for (const importPath of imports) {
            const leakage = detectFeatureLeakage(filePath, importPath, config);

            if (!leakage) {
                continue;
            }

            // If it's not using public API, it's a violation
            if (!leakage.isPublicApi) {
                issues.push({
                    rule: 'feature-leakage',
                    severity,

                    file: filePath,
                    line: 1,
                    column: 1,

                    message: buildMessage(leakage),

                    suggestion: buildSuggestion(leakage),
                });
            }
        }

        return issues;
    },
};

function buildMessage(leakage: FeatureLeakage): string {
    return `Feature '${leakage.sourceFeature}' imports internal module from '${leakage.targetFeature}'`;
}

function buildSuggestion(leakage: FeatureLeakage): string {
    const publicApiPath = `${leakage.targetFeature}/index`;
    return `Import from the public API instead: import from '${publicApiPath}'`;
}
