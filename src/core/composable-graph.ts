import { parseVueFile, type ParsedVueFile } from './parser';
import { extractImports } from './graph';

export interface ComposableDefinition {
    name: string;
    filePath: string;
    type: 'function' | 'export' | 'object';
    kind: 'composition' | 'options' | 'unknown';
    exports: string[];
}

export interface ComposableUsage {
    name: string;
    filePath: string;
    isDefault: boolean;
    isNamed: boolean;
    isAliased: boolean;
}

export interface ComposableGraph {
    composables: Map<string, ComposableDefinition>;
    usages: Map<string, ComposableUsage[]>;
    files: Set<string>;
}

const COMPOSABLE_PATTERNS = {
    directory: /^(composables|composable|hooks|hook|utils|use)$/i,
    filename: /^use[A-Z][a-zA-Z0-9]*\.(ts|js|tsx|jsx|vue)$/,
    function: /^use[A-Z][a-zA-Z0-9]*/,
};

const COMPOSITION_API_PATTERNS = [
    /\b(ref|reactive|computed|watch|watchEffect|onMounted|onUpdated|onUnmounted|onBeforeMount|onBeforeUpdate|onBeforeUnmounted)\s*\(/,
    /\b(ref|reactive|computed)\s*\(/,
    /<script\s+setup/,
];

const OPTIONS_API_PATTERNS = [
    /export\s+default\s+\{/,
    /data\s*\(\s*\)/,
    /methods\s*:/,
];

function detectComposableKind(source: string, isVueFile: boolean): 'composition' | 'options' | 'unknown' {
    if (isVueFile && source.includes('<script setup')) {
        return 'composition';
    }

    for (const pattern of COMPOSITION_API_PATTERNS) {
        if (pattern.test(source)) {
            return 'composition';
        }
    }

    for (const pattern of OPTIONS_API_PATTERNS) {
        if (pattern.test(source)) {
            return 'options';
        }
    }

    return 'unknown';
}

function extractExportedNames(source: string): string[] {
    const exports: string[] = [];

    const namedExports = source.matchAll(/export\s+(?:const|function|class|type|interface)\s+(\w+)/g);
    for (const match of namedExports) {
        exports.push(match[1]);
    }

    const defaultExport = source.match(/export\s+default\s+(\w+)/);
    if (defaultExport) {
        exports.push(defaultExport[1]);
    }

    const namedExportFrom = source.matchAll(/export\s*\{[^}]*\b(\w+)\b[^}]*\}\s*from/g);
    for (const match of namedExportFrom) {
        exports.push(match[1]);
    }

    return exports;
}

function extractComposableName(filePath: string, source: string): string | null {
    const normalized = filePath.replace(/\\/g, '/');
    const filename = normalized.split('/').pop() || '';

    if (COMPOSABLE_PATTERNS.filename.test(filename)) {
        const match = filename.match(/^use([A-Z][a-zA-Z0-9]*)/);
        if (match) {
            return match[1];
        }
        const useMatch = filename.match(/^use(.+)\./);
        if (useMatch) {
            return useMatch[1];
        }
    }

    if (COMPOSABLE_PATTERNS.directory.test(normalized)) {
        const exports = extractExportedNames(source);
        const useExports = exports.filter(name => name.startsWith('use') && /^[a-z]/.test(name));

        if (useExports.length > 0) {
            const firstUse = useExports[0];
            return firstUse.replace(/^use/, '');
        }

        if (exports.length > 0) {
            return exports[0].replace(/^use/, '');
        }
    }

    const functionMatch = source.match(/function\s+(use[A-Z][a-zA-Z0-9]*)/);
    if (functionMatch) {
        return functionMatch[1].replace(/^use/, '');
    }

    const constMatch = source.match(/const\s+(use[A-Z][a-zA-Z0-9]*)\s*=/);
    if (constMatch) {
        return constMatch[1].replace(/^use/, '');
    }

    return null;
}

function isComposableFile(filePath: string): boolean {
    const normalized = filePath.replace(/\\/g, '/');

    const parts = normalized.split('/');
    const lastTwoParts = parts.slice(-2).join('/');

    if (COMPOSABLE_PATTERNS.directory.test(lastTwoParts)) {
        return true;
    }

    const filename = parts[parts.length - 1];
    if (COMPOSABLE_PATTERNS.filename.test(filename)) {
        return true;
    }

    return false;
}

function parseUsage(importSource: string, allImports: string[]): ComposableUsage | null {
    for (const imported of allImports) {
        if (imported.startsWith('./') || imported.startsWith('../') || imported.startsWith('@/') || imported.startsWith('~/')) {
            const filename = imported.split('/').pop() || '';

            if (filename.startsWith('use') || isComposableFile(imported)) {
                const nameMatch = importSource.match(/\buse([A-Z][a-zA-Z0-9]*)/);
                if (nameMatch) {
                    return {
                        name: nameMatch[1],
                        filePath: imported,
                        isDefault: importSource.includes('default'),
                        isNamed: importSource.includes('{') || importSource.includes('use'),
                        isAliased: importSource.includes('as'),
                    };
                }
            }
        }
    }

    return null;
}

export async function buildComposableGraph(
    files: string[],
    parsedFiles?: Map<string, ParsedVueFile>
): Promise<ComposableGraph> {
    const composables = new Map<string, ComposableDefinition>();
    const usages = new Map<string, ComposableUsage[]>();
    const composableFiles = new Set<string>();

    const fileContents = new Map<string, string>();

    if (parsedFiles) {
        for (const [filePath, parsed] of parsedFiles) {
            fileContents.set(filePath, parsed.source);
        }
    }

    for (const file of files) {
        if (!isComposableFile(file)) {
            continue;
        }

        const normalizedPath = file.replace(/\\/g, '/');
        composableFiles.add(normalizedPath);

        let source: string = '';
        if (parsedFiles?.has(normalizedPath)) {
            source = parsedFiles.get(normalizedPath)!.source;
        } else {
            try {
                const parsed = await parseVueFile(file);
                source = parsed.source;
            } catch {
                source = '';
            }
        }

        const composableName = extractComposableName(normalizedPath, source);

        if (composableName && source) {
            const definition: ComposableDefinition = {
                name: composableName,
                filePath: normalizedPath,
                type: source.includes('export default') ? 'export' : 'function',
                kind: detectComposableKind(source, normalizedPath.endsWith('.vue')),
                exports: extractExportedNames(source),
            };

            composables.set(composableName, definition);
        }
    }

    for (const file of files) {
        if (composableFiles.has(file.replace(/\\/g, '/'))) {
            continue;
        }

        const normalizedPath = file.replace(/\\/g, '/');

        let source: string = '';
        if (fileContents.has(normalizedPath)) {
            source = fileContents.get(normalizedPath)!;
        } else {
            try {
                const parsed = await parseVueFile(file);
                source = parsed.source;
            } catch {
                source = '';
            }
        }

        if (!source) {
            continue;
        }

        const imports = source ? extractImports(source) : [];

        const fileUsages: ComposableUsage[] = [];

        const composableImportRegex = /import\s+(?:{[^}]+}|[\w]+)\s+from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]/g;
        let match;

        while ((match = composableImportRegex.exec(source)) !== null) {
            const importPath = match[1] || match[2];

            if (importPath.startsWith('./') || importPath.startsWith('../') || importPath.startsWith('@/') || importPath.startsWith('~/')) {
                const resolvedPath = importPath;
                const filename = resolvedPath.split('/').pop() || '';
                const dirParts = resolvedPath.split('/').slice(0, -1).join('/');

                if (filename.startsWith('use') || COMPOSABLE_PATTERNS.directory.test(dirParts)) {
                    const nameMatch = match[0].match(/\buse([A-Z][a-zA-Z0-9]*)/);
                    if (nameMatch) {
                        fileUsages.push({
                            name: nameMatch[1],
                            filePath: importPath,
                            isDefault: match[0].includes('default'),
                            isNamed: match[0].includes('{'),
                            isAliased: match[0].includes('as'),
                        });
                    }
                }
            }
        }

        if (fileUsages.length > 0) {
            usages.set(normalizedPath, fileUsages);
        }
    }

    return {
        composables,
        usages,
        files: composableFiles,
    };
}

export function getComposableInfo(graph: ComposableGraph, name: string): ComposableDefinition | undefined {
    return graph.composables.get(name);
}

export function getComposableUsages(graph: ComposableGraph, composableName: string): string[] {
    const results: string[] = [];

    for (const [filePath, fileUsages] of graph.usages.entries()) {
        for (const usage of fileUsages) {
            if (usage.name === composableName) {
                results.push(filePath);
                break;
            }
        }
    }

    return results;
}

export function getComposablesByKind(graph: ComposableGraph, kind: 'composition' | 'options' | 'unknown'): ComposableDefinition[] {
    return [...graph.composables.values()].filter(c => c.kind === kind);
}
