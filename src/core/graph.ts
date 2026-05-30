import path from 'node:path';

export type GraphNodeKind = 'page' | 'component' | 'store' | 'composable' | 'other';

export interface GraphNode {
    filePath: string;
    kind: GraphNodeKind;
    imports: string[];
}

export interface GraphEdge {
    from: string;
    to: string;
    kind: 'import';
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

    const imports = new Set<string>();

    for (const match of source.matchAll(
        /(?:import|export\s+[^'"\n]+from|require\s*\()\s*['"]([^'"]+)['"]/g,
    )) {
        const importPath = match[1];

        if (importPath) {
            imports.add(importPath);
        }
    }

    return [...imports];
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
    }));

    const edges = new Map<string, GraphEdge>();

    for (const node of nodes) {
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
