/**
 * Graph CLI Command
 *
 * Options:
 * --type <kind>   Filter by node type: page, component, store, composable, all
 * --depth <n>     Maximum depth to traverse (default: unlimited)
 * --format <fmt>  Output format: text, tree, json, stats
 * --filter <str>  Filter by file path pattern
 */

import fs from 'node:fs/promises';
import fg from 'fast-glob';
import path from 'node:path';

import { buildProjectGraph } from '../../core/graph';
import {
    createGraphVisualization,
    buildGraphTree,
    getGraphStats,
    exportGraphToJson,
    type GraphVisualization,
} from '../../utils/graph-visualization';

export interface GraphCommandOptions {
    type?: 'page' | 'component' | 'store' | 'composable' | 'all';
    depth?: number;
    format?: 'text' | 'tree' | 'json' | 'stats';
    filter?: string;
}

async function collectGraphFiles(): Promise<string[]> {
    return fg(['**/*.{vue,ts,js,tsx,jsx,mjs,cjs}'], {
        ignore: [
            '**/node_modules/**',
            '**/dist/**',
            '**/.nuxt/**',
            '**/coverage/**',
            '**/*.test.ts',
            '**/*.spec.ts',
        ],
    });
}

function filterNodesByType(
    viz: GraphVisualization,
    type?: 'page' | 'component' | 'store' | 'composable' | 'all',
): GraphVisualization {
    if (!type || type === 'all') {
        return viz;
    }

    return {
        ...viz,
        nodes: viz.nodes.filter((n) => n.type === type),
        edges: viz.edges.filter((e) => {
            const sourceNode = viz.nodes.find((n) => n.id === e.source);
            const targetNode = viz.nodes.find((n) => n.id === e.target);
            return sourceNode?.type === type || targetNode?.type === type;
        }),
    };
}

function filterByPattern(viz: GraphVisualization, pattern?: string): GraphVisualization {
    if (!pattern) {
        return viz;
    }

    const regex = new RegExp(pattern);

    return {
        ...viz,
        nodes: viz.nodes.filter((n) => regex.test(n.filePath)),
        edges: viz.edges.filter((e) => {
            return regex.test(e.source) || regex.test(e.target);
        }),
    };
}

function limitDepth(
    viz: GraphVisualization,
    maxDepth?: number,
): GraphVisualization {
    if (!maxDepth || maxDepth <= 0) {
        return viz;
    }

    // Build adjacency list
    const children = new Map<string, string[]>();
    const parents = new Map<string, string[]>();

    for (const node of viz.nodes) {
        children.set(node.id, []);
        parents.set(node.id, []);
    }

    for (const edge of viz.edges) {
        children.get(edge.source)?.push(edge.target);
        parents.get(edge.target)?.push(edge.source);
    }

    // Find root nodes (nodes with no incoming edges)
    const rootNodes = viz.nodes
        .filter((n) => (parents.get(n.id)?.length ?? 0) === 0)
        .map((n) => n.id);

    // BFS to mark nodes within depth limit
    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; depth: number }> = [];

    for (const root of rootNodes) {
        queue.push({ nodeId: root, depth: 0 });
    }

    while (queue.length > 0) {
        const { nodeId, depth } = queue.shift()!;

        if (visited.has(nodeId)) continue;
        if (depth > maxDepth) continue;

        visited.add(nodeId);

        for (const child of children.get(nodeId) ?? []) {
            if (!visited.has(child)) {
                queue.push({ nodeId: child, depth: depth + 1 });
            }
        }
    }

    return {
        ...viz,
        nodes: viz.nodes.filter((n) => visited.has(n.id)),
        edges: viz.edges.filter(
            (e) => visited.has(e.source) && visited.has(e.target),
        ),
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────────────────────

function formatText(viz: GraphVisualization): string {
    const lines: string[] = [];

    lines.push('Project Graph');
    lines.push('─'.repeat(50));

    // Group nodes by type
    const byType = new Map<string, string[]>();
    for (const node of viz.nodes) {
        const type = node.type;
        if (!byType.has(type)) {
            byType.set(type, []);
        }
        byType.get(type)!.push(node.label);
    }

    for (const [type, nodes] of byType) {
        lines.push(`\n${type.toUpperCase()}S (${nodes.length}):`);
        for (const label of nodes.sort()) {
            lines.push(`  • ${label}`);
        }
    }

    lines.push('\n' + '─'.repeat(50));
    lines.push(`\nEdges (${viz.edges.length}):`);

    for (const edge of viz.edges) {
        const sourceLabel = viz.nodes.find((n) => n.id === edge.source)?.label ?? edge.source;
        const targetLabel = viz.nodes.find((n) => n.id === edge.target)?.label ?? edge.target;
        const kind = edge.type === 'dynamic' ? ' [lazy]' : '';
        lines.push(`  ${sourceLabel} → ${targetLabel}${kind}`);
    }

    return lines.join('\n');
}

function formatTree(viz: GraphVisualization): string {
    const lines: string[] = [];
    lines.push('Project Graph (Tree View)');
    lines.push('─'.repeat(50));

    // Build tree from visualization
    const tree = buildGraphTree(viz);

    function printTreeNode(node: typeof tree[0], prefix: string, isLast: boolean): void {
        const connector = isLast ? '└── ' : '├── ';
        const name = `${node.label} (${node.type})`;

        if (node.inDegree > 0) {
            lines.push(`${prefix}${connector}${name} ← ${node.inDegree}`);
        } else {
            lines.push(`${prefix}${connector}${name}`);
        }

        const childPrefix = prefix + (isLast ? '    ' : '│   ');

        if (node.children) {
            for (let i = 0; i < node.children.length; i++) {
                printTreeNode(node.children[i], childPrefix, i === node.children.length - 1);
            }
        }
    }

    for (let i = 0; i < tree.length; i++) {
        printTreeNode(tree[i], '', i === tree.length - 1);
    }

    return lines.join('\n');
}

function formatStats(viz: GraphVisualization): string {
    const stats = getGraphStats(viz);
    const lines: string[] = [];

    lines.push('Project Statistics');
    lines.push('─'.repeat(50));

    // Type counts
    const typeLabels: Record<string, string> = {
        page: 'Pages',
        component: 'Components',
        store: 'Stores',
        composable: 'Composables',
        other: 'Other files',
    };

    for (const [type, count] of Object.entries(viz.metadata.byType)) {
        const label = typeLabels[type] ?? type;
        lines.push(`${label}: ${count}`);
    }

    lines.push('\n' + '─'.repeat(50));
    lines.push('\nGraph Metrics:');
    lines.push(`  Total nodes: ${stats.nodeCount}`);
    lines.push(`  Total edges: ${stats.edgeCount}`);
    lines.push(`  Static imports: ${viz.metadata.totalStaticEdges}`);
    lines.push(`  Dynamic imports: ${viz.metadata.totalDynamicEdges}`);
    lines.push(`  Graph density: ${stats.density}`);
    lines.push(`  Average degree: ${stats.avgDegree}`);
    lines.push(`  Max degree: ${stats.maxDegree}`);
    lines.push(`  Orphan nodes: ${stats.orphanCount}`);

    if (stats.mostConnected.length > 0) {
        lines.push(`  Most connected: ${stats.mostConnected.join(', ')}`);
    }

    return lines.join('\n');
}

function formatJson(viz: GraphVisualization): string {
    return exportGraphToJson(viz);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Command
// ─────────────────────────────────────────────────────────────────────────────

export async function graphCommand(options: GraphCommandOptions = {}) {
    const {
        type = 'all',
        depth,
        format = 'text',
        filter,
    } = options;

    const files = await collectGraphFiles();

    if (files.length === 0) {
        console.log('No files found to analyze.');
        return;
    }

    const sources = new Map<string, string>();

    for (const file of files) {
        try {
            sources.set(file, await fs.readFile(file, 'utf-8'));
        } catch {
            // Skip files that can't be read
        }
    }

    const graph = buildProjectGraph(files, sources);
    let viz = createGraphVisualization(graph);

    // Apply filters
    viz = filterNodesByType(viz, type);
    viz = filterByPattern(viz, filter);
    viz = limitDepth(viz, depth);

    // Format output
    let output: string;

    switch (format) {
        case 'tree':
            output = formatTree(viz);
            break;
        case 'stats':
            output = formatStats(viz);
            break;
        case 'json':
            output = formatJson(viz);
            break;
        case 'text':
        default:
            output = formatText(viz);
            break;
    }

    console.log(output);
}
