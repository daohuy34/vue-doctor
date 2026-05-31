/**
 * Circular Dependency Detection Tests
 *
 * Tests for Tarjan's SCC algorithm and cycle detection.
 */

import { describe, it, expect } from 'vitest';
import {
    findCircularDependencies,
    isInCircularDependency,
    getCircularDependenciesForFile,
    formatCircularDependency,
} from '../../src/core/circular-deps';

describe('circular dependency detection', () => {
    describe('Tarjan SCC algorithm', () => {
        it('detects simple 2-node cycle', () => {
            const edges = [
                { from: 'A.ts', to: 'B.ts' },
                { from: 'B.ts', to: 'A.ts' },
            ];

            const result = findCircularDependencies(edges);

            expect(result.hasCycles).toBe(true);
            expect(result.count).toBeGreaterThan(0);
            expect(result.cycles.length).toBeGreaterThan(0);
        });

        it('detects 3-node cycle', () => {
            const edges = [
                { from: 'A.ts', to: 'B.ts' },
                { from: 'B.ts', to: 'C.ts' },
                { from: 'C.ts', to: 'A.ts' },
            ];

            const result = findCircularDependencies(edges);

            expect(result.hasCycles).toBe(true);
            expect(result.cycles[0].length).toBe(3);
        });

        it('detects complex multi-cycle', () => {
            const edges = [
                { from: 'A.ts', to: 'B.ts' },
                { from: 'B.ts', to: 'C.ts' },
                { from: 'C.ts', to: 'A.ts' },
                { from: 'X.ts', to: 'Y.ts' },
                { from: 'Y.ts', to: 'X.ts' },
            ];

            const result = findCircularDependencies(edges);

            expect(result.count).toBeGreaterThanOrEqual(2);
        });

        it('returns no cycles for acyclic graph', () => {
            const edges = [
                { from: 'A.ts', to: 'B.ts' },
                { from: 'B.ts', to: 'C.ts' },
                { from: 'A.ts', to: 'C.ts' },
            ];

            const result = findCircularDependencies(edges);

            expect(result.hasCycles).toBe(false);
            expect(result.cycles).toHaveLength(0);
        });

        it('handles disconnected components', () => {
            const edges = [
                { from: 'A.ts', to: 'B.ts' },
                { from: 'C.ts', to: 'D.ts' },
            ];

            const result = findCircularDependencies(edges);

            expect(result.hasCycles).toBe(false);
        });
    });

    describe('self-referencing modules', () => {
        it('detects self-referencing imports', () => {
            const edges = [
                { from: 'A.ts', to: 'A.ts' },
            ];

            const result = findCircularDependencies(edges);

            expect(result.hasCycles).toBe(true);
            expect(result.cycles[0].length).toBe(1);
            expect(result.cycles[0].nodes).toContain('A.ts');
        });

        it('detects self-reference with other dependencies', () => {
            const edges = [
                { from: 'A.ts', to: 'A.ts' },
                { from: 'A.ts', to: 'B.ts' },
                { from: 'B.ts', to: 'C.ts' },
            ];

            const result = findCircularDependencies(edges);

            expect(result.hasCycles).toBe(true);
            // Should detect both the self-reference and be acyclic for others
        });
    });

    describe('complex patterns', () => {
        it('detects cycle in diamond pattern', () => {
            // A → B → D
            // A → C → D
            // B → C (creates cycle: B → C → B)
            const edges = [
                { from: 'A.ts', to: 'B.ts' },
                { from: 'A.ts', to: 'C.ts' },
                { from: 'B.ts', to: 'D.ts' },
                { from: 'C.ts', to: 'D.ts' },
                { from: 'B.ts', to: 'C.ts' },
                { from: 'C.ts', to: 'B.ts' },
            ];

            const result = findCircularDependencies(edges);

            expect(result.hasCycles).toBe(true);
        });

        it('handles large graph efficiently', () => {
            const edges: Array<{ from: string; to: string }> = [];

            // Create a long chain
            for (let i = 0; i < 100; i++) {
                edges.push({
                    from: `file${i}.ts`,
                    to: `file${i + 1}.ts`,
                });
            }

            // Add one cycle at the end
            edges.push({ from: 'file100.ts', to: 'file50.ts' });

            const result = findCircularDependencies(edges);

            expect(result.hasCycles).toBe(true);
        });

        it('handles nodes with no edges', () => {
            const edges = [
                { from: 'A.ts', to: 'B.ts' },
                { from: 'B.ts', to: 'C.ts' },
            ];

            const result = findCircularDependencies(edges, [
                'A.ts',
                'B.ts',
                'C.ts',
                'D.ts', // isolated node
            ]);

            expect(result.hasCycles).toBe(false);
        });

        it('handles duplicate edges', () => {
            const edges = [
                { from: 'A.ts', to: 'B.ts' },
                { from: 'A.ts', to: 'B.ts' },
                { from: 'B.ts', to: 'A.ts' },
            ];

            const result = findCircularDependencies(edges);

            expect(result.hasCycles).toBe(true);
        });
    });

    describe('isInCircularDependency', () => {
        it('returns true for file in cycle', () => {
            const edges = [
                { from: 'A.ts', to: 'B.ts' },
                { from: 'B.ts', to: 'A.ts' },
            ];

            expect(isInCircularDependency('A.ts', edges)).toBe(true);
            expect(isInCircularDependency('B.ts', edges)).toBe(true);
        });

        it('returns false for file not in cycle', () => {
            const edges = [
                { from: 'A.ts', to: 'B.ts' },
                { from: 'B.ts', to: 'A.ts' },
            ];

            expect(isInCircularDependency('C.ts', edges)).toBe(false);
        });

        it('handles empty edges', () => {
            expect(isInCircularDependency('A.ts', [])).toBe(false);
        });
    });

    describe('getCircularDependenciesForFile', () => {
        it('returns cycles involving specific file', () => {
            const edges = [
                { from: 'A.ts', to: 'B.ts' },
                { from: 'B.ts', to: 'A.ts' },
                { from: 'C.ts', to: 'D.ts' },
                { from: 'D.ts', to: 'C.ts' },
            ];

            const cycles = getCircularDependenciesForFile('A.ts', edges);

            expect(cycles.length).toBeGreaterThan(0);
            expect(cycles[0].nodes).toContain('A.ts');
        });

        it('returns empty for file not in any cycle', () => {
            const edges = [
                { from: 'A.ts', to: 'B.ts' },
                { from: 'B.ts', to: 'A.ts' },
            ];

            const cycles = getCircularDependenciesForFile('C.ts', edges);

            expect(cycles).toHaveLength(0);
        });
    });

    describe('formatCircularDependency', () => {
        it('formats cycle as arrow-separated string', () => {
            const cycle = {
                path: ['A.ts', 'B.ts', 'C.ts', 'A.ts'],
                nodes: ['A.ts', 'B.ts', 'C.ts'],
                length: 3,
            };

            expect(formatCircularDependency(cycle)).toBe('A.ts → B.ts → C.ts → A.ts');
        });

        it('formats self-reference', () => {
            const cycle = {
                path: ['A.ts', 'A.ts'],
                nodes: ['A.ts'],
                length: 1,
            };

            expect(formatCircularDependency(cycle)).toBe('A.ts → A.ts');
        });
    });

    describe('edge cases', () => {
        it('handles empty graph', () => {
            const result = findCircularDependencies([]);

            expect(result.hasCycles).toBe(false);
            expect(result.cycles).toHaveLength(0);
        });

        it('handles single node with no edges', () => {
            const result = findCircularDependencies([], ['A.ts']);

            expect(result.hasCycles).toBe(false);
        });

        it('handles bidirectional edges (mutual imports)', () => {
            const edges = [
                { from: 'foo.ts', to: 'bar.ts' },
                { from: 'bar.ts', to: 'foo.ts' },
                { from: 'baz.ts', to: 'qux.ts' },
                { from: 'qux.ts', to: 'baz.ts' },
            ];

            const result = findCircularDependencies(edges);

            expect(result.hasCycles).toBe(true);
            expect(result.count).toBeGreaterThanOrEqual(2);
        });
    });
});
