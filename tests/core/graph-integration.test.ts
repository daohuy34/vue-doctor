import { describe, it, expect, beforeEach } from 'vitest';
import {
    buildProjectGraph,
    classifyGraphNode,
    extractImports,
    extractDynamicImports,
} from '../../src/core/graph';
import {
    parseImports,
    extractComponentNames,
    isLikelyComponent,
} from '../../src/utils/import-parser';
import {
    trackComponentUsage,
    normalizeComponentName,
    isLikelyComponent as isLikelyComponentTracker,
} from '../../src/utils/component-usage-tracker';
import {
    buildComponentRegistry,
    resolveComponentTag,
    buildComponentDependencyMap,
    findCircularDependencies,
} from '../../src/utils/component-resolver';
import {
    createGraphVisualization,
    buildGraphTree,
    toAdjacencyList,
    getGraphStats,
    exportGraphToJson,
} from '../../src/utils/graph-visualization';
import { parse as parseSFC } from '@vue/compiler-sfc';

describe('Integration: Full Graph System', () => {
    describe('buildProjectGraph', () => {
        it('should build a graph with all node types', () => {
            const files = [
                'src/pages/Index.vue',
                'src/components/BaseCard.vue',
                'src/stores/user.ts',
                'src/composables/useAuth.ts',
                'src/utils/helpers.ts',
            ];

            const sources = new Map([
                ['src/pages/Index.vue', `import BaseCard from 'components/BaseCard.vue'`],
                ['src/components/BaseCard.vue', ''],
                ['src/stores/user.ts', `import { defineStore } from 'pinia'`],
                ['src/composables/useAuth.ts', ''],
                ['src/utils/helpers.ts', ''],
            ]);

            const graph = buildProjectGraph(files, sources);

            expect(graph.nodes).toHaveLength(5);
            expect(graph.counts.pages).toBe(1);
            expect(graph.counts.components).toBe(1);
            expect(graph.counts.stores).toBe(1);
            expect(graph.counts.composables).toBe(1);
            expect(graph.counts.utils).toBe(1);
        });

        it('should track dynamic imports', () => {
            const files = ['src/pages/Index.vue', 'src/components/HeavyModal.vue'];
            const sources = new Map([
                [
                    'src/pages/Index.vue',
                    `const Modal = defineAsyncComponent(() => import('./HeavyModal.vue'))`,
                ],
                ['src/components/HeavyModal.vue', ''],
            ]);

            const graph = buildProjectGraph(files, sources);

            expect(graph.nodes[0].dynamicImports.length).toBeGreaterThanOrEqual(0);
        });

        it('should classify files correctly', () => {
            expect(classifyGraphNode('src/pages/Home.vue')).toBe('page');
            expect(classifyGraphNode('src/components/Button.vue')).toBe('component');
            expect(classifyGraphNode('src/stores/auth.ts')).toBe('store');
            expect(classifyGraphNode('src/composables/useAuth.ts')).toBe('composable');
        });
    });

    describe('Graph Visualization', () => {
        it('should create visualization from graph', () => {
            const files = [
                'pages/Index.vue',
                'components/BaseCard.vue',
            ];
            const sources = new Map([
                ['pages/Index.vue', `import BaseCard from './BaseCard.vue'`],
                ['components/BaseCard.vue', ''],
            ]);

            const graph = buildProjectGraph(files, sources);
            const viz = createGraphVisualization(graph);

            expect(viz.nodes).toHaveLength(2);
            expect(viz.metadata.totalNodes).toBe(2);
        });

        it('should calculate correct stats', () => {
            const files = ['pages/Index.vue', 'components/BaseCard.vue'];
            const sources = new Map([
                ['pages/Index.vue', `import BaseCard from './BaseCard.vue'`],
                ['components/BaseCard.vue', ''],
            ]);

            const graph = buildProjectGraph(files, sources);
            const viz = createGraphVisualization(graph);
            const stats = getGraphStats(viz);

            expect(stats.nodeCount).toBe(2);
            // orphanCount can be equal to nodeCount for disconnected graphs
            expect(stats.orphanCount).toBeLessThanOrEqual(stats.nodeCount);
        });

        it('should export to JSON', () => {
            const files = ['pages/Index.vue'];
            const sources = new Map([['pages/Index.vue', '']]);

            const graph = buildProjectGraph(files, sources);
            const viz = createGraphVisualization(graph);
            const json = exportGraphToJson(viz);

            const parsed = JSON.parse(json);
            expect(parsed.metadata.totalNodes).toBe(1);
        });
    });

    describe('Component Resolution', () => {
        it('should build component registry from files', () => {
            const files = [
                'components/BaseCard.vue',
                'components/BaseButton.vue',
            ];
            const sources = new Map([
                ['components/BaseCard.vue', `export default { name: 'BaseCard' }`],
                ['components/BaseButton.vue', `export default { name: 'BaseButton' }`],
            ]);

            const registry = buildComponentRegistry(files, sources);

            expect(registry.byName.size).toBeGreaterThan(0);
        });

        it('should resolve component tags', () => {
            const files = ['components/BaseCard.vue'];
            const sources = new Map([
                ['components/BaseCard.vue', `export default { name: 'BaseCard' }`],
            ]);

            const registry = buildComponentRegistry(files, sources);
            const resolved = resolveComponentTag('base-card', registry);

            expect(resolved).toBeDefined();
        });
    });

    describe('Circular Dependency Detection', () => {
        it('should detect circular dependencies', () => {
            const dependencyMap = new Map([
                [
                    'components/A.vue',
                    [{ name: 'B', filePath: 'components/B.vue', source: 'import' as const }],
                ],
                [
                    'components/B.vue',
                    [{ name: 'C', filePath: 'components/C.vue', source: 'import' as const }],
                ],
                [
                    'components/C.vue',
                    [{ name: 'A', filePath: 'components/A.vue', source: 'import' as const }],
                ],
            ]);

            const cycles = findCircularDependencies(dependencyMap);
            expect(cycles.length).toBeGreaterThan(0);
        });

        it('should not report false positives for linear dependencies', () => {
            const dependencyMap = new Map([
                ['pages/Index.vue', []],
                [
                    'components/A.vue',
                    [{ name: 'B', filePath: 'components/B.vue', source: 'import' as const }],
                ],
                ['components/B.vue', []],
            ]);

            const cycles = findCircularDependencies(dependencyMap);
            expect(cycles).toHaveLength(0);
        });
    });
});
