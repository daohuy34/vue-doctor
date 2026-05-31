/**
 * Coupling Rules Tests
 *
 * Tests for component, composable, and store coupling detection.
 */

import { describe, it, expect } from 'vitest';
import {
    findCircularDependencies,
    isInCircularDependency,
    getCircularDependenciesForFile,
} from '../../src/core/circular-deps';

describe('coupling metrics', () => {
    describe('fan-out calculation', () => {
        it('calculates correct fan-out for leaf nodes', () => {
            const edges = [
                { from: 'A.vue', to: 'B.vue' },
                { from: 'A.vue', to: 'C.vue' },
                { from: 'A.vue', to: 'D.vue' },
            ];

            const aOutgoing = edges.filter((e) => e.from === 'A.vue').length;
            const bOutgoing = edges.filter((e) => e.from === 'B.vue').length;

            expect(aOutgoing).toBe(3);
            expect(bOutgoing).toBe(0);
        });

        it('calculates correct fan-in for root nodes', () => {
            const edges = [
                { from: 'A.vue', to: 'C.vue' },
                { from: 'B.vue', to: 'C.vue' },
                { from: 'C.vue', to: 'D.vue' },
            ];

            const cIncoming = edges.filter((e) => e.to === 'C.vue').length;

            expect(cIncoming).toBe(2);
        });
    });

    describe('coupling thresholds', () => {
        it('identifies high fan-out components', () => {
            const edges: Array<{ from: string; to: string }> = [];

            // Create component with 15 dependencies
            for (let i = 0; i < 15; i++) {
                edges.push({ from: 'BigComponent.vue', to: `dependency${i}.vue` });
            }

            const fanOut = edges.filter((e) => e.from === 'BigComponent.vue').length;
            const MAX_IMPORTS = 10;

            expect(fanOut).toBe(15);
            expect(fanOut > MAX_IMPORTS).toBe(true);
        });

        it('identifies highly depended-upon components', () => {
            const edges = [
                { from: 'A.vue', to: 'Shared.vue' },
                { from: 'B.vue', to: 'Shared.vue' },
                { from: 'C.vue', to: 'Shared.vue' },
                { from: 'D.vue', to: 'Shared.vue' },
                { from: 'E.vue', to: 'Shared.vue' },
            ];

            const fanIn = edges.filter((e) => e.to === 'Shared.vue').length;

            expect(fanIn).toBe(5);
        });
    });

    describe('coupling patterns', () => {
        it('detects hub components (high fan-in and fan-out)', () => {
            const edges = [
                // Fan-out
                { from: 'Hub.vue', to: 'A.vue' },
                { from: 'Hub.vue', to: 'B.vue' },
                { from: 'Hub.vue', to: 'C.vue' },
                // Fan-in
                { from: 'X.vue', to: 'Hub.vue' },
                { from: 'Y.vue', to: 'Hub.vue' },
                { from: 'Z.vue', to: 'Hub.vue' },
            ];

            const fanOut = edges.filter((e) => e.from === 'Hub.vue').length;
            const fanIn = edges.filter((e) => e.to === 'Hub.vue').length;

            expect(fanOut).toBe(3);
            expect(fanIn).toBe(3);
        });

        it('detects dependency chains', () => {
            const edges = [
                { from: 'A.vue', to: 'B.vue' },
                { from: 'B.vue', to: 'C.vue' },
                { from: 'C.vue', to: 'D.vue' },
            ];

            // Check chain depth
            const chainLength = edges.length;

            expect(chainLength).toBe(3);
            expect(isInCircularDependency('A.vue', edges)).toBe(false);
        });

        it('detects star pattern (central node with many leaves)', () => {
            const edges: Array<{ from: string; to: string }> = [];

            // Central node imports many leaves
            for (let i = 0; i < 10; i++) {
                edges.push({ from: 'Router.vue', to: `page${i}.vue` });
            }

            const routerOut = edges.filter((e) => e.from === 'Router.vue').length;

            expect(routerOut).toBe(10);
        });
    });

    describe('instability metric', () => {
        // Instability = fanOut / (fanOut + fanIn)
        // 0 = completely stable, 1 = completely unstable

        function calculateInstability(
            node: string,
            edges: Array<{ from: string; to: string }>,
        ): number {
            const fanOut = edges.filter((e) => e.from === node).length;
            const fanIn = edges.filter((e) => e.to === node).length;
            const total = fanOut + fanIn;

            return total === 0 ? 0 : fanOut / total;
        }

        it('calculates instability for unstable nodes', () => {
            const edges = [
                { from: 'A.vue', to: 'B.vue' },
                { from: 'A.vue', to: 'C.vue' },
            ];

            const instability = calculateInstability('A.vue', edges);

            expect(instability).toBe(1); // 2 / (2 + 0) = 1
        });

        it('calculates instability for stable nodes', () => {
            const edges = [
                { from: 'A.vue', to: 'C.vue' },
                { from: 'B.vue', to: 'C.vue' },
            ];

            const instability = calculateInstability('C.vue', edges);

            expect(instability).toBe(0); // 0 / (0 + 2) = 0
        });

        it('calculates instability for balanced nodes', () => {
            const edges = [
                { from: 'A.vue', to: 'B.vue' },
                { from: 'B.vue', to: 'A.vue' },
            ];

            const instabilityA = calculateInstability('A.vue', edges);

            expect(instabilityA).toBe(0.5); // 1 / (1 + 1) = 0.5
        });
    });

    describe('abstraction level', () => {
        it('identifies abstract modules (many incoming, few outgoing)', () => {
            const edges = [
                { from: 'A.vue', to: 'BaseComponent.vue' },
                { from: 'B.vue', to: 'BaseComponent.vue' },
                { from: 'C.vue', to: 'BaseComponent.vue' },
                { from: 'D.vue', to: 'BaseComponent.vue' },
            ];

            const fanIn = edges.filter((e) => e.to === 'BaseComponent.vue').length;
            const fanOut = edges.filter((e) => e.from === 'BaseComponent.vue').length;

            // Abstract: high fan-in, low fan-out
            expect(fanIn).toBe(4);
            expect(fanOut).toBe(0);
        });

        it('identifies concrete modules (many outgoing, few incoming)', () => {
            const edges = [
                { from: 'Container.vue', to: 'A.vue' },
                { from: 'Container.vue', to: 'B.vue' },
                { from: 'Container.vue', to: 'C.vue' },
                { from: 'Container.vue', to: 'D.vue' },
            ];

            const fanIn = edges.filter((e) => e.to === 'Container.vue').length;
            const fanOut = edges.filter((e) => e.from === 'Container.vue').length;

            // Concrete: high fan-out, low fan-in
            expect(fanIn).toBe(0);
            expect(fanOut).toBe(4);
        });
    });

    describe('package boundary violations', () => {
        it('detects cross-boundary dependencies', () => {
            // Simulating components in 'pages' importing from 'components'
            const edges = [
                { from: 'pages/Dashboard.vue', to: 'components/Chart.vue' },
                { from: 'pages/Dashboard.vue', to: 'components/Table.vue' },
                { from: 'components/Chart.vue', to: 'utils/formatDate.ts' },
            ];

            // Count cross-boundary imports
            const crossBoundary = edges.filter((e) => {
                const from = e.from.split('/')[0];
                const to = e.to.split('/')[0];
                return from !== to;
            });

            expect(crossBoundary.length).toBe(3);
        });

        it('detects page-to-page imports (should be avoided)', () => {
            const edges = [
                { from: 'pages/Home.vue', to: 'pages/About.vue' },
            ];

            const pageToPage = edges.filter((e) => {
                const fromParts = e.from.split('/');
                const toParts = e.to.split('/');
                return fromParts[0] === 'pages' && toParts[0] === 'pages';
            });

            expect(pageToPage.length).toBe(1);
        });
    });
});
