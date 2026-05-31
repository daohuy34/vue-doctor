/**
 * Circular Dependency Integration Tests
 *
 * Tests for circular dependency detection using direct edge input.
 */

import { describe, it, expect } from 'vitest';
import { findCircularDependencies, isInCircularDependency } from '../../src/core/circular-deps';

describe('circular dependency detection integration', () => {
    describe('simple 2-node cycle', () => {
        const edges = [
            { from: 'src/a/ComponentA.vue', to: 'src/b/ComponentB.vue' },
            { from: 'src/b/ComponentB.vue', to: 'src/a/ComponentA.vue' },
        ];

        it('detects 2-node cycle', () => {
            const result = findCircularDependencies(edges);

            expect(result.hasCycles).toBe(true);
            expect(result.count).toBeGreaterThan(0);
        });

        it('identifies files in cycle', () => {
            expect(isInCircularDependency('src/a/ComponentA.vue', edges)).toBe(true);
            expect(isInCircularDependency('src/b/ComponentB.vue', edges)).toBe(true);
        });

        it('returns correct cycle length', () => {
            const result = findCircularDependencies(edges);

            expect(result.cycles[0].length).toBe(2);
        });
    });

    describe('3-node cycle', () => {
        const edges = [
            { from: 'src/a/A.vue', to: 'src/b/B.vue' },
            { from: 'src/b/B.vue', to: 'src/c/C.vue' },
            { from: 'src/c/C.vue', to: 'src/a/A.vue' },
        ];

        it('detects 3-node cycle', () => {
            const result = findCircularDependencies(edges);

            expect(result.hasCycles).toBe(true);
        });

        it('returns correct cycle length', () => {
            const result = findCircularDependencies(edges);

            expect(result.cycles[0].length).toBe(3);
        });
    });

    describe('no cycle', () => {
        const edges = [
            { from: 'src/a/A.vue', to: 'src/b/B.vue' },
            { from: 'src/b/B.vue', to: 'src/c/C.vue' },
        ];

        it('returns no cycles for acyclic graph', () => {
            const result = findCircularDependencies(edges);

            expect(result.hasCycles).toBe(false);
            expect(result.count).toBe(0);
        });

        it('returns false for all files', () => {
            expect(isInCircularDependency('src/a/A.vue', edges)).toBe(false);
            expect(isInCircularDependency('src/b/B.vue', edges)).toBe(false);
            expect(isInCircularDependency('src/c/C.vue', edges)).toBe(false);
        });
    });

    describe('self-reference', () => {
        const edges = [{ from: 'src/a/Self.vue', to: 'src/a/Self.vue' }];

        it('detects self-referencing module', () => {
            const result = findCircularDependencies(edges);

            expect(result.hasCycles).toBe(true);
            expect(result.cycles[0].length).toBe(1);
        });
    });

    describe('mixed dependencies', () => {
        const edges = [
            { from: 'src/pages/Index.vue', to: 'src/components/Header.vue' },
            { from: 'src/pages/Index.vue', to: 'src/components/Footer.vue' },
            { from: 'src/components/Header.vue', to: 'src/utils/helper.vue' },
            { from: 'src/components/Footer.vue', to: 'src/utils/helper.vue' },
        ];

        it('returns no cycles for tree-like structure', () => {
            const result = findCircularDependencies(edges);

            expect(result.hasCycles).toBe(false);
        });
    });

    describe('multiple independent cycles', () => {
        const edges = [
            // First cycle
            { from: 'A.vue', to: 'B.vue' },
            { from: 'B.vue', to: 'A.vue' },
            // Second cycle
            { from: 'C.vue', to: 'D.vue' },
            { from: 'D.vue', to: 'C.vue' },
        ];

        it('detects both cycles', () => {
            const result = findCircularDependencies(edges);

            expect(result.hasCycles).toBe(true);
            expect(result.count).toBeGreaterThanOrEqual(2);
        });
    });

    describe('large acyclic graph', () => {
        const edges: Array<{ from: string; to: string }> = [];

        // Create a tree structure
        for (let i = 0; i < 50; i++) {
            edges.push({ from: `level${i}.vue`, to: `level${i + 1}.vue` });
        }

        it('handles large graphs efficiently', () => {
            const result = findCircularDependencies(edges);

            expect(result.hasCycles).toBe(false);
            expect(result.count).toBe(0);
        });
    });

    describe('complex cycle with branches', () => {
        const edges = [
            // Main cycle
            { from: 'A.vue', to: 'B.vue' },
            { from: 'B.vue', to: 'C.vue' },
            { from: 'C.vue', to: 'A.vue' },
            // Additional branches
            { from: 'A.vue', to: 'D.vue' },
            { from: 'B.vue', to: 'E.vue' },
            { from: 'D.vue', to: 'F.vue' },
        ];

        it('detects cycle in complex graph', () => {
            const result = findCircularDependencies(edges);

            expect(result.hasCycles).toBe(true);
        });
    });
});
