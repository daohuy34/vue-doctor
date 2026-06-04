/**
 * Feature Boundary Analyzer
 *
 * Detects cross-boundary violations in feature-based architectures.
 */

import type { ProjectGraph, GraphNode } from '../core/graph';
import type { FeatureBoundary } from '../types/config';

export interface BoundaryViolation {
    sourceFile: string;
    targetFile: string;
    sourceBoundary: string;
    targetBoundary: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    edgeType: string;
}

export interface BoundaryAnalysis {
    violations: BoundaryViolation[];
    summary: {
        totalViolations: number;
        byBoundary: Record<string, number>;
        bySeverity: Record<string, number>;
    };
}

/**
 * Detect which boundary a file belongs to
 */
function getFileBoundary(filePath: string, boundaries: FeatureBoundary[]): string | null {
    for (const boundary of boundaries) {
        const regex = new RegExp(boundary.pattern.replace(/\*/g, '.*'));
        if (regex.test(filePath)) {
            return boundary.name;
        }
    }
    return null;
}

/**
 * Check if source boundary is allowed to access target boundary
 */
function isAllowedAccess(
    sourceBoundary: string,
    targetBoundary: string,
    boundaries: FeatureBoundary[],
): boolean {
    const target = boundaries.find((b) => b.name === targetBoundary);

    // If no boundary config or allowedBy is '*', allow all
    if (!target || !target.allowedBy || target.allowedBy.includes('*')) {
        return true;
    }

    return target.allowedBy.includes(sourceBoundary);
}

/**
 * Analyze feature boundary violations in a project graph
 */
export function analyzeFeatureBoundaries(
    graph: ProjectGraph,
    boundaries: FeatureBoundary[],
): BoundaryAnalysis {
    const violations: BoundaryViolation[] = [];

    if (boundaries.length === 0) {
        return {
            violations: [],
            summary: {
                totalViolations: 0,
                byBoundary: {},
                bySeverity: {},
            },
        };
    }

    // Build adjacency for quick lookup
    const boundaryNodes = new Map<string, GraphNode[]>();

    for (const node of graph.nodes) {
        const boundary = getFileBoundary(node.filePath, boundaries);
        if (boundary) {
            if (!boundaryNodes.has(boundary)) {
                boundaryNodes.set(boundary, []);
            }
            boundaryNodes.get(boundary)!.push(node);
        }
    }

    // Check each edge for boundary violations
    for (const edge of graph.edges) {
        const sourceBoundary = getFileBoundary(edge.from, boundaries);
        const targetBoundary = getFileBoundary(edge.to, boundaries);

        // Skip if either file is not in a boundary
        if (!sourceBoundary || !targetBoundary) {
            continue;
        }

        // Skip if same boundary
        if (sourceBoundary === targetBoundary) {
            continue;
        }

        // Check if access is allowed
        if (!isAllowedAccess(sourceBoundary, targetBoundary, boundaries)) {
            const violation: BoundaryViolation = {
                sourceFile: edge.from,
                targetFile: edge.to,
                sourceBoundary,
                targetBoundary,
                severity: 'high',
                edgeType: edge.type,
            };

            violations.push(violation);
        }
    }

    // Calculate summary
    const summary = {
        totalViolations: violations.length,
        byBoundary: {} as Record<string, number>,
        bySeverity: {
            low: 0,
            medium: 0,
            high: 0,
            critical: 0,
        } as Record<string, number>,
    };

    for (const v of violations) {
        summary.byBoundary[v.targetBoundary] = (summary.byBoundary[v.targetBoundary] || 0) + 1;
        summary.bySeverity[v.severity]++;
    }

    return { violations, summary };
}

/**
 * Format boundary violations for CLI output
 */
export function formatBoundaryViolations(analysis: BoundaryAnalysis): string {
    const lines: string[] = [];

    lines.push('Feature Boundary Analysis');
    lines.push('═'.repeat(60));

    if (analysis.violations.length === 0) {
        lines.push('');
        lines.push('✅ No boundary violations found!');
        lines.push('');
        return lines.join('\n');
    }

    lines.push(`Found ${analysis.violations.length} violation(s)`);
    lines.push('');

    // Group by target boundary
    const byTarget = new Map<string, BoundaryViolation[]>();
    for (const v of analysis.violations) {
        if (!byTarget.has(v.targetBoundary)) {
            byTarget.set(v.targetBoundary, []);
        }
        byTarget.get(v.targetBoundary)!.push(v);
    }

    for (const [boundary, violations] of byTarget) {
        lines.push(`🔴 ${boundary} (${violations.length} violations)`);
        lines.push('─'.repeat(40));

        for (const v of violations.slice(0, 5)) {
            const sourceName = v.sourceFile.split('/').pop() || v.sourceFile;
            const targetName = v.targetFile.split('/').pop() || v.targetFile;
            lines.push(`  ${sourceName} → ${targetName}`);
        }

        if (violations.length > 5) {
            lines.push(`  ... and ${violations.length - 5} more`);
        }

        lines.push('');
    }

    lines.push('Summary:');
    lines.push(`  Total violations: ${analysis.summary.totalViolations}`);

    return lines.join('\n');
}

/**
 * Calculate route/page complexity
 */
export interface RouteComplexity {
    filePath: string;
    route: string;
    score: number;
    metrics: {
        componentCount: number;
        storeCount: number;
        composableCount: number;
        apiCallCount: number;
        totalLoc: number;
    };
}

export function analyzeRouteComplexity(
    graph: ProjectGraph,
    sources: Map<string, string>,
): RouteComplexity[] {
    const pages = graph.nodes.filter((n) => n.type === 'page');

    const results: RouteComplexity[] = [];

    for (const page of pages) {
        const route = page.filePath
            .replace(/^.*\/pages/, '')
            .replace(/\.vue$/, '')
            .replace(/index\.vue$/, '/')
            .replace(/\[(\w+)\]/g, ':$1')
            || '/';

        // Find dependencies of this page
        const dependencies = new Set<string>();
        const queue = [page.filePath];
        const visited = new Set<string>();

        while (queue.length > 0) {
            const current = queue.shift()!;
            if (visited.has(current)) continue;
            visited.add(current);

            for (const edge of graph.edges) {
                if (edge.from === current) {
                    dependencies.add(edge.to);
                    queue.push(edge.to);
                }
            }
        }

        // Count metrics
        let componentCount = 0;
        let storeCount = 0;
        let composableCount = 0;
        let apiCallCount = 0;
        let totalLoc = page.loc;

        for (const dep of dependencies) {
            const depNode = graph.nodes.find((n) => n.filePath === dep);
            if (!depNode) continue;

            totalLoc += depNode.loc;

            switch (depNode.type) {
                case 'component':
                    componentCount++;
                    break;
                case 'store':
                    storeCount++;
                    break;
                case 'composable':
                    composableCount++;
                    break;
            }

            // Count API calls
            const source = sources.get(dep) || '';
            if (
                source.includes('useFetch') ||
                source.includes('useAsyncData') ||
                source.includes('$fetch') ||
                source.includes('axios') ||
                source.includes('http')
            ) {
                apiCallCount++;
            }
        }

        // Calculate complexity score
        const score =
            componentCount * 2 +
            storeCount * 3 +
            composableCount * 1 +
            apiCallCount * 4 +
            Math.floor(totalLoc / 100);

        results.push({
            filePath: page.filePath,
            route,
            score,
            metrics: {
                componentCount,
                storeCount,
                composableCount,
                apiCallCount,
                totalLoc,
            },
        });
    }

    return results.sort((a, b) => b.score - a.score);
}

/**
 * Calculate coupling between two features based on boundary names
 */
export function calculateBoundaryCoupling(
    graph: ProjectGraph,
    boundaries: FeatureBoundary[],
): { feature1: string; feature2: string; coupling: number }[] {
    const couplings: { feature1: string; feature2: string; coupling: number }[] = [];
    const boundaryNames = boundaries.map((b) => b.name);

    // Calculate coupling for each pair
    for (let i = 0; i < boundaryNames.length; i++) {
        for (let j = i + 1; j < boundaryNames.length; j++) {
            const feature1 = boundaryNames[i];
            const feature2 = boundaryNames[j];
            const coupling = calculateFeatureCouplingByBoundary(graph, boundaries, feature1, feature2);

            if (coupling > 0) {
                couplings.push({ feature1, feature2, coupling });
            }
        }
    }

    return couplings.sort((a, b) => b.coupling - a.coupling);
}

/**
 * Calculate coupling between two boundaries
 */
function calculateFeatureCouplingByBoundary(
    graph: ProjectGraph,
    boundaries: FeatureBoundary[],
    feature1: string,
    feature2: string,
): number {
    let crossBoundaryImports = 0;

    for (const edge of graph.edges) {
        const fromBoundary = getFileBoundary(edge.from, boundaries);
        const toBoundary = getFileBoundary(edge.to, boundaries);

        if (!fromBoundary || !toBoundary) continue;

        if (
            (fromBoundary === feature1 && toBoundary === feature2) ||
            (fromBoundary === feature2 && toBoundary === feature1)
        ) {
            crossBoundaryImports++;
        }
    }

    return crossBoundaryImports;
}

/**
 * Format coupling analysis for CLI output
 */
export function formatCouplingAnalysis(
    couplings: { feature1: string; feature2: string; coupling: number }[],
): string {
    const lines: string[] = [];

    lines.push('Feature Coupling Analysis');
    lines.push('═'.repeat(60));

    if (couplings.length === 0) {
        lines.push('');
        lines.push('No cross-boundary coupling detected.');
        lines.push('');
        return lines.join('\n');
    }

    lines.push('');
    lines.push('Feature Pair              Coupling  Cross-Imports');
    lines.push('─'.repeat(50));

    for (const c of couplings.slice(0, 10)) {
        const pair = `${c.feature1} ↔ ${c.feature2}`.padEnd(24);
        const coupling = c.coupling.toString().padStart(8);
        lines.push(`${pair} ${coupling}`);
    }

    lines.push('');
    lines.push(`Total: ${couplings.length} coupling pair(s)`);
    lines.push('');

    return lines.join('\n');
}

/**
 * Format route complexity for CLI output
 */
export function formatRouteComplexity(analysis: RouteComplexity[]): string {
    const lines: string[] = [];

    lines.push('Route Complexity Analysis');
    lines.push('═'.repeat(60));

    if (analysis.length === 0) {
        lines.push('');
        lines.push('No pages found. Make sure you have pages/ directory.');
        lines.push('');
        return lines.join('\n');
    }

    lines.push('');
    lines.push('Route              Score  Components  Stores  Composables  API Calls  LOC');
    lines.push('─'.repeat(70));

    for (const route of analysis) {
        const routeStr = route.route.padEnd(18);
        const score = route.score.toString().padStart(5);
        const components = route.metrics.componentCount.toString().padStart(10);
        const stores = route.metrics.storeCount.toString().padStart(7);
        const composables = route.metrics.composableCount.toString().padStart(12);
        const apis = route.metrics.apiCallCount.toString().padStart(10);
        const loc = route.metrics.totalLoc.toString().padStart(5);

        lines.push(`${routeStr} ${score} ${components} ${stores} ${composables} ${apis} ${loc}`);
    }

    lines.push('');

    return lines.join('\n');
}
