import { describe, expect, it } from 'vitest';

import {
    buildProjectGraph,
    classifyGraphNode,
    extractImports,
} from '../../src/core/graph';

describe('graph core', () => {
    it('classifies files by path', () => {
        expect(classifyGraphNode('src/pages/Home.vue')).toBe('page');
        expect(classifyGraphNode('src/components/Button.vue')).toBe('component');
        expect(classifyGraphNode('src/composables/useAuth.ts')).toBe('composable');
        expect(classifyGraphNode('src/stores/cart.ts')).toBe('store');
    });

    it('extracts local imports from source', () => {
        const imports = extractImports(`
            import Button from '@/components/Button.vue'
            import { useAuth } from '@/composables/useAuth'
            const pkg = 'react'
        `);

        expect(imports).toEqual([
            '@/components/Button.vue',
            '@/composables/useAuth',
        ]);
    });

    it('builds a dependency graph and resolves aliases', () => {
        const files = [
            'src/pages/Home.vue',
            'src/components/Button.vue',
            'src/composables/useAuth.ts',
        ];

        const sources = new Map<string, string>([
            [
                'src/pages/Home.vue',
                `import Button from '@/components/Button.vue'
                 import { useAuth } from '@/composables/useAuth'
                 import './Local.vue'`,
            ],
            ['src/components/Button.vue', ''],
            ['src/composables/useAuth.ts', ''],
        ]);

        const graph = buildProjectGraph(files, sources);

        expect(graph.counts.pages).toBe(1);
        expect(graph.counts.components).toBe(1);
        expect(graph.counts.composables).toBe(1);
        expect(graph.counts.stores).toBe(0);

        expect(graph.edges).toEqual([
            {
                from: 'src/pages/Home.vue',
                to: 'src/components/Button.vue',
                kind: 'import',
            },
            {
                from: 'src/pages/Home.vue',
                to: 'src/composables/useAuth.ts',
                kind: 'import',
            },
        ]);
    });
});
