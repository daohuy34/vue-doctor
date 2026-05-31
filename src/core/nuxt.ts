/**
 * Nuxt Framework Detection & Analysis
 *
 * Provides Nuxt-specific detection and utilities for
 * understanding Nuxt project structure.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface NuxtConfig {
    version: string;
    isNuxt: boolean;
    directories: NuxtDirectories;
    autoImports: AutoImportConfig;
}

export interface NuxtDirectories {
    pages: string;
    layouts: string;
    components: string;
    composables: string;
    server: string;
    middleware: string;
    plugins: string;
    utils: string;
    assets: string;
    public: string;
}

export interface AutoImportConfig {
    components: boolean;
    composables: boolean;
    utils: boolean;
}

/**
 * Default Nuxt 3 directory structure
 */
export const DefaultNuxtDirectories: NuxtDirectories = {
    pages: 'pages',
    layouts: 'layouts',
    components: 'components',
    composables: 'composables',
    server: 'server',
    middleware: 'middleware',
    plugins: 'plugins',
    utils: 'utils',
    assets: 'assets',
    public: 'public',
};

/**
 * Nuxt config file patterns
 */
const NUXT_CONFIG_PATTERNS = [
    'nuxt.config.ts',
    'nuxt.config.js',
    'nuxt.config.mjs',
    '.nuxtrc',
    '.nuxtrc.json',
    '.nuxtrc',
];

/**
 * Nuxt package names
 */
const NUXT_PACKAGES = ['nuxt', '@nuxtjs/firebase'];

/**
 * Detect if a project is a Nuxt project
 */
export function detectNuxt(cwd: string): NuxtConfig | null {
    // Check for nuxt config file
    const hasNuxtConfig = NUXT_CONFIG_PATTERNS.some((pattern) => {
        const configPath = path.join(cwd, pattern);
        return fs.existsSync(configPath);
    });

    if (!hasNuxtConfig) {
        return null;
    }

    // Parse nuxt.config to detect version
    const version = detectNuxtVersion(cwd);

    // Get directory structure
    const directories = detectNuxtDirectories(cwd);

    // Detect auto-imports configuration
    const autoImports = detectAutoImports(cwd);

    return {
        version,
        isNuxt: true,
        directories,
        autoImports,
    };
}

/**
 * Detect Nuxt version (2 or 3)
 */
export function detectNuxtVersion(cwd: string): string {
    // Check package.json for nuxt version
    const packageJsonPath = path.join(cwd, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
            const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

            if (dependencies.nuxt) {
                const version = dependencies.nuxt;
                if (version.startsWith('3.')) return '3';
                if (version.startsWith('2.')) return '2';
            }
        } catch {
            // Ignore parsing errors
        }
    }

    // Check nuxt.config for Nuxt 3 indicators
    const nuxtConfigPath = path.join(cwd, 'nuxt.config.ts');
    if (fs.existsSync(nuxtConfigPath)) {
        const content = fs.readFileSync(nuxtConfigPath, 'utf-8');
        if (content.includes('modules:') && content.includes('buildModules')) {
            return '2'; // Nuxt 2 uses buildModules
        }
        if (content.includes('imports:') && !content.includes('buildModules')) {
            return '3'; // Nuxt 3 uses imports
        }
    }

    return '3'; // Default to Nuxt 3
}

/**
 * Detect Nuxt directory structure
 */
export function detectNuxtDirectories(cwd: string): NuxtDirectories {
    const directories: NuxtDirectories = { ...DefaultNuxtDirectories };

    // Nuxt 3 uses srcDir concept, default to project root
    const srcDir = path.join(cwd, 'src');

    // Check if src directory exists (Nuxt 3 pattern)
    if (fs.existsSync(srcDir)) {
        directories.pages = 'src/pages';
        directories.layouts = 'src/layouts';
        directories.components = 'src/components';
        directories.composables = 'src/composables';
        directories.server = 'src/server';
        directories.middleware = 'src/middleware';
        directories.plugins = 'src/plugins';
        directories.utils = 'src/utils';
        directories.assets = 'src/assets';
        directories.public = 'public';
    }

    return directories;
}

/**
 * Detect auto-import configuration
 */
export function detectAutoImports(cwd: string): AutoImportConfig {
    const config: AutoImportConfig = {
        components: true, // Default in Nuxt 3
        composables: true, // Default in Nuxt 3
        utils: false, // Default off
    };

    // Parse nuxt.config to check autoImports
    const configPath = path.join(cwd, 'nuxt.config.ts');
    if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');

        // Check for components auto-import
        if (content.includes('components: false')) {
            config.components = false;
        }

        // Check for composables auto-import
        if (content.includes('composables: false') || content.includes("composables: {")) {
            config.composables = !content.includes('composables: false');
        }

        // Check for utils auto-import
        if (content.includes('imports:')) {
            config.utils = content.includes('utils');
        }
    }

    return config;
}

/**
 * Check if a file path is in a specific Nuxt directory
 */
export function isInNuxtDirectory(
    filePath: string,
    directory: keyof NuxtDirectories,
    config: NuxtConfig
): boolean {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const dirPath = config.directories[directory].replace(/\\/g, '/');

    return normalizedPath.includes(`/${dirPath}/`) || normalizedPath.endsWith(`/${dirPath}`);
}

/**
 * Detect if a file is a Nuxt page
 */
export function isNuxtPage(filePath: string, config: NuxtConfig): boolean {
    return isInNuxtDirectory(filePath, 'pages', config);
}

/**
 * Detect if a file is a Nuxt layout
 */
export function isNuxtLayout(filePath: string, config: NuxtConfig): boolean {
    return isInNuxtDirectory(filePath, 'layouts', config);
}

/**
 * Detect if a file is a Nuxt middleware
 */
export function isNuxtMiddleware(filePath: string, config: NuxtConfig): boolean {
    return isInNuxtDirectory(filePath, 'middleware', config);
}

/**
 * Detect if a file is a Nuxt plugin
 */
export function isNuxtPlugin(filePath: string, config: NuxtConfig): boolean {
    return isInNuxtDirectory(filePath, 'plugins', config);
}

/**
 * Get the route for a Nuxt page file
 */
export function getPageRoute(filePath: string, config: NuxtConfig): string | null {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const pagesDir = config.directories.pages.replace(/\\/g, '/');

    if (!normalizedPath.includes(`/${pagesDir}/`)) {
        return null;
    }

    // Remove pages directory prefix
    let route = normalizedPath.split(`/${pagesDir}/`)[1] || '';

    // Remove file extension
    route = route.replace(/\.(vue|ts|js)$/, '');

    // Handle index files
    if (route.endsWith('/index')) {
        route = route.replace('/index', '');
    }

    // Convert to route path
    route = route
        .split('/')
        .map((segment) => {
            // Dynamic routes: [id] -> :id
            if (segment.startsWith('[') && segment.endsWith(']')) {
                return segment.slice(1, -1);
            }
            return segment;
        })
        .join('/');

    return '/' + route;
}

/**
 * Detect Nuxt auto-imported components (global components)
 */
export function getGlobalComponents(config: NuxtConfig): string[] {
    const componentsDir = config.directories.components;
    const components: string[] = [];

    // In a real implementation, this would scan the components directory
    // and return component names that would be auto-imported

    return components;
}
