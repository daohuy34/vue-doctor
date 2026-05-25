import type { RuleContext } from '../types/context';

export function getRuleOption<T>(
    context: RuleContext,
    ruleName: string,
    key: string,
    fallback: T,
): T {
    const options = context.config?.ruleOptions?.[ruleName];

    if (!options) {
        return fallback;
    }

    const value = options[key];

    if (value === undefined) {
        return fallback;
    }

    return value as T;
}
