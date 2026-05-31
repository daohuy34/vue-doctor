import path from 'node:path';
import { parseImports } from '../utils/import-parser';

export type GraphNodeKind = 'page' | 'component' | 'store' | 'composable' | 'other';

export interface GraphNode {
    filePath: string;
    kind: GraphNodeKind;
    imports: string[];
    dynamicImports: string[];
}

export interface GraphEdge {
    from: string;
    to: string;
    kind: 'import' | 'dynamic';
}

export interface ProjectGraph {
    counts: {
        pages: number;
        components: number;
        stores: number;
        composables: number;
        others: number;
    };
    nodes: GraphNode[];
    edges: GraphEdge[];
}

function normalize(filePath: string) {
    return filePath.replace(/\\/g, '/');
}

export function classifyGraphNode(filePath: string): GraphNodeKind {
    const normalized = normalize(filePath);

    if (normalized.includes('/pages/')) {
        return 'page';
    }

    if (normalized.includes('/stores/')) {
        return 'store';
    }

    if (normalized.includes('/composables/')) {
        return 'composable';
    }

    if (/^src\/.*\/use[A-Z][A-Za-z0-9_-]*\.(ts|js|vue)$/.test(normalized)) {
        return 'composable';
    }

    if (/(^|\/)(store|stores)(\/|$)/i.test(normalized)) {
        return 'store';
    }

    if (normalized.endsWith('.vue')) {
        return 'component';
    }

    return 'other';
}

export function extractImports(source: string): string[] {
    if (!source) {
        return [];
    }

    // Strip line comments before processing
    const stripped = source.replace(/\/\/.*$/gm, '');

    const imports = new Set<string>();

    // Match: import ... from 'path' or import 'path' (side-effect import)
    const importRegex = /import\s+(?:(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]|['"]([^'"]+)['"])/g;
    for (const match of stripped.matchAll(importRegex)) {
        const importPath = match[1] || match[2];
        if (importPath) {
            imports.add(importPath);
        }
    }

    // Match: export ... from 'path'
    const exportFromRegex = /export\s+(?:[\w*{}\s,]+\s+)?from\s+['"]([^'"]+)['"]/g;
    for (const match of stripped.matchAll(exportFromRegex)) {
        const importPath = match[1];
        if (importPath) {
            imports.add(importPath);
        }
    }

    // Match: require('path') or require("path")
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    for (const match of stripped.matchAll(requireRegex)) {
        const importPath = match[1];
        if (importPath) {
            imports.add(importPath);
        }
    }

    return [...imports];
}

/**
 * Extracts dynamic imports from source.
 * Handles patterns like:
 * - import('./module')
 * - await import('./module')
 * - defineAsyncComponent(() => import('./module'))
 */
export function extractDynamicImports(source: string): string[] {
    if (!source) {
        return [];
    }

    const dynamicImports = new Set<string>();

    // Regex patterns for dynamic imports
    // import('path') or import("path") - with or without await
    const importCallRegex = /(?:await\s+)?import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

    for (const match of source.matchAll(importCallRegex)) {
        const path = match[1];
        if (path) {
            dynamicImports.add(path);
        }
    }

    // defineAsyncComponent(() => import('path'))
    const asyncComponentRegex = /defineAsyncComponent\s*\(\s*\(\s*\)\s*=>\s*import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

    for (const match of source.matchAll(asyncComponentRegex)) {
        const path = match[1];
        if (path) {
            dynamicImports.add(path);
        }
    }

    return [...dynamicImports];
}

/**
 * Extracts all imports (both static and dynamic) from source.
 */
export function extractAllImports(source: string): { staticImports: string[]; dynamicImports: string[] } {
    if (!source) {
        return { staticImports: [], dynamicImports: [] };
    }

    const result = parseImports(source);
    return {
        staticImports: result.imports.map(i => i.source),
        dynamicImports: result.dynamicImports,
    };
}

function isExternalImport(importPath: string) {
    return (
        importPath.startsWith('http://') ||
        importPath.startsWith('https://') ||
        importPath.startsWith('//') ||
        importPath.startsWith('virtual:') ||
        importPath.startsWith('~~') ||
        importPath.startsWith('@@')
    );
}

function resolveAliasImport(importPath: string) {
    if (importPath.startsWith('@/')) {
        return importPath.replace(/^@\//, 'src/');
    }

    if (importPath.startsWith('~/')) {
        return importPath.replace(/^~\//, 'src/');
    }

    return null;
}

function appendExtensions(candidate: string) {
    const extensions = ['.vue', '.ts', '.js', '.jsx', '.tsx', '.mjs', '.cjs'];

    return extensions.map((extension) => `${candidate}${extension}`);
}

function resolveCandidateVariants(candidate: string) {
    if (candidate.includes('.')) {
        return [candidate];
    }

    return appendExtensions(candidate);
}

function resolveLocalImport(
    importPath: string,
    currentFilePath: string,
    knownFiles: Set<string>,
) {
    if (isExternalImport(importPath)) {
        return null;
    }

    const normalizedCurrent = normalize(currentFilePath);
    const currentDirectory = path.posix.dirname(normalizedCurrent);

    const aliasTarget = resolveAliasImport(importPath);
    const relativeTarget = importPath.startsWith('.')
        ? path.posix.resolve(currentDirectory, importPath)
        : null;

    const candidates = [
        aliasTarget,
        relativeTarget,
        importPath.startsWith('/') ? importPath.slice(1) : null,
    ].filter((candidate): candidate is string => Boolean(candidate));

    for (const candidate of candidates) {
        const normalizedCandidate = normalize(candidate);

        if (knownFiles.has(normalizedCandidate)) {
            return normalizedCandidate;
        }

        for (const expandedCandidate of appendExtensions(normalizedCandidate)) {
            if (knownFiles.has(expandedCandidate)) {
                return expandedCandidate;
            }
        }

        if (normalizedCandidate.endsWith('/index')) {
            for (const candidate of resolveCandidateVariants(
                normalizedCandidate,
            )) {
                if (knownFiles.has(candidate)) {
                    return candidate;
                }
            }
        }
    }

    if (importPath.startsWith('.') || importPath.startsWith('@/') || importPath.startsWith('~/')) {
        const fallback = normalize(importPath);

        if (knownFiles.has(fallback)) {
            return fallback;
        }
    }

    return null;
}

export function buildProjectGraph(
    files: string[],
    sources: Map<string, string>,
): ProjectGraph {
    const normalizedFiles = files.map((filePath) => normalize(filePath));
    const knownFiles = new Set(normalizedFiles);

    const nodes = normalizedFiles.map((filePath) => ({
        filePath,
        kind: classifyGraphNode(filePath),
        imports: extractImports(sources.get(filePath) ?? ''),
        dynamicImports: extractDynamicImports(sources.get(filePath) ?? ''),
    }));

    const edges = new Map<string, GraphEdge>();

    for (const node of nodes) {
        // Process static imports
        for (const importPath of node.imports) {
            const target = resolveLocalImport(importPath, node.filePath, knownFiles);

            if (!target || target === node.filePath) {
                continue;
            }

            edges.set(`${node.filePath}::${target}`, {
                from: node.filePath,
                to: target,
                kind: 'import',
            });
        }

        // Process dynamic imports
        for (const importPath of node.dynamicImports) {
            const target = resolveLocalImport(importPath, node.filePath, knownFiles);

            if (!target || target === node.filePath) {
                continue;
            }

            const edgeKey = `${node.filePath}::${target}`;
            // Don't override existing static import edge with dynamic
            if (!edges.has(edgeKey)) {
                edges.set(edgeKey, {
                    from: node.filePath,
                    to: target,
                    kind: 'dynamic',
                });
            }
        }
    }

    const counts = nodes.reduce(
        (accumulator, node) => {
            if (node.kind === 'page') {
                accumulator.pages += 1;
            } else if (node.kind === 'component') {
                accumulator.components += 1;
            } else if (node.kind === 'store') {
                accumulator.stores += 1;
            } else if (node.kind === 'composable') {
                accumulator.composables += 1;
            } else {
                accumulator.others += 1;
            }

            return accumulator;
        },
        {
            pages: 0,
            components: 0,
            stores: 0,
            composables: 0,
            others: 0,
        },
    );

    return {
        counts,
        nodes,
        edges: [...edges.values()],
    };
}
