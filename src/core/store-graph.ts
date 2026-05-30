import { parseVueFile, type ParsedVueFile } from './parser';
import { extractImports } from './graph';

export type StoreKind = 'pinia' | 'vuex' | 'other';

export interface StoreState {
    name: string;
    type: 'ref' | 'reactive' | 'object';
}

export interface StoreAction {
    name: string;
    isAsync: boolean;
    parameters: string[];
}

export interface StoreGetter {
    name: string;
    computed: boolean;
}

export interface StoreDefinition {
    name: string;
    filePath: string;
    kind: StoreKind;
    state: StoreState[];
    actions: StoreAction[];
    getters: StoreGetter[];
    stores: string[];
}

export interface StoreUsage {
    storeName: string;
    composableName: string;
    filePath: string;
}

export interface StoreGraph {
    stores: Map<string, StoreDefinition>;
    usages: Map<string, StoreUsage[]>;
    files: Set<string>;
}

const STORE_PATTERNS = {
    directory: /^(stores|store|state)$/i,
    filename: /(?:store|Store|state|State)\.(ts|js|tsx|jsx|vue)$/,
};

const PINIA_PATTERNS = [
    /defineStore\s*\(/,
    /storeToRefs\s*\(/,
    /useStore\s*\(/,
    /createGlobalState\s*\(/,
];

const VUEX_PATTERNS = [
    /createStore\s*\(/,
    /new\s+Vuex\.Store\s*\(/,
    /mapState\s*\(/,
    /mapGetters\s*\(/,
    /mapMutations\s*\(/,
    /mapActions\s*\(/,
];

function detectStoreKind(source: string): StoreKind {
    for (const pattern of PINIA_PATTERNS) {
        if (pattern.test(source)) {
            return 'pinia';
        }
    }

    for (const pattern of VUEX_PATTERNS) {
        if (pattern.test(source)) {
            return 'vuex';
        }
    }

    return 'other';
}

function extractStoreName(filePath: string, source: string): string | null {
    const normalized = filePath.replace(/\\/g, '/');
    const filename = normalized.split('/').pop() || '';

    const defineStoreMatch = source.match(/defineStore\s*\(\s*['"]([^'"]+)['"]|defineStore\s*\(\s*['"]([^'"]+)['"]\s*,/);
    if (defineStoreMatch) {
        const name = defineStoreMatch[1] || defineStoreMatch[2];
        return name.replace(/Store$/, '').replace(/^use/, '');
    }

    const useStoreMatch = source.match(/useStore\s*\(\s*['"]([^'"]+)['"]/);
    if (useStoreMatch) {
        return useStoreMatch[1].replace(/Store$/, '');
    }

    const storeMatch = source.match(/(?:export\s+default|module\.exports)\s*=\s*(?:createStore\s*\()?\{[^}]*name\s*:\s*['"]([^'"]+)['"]/);
    if (storeMatch) {
        return storeMatch[1].replace(/Store$/, '');
    }

    const filenameMatch = filename.match(/^(?:use)?([A-Z][a-zA-Z0-9]*(?:Store)?)/i);
    if (filenameMatch) {
        return filenameMatch[1].replace(/Store$/i, '');
    }

    return null;
}

function extractState(source: string, kind: StoreKind): StoreState[] {
    const state: StoreState[] = [];

    if (kind === 'pinia') {
        const refs = source.matchAll(/\b(const|let|var)\s+(?:state|user|count|data|items|todos|items)\s*=\s*ref\s*\(/g);
        for (const match of refs) {
            state.push({ name: match[1], type: 'ref' });
        }

        const reactives = source.matchAll(/\b(const|let|var)\s+(\w+)\s*=\s*reactive\s*\(/g);
        for (const match of reactives) {
            state.push({ name: match[2], type: 'reactive' });
        }

        const stateObject = source.match(/state\s*:\s*\{([^}]+)\}/g);
        if (stateObject) {
            for (const obj of stateObject) {
                const properties = obj.match(/(\w+)\s*:/g);
                if (properties) {
                    for (const prop of properties) {
                        const propName = prop.replace(/:\s*$/, '');
                        state.push({ name: propName, type: 'object' });
                    }
                }
            }
        }
    }

    return state;
}

function extractActions(source: string, kind: StoreKind): StoreAction[] {
    const actions: StoreAction[] = [];

    const functions = source.matchAll(/(?:async\s+)?(?:async\s+)?(?:function\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*\w+\s*)?\{/g);
    for (const match of functions) {
        const name = match[1];

        if (['if', 'else', 'for', 'while', 'switch', 'constructor', 'connectedCallback'].includes(name)) {
            continue;
        }

        const isAsync = source.slice(match.index! - 10, match.index!).includes('async');

        actions.push({
            name,
            isAsync,
            parameters: [],
        });
    }

    return actions.slice(0, 50);
}

function extractGetters(source: string): StoreGetter[] {
    const getters: StoreGetter[] = [];

    const computed = source.matchAll(/(?:const|getter)\s+(\w+)\s*=\s*computed\s*\(/g);
    for (const match of computed) {
        getters.push({ name: match[1], computed: true });
    }

    const gettersObject = source.match(/getters\s*:\s*\{([^}]+)\}/g);
    if (gettersObject) {
        for (const obj of gettersObject) {
            const properties = obj.match(/(\w+)\s*\(/g);
            if (properties) {
                for (const prop of properties) {
                    const propName = prop.replace(/\(\s*$/, '');
                    getters.push({ name: propName, computed: false });
                }
            }
        }
    }

    return getters;
}

function extractStoreImports(source: string): string[] {
    if (!source) {
        return [];
    }

    const imports: string[] = [];

    const importMatches = source.matchAll(/import\s+(?:{[^}]+}|[\w]+)\s+from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]/g);
    for (const match of importMatches) {
        const path = match[1] || match[2];
        if (path.includes('store') || path.includes('Store')) {
            imports.push(path);
        }
    }

    return imports;
}

function isStoreFile(filePath: string): boolean {
    const normalized = filePath.replace(/\\/g, '/');

    const parts = normalized.split('/');

    for (let i = 0; i < parts.length; i++) {
        const dirName = parts[i];
        if (STORE_PATTERNS.directory.test(dirName)) {
            return true;
        }
    }

    const filename = parts[parts.length - 1];
    if (STORE_PATTERNS.filename.test(filename)) {
        return true;
    }

    return false;
}

export async function buildStoreGraph(
    files: string[],
    parsedFiles?: Map<string, ParsedVueFile>
): Promise<StoreGraph> {
    const stores = new Map<string, StoreDefinition>();
    const usages = new Map<string, StoreUsage[]>();
    const storeFiles = new Set<string>();

    for (const file of files) {
        if (!isStoreFile(file)) {
            continue;
        }

        const normalizedPath = file.replace(/\\/g, '/');
        storeFiles.add(normalizedPath);

        let source: string = '';
        try {
            if (parsedFiles?.has(normalizedPath)) {
                source = parsedFiles.get(normalizedPath)!.source;
            } else {
                const parsed = await parseVueFile(file);
                source = parsed.source;
            }
        } catch {
            source = '';
        }

        if (!source) {
            continue;
        }

        const storeKind = detectStoreKind(source);
        const storeName = extractStoreName(normalizedPath, source);

        if (storeName) {
            const definition: StoreDefinition = {
                name: storeName,
                filePath: normalizedPath,
                kind: storeKind,
                state: extractState(source, storeKind),
                actions: extractActions(source, storeKind),
                getters: extractGetters(source),
                stores: [],
            };

            stores.set(storeName, definition);
        }
    }

    for (const file of files) {
        if (storeFiles.has(file.replace(/\\/g, '/'))) {
            continue;
        }

        const normalizedPath = file.replace(/\\/g, '/');

        let source: string = '';
        try {
            if (parsedFiles?.has(normalizedPath)) {
                source = parsedFiles.get(normalizedPath)!.source;
            } else {
                const parsed = await parseVueFile(file);
                source = parsed.source;
            }
        } catch {
            continue;
        }

        const storeImports = extractStoreImports(source);

        if (storeImports.length > 0) {
            const fileUsages: StoreUsage[] = [];

            for (const importPath of storeImports) {
                const useStoreMatch = source.match(/const\s+(\w+)\s*=\s*(?:useStore|use\w*Store)\s*\(/);
                if (useStoreMatch) {
                    fileUsages.push({
                        storeName: '',
                        composableName: useStoreMatch[1],
                        filePath: importPath,
                    });
                }
            }

            if (fileUsages.length > 0) {
                usages.set(normalizedPath, fileUsages);
            }
        }
    }

    return {
        stores,
        usages,
        files: storeFiles,
    };
}

export function getStoreInfo(graph: StoreGraph, name: string): StoreDefinition | undefined {
    return graph.stores.get(name);
}

export function getStoreUsages(graph: StoreGraph, storeName: string): string[] {
    const results: string[] = [];

    for (const [filePath, fileUsages] of graph.usages.entries()) {
        for (const usage of fileUsages) {
            if (usage.storeName === storeName || usage.filePath.includes(storeName)) {
                results.push(filePath);
            }
        }
    }

    return results;
}

export function getStoresByKind(graph: StoreGraph, kind: StoreKind): StoreDefinition[] {
    return [...graph.stores.values()].filter(s => s.kind === kind);
}

export function getStoreStats(graph: StoreGraph) {
    const pinia = getStoresByKind(graph, 'pinia');
    const vuex = getStoresByKind(graph, 'vuex');
    const other = getStoresByKind(graph, 'other');

    return {
        total: graph.stores.size,
        pinia: pinia.length,
        vuex: vuex.length,
        other: other.length,
        files: graph.files.size,
    };
}
