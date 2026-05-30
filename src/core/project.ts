import { parseVueFile, type ParsedVueFile } from './parser';
import {
    buildProjectGraph,
    classifyGraphNode,
    extractImports,
    type ProjectGraph,
    type GraphNodeKind,
} from './graph';

export type { GraphNodeKind, GraphEdge } from './graph';

export interface ComponentInfo {
    name: string;
    filePath: string;
    kind: GraphNodeKind;
}

export interface ComposableInfo {
    name: string;
    filePath: string;
}

export interface StoreInfo {
    name: string;
    filePath: string;
    kind: 'pinia' | 'vuex' | 'other';
}

export interface ParsedFileInfo {
    filePath: string;
    parsed: ParsedVueFile;
}

export interface ProjectContext {
    files: Map<string, ParsedFileInfo>;
    componentMap: Map<string, string>;
    composableMap: Map<string, string>;
    storeMap: Map<string, string>;
    importGraph: Map<string, Set<string>>;
    graph: ProjectGraph;
}

function normalizeComponentName(filePath: string): string {
    const normalized = filePath.replace(/\\/g, '/');
    const parts = normalized.split('/');
    let name = parts[parts.length - 1];

    name = name.replace(/\.(vue|ts|js)$/, '');

    if (name === 'index') {
        name = parts[parts.length - 2] || 'index';
        return name;
    }

    name = name
        .replace(/^-([a-z])/, (_, c) => c.toUpperCase())
        .replace(/-([a-z])/g, (_, c) => c.toUpperCase());

    return name;
}

function detectStoreKind(source: string): 'pinia' | 'vuex' | 'other' {
    if (source.includes('defineStore') || source.includes('storeToRefs')) {
        return 'pinia';
    }
    if (source.includes('createStore') || source.includes('mapState') || source.includes('mapGetters')) {
        return 'vuex';
    }
    return 'other';
}

function detectComposableKind(source: string): 'composition' | 'options' {
    if (source.includes('ref(') || source.includes('reactive(') || source.includes('computed(')) {
        return 'composition';
    }
    return 'options';
}

export async function buildProjectContext(files: string[]): Promise<ProjectContext> {
    const componentMap = new Map<string, string>();
    const composableMap = new Map<string, string>();
    const storeMap = new Map<string, string>();
    const importGraph = new Map<string, Set<string>>();
    const parsedFiles = new Map<string, ParsedFileInfo>();
    const sources = new Map<string, string>();

    for (const filePath of files) {
        const normalizedPath = filePath.replace(/\\/g, '/');

        try {
            const parsed = await parseVueFile(filePath);
            parsedFiles.set(normalizedPath, { filePath, parsed });

            const source = parsed.source;
            sources.set(normalizedPath, source);

            const nodeKind = classifyGraphNode(normalizedPath);
            const componentName = normalizeComponentName(normalizedPath);

            if (nodeKind === 'component') {
                componentMap.set(componentName, normalizedPath);
            }

            if (nodeKind === 'composable') {
                composableMap.set(componentName, normalizedPath);
            }

            if (nodeKind === 'store') {
                const storeKind = detectStoreKind(source);
                storeMap.set(componentName, normalizedPath);
            }

            const imports = extractImports(source);
            importGraph.set(normalizedPath, new Set(imports));
        } catch (error) {
            console.warn(`Failed to parse file: ${filePath}`, error);
        }
    }

    const graph = buildProjectGraph(files, sources);

    return {
        files: parsedFiles,
        componentMap,
        composableMap,
        storeMap,
        importGraph,
        graph,
    };
}

export function getComponentInfo(context: ProjectContext, componentName: string): ComponentInfo | undefined {
    const filePath = context.componentMap.get(componentName);

    if (!filePath) {
        return undefined;
    }

    return {
        name: componentName,
        filePath,
        kind: classifyGraphNode(filePath),
    };
}

export function getComposableInfo(context: ProjectContext, composableName: string): ComposableInfo | undefined {
    const filePath = context.composableMap.get(composableName);

    if (!filePath) {
        return undefined;
    }

    return {
        name: composableName,
        filePath,
    };
}

export function getStoreInfo(context: ProjectContext, storeName: string): StoreInfo | undefined {
    const filePath = context.storeMap.get(storeName);

    if (!filePath) {
        return undefined;
    }

    const parsedInfo = context.files.get(filePath);
    const source = parsedInfo?.parsed.source || '';

    return {
        name: storeName,
        filePath,
        kind: detectStoreKind(source),
    };
}

export function getFileImports(context: ProjectContext, filePath: string): string[] {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const imports = context.importGraph.get(normalizedPath);
    return imports ? [...imports] : [];
}

export function getFileDependents(context: ProjectContext, filePath: string): string[] {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const dependents: string[] = [];

    for (const edge of context.graph.edges) {
        if (edge.to === normalizedPath) {
            dependents.push(edge.from);
        }
    }

    return dependents;
}

export function getFanIn(context: ProjectContext, filePath: string): number {
    return getFileDependents(context, filePath).length;
}

export function getFanOut(context: ProjectContext, filePath: string): number {
    const normalizedPath = filePath.replace(/\\/g, '/');
    let count = 0;

    for (const edge of context.graph.edges) {
        if (edge.from === normalizedPath) {
            count++;
        }
    }

    return count;
}

export function getProjectStats(context: ProjectContext) {
    return {
        totalFiles: context.files.size,
        ...context.graph.counts,
    };
}
