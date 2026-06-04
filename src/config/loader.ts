/**
 * Config Loader
 *
 * Loads and merges configuration from various sources.
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { RuleProfile } from './profiles';
import type { Policy } from './policies';
import {
    getProfile,
    getDefaultProfile,
    mergeProfileConfig,
    PROFILE_RECOMMENDED,
    PROFILE_STRICT,
    PROFILE_MINIMAL,
} from './profiles';
import { ARCHITECTURE_POLICIES } from './policies';

export interface FeatureBoundary {
    name: string;
    pattern: string;
    allowedBy?: string[];
    children?: boolean;
}

export interface VueDoctorConfig {
    /** Profile name or custom profile */
    profile?: string | RuleProfile;
    /** Override specific rules */
    rules?: Record<string, { enabled?: boolean; severity?: string; options?: Record<string, unknown> }>;
    /** Architecture policies */
    policies?: Partial<Policy>[];
    /** Include patterns */
    include?: string[];
    /** Exclude patterns */
    exclude?: string[];
    /** Reporter */
    reporter?: 'stylish' | 'json' | 'html' | 'sarif';
    /** Fail on severity */
    failOn?: 'error' | 'warning' | 'none';
    /** Thresholds */
    thresholds?: {
        maxComponentSize?: number;
        maxCircularDepth?: number;
        maxFanOut?: number;
        maxStoreSize?: number;
        maxWatchers?: number;
    };
    /** Feature boundaries */
    boundaries?: FeatureBoundary[];
    /** Hotspot detection threshold (0-100) */
    hotspotThreshold?: number;
    /** Shared module threshold (max imports from shared/) */
    sharedModuleThreshold?: number;
    /** Cache configuration */
    cache?: {
        enabled?: boolean;
        ttl?: number;
    };
    /** Report settings */
    report?: {
        formats?: string[];
        output?: string;
    };
}

let cachedConfig: VueDoctorConfig | null = null;

/**
 * Load config from package.json or vue-doctor.config.js
 */
export async function loadConfig(cwd: string = process.cwd()): Promise<VueDoctorConfig> {
    if (cachedConfig) return cachedConfig;

    // Try vue-doctor.config.js first
    const configPaths = [
        join(cwd, 'vue-doctor.config.js'),
        join(cwd, 'vue-doctor.config.ts'),
        join(cwd, 'vue-doctor.config.mjs'),
    ];

    for (const configPath of configPaths) {
        if (existsSync(configPath)) {
            try {
                const module = await import(configPath);
                cachedConfig = module.default || module;
                return cachedConfig!;
            } catch {
                // Continue to next option
            }
        }
    }

    // Try package.json
    const packageJsonPath = join(cwd, 'package.json');
    if (existsSync(packageJsonPath)) {
        try {
            const content = await readFile(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(content);
            if (packageJson.vueDoctor) {
                cachedConfig = packageJson.vueDoctor;
                return cachedConfig;
            }
        } catch {
            // Continue to default
        }
    }

    // Return default
    cachedConfig = {
        profile: 'recommended',
    };

    return cachedConfig;
}

/**
 * Get resolved profile with overrides
 */
export function resolveProfile(config: VueDoctorConfig): RuleProfile {
    let base: RuleProfile;

    if (typeof config.profile === 'string') {
        base = getProfile(config.profile) || getDefaultProfile();
    } else if (config.profile) {
        base = config.profile;
    } else {
        base = PROFILE_RECOMMENDED;
    }

    // Apply rule overrides
    if (config.rules) {
        const customRules = Object.entries(config.rules).map(([rule, override]) => ({
            rule,
            ...override,
        }));
        return mergeProfileConfig(base, { rules: customRules as any });
    }

    return base;
}

/**
 * Get resolved policies
 */
export function resolvePolicies(config: VueDoctorConfig): Policy[] {
    if (!config.policies || config.policies.length === 0) {
        return ARCHITECTURE_POLICIES;
    }

    return ARCHITECTURE_POLICIES.map((policy) => {
        const override = config.policies!.find((p) => p.id === policy.id);
        if (override) {
            return { ...policy, ...override };
        }
        return policy;
    });
}

/**
 * Clear config cache
 */
export function clearConfigCache(): void {
    cachedConfig = null;
}

/**
 * Merge CLI args with config
 */
export function mergeWithCliArgs(
    config: VueDoctorConfig,
    args: {
        profile?: string;
        reporter?: string;
        failOn?: string;
    }
): VueDoctorConfig {
    return {
        ...config,
        profile: args.profile || config.profile,
        reporter: (args.reporter as VueDoctorConfig['reporter']) || config.reporter,
        failOn: (args.failOn as VueDoctorConfig['failOn']) || config.failOn,
    };
}

/**
 * Validate config
 */
export function validateConfig(config: VueDoctorConfig): string[] {
    const errors: string[] = [];

    if (config.profile) {
        if (typeof config.profile === 'string') {
            const validProfiles = ['strict', 'recommended', 'minimal'];
            if (!validProfiles.includes(config.profile)) {
                errors.push(`Invalid profile: ${config.profile}. Valid: ${validProfiles.join(', ')}`);
            }
        }
    }

    if (config.failOn && !['error', 'warning', 'none'].includes(config.failOn)) {
        errors.push(`Invalid failOn: ${config.failOn}. Valid: error, warning, none`);
    }

    if (config.reporter && !['stylish', 'json', 'html', 'sarif'].includes(config.reporter)) {
        errors.push(`Invalid reporter: ${config.reporter}. Valid: stylish, json, html, sarif`);
    }

    return errors;
}
