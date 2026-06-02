/**
 * Architecture Policies
 *
 * Team-wide architecture enforcement rules.
 */

export type PolicySeverity = 'error' | 'warning' | 'info';

export interface PolicyCondition {
    /** Field to check */
    field: string;
    /** Operator */
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'contains';
    /** Threshold value */
    value: number | string;
}

export interface Policy {
    /** Policy ID */
    id: string;
    /** Policy name */
    name: string;
    /** Policy description */
    description: string;
    /** Category */
    category: 'architecture' | 'performance' | 'maintainability' | 'security';
    /** Whether enabled */
    enabled: boolean;
    /** Severity when violated */
    severity: PolicySeverity;
    /** Conditions to check */
    conditions: PolicyCondition[];
    /** Policy message template */
    message: string;
    /** Suggested fix */
    fix?: string;
}

export interface PolicyViolation {
    policy: Policy;
    actualValue: number | string;
    threshold: number | string;
    location?: string;
}

/**
 * Built-in architecture policies
 */
export const ARCHITECTURE_POLICIES: Policy[] = [
    {
        id: 'max-component-size',
        name: 'Component Size Limit',
        description: 'Components should not exceed defined line count',
        category: 'maintainability',
        enabled: true,
        severity: 'warning',
        conditions: [{ field: 'componentSize', operator: 'gt', value: 300 }],
        message: 'Component {{location}} has {{actualValue}} lines, exceeds limit of {{threshold}}',
    },
    {
        id: 'no-deep-circular-deps',
        name: 'No Deep Circular Dependencies',
        description: 'Circular dependencies should be eliminated',
        category: 'architecture',
        enabled: true,
        severity: 'error',
        conditions: [{ field: 'circularDepth', operator: 'gt', value: 1 }],
        message: 'Circular dependency detected with depth {{actualValue}}',
    },
    {
        id: 'max-store-size',
        name: 'Store Size Limit',
        description: 'Pinia stores should not have too many state properties',
        category: 'maintainability',
        enabled: true,
        severity: 'warning',
        conditions: [{ field: 'storeStateProps', operator: 'gt', value: 25 }],
        message: 'Store {{location}} has {{actualValue}} state properties, consider splitting',
    },
    {
        id: 'max-fan-out',
        name: 'Component Fan-out Limit',
        description: 'Components should not depend on too many other components',
        category: 'architecture',
        enabled: true,
        severity: 'warning',
        conditions: [{ field: 'fanOut', operator: 'gt', value: 8 }],
        message: 'Component {{location}} has {{actualValue}} dependencies, exceeds {{threshold}}',
    },
    {
        id: 'no-cross-store-deps',
        name: 'No Cross-Store Dependencies',
        description: 'Stores should not depend on other stores directly',
        category: 'architecture',
        enabled: true,
        severity: 'error',
        conditions: [{ field: 'crossStoreDeps', operator: 'gt', value: 0 }],
        message: 'Store {{location}} depends on another store',
        fix: 'Use composables or shared state instead of direct store imports',
    },
    {
        id: 'max-nested-watchers',
        name: 'Max Nested Watchers',
        description: 'Deep watcher nesting causes performance issues',
        category: 'performance',
        enabled: true,
        severity: 'warning',
        conditions: [{ field: 'nestedWatchers', operator: 'gt', value: 3 }],
        message: 'Found {{actualValue}} nested watchers, max allowed is {{threshold}}',
    },
    {
        id: 'ssr-compatible',
        name: 'SSR Compatibility',
        description: 'Code must be SSR-safe in Nuxt projects',
        category: 'security',
        enabled: true,
        severity: 'error',
        conditions: [{ field: 'ssrUnsafeApis', operator: 'gt', value: 0 }],
        message: 'SSR-unsafe APIs detected in {{location}}',
        fix: 'Use onMounted() or import.meta.client checks for browser-only APIs',
    },
    {
        id: 'no-god-components',
        name: 'No God Components',
        description: 'Components should have single responsibility',
        category: 'maintainability',
        enabled: true,
        severity: 'warning',
        conditions: [{ field: 'responsibilities', operator: 'gt', value: 5 }],
        message: 'Component {{location}} has {{actualValue}} responsibilities',
        fix: 'Extract child components or use composables',
    },
];

/**
 * Evaluate policies against metrics
 */
export function evaluatePolicies(
    metrics: Record<string, number | string>,
    policies: Policy[] = ARCHITECTURE_POLICIES,
    location?: string
): PolicyViolation[] {
    const violations: PolicyViolation[] = [];

    for (const policy of policies) {
        if (!policy.enabled) continue;

        for (const condition of policy.conditions) {
            const actualValue = metrics[condition.field];

            if (actualValue === undefined) continue;

            const violated = checkCondition(actualValue, condition);

            if (violated) {
                violations.push({
                    policy,
                    actualValue,
                    threshold: condition.value,
                    location,
                });
                break; // Only report each policy once
            }
        }
    }

    return violations;
}

function checkCondition(actual: number | string, condition: PolicyCondition): boolean {
    switch (condition.operator) {
        case 'gt':
            return typeof actual === 'number' && actual > (condition.value as number);
        case 'lt':
            return typeof actual === 'number' && actual < (condition.value as number);
        case 'gte':
            return typeof actual === 'number' && actual >= (condition.value as number);
        case 'lte':
            return typeof actual === 'number' && actual <= (condition.value as number);
        case 'eq':
            return actual === condition.value;
        case 'contains':
            return typeof actual === 'string' && actual.includes(condition.value as string);
        default:
            return false;
    }
}

/**
 * Format policy violation message
 */
export function formatViolationMessage(violation: PolicyViolation): string {
    let message = violation.policy.message;
    message = message.replace('{{actualValue}}', String(violation.actualValue));
    message = message.replace('{{threshold}}', String(violation.threshold));
    message = message.replace('{{location}}', violation.location || 'unknown');
    return message;
}

/**
 * Get policies by category
 */
export function getPoliciesByCategory(category: Policy['category']): Policy[] {
    return ARCHITECTURE_POLICIES.filter((p) => p.category === category);
}

/**
 * Get policy summary
 */
export function getPolicySummary(violations: PolicyViolation[]): Record<PolicySeverity, number> {
    return {
        error: violations.filter((v) => v.policy.severity === 'error').length,
        warning: violations.filter((v) => v.policy.severity === 'warning').length,
        info: violations.filter((v) => v.policy.severity === 'info').length,
    };
}
