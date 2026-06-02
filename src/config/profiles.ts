/**
 * Rule Profiles
 *
 * Predefined rule configurations for different team needs.
 */

export interface ProfileRuleConfig {
    /** Rule ID */
    rule: string;
    /** Enable/disable rule */
    enabled?: boolean;
    /** Severity level */
    severity?: 'error' | 'warning' | 'info';
    /** Custom thresholds */
    options?: Record<string, unknown>;
}

export interface RuleProfile {
    /** Profile name */
    name: string;
    /** Profile description */
    description: string;
    /** Profile type */
    type: 'strict' | 'recommended' | 'minimal' | 'custom';
    /** Rule configurations */
    rules: ProfileRuleConfig[];
    /** Recommended thresholds */
    thresholds?: {
        maxComponentSize?: number;
        maxCircularDepth?: number;
        maxFanOut?: number;
        maxStoreSize?: number;
        maxWatchers?: number;
    };
}

export const PROFILE_STRICT: RuleProfile = {
    name: 'strict',
    description: 'Maximum code quality standards for enterprise projects',
    type: 'strict',
    rules: [
        { rule: 'ai-monster-component', enabled: true, severity: 'error', options: { maxScore: 15 } },
        { rule: 'no-circular', enabled: true, severity: 'error' },
        { rule: 'component-coupling', enabled: true, severity: 'warning', options: { maxDeps: 5 } },
        { rule: 'cross-store-dependency', enabled: true, severity: 'error' },
        { rule: 'excessive-dom-depth', enabled: true, severity: 'warning', options: { maxDepth: 15 } },
        { rule: 'store-size', enabled: true, severity: 'warning', options: { maxProps: 15 } },
        { rule: 'god-component', enabled: true, severity: 'error', options: { maxResponsibilities: 3 } },
        { rule: 'ssr-unsafe-api', enabled: true, severity: 'error' },
        { rule: 'deep-reactive', enabled: true, severity: 'warning', options: { maxDepth: 3 } },
        { rule: 'ref-vs-reactive', enabled: true, severity: 'info' },
        { rule: 'prop-drilling', enabled: true, severity: 'warning', options: { maxDepth: 3 } },
        { rule: 'magic-strings', enabled: true, severity: 'info' },
    ],
    thresholds: {
        maxComponentSize: 200,
        maxCircularDepth: 1,
        maxFanOut: 5,
        maxStoreSize: 20,
        maxWatchers: 5,
    },
};

export const PROFILE_RECOMMENDED: RuleProfile = {
    name: 'recommended',
    description: 'Balanced rules for most Vue projects',
    type: 'recommended',
    rules: [
        { rule: 'ai-monster-component', enabled: true, severity: 'warning', options: { maxScore: 20 } },
        { rule: 'no-circular', enabled: true, severity: 'error' },
        { rule: 'component-coupling', enabled: true, severity: 'warning', options: { maxDeps: 8 } },
        { rule: 'cross-store-dependency', enabled: true, severity: 'warning' },
        { rule: 'excessive-dom-depth', enabled: true, severity: 'warning', options: { maxDepth: 20 } },
        { rule: 'store-size', enabled: true, severity: 'warning', options: { maxProps: 25 } },
        { rule: 'god-component', enabled: true, severity: 'warning', options: { maxResponsibilities: 5 } },
        { rule: 'ssr-unsafe-api', enabled: true, severity: 'error' },
        { rule: 'deep-reactive', enabled: true, severity: 'info', options: { maxDepth: 5 } },
        { rule: 'ref-vs-reactive', enabled: true, severity: 'info' },
        { rule: 'prop-drilling', enabled: true, severity: 'info', options: { maxDepth: 5 } },
        { rule: 'magic-strings', enabled: false },
    ],
    thresholds: {
        maxComponentSize: 350,
        maxCircularDepth: 2,
        maxFanOut: 8,
        maxStoreSize: 30,
        maxWatchers: 8,
    },
};

export const PROFILE_MINIMAL: RuleProfile = {
    name: 'minimal',
    description: 'Lightweight checks for quick iterations',
    type: 'minimal',
    rules: [
        { rule: 'ai-monster-component', enabled: true, severity: 'warning', options: { maxScore: 30 } },
        { rule: 'no-circular', enabled: true, severity: 'error' },
        { rule: 'component-coupling', enabled: true, severity: 'info', options: { maxDeps: 12 } },
        { rule: 'cross-store-dependency', enabled: false },
        { rule: 'excessive-dom-depth', enabled: false },
        { rule: 'store-size', enabled: false },
        { rule: 'god-component', enabled: false },
        { rule: 'ssr-unsafe-api', enabled: true, severity: 'warning' },
        { rule: 'deep-reactive', enabled: false },
        { rule: 'ref-vs-reactive', enabled: false },
        { rule: 'prop-drilling', enabled: false },
        { rule: 'magic-strings', enabled: false },
    ],
    thresholds: {
        maxComponentSize: 500,
        maxCircularDepth: 3,
        maxFanOut: 12,
        maxStoreSize: 50,
        maxWatchers: 10,
    },
};

export const ALL_PROFILES: RuleProfile[] = [
    PROFILE_STRICT,
    PROFILE_RECOMMENDED,
    PROFILE_MINIMAL,
];

/**
 * Get profile by name
 */
export function getProfile(name: string): RuleProfile | undefined {
    return ALL_PROFILES.find((p) => p.name === name);
}

/**
 * Get default profile
 */
export function getDefaultProfile(): RuleProfile {
    return PROFILE_RECOMMENDED;
}

/**
 * Merge custom rules into base profile
 */
export function mergeProfileConfig(base: RuleProfile, custom: Partial<RuleProfile>): RuleProfile {
    const mergedRules = [...base.rules];

    if (custom.rules) {
        for (const customRule of custom.rules) {
            const existingIndex = mergedRules.findIndex((r) => r.rule === customRule.rule);
            if (existingIndex >= 0) {
                mergedRules[existingIndex] = { ...mergedRules[existingIndex], ...customRule };
            } else {
                mergedRules.push(customRule);
            }
        }
    }

    return {
        ...base,
        ...custom,
        rules: mergedRules,
        type: custom.type || base.type,
    };
}
