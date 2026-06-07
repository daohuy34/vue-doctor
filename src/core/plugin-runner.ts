import type { ResolvedPlugin, HookContext, PluginHook } from '../types/plugin';

/**
 * PluginRunner orchestrates lifecycle hooks from resolved plugins.
 */
export class PluginRunner {
    private readonly plugins: ResolvedPlugin[];

    constructor(plugins: ResolvedPlugin[]) {
        this.plugins = plugins;
    }

    private buildContext(partial: Partial<HookContext> = {}): HookContext {
        return {
            issues: [],
            config: {},
            ...partial,
        };
    }

    async runHook(hook: PluginHook, context: Partial<HookContext> = {}): Promise<HookContext> {
        const fullContext = this.buildContext(context);

        for (const plugin of this.plugins) {
            const hooks = plugin.hooks[hook];
            if (!hooks?.length) continue;

            for (const fn of hooks) {
                try {
                    const result = fn(fullContext);
                    if (result && typeof result.then === 'function') {
                        await result;
                    }
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    fullContext.issues.push({
                        rule: plugin.meta.name,
                        severity: 'warning',
                        message: `Plugin hook "${hook}" failed in "${plugin.meta.name}": ${message}`,
                        file: context.filePath,
                    });
                }
            }
        }

        return fullContext;
    }

    getPlugins(): ResolvedPlugin[] {
        return this.plugins;
    }
}
