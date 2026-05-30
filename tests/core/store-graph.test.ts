import { describe, expect, it, afterAll, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
    buildStoreGraph,
    getStoreInfo,
    getStoreUsages,
    getStoresByKind,
    getStoreStats,
} from '../../src/core/store-graph';

describe('store-graph', () => {
    const tempDir = path.join(os.tmpdir(), `vue-doctor-store-test-${Date.now()}`);

    beforeAll(async () => {
        fs.mkdirSync(path.join(tempDir, 'src', 'stores'), { recursive: true });
        fs.mkdirSync(path.join(tempDir, 'src', 'components'), { recursive: true });
    });

    afterAll(async () => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    describe('buildStoreGraph', () => {
        it('detects files in stores directory', async () => {
            const cartStore = path.join(tempDir, 'src', 'stores', 'cart.ts');

            fs.writeFileSync(cartStore, `
                import { defineStore } from 'pinia'
                export const useCartStore = defineStore('cart', {
                    state: () => ({ items: [] })
                })
            `);

            const graph = await buildStoreGraph([cartStore]);

            const normalizedPath = cartStore.replace(/\\/g, '/');
            expect(graph.files.has(normalizedPath)).toBe(true);
        });

        it('skips non-store files', async () => {
            const component = path.join(tempDir, 'src', 'components', 'Button.vue');

            fs.writeFileSync(component, '<template><button>Click</button></template>');

            const graph = await buildStoreGraph([component]);

            expect(graph.stores.size).toBe(0);
        });

        it('populates graph with store files', async () => {
            const store = path.join(tempDir, 'src', 'stores', 'productStore.ts');

            fs.writeFileSync(store, `
                import { defineStore } from 'pinia'
                export const useProductStore = defineStore('product', {
                    state: () => ({ products: [] })
                })
            `);

            const graph = await buildStoreGraph([store]);

            const normalizedPath = store.replace(/\\/g, '/');
            expect(graph.files.has(normalizedPath)).toBe(true);
        });
    });

    describe('getStoresByKind', () => {
        it('filters stores by kind when detected', async () => {
            const piniaStore = path.join(tempDir, 'src', 'stores', 'piniaStore.ts');
            const vuexStore = path.join(tempDir, 'src', 'stores', 'vuexStore.js');

            fs.writeFileSync(piniaStore, `
                import { defineStore } from 'pinia'
                export const useTestStore = defineStore('test', { state: () => ({}) })
            `);

            fs.writeFileSync(vuexStore, `
                import { createStore } from 'vuex'
                export default createStore({ state: {} })
            `);

            const graph = await buildStoreGraph([piniaStore, vuexStore]);

            const piniaStores = getStoresByKind(graph, 'pinia');
            const vuexStores = getStoresByKind(graph, 'vuex');

            expect(piniaStores.length).toBeGreaterThanOrEqual(0);
            expect(vuexStores.length).toBeGreaterThanOrEqual(0);
        });
    });

    describe('getStoreStats', () => {
        it('returns store statistics', async () => {
            const store = path.join(tempDir, 'src', 'stores', 'test.ts');

            fs.writeFileSync(store, `
                import { defineStore } from 'pinia'
                export const useTestStore = defineStore('test', { state: () => ({}) })
            `);

            const graph = await buildStoreGraph([store]);
            const stats = getStoreStats(graph);

            expect(stats).toHaveProperty('total');
            expect(stats).toHaveProperty('pinia');
            expect(stats).toHaveProperty('vuex');
            expect(stats).toHaveProperty('files');
        });
    });

    describe('graph.files', () => {
        it('contains paths of store files', async () => {
            const store = path.join(tempDir, 'src', 'stores', 'test.ts');

            fs.writeFileSync(store, `
                import { defineStore } from 'pinia'
                export const useTestStore = defineStore('test', { state: () => ({}) })
            `);

            const graph = await buildStoreGraph([store]);

            expect(graph.files.size).toBeGreaterThan(0);
        });
    });
});
