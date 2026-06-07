import type { Rule } from '../types/rule';
import type { VueDoctorPlugin, PluginDefinition, ResolvedPlugin } from '../types/plugin';
import { loadPlugins } from './plugin-loader';
import { PluginRunner } from './plugin-runner';

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

export function isPluginDefinition(plugin: unknown): plugin is PluginDefinition {
    return (
        typeof plugin === 'object' &&
        plugin !== null &&
        'meta' in plugin &&
        typeof (plugin as PluginDefinition).meta === 'object'
    );
}

export async function resolvePlugins(
    plugins: (VueDoctorPlugin | string)[] = []
): Promise<{ rules: Rule[]; resolved: ResolvedPlugin[]; runner: PluginRunner }> {
    const sources: string[] = [];
    const inlinePlugins: VueDoctorPlugin[] = [];

    for (const plugin of plugins) {
        if (typeof plugin === 'string') {
            sources.push(plugin);
        } else {
            inlinePlugins.push(plugin);
        }
    }

    const resolvedPlugins = await loadPlugins(sources);

    const allRules = [
        ...normalizePlugins(inlinePlugins),
        ...resolvedPlugins.flatMap((plugin) => plugin.rules ?? []),
    ];

    return {
        rules: allRules,
        resolved: resolvedPlugins,
        runner: new PluginRunner(resolvedPlugins),
    };
}

export { PluginRunner } from './plugin-runner';
export { loadPlugins, loadPlugin } from './plugin-loader';
