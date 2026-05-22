import type { Rule } from '../types/rule';
import type { VueDoctorPlugin } from '../types/plugin';

export function validateRule(rule: unknown): rule is Rule {
    return (
        typeof rule === 'object' &&
        rule !== null &&
        'name' in rule &&
        'check' in rule
    );
}

export function normalizePlugins(plugins: VueDoctorPlugin[] = []): Rule[] {
    const result: Rule[] = [];

    for (const plugin of plugins) {
        const rules = Array.isArray(plugin) ? plugin : [plugin];

        for (const rule of rules) {
            if (!validateRule(rule)) {
                throw new Error(`Invalid plugin rule`);
            }

            result.push(rule);
        }
    }

    return result;
}
