/**
 * Circular Dependency Detection
 *
 * Uses Tarjan's Strongly Connected Components (SCC) algorithm
 * to detect circular dependencies in the project graph.
 */

export interface CircularDependency {
    /** The cycle path, e.g., ["A.ts", "B.ts", "C.ts", "A.ts"] */
    path: string[];
    /** Files involved in the cycle */
    nodes: string[];
    /** Length of the cycle */
    length: number;
}

export interface CycleDetectionResult {
    /** All circular dependencies found */
    cycles: CircularDependency[];
    /** Total number of cycles */
    count: number;
    /** Whether any cycles were detected */
    hasCycles: boolean;
}

// Cache for cycle detection results
const cache = new Map<string, CycleDetectionResult>();

/**
 * Clears the cycle detection cache.
 */
export function clearCycleCache(): void {
    cache.clear();
}

/**
 * Generates a cache key from edges.
 */
function getCacheKey(edges: Array<{ from: string; to: string }>): string {
    return edges
        .map((e) => `${e.from}->${e.to}`)
        .sort()
        .join('|');
}

/**
 * Finds all circular dependencies in a directed graph using Tarjan's SCC algorithm.
 *
 * Tarjan's algorithm runs in O(V + E) time complexity where:
 * - V = number of vertices (files)
 * - E = number of edges (imports)
 *
 * Results are cached for performance.
 *
 * @param edges - Array of [source, target] pairs representing directed edges
 * @param nodes - Optional array of all nodes (if not provided, will be inferred from edges)
 * @returns CycleDetectionResult with all detected cycles
 */
export function findCircularDependencies(
    edges: Array<{ from: string; to: string }>,
    nodes?: string[],
): CycleDetectionResult {
    // Check cache first
    const cacheKey = getCacheKey(edges);
    const cached = cache.get(cacheKey);
    if (cached) {
        return cached;
    }

    // Build adjacency list
    const adjacency = new Map<string, string[]>();
    const allNodes = new Set<string>();

    // Initialize adjacency list with all nodes
    const nodeSet = new Set(nodes ?? []);

    for (const edge of edges) {
        allNodes.add(edge.from);
        allNodes.add(edge.to);
        nodeSet.add(edge.from);
        nodeSet.add(edge.to);
    }

    for (const node of nodeSet) {
        if (!adjacency.has(node)) {
            adjacency.set(node, []);
        }
    }

    for (const edge of edges) {
        adjacency.get(edge.from)?.push(edge.to);
    }

    // Tarjan's SCC algorithm
    let index = 0;
    const indices = new Map<string, number>();
    const lowlinks = new Map<string, number>();
    const onStack = new Set<string>();
    const stack: string[] = [];
    const sccs: string[][] = [];

    function strongConnect(node: string) {
        // Set the depth index for node
        indices.set(node, index);
        lowlinks.set(node, index);
        index++;

        stack.push(node);
        onStack.add(node);

        // Consider successors of node
        const successors = adjacency.get(node) ?? [];
        for (const successor of successors) {
            if (!indices.has(successor)) {
                // Successor has not yet been visited
                strongConnect(successor);
                lowlinks.set(node, Math.min(lowlinks.get(node)!, lowlinks.get(successor)!));
            } else if (onStack.has(successor)) {
                // Successor is on stack, hence in current SCC
                lowlinks.set(node, Math.min(lowlinks.get(node)!, indices.get(successor)!));
            }
        }

        // If node is a root, pop stack and generate SCC
        if (lowlinks.get(node) === indices.get(node)) {
            const scc: string[] = [];
            let w: string;
            do {
                w = stack.pop()!;
                onStack.delete(w);
                scc.push(w);
            } while (w !== node);

            sccs.push(scc.reverse());
        }
    }

    // Run Tarjan's algorithm on all nodes
    for (const node of nodeSet) {
        if (!indices.has(node)) {
            strongConnect(node);
        }
    }

    // Filter to only SCCs with size > 1 (actual cycles)
    // Also handle self-referencing nodes
    const cycles: CircularDependency[] = [];
    const seenCycles = new Set<string>();

    for (const scc of sccs) {
        if (scc.length === 1) {
            // Check for self-reference
            const node = scc[0];
            if (edges.some(e => e.from === node && e.to === node)) {
                cycles.push({
                    path: [node, node],
                    nodes: [node],
                    length: 1,
                });
            }
        } else if (scc.length > 1) {
            // For SCCs with more than one node, find the actual cycle path
            // Build a subgraph for this SCC
            const sccSet = new Set(scc);
            const cycleEdges = edges.filter(
                e => sccSet.has(e.from) && sccSet.has(e.to)
            );

            // Find a cycle path within this SCC
            const cyclePath = findCyclePath(scc, cycleEdges);
            if (cyclePath) {
                const cycleKey = cyclePath.slice(0, -1).sort().join('->');
                if (!seenCycles.has(cycleKey)) {
                    seenCycles.add(cycleKey);
                    cycles.push({
                        path: cyclePath,
                        nodes: cyclePath.slice(0, -1),
                        length: cyclePath.length - 1,
                    });
                }
            }
        }
    }

    const result: CycleDetectionResult = {
        cycles,
        count: cycles.length,
        hasCycles: cycles.length > 0,
    };

    // Cache the result
    cache.set(cacheKey, result);

    return result;
}

/**
 * Finds a valid cycle path within a strongly connected component.
 */
function findCyclePath(
    nodes: string[],
    edges: Array<{ from: string; to: string }>,
): string[] | null {
    if (nodes.length === 1) {
        return [nodes[0], nodes[0]];
    }

    // Build adjacency for this SCC
    const adj = new Map<string, string[]>();
    for (const node of nodes) {
        adj.set(node, []);
    }
    for (const edge of edges) {
        adj.get(edge.from)?.push(edge.to);
    }

    // DFS to find any cycle
    const visited = new Set<string>();
    const path: string[] = [];

    function dfs(node: string): boolean {
        if (path.includes(node)) {
            // Found cycle - truncate path to start of cycle
            const cycleStart = path.indexOf(node);
            const cycle = [...path.slice(cycleStart), node];
            path.length = 0;
            path.push(...cycle);
            return true;
        }

        if (visited.has(node)) {
            return false;
        }

        visited.add(node);
        path.push(node);

        for (const neighbor of adj.get(node) ?? []) {
            if (dfs(neighbor)) {
                return true;
            }
        }

        path.pop();
        return false;
    }

    // Try DFS from each node until we find a cycle
    for (const node of nodes) {
        visited.clear();
        path.length = 0;
        if (dfs(node)) {
            return path;
        }
    }

    // If no cycle found via DFS, create a simple path for visualization
    return [...nodes, nodes[0]];
}

/**
 * Checks if a specific file is part of a circular dependency.
 */
export function isInCircularDependency(
    filePath: string,
    edges: Array<{ from: string; to: string }>,
): boolean {
    const result = findCircularDependencies(edges);
    return result.cycles.some(cycle => cycle.nodes.includes(filePath));
}

/**
 * Gets all circular dependencies involving a specific file.
 */
export function getCircularDependenciesForFile(
    filePath: string,
    edges: Array<{ from: string; to: string }>,
): CircularDependency[] {
    const result = findCircularDependencies(edges);
    return result.cycles.filter(cycle => cycle.nodes.includes(filePath));
}

/**
 * Formats a circular dependency as a human-readable string.
 */
export function formatCircularDependency(cycle: CircularDependency): string {
    return cycle.path.join(' → ');
}
