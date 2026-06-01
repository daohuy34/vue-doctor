/**
 * Store Bloat Rule (Pinia)
 *
 * Detects overly large Pinia stores that may hurt maintainability.
 */

import { getRuleOption } from '../../utils/rule-options';
import { type Rule, type RuleContext } from '../../types/rule';
import {
    parsePiniaStore,
    analyzeStore,
    isStoreBloated,
} from '../../utils/pinia-detector';

export interface StoreBloatOptions {
    /** Maximum lines in a store (default: 300) */
    maxLines?: number;
    /** Maximum state properties (default: 15) */
    maxStateProperties?: number;
    /** Severity level (default: warning) */
    severity?: 'info' | 'warning' | 'error';
}

export const storeBloatRule: Rule<StoreBloatOptions> = {
    name: 'store-bloat',

    meta: {
        severity: 'warning',
        category: 'Maintainability',
        description:
            'Detect overly large Pinia stores. ' +
            'Large stores hurt maintainability and may indicate too many responsibilities.',
        recommended: false,
    },

    async check(context: RuleContext) {
        const maxLines = getRuleOption(context, 'store-bloat', 'maxLines', 300);
        const maxStateProperties = getRuleOption(context, 'store-bloat', 'maxStateProperties', 15);
        const severity = getRuleOption(context, 'store-bloat', 'severity', 'warning') as
            | 'info'
            | 'warning'
            | 'error';

        const filePath = context.filePath;
        const source = context.source;

        // Parse the store
        const store = parsePiniaStore(source, filePath);
        if (!store) {
            return [];
        }

        const analysis = analyzeStore(store);

        // Check for bloat
        if (!isStoreBloated(analysis)) {
            return [];
        }

        const issues = [];

        // Check line count
        if (store.lineCount > maxLines) {
            issues.push({
                rule: 'store-bloat',
                severity,

                file: filePath,
                line: 1,
                column: 1,

                message: `Store has ${store.lineCount} lines (max recommended: ${maxLines})`,

                suggestion: buildLineSuggestion(store.lineCount, maxLines),
            });
        }

        // Check state properties
        if (analysis.stateSize > maxStateProperties) {
            issues.push({
                rule: 'store-bloat',
                severity,

                file: filePath,
                line: 1,
                column: 1,

                message: `Store has ${analysis.stateSize} state properties (max recommended: ${maxStateProperties})`,

                suggestion: 'Consider splitting this store by domain or feature.',
            });
        }

        // Check total size
        const totalSize = analysis.stateSize + analysis.getterCount + analysis.actionCount;
        if (totalSize > 30) {
            issues.push({
                rule: 'store-bloat',
                severity,

                file: filePath,
                line: 1,
                column: 1,

                message: `Store has ${totalSize} total members (state + getters + actions)`,

                suggestion: 'Consider splitting this store into smaller, focused stores.',
            });
        }

        return issues;
    },
};

function buildLineSuggestion(lineCount: number, maxLines: number): string {
    const excess = lineCount - maxLines;

    if (excess < 50) {
        return 'Consider extracting some logic into composables or splitting by feature.';
    }

    if (excess < 150) {
        return 'This store is getting large. Consider splitting it by domain or feature.';
    }

    return 'This store is too large. Consider a major refactor: split into multiple focused stores.';
}
