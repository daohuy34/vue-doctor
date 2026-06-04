/**
 * Alias Resolver
 *
 * Resolves path aliases from tsconfig.json, vite.config.ts, and nuxt.config.ts
 */

import fs from 'node:fs';
import path from 'node:path';

export interface AliasConfig {
    pattern: string;
    replacement: string;
}

export interface AliasResolver {
    aliases: Map<string, AliasConfig>;
    baseUrl: string;
}

/**
 * Parse tsconfig.json and extract path aliases
 */
export function parseTsconfigAliases(tsconfigPath?: string): AliasResolver {
    const defaultResult: AliasResolver = {
        aliases: new Map(),
        baseUrl: 'src',
    };

    try {
        const configPath = tsconfigPath || findTsconfig();
        if (!configPath || !fs.existsSync(configPath)) {
            return defaultResult;
        }

        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        const compilerOptions = config.compilerOptions || {};

        const baseUrl = compilerOptions.baseUrl || 'src';
        const paths = compilerOptions.paths || {};

        const aliases = new Map<string, AliasConfig>();

        for (const [pattern, targets] of Object.entries(paths)) {
            if (Array.isArray(targets) && targets.length > 0) {
                aliases.set(pattern, {
                    pattern: pattern.replace(/\*$/, ''),
                    replacement: targets[0].replace(/\*$/, ''),
                });
            }
        }

        return {
            aliases,
            baseUrl,
        };
    } catch {
        return defaultResult;
    }
}

/**
 * Parse vite.config.ts and extract resolve.alias
 */
export function parseViteAliases(viteConfigPath?: string): AliasResolver {
    const defaultResult: AliasResolver = {
        aliases: new Map(),
        baseUrl: 'src',
    };

    try {
        const configPath = viteConfigPath || findViteConfig();
        if (!configPath || !fs.existsSync(configPath)) {
            return defaultResult;
        }

        const content = fs.readFileSync(configPath, 'utf-8');

        // Simple regex-based extraction for common patterns
        // For full support, use @babel/parser or tsx
        const aliases = new Map<string, AliasConfig>();

        // Match: alias: { '@': srcPath, ... }
        const objectPattern = /alias\s*:\s*\{([^}]+)\}/s;
        const objectMatch = content.match(objectPattern);

        if (objectMatch) {
            const objectContent = objectMatch[1];

            // Match key-value pairs like: '@': path.resolve(...)
            const kvPattern = /['"]?([^'":\s]+)['"]?\s*:\s*(?:path\.resolve\([^)]+\)|['"]([^'"]+)['"])/g;
            let match;

            while ((match = kvPattern.exec(objectContent)) !== null) {
                const alias = match[1];
                const replacement = match[2];

                if (replacement) {
                    aliases.set(alias, {
                        pattern: alias.endsWith('/') ? alias.slice(0, -1) : alias,
                        replacement: replacement.endsWith('/') ? replacement.slice(0, -1) : replacement,
                    });
                }
            }
        }

        // Match: resolve: { alias: [...] }
        const arrayPattern = /alias\s*:\s*\[([^\]]+)\]/s;
        const arrayMatch = content.match(arrayPattern);

        if (arrayMatch) {
            const arrayContent = arrayMatch[1];

            // Match array items like: { find: '@', replacement: 'src' }
            const itemPattern = /find\s*:\s*['"]([^'"]+)['"][^,]*replacement\s*:\s*['"]([^'"]+)['"]/g;
            let match;

            while ((match = itemPattern.exec(arrayContent)) !== null) {
                const find = match[1];
                const replacement = match[2];

                aliases.set(find, {
                    pattern: find.endsWith('/') ? find.slice(0, -1) : find,
                    replacement: replacement.endsWith('/') ? replacement.slice(0, -1) : replacement,
                });
            }
        }

        return {
            aliases,
            baseUrl: 'src',
        };
    } catch {
        return defaultResult;
    }
}

/**
 * Parse nuxt.config.ts and extract Nuxt alias conventions
 */
export function parseNuxtAliases(nuxtConfigPath?: string): AliasResolver {
    // Nuxt has built-in aliases that we need to support
    const nuxtAliases = new Map<string, AliasConfig>([
        ['~', { pattern: '~', replacement: '' }],
        ['@', { pattern: '@', replacement: '' }],
        ['@@', { pattern: '@@', replacement: '' }],
        ['#', { pattern: '#', replacement: '' }],
    ]);

    try {
        const configPath = nuxtConfigPath || findNuxtConfig();
        if (!configPath || !fs.existsSync(configPath)) {
            return { aliases: nuxtAliases, baseUrl: 'src' };
        }

        // Try to read extend config for custom aliases
        const content = fs.readFileSync(configPath, 'utf-8');

        // Match: alias: { ... }
        const aliasPattern = /alias\s*:\s*\{([^}]+)\}/s;
        const match = content.match(aliasPattern);

        if (match) {
            const objectContent = match[1];
            const kvPattern = /['"]?([^'":\s]+)['"]?\s*:\s*['"]([^'"]+)['"]/g;
            let kvMatch;

            while ((kvMatch = kvPattern.exec(objectContent)) !== null) {
                const alias = kvMatch[1];
                const replacement = kvMatch[2];

                // Don't override Nuxt built-in aliases
                if (!['~', '@', '@@', '#'].includes(alias)) {
                    nuxtAliases.set(alias, {
                        pattern: alias,
                        replacement,
                    });
                }
            }
        }

        return { aliases: nuxtAliases, baseUrl: 'src' };
    } catch {
        return { aliases: nuxtAliases, baseUrl: 'src' };
    }
}

/**
 * Merge all alias resolvers into one
 */
export function createAliasResolver(cwd?: string): AliasResolver {
    const tsconfigAliases = parseTsconfigAliases();
    const viteAliases = parseViteAliases();
    const nuxtAliases = parseNuxtAliases();

    const merged = new Map<string, AliasConfig>();

    // Priority: Nuxt > Vite > Tsconfig
    for (const [key, value] of tsconfigAliases.aliases) {
        merged.set(key, value);
    }
    for (const [key, value] of viteAliases.aliases) {
        merged.set(key, value);
    }
    for (const [key, value] of nuxtAliases.aliases) {
        merged.set(key, value);
    }

    // Always add default aliases
    const defaultAliases = [
        { pattern: '@/', replacement: 'src/' },
        { pattern: '~/', replacement: 'src/' },
    ];

    for (const alias of defaultAliases) {
        if (!merged.has(alias.pattern)) {
            merged.set(alias.pattern, alias);
        }
    }

    return {
        aliases: merged,
        baseUrl: tsconfigAliases.baseUrl || 'src',
    };
}

/**
 * Resolve an import path using alias resolver
 */
export function resolveAlias(
    importPath: string,
    resolver: AliasResolver,
    currentFile: string,
    projectRoot: string,
): string | null {
    const normalizedCurrent = path.posix.normalize(currentFile);
    const currentDir = path.posix.dirname(normalizedCurrent);

    // Check for exact alias match first
    for (const [alias, config] of resolver.aliases) {
        if (importPath === alias || importPath.startsWith(alias + '/')) {
            const suffix = importPath.slice(alias.length);
            const resolved = config.replacement + suffix;

            // Handle relative vs absolute
            if (config.replacement.startsWith('/') || config.replacement.match(/^[a-zA-Z]:/)) {
                return normalizePath(resolved);
            }

            // Resolve relative to baseUrl
            return normalizePath(path.posix.resolve(projectRoot, resolver.baseUrl, resolved));
        }
    }

    // Handle ~ alias (src root)
    if (importPath.startsWith('~/')) {
        const suffix = importPath.slice(2);
        return normalizePath(path.posix.resolve(projectRoot, 'src', suffix));
    }

    // Handle @ alias (src)
    if (importPath.startsWith('@/')) {
        const suffix = importPath.slice(2);
        return normalizePath(path.posix.resolve(projectRoot, 'src', suffix));
    }

    // Handle relative imports
    if (importPath.startsWith('.')) {
        const resolved = path.posix.resolve(currentDir, importPath);
        return normalizePath(resolved);
    }

    return null;
}

/**
 * Normalize path to use forward slashes
 */
function normalizePath(p: string): string {
    return p.replace(/\\/g, '/');
}

/**
 * Find tsconfig.json in project
 */
function findTsconfig(): string | null {
    const candidates = [
        'tsconfig.json',
        'tsconfig.app.json',
        'tsconfig.base.json',
    ];

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    return null;
}

/**
 * Find vite.config.ts/js in project
 */
function findViteConfig(): string | null {
    const candidates = [
        'vite.config.ts',
        'vite.config.js',
        'vite.config.mts',
    ];

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    return null;
}

/**
 * Find nuxt.config.ts/js in project
 */
function findNuxtConfig(): string | null {
    const candidates = [
        'nuxt.config.ts',
        'nuxt.config.js',
    ];

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    return null;
}
