/**
 * Store God Object Rule (Pinia)
 *
 * Detects Pinia stores that have too many responsibilities (god objects).
 * A god object knows too much or does too much.
 */

import { getRuleOption } from '../../utils/rule-options';
import { type Rule, type RuleContext } from '../../types/rule';
import {
    parsePiniaStore,
    analyzeStore,
    isGodObject,
} from '../../utils/pinia-detector';

export interface StoreGodObjectOptions {
    /** Maximum state properties (default: 20) */
    maxStateProperties?: number;
    /** Maximum actions (default: 15) */
    maxActions?: number;
    /** Severity level (default: warning) */
    severity?: 'info' | 'warning' | 'error';
}

export const storeGodObjectRule: Rule<StoreGodObjectOptions> = {
    name: 'store-god-object',

    meta: {
        severity: 'warning',
        category: 'Architecture',
        description:
            'Detect Pinia stores that have too many responsibilities (god objects). ' +
            'God objects are hard to maintain, test, and understand.',
        recommended: false,
    },

    async check(context: RuleContext) {
        const maxStateProperties = getRuleOption(context, 'store-god-object', 'maxStateProperties', 20);
        const maxActions = getRuleOption(context, 'store-god-object', 'maxActions', 15);
        const severity = getRuleOption(context, 'store-god-object', 'severity', 'warning') as
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

        // Check for god object
        if (!isGodObject(analysis)) {
            return [];
        }

        const issues = [];

        // Too many state properties
        if (analysis.stateSize > maxStateProperties) {
            issues.push({
                rule: 'store-god-object',
                severity,

                file: filePath,
                line: 1,
                column: 1,

                message: `Store has ${analysis.stateSize} state properties (max: ${maxStateProperties}). This looks like a "god object".`,

                suggestion: buildStateSuggestion(analysis.stateSize, maxStateProperties),
            });
        }

        // Too many actions
        if (analysis.actionCount > maxActions) {
            issues.push({
                rule: 'store-god-object',
                severity,

                file: filePath,
                line: 1,
                column: 1,

                message: `Store has ${analysis.actionCount} actions (max: ${maxActions}). This looks like a "god object".`,

                suggestion: buildActionSuggestion(analysis.actionCount, maxActions),
            });
        }

        return issues;
    },
};

function buildStateSuggestion(stateSize: number, max: number): string {
    const excess = stateSize - max;

    return `This store manages ${stateSize} state properties. ` +
        `Consider splitting by domain: userStore, productStore, cartStore, etc.`;
}

function buildActionSuggestion(actionCount: number, max: number): string {
    const excess = actionCount - max;

    return `This store has ${actionCount} actions. ` +
        `Consider splitting by responsibility: userAuthStore, userProfileStore, etc.`;
}
