import type { Rule } from './rule';
import type { Issue } from './issue';
import type { RuleContext } from './context';

/**
 * Plugin hook points in the analysis lifecycle
 */
export type PluginHook =
    | 'before:analysis'      // Before running all rules
    | 'after:analysis'       // After running all rules
    | 'before:check'         // Before checking each file
    | 'after:check'          // After checking each file
    | 'before:rule'          // Before running a rule
    | 'after:rule';          // After running a rule

/**
 * Hook context passed to plugin hooks
 */
export interface HookContext {
    filePath?: string;
    ruleName?: string;
    issues: Issue[];
    config: Record<string, unknown>;
}

/**
 * Plugin metadata
 */
export interface PluginMeta {
    name: string;
    version: string;
    description?: string;
    author?: string;
    homepage?: string;
    repository?: string;
    keywords?: string[];
}

/**
 * Plugin configuration options
 */
export interface PluginOptions {
    [key: string]: unknown;
}

/**
 * Vue Doctor Plugin - can be a rule, array of rules, or a full plugin object
 */
export type VueDoctorPlugin =
    | Rule
    | Rule[]
    | PluginDefinition;

/**
 * Full plugin definition with metadata, rules, hooks, and options
 */
export interface PluginDefinition {
    /** Plugin metadata */
    meta: PluginMeta;

    /** Rules provided by this plugin */
    rules?: Rule[];

    /** Lifecycle hooks */
    hooks?: Record<PluginHook, (context: HookContext) => void | Promise<void>>;

    /** Default options for this plugin's rules */
    options?: PluginOptions;

    /** Plugin-specific configuration */
    config?: PluginOptions;
}

/**
 * Resolved plugin with normalized rules and hooks
 */
export interface ResolvedPlugin {
    meta: PluginMeta;
    rules: Rule[];
    hooks: Record<PluginHook, ((context: HookContext) => void | Promise<void>)[]>;
    options: PluginOptions;
    source: string; // npm package name or local path
}

/**
 * Plugin manifest (in package.json of plugin)
 */
export interface PluginManifest {
    name: string;
    version: string;
    vueDoctor?: {
        rules?: string | string[];
        hooks?: Record<PluginHook, string>;
        options?: PluginOptions;
    };
    main?: string;
    exports?: Record<string, string>;
}
