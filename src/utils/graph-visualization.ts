/**
 * Component Graph Visualization Data Structure
 *
 * Provides flexible graph representation for:
 * - CLI text/ASCII output
 * - Future web visualization (D3.js, Cytoscape, etc.)
 * - JSON export for external tools
 */

import type { ProjectGraph as BaseProjectGraph, GraphNode, GraphEdge } from '../core/graph';

export type GraphFormat = 'tree' | 'list' | 'matrix' | 'adjacency';

export interface GraphVisualizationNode {
    id: string;
    label: string;
    type: 'page' | 'component' | 'store' | 'composable' | 'service' | 'layout' | 'middleware' | 'plugin' | 'util' | 'other';
    /** File path for reference */
    filePath: string;
    /** Number of incoming edges (how many files use this) */
    inDegree: number;
    /** Number of outgoing edges (what this file uses) */
    outDegree: number;
    /** Children in tree view */
    children?: GraphVisualizationNode[];
    /** Metadata for additional visualization info */
    metadata?: {
        lineCount?: number;
        imports?: string[];
        dynamicImports?: string[];
        tags?: string[];
    };
}

export interface GraphVisualizationEdge {
    id: string;
    source: string;
    target: string;
    type: 'static' | 'dynamic';
    label?: string;
}

export interface GraphVisualization {
    format: GraphFormat;
    nodes: GraphVisualizationNode[];
    edges: GraphVisualizationEdge[];
    metadata: {
        totalNodes: number;
        totalEdges: number;
        totalStaticEdges: number;
        totalDynamicEdges: number;
        byType: Record<string, number>;
        orphanedNodes: string[]; // Nodes with no connections
        rootNodes: string[]; // Entry points (pages)
    };
}

/**
 * Converts the internal graph to a visualization-friendly format.
 */
export function createGraphVisualization(
    baseGraph: BaseProjectGraph,
): GraphVisualization {
    // Build adjacency map for degree calculation
    const inDegree = new Map<string, number>();
    const outDegree = new Map<string, number>();

    // Initialize degrees
    for (const node of baseGraph.nodes) {
        inDegree.set(node.filePath, 0);
        outDegree.set(node.filePath, 0);
    }

    // Calculate degrees from edges
    for (const edge of baseGraph.edges) {
        inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
        outDegree.set(edge.from, (outDegree.get(edge.from) ?? 0) + 1);
    }

    // Convert nodes
    const nodes: GraphVisualizationNode[] = baseGraph.nodes.map((node) => ({
        id: node.filePath,
        label: getNodeLabel(node),
        type: node.type as GraphVisualizationNode['type'],
        filePath: node.filePath,
        inDegree: inDegree.get(node.filePath) ?? 0,
        outDegree: outDegree.get(node.filePath) ?? 0,
        metadata: {
            imports: node.imports,
            dynamicImports: node.dynamicImports,
        },
    }));

    // Convert edges
    const edges: GraphVisualizationEdge[] = baseGraph.edges.map((edge, index) => ({
        id: `edge-${index}`,
        source: edge.from,
        target: edge.to,
        type: 'static',
    }));

    // Find orphaned nodes (no connections)
    const orphanedNodes = nodes
        .filter((n) => n.inDegree === 0 && n.outDegree === 0)
        .map((n) => n.id);

    // Find root nodes (pages - usually entry points)
    const rootNodes = nodes
        .filter((n) => n.type === 'page' || (n.inDegree === 0 && n.outDegree > 0))
        .map((n) => n.id);

    // Count by type
    const byType: Record<string, number> = {};
    for (const node of baseGraph.nodes) {
        byType[node.type] = (byType[node.type] ?? 0) + 1;
    }

    return {
        format: 'adjacency',
        nodes,
        edges,
        metadata: {
            totalNodes: nodes.length,
            totalEdges: edges.length,
            totalStaticEdges: edges.filter((e) => e.type === 'static').length,
            totalDynamicEdges: edges.filter((e) => e.type === 'dynamic').length,
            byType,
            orphanedNodes,
            rootNodes,
        },
    };
}

/**
 * Gets a human-readable label for a graph node.
 */
function getNodeLabel(node: GraphNode): string {
    // Extract file name without extension
    const fileName = node.filePath.split('/').pop() ?? node.filePath;
    const baseName = fileName.replace(/\.(vue|ts|js)$/, '');

    // Convert to readable format
    return baseName
        .split(/[-_]/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

/**
 * Builds a tree structure from the graph for hierarchical visualization.
 */
export function buildGraphTree(
    visualization: GraphVisualization,
): GraphVisualizationNode[] {
    // Find root nodes (pages or nodes with no incoming edges)
    const roots = visualization.nodes.filter(
        (n) => n.type === 'page' || n.inDegree === 0
    );

    // Build child map
    const childrenMap = new Map<string, GraphVisualizationNode[]>();
    for (const node of visualization.nodes) {
        childrenMap.set(node.id, []);
    }

    for (const edge of visualization.edges) {
        const children = childrenMap.get(edge.source);
        if (children) {
            const targetNode = visualization.nodes.find((n) => n.id === edge.target);
            if (targetNode) {
                children.push({ ...targetNode, children: [] });
            }
        }
    }

    // Attach children to roots
    return roots.map((root) => ({
        ...root,
        children: childrenMap.get(root.id) ?? [],
    }));
}

/**
 * Converts to adjacency list format.
 */
export function toAdjacencyList(
    visualization: GraphVisualization,
): Map<string, string[]> {
    const adjacency = new Map<string, string[]>();

    for (const node of visualization.nodes) {
        adjacency.set(node.id, []);
    }

    for (const edge of visualization.edges) {
        const neighbors = adjacency.get(edge.source);
        if (neighbors) {
            neighbors.push(edge.target);
        }
    }

    return adjacency;
}

/**
 * Converts to adjacency matrix format (for small graphs).
 */
export function toAdjacencyMatrix(
    visualization: GraphVisualization,
): { matrix: boolean[][]; nodeIds: string[] } {
    const nodeIds = visualization.nodes.map((n) => n.id);
    const nodeIndex = new Map(nodeIds.map((id, i) => [id, i]));

    const matrix: boolean[][] = nodeIds.map(() => nodeIds.map(() => false));

    for (const edge of visualization.edges) {
        const fromIndex = nodeIndex.get(edge.source);
        const toIndex = nodeIndex.get(edge.target);
        if (fromIndex !== undefined && toIndex !== undefined) {
            matrix[fromIndex][toIndex] = true;
        }
    }

    return { matrix, nodeIds };
}

/**
 * Exports graph to JSON for external tools.
 */
export function exportGraphToJson(visualization: GraphVisualization): string {
    return JSON.stringify(visualization, null, 2);
}

/**
 * Gets summary statistics for the graph.
 */
export function getGraphStats(visualization: GraphVisualization): {
    nodeCount: number;
    edgeCount: number;
    density: number;
    avgDegree: number;
    maxDegree: number;
    mostConnected: string[];
    orphanCount: number;
} {
    const n = visualization.nodes.length;
    const m = visualization.edges.length;

    // Calculate density (for connected graphs)
    const maxEdges = n * (n - 1);
    const density = maxEdges > 0 ? m / maxEdges : 0;

    // Calculate average and max degree
    let totalDegree = 0;
    let maxDegree = 0;
    let maxDegreeNode = '';

    for (const node of visualization.nodes) {
        const degree = node.inDegree + node.outDegree;
        totalDegree += degree;
        if (degree > maxDegree) {
            maxDegree = degree;
            maxDegreeNode = node.id;
        }
    }

    const avgDegree = n > 0 ? totalDegree / n : 0;

    // Find most connected nodes
    const mostConnected = visualization.nodes
        .filter((n) => n.inDegree + n.outDegree >= maxDegree * 0.8)
        .map((n) => n.label);

    return {
        nodeCount: n,
        edgeCount: m,
        density: Math.round(density * 1000) / 1000,
        avgDegree: Math.round(avgDegree * 100) / 100,
        maxDegree,
        mostConnected,
        orphanCount: visualization.metadata.orphanedNodes.length,
    };
}
