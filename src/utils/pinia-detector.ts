/**
 * Pinia Store Detection & Analysis
 *
 * Utilities for detecting and analyzing Pinia stores.
 */

export interface PiniaStore {
    /** Store name */
    name: string;
    /** Full file path */
    filePath: string;
    /** State properties */
    stateProperties: string[];
    /** Getters */
    getters: string[];
    /** Actions */
    actions: ActionInfo[];
    /** Total lines */
    lineCount: number;
    /** Store type */
    type: 'options' | 'setup';
}

export interface ActionInfo {
    name: string;
    isAsync: boolean;
    line: number;
}

export interface StoreAnalysis {
    store: PiniaStore;
    stateSize: number;
    getterCount: number;
    actionCount: number;
    asyncActionCount: number;
    complexity: 'low' | 'medium' | 'high';
}

/**
 * Detect if a file is a Pinia store
 */
export function isPiniaStore(source: string): boolean {
    return (
        source.includes('defineStore') ||
        source.includes('storeToRefs') ||
        (source.includes('ref') && source.includes('state'))
    );
}

/**
 * Extract store name from defineStore call
 */
export function extractStoreName(source: string): string | null {
    // Pattern: defineStore('name', ...)
    const nameMatch = source.match(/defineStore\s*\(\s*['"]([^'"]+)['"]/);
    if (nameMatch) {
        return nameMatch[1];
    }

    // Pattern: defineStore({ name: 'name', ...
    const nameObjMatch = source.match(/defineStore\s*\(\s*\{[^}]*name\s*:\s*['"]([^'"]+)['"]/);
    if (nameObjMatch) {
        return nameObjMatch[1];
    }

    return null;
}

/**
 * Extract state properties from store
 */
export function extractStateProperties(source: string): string[] {
    const properties: string[] = [];

    // Options API: state() { return { prop: value } }
    const stateMatch = source.match(/state\s*\(\s*\)\s*\{[^}]*return\s*\{([^}]+)\}/s);
    if (stateMatch) {
        const stateContent = stateMatch[1];
        const propMatches = stateContent.matchAll(/(\w+)\s*:/g);
        for (const match of propMatches) {
            properties.push(match[1]);
        }
    }

    // Setup API: ref/reactive
    const setupMatch = source.match(/<script[^>]*setup[^>]*>([\s\S]*?)<\/script>/);
    if (setupMatch) {
        const setupContent = setupMatch[1];
        // Match ref() and reactive() declarations
        const refMatches = setupContent.matchAll(/\bconst\s+(\w+)\s*=\s*ref\s*\(/g);
        for (const match of refMatches) {
            properties.push(match[1]);
        }
        const reactiveMatches = setupContent.matchAll(/\bconst\s+(\w+)\s*=\s*reactive\s*\(/g);
        for (const match of reactiveMatches) {
            properties.push(match[1]);
        }
    }

    return [...new Set(properties)]; // Remove duplicates
}

/**
 * Extract getters from store
 */
export function extractGetters(source: string): string[] {
    const getters: string[] = [];

    // Options API: getters: { getX() { ... } }
    const gettersMatch = source.match(/getters\s*:\s*\{([^}]+)\}/s);
    if (gettersMatch) {
        const getterMatches = gettersMatch[1].matchAll(/(\w+)\s*\(/g);
        for (const match of getterMatches) {
            getters.push(match[1]);
        }
    }

    // Setup API: computed()
    const setupMatch = source.match(/<script[^>]*setup[^>]*>([\s\S]*?)<\/script>/);
    if (setupMatch) {
        const setupContent = setupMatch[1];
        const computedMatches = setupContent.matchAll(/\bconst\s+(\w+)\s*=\s*computed\s*\(/g);
        for (const match of computedMatches) {
            getters.push(match[1]);
        }
    }

    return [...new Set(getters)];
}

/**
 * Extract actions from store
 */
export function extractActions(source: string): ActionInfo[] {
    const actions: ActionInfo[] = [];
    const lines = source.split('\n');

    // Options API: actions: { async doX() { ... } }
    const actionsMatch = source.match(/actions\s*:\s*\{([^}]+)\}/s);
    if (actionsMatch) {
        const actionsContent = actionsMatch[1];
        const lines = actionsContent.split('\n');

        for (const line of lines) {
            // Match function declarations
            const funcMatch = line.match(/(?:async\s+)?(\w+)\s*\(/);
            if (funcMatch && !['if', 'for', 'while', 'switch'].includes(funcMatch[1])) {
                const isAsync = line.trim().startsWith('async');
                actions.push({
                    name: funcMatch[1],
                    isAsync,
                    line: 0, // Line number would need context
                });
            }
        }
    }

    // Setup API: regular functions in setup
    const setupMatch = source.match(/<script[^>]*setup[^>]*>([\s\S]*?)<\/script>/);
    if (setupMatch) {
        const setupContent = setupMatch[1];
        const funcMatches = setupContent.matchAll(/(?:async\s+)?function\s+(\w+)\s*\(/g);
        for (const match of funcMatches) {
            actions.push({
                name: match[1],
                isAsync: false,
                line: 0,
            });
        }
    }

    return actions;
}

/**
 * Analyze a Pinia store
 */
export function analyzeStore(store: PiniaStore): StoreAnalysis {
    const stateSize = store.stateProperties.length;
    const getterCount = store.getters.length;
    const actionCount = store.actions.length;
    const asyncActionCount = store.actions.filter((a) => a.isAsync).length;

    // Calculate complexity
    let complexity: 'low' | 'medium' | 'high' = 'low';
    const totalSize = stateSize + getterCount + actionCount;

    if (totalSize > 20 || stateSize > 15 || actionCount > 10) {
        complexity = 'high';
    } else if (totalSize > 10 || stateSize > 8 || actionCount > 5) {
        complexity = 'medium';
    }

    return {
        store,
        stateSize,
        getterCount,
        actionCount,
        asyncActionCount,
        complexity,
    };
}

/**
 * Parse a Pinia store file
 */
export function parsePiniaStore(source: string, filePath: string): PiniaStore | null {
    if (!isPiniaStore(source)) {
        return null;
    }

    const name = extractStoreName(source) ?? 'unknown';
    const stateProperties = extractStateProperties(source);
    const getters = extractGetters(source);
    const actions = extractActions(source);
    const lineCount = source.split('\n').length;
    const type = source.includes('<script setup') ? 'setup' : 'options';

    return {
        name,
        filePath,
        stateProperties,
        getters,
        actions,
        lineCount,
        type,
    };
}

/**
 * Check if a store is a "god object" (too many responsibilities)
 */
export function isGodObject(analysis: StoreAnalysis): boolean {
    // More than 20 state properties or 15 actions indicates a god object
    return analysis.stateSize > 20 || analysis.actionCount > 15;
}

/**
 * Check if a store is bloated
 */
export function isStoreBloated(analysis: StoreAnalysis): boolean {
    // Store is bloated if it has too many lines or properties
    return (
        analysis.store.lineCount > 300 ||
        analysis.stateSize > 15 ||
        (analysis.stateSize + analysis.getterCount + analysis.actionCount) > 30
    );
}

/**
 * Store dependency info
 */
export interface StoreDependency {
    sourceStore: string;
    targetStore: string;
    sourceFile: string;
    targetFile: string;
}

/**
 * Extract store-to-store dependencies from source code
 */
export function extractStoreDependencies(source: string, filePath: string): StoreDependency[] {
    const dependencies: StoreDependency[] = [];

    // Pattern to match store imports
    const storeImportPattern = /use(\w+)Store/g;
    const storeName = extractStoreName(source);

    let match;
    while ((match = storeImportPattern.exec(source)) !== null) {
        const importedStore = match[1] + 'Store';
        const targetFile = filePath.replace(/[^/]+$/, `use${match[1]}Store.ts`);

        // Skip if importing itself
        if (storeName && importedStore === storeName) {
            continue;
        }

        dependencies.push({
            sourceStore: storeName ?? 'unknown',
            targetStore: importedStore,
            sourceFile: filePath,
            targetFile,
        });
    }

    return dependencies;
}

/**
 * Check if a store has cross-store dependencies
 */
export function hasCrossStoreDependencies(dependencies: StoreDependency[]): boolean {
    return dependencies.length > 0;
}

/**
 * Check if there's a circular store dependency in a dependency graph
 */
export function hasCircularStoreDependency(
    dependencies: StoreDependency[],
    storeName: string
): boolean {
    const visited = new Set<string>();
    const stack = [storeName];

    while (stack.length > 0) {
        const current = stack.pop()!;

        if (current === storeName && visited.has(current)) {
            return true;
        }

        if (visited.has(current)) {
            continue;
        }

        visited.add(current);

        // Find dependencies of current store
        const deps = dependencies.filter(d => d.sourceStore === current);
        for (const dep of deps) {
            stack.push(dep.targetStore);
        }
    }

    return false;
}

/**
 * Pinia best practice violation
 */
export interface BestPracticeViolation {
    type: 'direct-mutation' | 'async-in-state' | 'side-effect-getter' | 'no-types';
    message: string;
    line?: number;
}

/**
 * Check for Pinia best practice violations
 */
export function checkBestPractices(source: string): BestPracticeViolation[] {
    const violations: BestPracticeViolation[] = [];

    // Check for direct state mutation (Options API)
    if (source.includes('defineStore')) {
        // Check for direct assignment to state
        const stateMutationPattern = /state\.\w+\s*=/g;
        let match;
        while ((match = stateMutationPattern.exec(source)) !== null) {
            violations.push({
                type: 'direct-mutation',
                message: 'Direct state mutation detected. Use $patch or actions instead.',
                line: source.substring(0, match.index).split('\n').length,
            });
        }

        // Check for async in state (Options API)
        if (source.includes('state()') && /\basync\b/.test(source)) {
            const asyncInState = source.match(/state\s*\(\s*\)\s*\{[^}]*async/);
            if (asyncInState) {
                violations.push({
                    type: 'async-in-state',
                    message: 'Async code in state() is not recommended. Use actions for async operations.',
                });
            }
        }

        // Check for side effects in getters
        const getterWithSideEffect = source.match(/getters\s*:\s*\{[^}]*\{[^}]*\.(?:fetch|axios|localStorage)/s);
        if (getterWithSideEffect) {
            violations.push({
                type: 'side-effect-getter',
                message: 'Side effects in getters are not recommended. Getters should be pure.',
            });
        }
    }

    return violations;
}
