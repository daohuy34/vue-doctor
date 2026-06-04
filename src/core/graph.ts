import path from 'node:path';
import { parseImports } from '../utils/import-parser';
import { createAliasResolver, resolveAlias, type AliasResolver } from '../utils/alias-resolver';

export type NodeType =
    | 'page'
    | 'component'
    | 'composable'
    | 'store'
    | 'service'
    | 'layout'
    | 'middleware'
    | 'plugin'
    | 'util'
    | 'other';

export type EdgeType = 'imports' | 'depends-on' | 'calls' | 'uses';

export interface GraphNode {
    filePath: string;
    type: NodeType;
    name: string;
    loc: number;
    imports: string[];
    dynamicImports: string[];
    fanIn: number;
    fanOut: number;
    violations: number;
}

export interface GraphEdge {
    from: string;
    to: string;
    type: EdgeType;
}

export interface ProjectGraph {
    nodes: GraphNode[];
    edges: GraphEdge[];
    meta: {
        generatedAt: number;
        fileCount: number;
        version: string;
    };
    counts: {
        pages: number;
        components: number;
        stores: number;
        composables: number;
        services: number;
        layouts: number;
        middlewares: number;
        plugins: number;
        utils: number;
        others: number;
    };
}

export interface HotspotInfo {
    node: GraphNode;
    score: number;
    rank: number;
}

export interface CircularDependency {
    nodes: string[];
    length: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
}

function normalize(filePath: string) {
    return filePath.replace(/\\/g, '/');
}

function getNodeName(filePath: string): string {
    const normalized = normalize(filePath);
    const parts = normalized.split('/');
    return parts[parts.length - 1].replace(/\.(vue|ts|js|tsx|jsx)$/, '');
}

export function classifyGraphNode(filePath: string): NodeType {
    const normalized = normalize(filePath);

    // Nuxt conventions
    if (normalized.includes('/pages/')) return 'page';
    if (normalized.includes('/layouts/')) return 'layout';
    if (normalized.includes('/middleware/')) return 'middleware';
    if (normalized.includes('/plugins/')) return 'plugin';

    // Standard conventions
    if (normalized.includes('/stores/') || /(^|\/)(store|stores)(\/|$)/i.test(normalized)) {
        return 'store';
    }

    if (normalized.includes('/composables/') || normalized.includes('/composable/')) {
        return 'composable';
    }

    if (normalized.includes('/services/') || normalized.includes('/api/')) {
        return 'service';
    }

    if (normalized.includes('/utils/') || normalized.includes('/helpers/')) {
        return 'util';
    }

    // Pattern-based detection
    if (/^src\/.*\/use[A-Z][A-Za-z0-9_-]*\.(ts|js|vue)$/.test(normalized)) {
        return 'composable';
    }

    if (/^src\/.*store[A-Z][A-Za-z0-9_-]*\.(ts|js|vue)$/.test(normalized)) {
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

/**
 * Build the complete project graph with all features
 */
export function buildProjectGraph(
    files: string[],
    sources: Map<string, string>,
    projectRoot: string = process.cwd(),
): ProjectGraph {
    const normalizedFiles = files.map((filePath) => normalize(filePath));
    const knownFiles = new Set(normalizedFiles);

    // Create alias resolver
    const aliasResolver = createAliasResolver(projectRoot);

    // Build nodes with enhanced metadata
    const nodes: GraphNode[] = normalizedFiles.map((filePath) => {
        const source = sources.get(filePath) ?? '';
        const loc = source.split('\n').length;

        return {
            filePath,
            type: classifyGraphNode(filePath),
            name: getNodeName(filePath),
            loc,
            imports: extractImports(source),
            dynamicImports: extractDynamicImports(source),
            fanIn: 0,
            fanOut: 0,
            violations: 0,
        };
    });

    // Build edges
    const edges: GraphEdge[] = [];
    const nodeMap = new Map(nodes.map((n) => [n.filePath, n]));

    for (const node of nodes) {
        // Process static imports
        for (const importPath of node.imports) {
            const target = resolveLocalImport(
                importPath,
                node.filePath,
                knownFiles,
            );

            if (!target || target === node.filePath) {
                continue;
            }

            edges.push({
                from: node.filePath,
                to: target,
                type: 'imports',
            });

            node.fanOut++;
            const targetNode = nodeMap.get(target);
            if (targetNode) {
                targetNode.fanIn++;
            }
        }

        // Process dynamic imports
        for (const importPath of node.dynamicImports) {
            const target = resolveLocalImport(
                importPath,
                node.filePath,
                knownFiles,
            );

            if (!target || target === node.filePath) {
                continue;
            }

            // Skip if already have a static import edge
            if (!edges.some((e) => e.from === node.filePath && e.to === target)) {
                edges.push({
                    from: node.filePath,
                    to: target,
                    type: 'imports',
                });

                node.fanOut++;
                const targetNode = nodeMap.get(target);
                if (targetNode) {
                    targetNode.fanIn++;
                }
            }
        }
    }

    // Calculate counts
    const counts = {
        pages: nodes.filter((n) => n.type === 'page').length,
        components: nodes.filter((n) => n.type === 'component').length,
        stores: nodes.filter((n) => n.type === 'store').length,
        composables: nodes.filter((n) => n.type === 'composable').length,
        services: nodes.filter((n) => n.type === 'service').length,
        layouts: nodes.filter((n) => n.type === 'layout').length,
        middlewares: nodes.filter((n) => n.type === 'middleware').length,
        plugins: nodes.filter((n) => n.type === 'plugin').length,
        utils: nodes.filter((n) => n.type === 'util').length,
        others: nodes.filter((n) => n.type === 'other').length,
    };

    return {
        nodes,
        edges,
        meta: {
            generatedAt: Date.now(),
            fileCount: nodes.length,
            version: '2.7.0',
        },
        counts,
    };
}

/**
 * Calculate hotspot score for a node
 * Score = (Fan-In × 0.3) + (Fan-Out × 0.2) + (LOC/10 × 0.2) + (Violations × 0.3)
 */
export function calculateHotspotScore(node: GraphNode): number {
    return (
        node.fanIn * 0.3 +
        node.fanOut * 0.2 +
        (node.loc / 10) * 0.2 +
        node.violations * 0.3
    );
}

/**
 * Get top hotspots from graph
 */
export function getHotspots(graph: ProjectGraph, limit: number = 10): HotspotInfo[] {
    return graph.nodes
        .map((node) => ({
            node,
            score: calculateHotspotScore(node),
            rank: 0,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((item, index) => ({
            ...item,
            rank: index + 1,
        }));
}

/**
 * Calculate instability index for a node
 * Instability = Fan-Out / (Fan-In + Fan-Out)
 */
export function calculateInstability(node: GraphNode): number {
    const total = node.fanIn + node.fanOut;
    if (total === 0) return 0;
    return node.fanOut / total;
}

/**
 * Find circular dependencies using DFS
 */
export function findCircularDependencies(graph: ProjectGraph): CircularDependency[] {
    const adjacencyList = new Map<string, string[]>();

    // Build adjacency list
    for (const edge of graph.edges) {
        if (!adjacencyList.has(edge.from)) {
            adjacencyList.set(edge.from, []);
        }
        adjacencyList.get(edge.from)!.push(edge.to);
    }

    const cycles: CircularDependency[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    function dfs(node: string): void {
        visited.add(node);
        recursionStack.add(node);
        path.push(node);

        const neighbors = adjacencyList.get(node) || [];

        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                dfs(neighbor);
            } else if (recursionStack.has(neighbor)) {
                // Found a cycle
                const cycleStart = path.indexOf(neighbor);
                const cycleNodes = path.slice(cycleStart);
                cycleNodes.push(neighbor); // Close the cycle

                const length = cycleNodes.length - 1;
                let severity: CircularDependency['severity'];

                if (length >= 6) severity = 'critical';
                else if (length >= 4) severity = 'high';
                else severity = 'medium';

                cycles.push({
                    nodes: cycleNodes,
                    length,
                    severity,
                });
            }
        }

        path.pop();
        recursionStack.delete(node);
    }

    // Run DFS from each unvisited node
    for (const node of graph.nodes) {
        if (!visited.has(node.filePath)) {
            dfs(node.filePath);
        }
    }

    // Sort by severity and length
    return cycles.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
        if (severityDiff !== 0) return severityDiff;
        return b.length - a.length;
    });
}

/**
 * Find orphan nodes (not imported by any other node)
 */
export function findOrphanNodes(
    graph: ProjectGraph,
    ignorePatterns: string[] = ['*.stories.*', '*.spec.*', '*.test.*'],
): GraphNode[] {
    const nodeMap = new Map(graph.nodes.map((n) => [n.filePath, n]));

    return graph.nodes.filter((node) => {
        // Check if imported by anyone
        const isImported = graph.edges.some((e) => e.to === node.filePath);

        if (isImported) return false;

        // Check ignore patterns
        const fileName = node.filePath.split('/').pop() || '';

        for (const pattern of ignorePatterns) {
            const regex = new RegExp(
                pattern
                    .replace(/\./g, '\\.')
                    .replace(/\*/g, '.*'),
            );
            if (regex.test(fileName)) {
                return false;
            }
        }

        // Pages, layouts, middleware, plugins are often auto-loaded in Nuxt
        const autoLoadedTypes: NodeType[] = ['page', 'layout', 'middleware', 'plugin'];
        if (autoLoadedTypes.includes(node.type)) {
            return false;
        }

        return true;
    });
}

/**
 * Get shared modules (imported by many files)
 */
export function getSharedModules(graph: ProjectGraph, threshold: number = 50): GraphNode[] {
    return graph.nodes
        .filter((node) => node.fanIn >= threshold)
        .sort((a, b) => b.fanIn - a.fanIn);
}

/**
 * Calculate coupling between two features
 */
export function calculateFeatureCoupling(
    graph: ProjectGraph,
    feature1: string,
    feature2: string,
): number {
    let crossBoundaryImports = 0;

    for (const edge of graph.edges) {
        const fromInFeature1 = edge.from.includes(feature1);
        const toInFeature2 = edge.to.includes(feature2);
        const fromInFeature2 = edge.from.includes(feature2);
        const toInFeature1 = edge.to.includes(feature1);

        if ((fromInFeature1 && toInFeature2) || (fromInFeature2 && toInFeature1)) {
            crossBoundaryImports++;
        }
    }

    return crossBoundaryImports;
}
