import type { PluginDefinition, PluginManifest, ResolvedPlugin, VueDoctorPlugin } from '../types/plugin';
import type { Rule } from '../types/rule';

const DEFAULT_PLUGIN_ENTRYPOINTS = [
    'vue-doctor-plugin',
    'vue-doctor',
    'index',
];

const DEFAULT_PLUGIN_EXTS = ['.mjs', '.js', '.ts', '.json'];

async function tryResolveEntry(source: string): Promise<string | null> {
    for (const entry of DEFAULT_PLUGIN_ENTRYPOINTS) {
        for (const ext of DEFAULT_PLUGIN_EXTS) {
            const candidate = source + '/' + entry + ext;
            if (candidate.startsWith('file://')) {
                return candidate;
            }
            try {
                const resolved = await import.meta.resolve(candidate);
                if (resolved) return resolved;
            } catch {
                // keep trying
            }
        }
    }

    return null;
}

async function tryResolveModuleId(source: string): Promise<string | null> {
    if (source.startsWith('file://')) return source;
    if (source.startsWith('.')) return source;

    try {
        const resolved = await import.meta.resolve(source);
        if (resolved) return resolved;
    } catch {
        // fallback to direct import
    }

    try {
        await import(source);
        return source;
    } catch {
        return null;
    }
}

function normalizeRules(rules: unknown): Rule[] {
    if (!rules) return [];

    if (Array.isArray(rules)) {
        return rules.filter((item): item is Rule => {
            return (
                typeof item === 'object' &&
                item !== null &&
                typeof (item as Rule).name === 'string' &&
                typeof (item as Rule).check === 'function'
            );
        });
    }

    if (typeof rules === 'object') {
        const keys = Object.keys(rules as Record<string, unknown>);
        const normalized: Rule[] = [];

        for (const key of keys) {
            const value = rules[key];
            if (typeof value === 'object' && value !== null) {
                normalized.push({
                    ...(value as Partial<Rule>),
                    name: (value as Partial<Rule>).name ?? key,
                    check: (value as Partial<Rule>).check ?? (async () => []),
                    meta: (value as Partial<Rule>).meta ?? {
                        severity: 'warning',
                        category: 'plugin',
                        description: '',
                        recommended: false,
                    },
                } as Rule);
            }
        }

        if (normalized.length > 0) return normalized;
    }

    return [];
}

function normalizeHooks(hooks: unknown): Record<string, ((context: unknown) => void | Promise<void>)[]> {
    const validHooks = [
        'before:analysis',
        'after:analysis',
        'before:check',
        'after:check',
        'before:rule',
        'after:rule',
    ];

    if (!hooks || typeof hooks !== 'object') return {};

    const normalized: Record<string, ((context: unknown) => void | Promise<void>)[]> = {};

    for (const hook of validHooks) {
        const value = (hooks as Record<string, unknown>)[hook];
        if (Array.isArray(value)) {
            const listeners = value.filter((item): item is (context: unknown) => void | Promise<void> => {
                return typeof item === 'function';
            });
            if (listeners.length > 0) normalized[hook] = listeners;
        } else if (typeof value === 'function') {
            normalized[hook] = [value];
        }
    }

    return normalized;
}

function extractManifest(module: unknown): PluginManifest | null {
    if (!module || typeof module !== 'object') return null;

    const record = module as Record<string, unknown>;
    const manifest = record.vueDoctorManifest ?? record.vueDoctor ?? record.default;

    if (manifest && typeof manifest === 'object') {
        return manifest as PluginManifest;
    }

    return null;
}

function loadManifestFromPackageJson(source: string): PluginManifest | null {
    if (!source || source.startsWith('file://')) return null;

    const packageJsonPath = source + '/package.json';
    try {
        // Use dynamic require only when absolutely necessary and when the source is a filesystem path.
        if (packageJsonPath.startsWith('.')) {
            const mod = require(packageJsonPath);
            return (mod?.default ?? mod) as PluginManifest | null;
        }
    } catch {
        // ignore
    }

    return null;
}

export async function loadPlugin(source: string): Promise<ResolvedPlugin> {
    let moduleId = await tryResolveModuleId(source);
    if (!moduleId) {
        moduleId = await tryResolveEntry(source);
    }

    if (!moduleId) {
        throw new Error(`Unable to resolve vue-doctor plugin: ${source}`);
    }

    let pluginModule: unknown;

    try {
        pluginModule = await import(moduleId);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to load plugin "${source}": ${message}`);
    }

    const manifest = extractManifest(pluginModule) ?? loadManifestFromPackageJson(moduleId);

    const pluginDefinition = pluginModule as Record<string, unknown>;

    const meta = {
        name: manifest?.name ?? pluginDefinition.name ?? source,
        version: manifest?.version ?? pluginDefinition.version ?? '0.0.0',
        description: manifest?.name
            ? String(manifest.name)
            : pluginDefinition.description ?? undefined,
        author: pluginDefinition.author ?? undefined,
        homepage: pluginDefinition.homepage ?? undefined,
        repository: pluginDefinition.repository ?? undefined,
        keywords: pluginDefinition.keywords ?? undefined,
    };

    const rules = normalizeRules(
        pluginDefinition.rules ??
            pluginDefinition.default?.rules ??
            manifest?.vueDoctor?.rules
    );

    if (!rules.length && typeof pluginDefinition.default === 'function') {
        const defaultExport = pluginModule as { default: PluginDefinition | Rule | Rule[] };
        const exported = defaultExport.default;
        if (Array.isArray(exported) || (typeof exported === 'object' && exported !== null)) {
            const resolvedRules = normalizeRules(exported as Rule[] | PluginDefinition['rules']);
            if (resolvedRules.length) rules.push(...resolvedRules);
        }
    }

    const hooks = normalizeHooks(
        pluginDefinition.hooks ??
            pluginDefinition.default?.hooks ??
            manifest?.vueDoctor?.hooks
    );

    const options = {
        ...(pluginDefinition.options ?? {}),
        ...(pluginDefinition.default?.options ?? {}),
        ...(manifest?.vueDoctor?.options ?? {}),
    };

    return {
        meta,
        rules,
        hooks,
        options,
        source,
    };
}

export async function loadPlugins(sources: string[] = []): Promise<ResolvedPlugin[]> {
    const results: ResolvedPlugin[] = [];

    for (const source of sources) {
        try {
            const resolved = await loadPlugin(source);
            results.push(resolved);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            results.push({
                meta: {
                    name: source,
                    version: '0.0.0',
                },
                rules: [],
                hooks: {},
                options: {},
                source,
                error: message,
            });
        }
    }

    return results;
}

export { normalizeRules, normalizeHooks, DEFAULT_PLUGIN_ENTRYPOINTS, DEFAULT_PLUGIN_EXTS };
