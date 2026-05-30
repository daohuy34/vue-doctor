import { describe, expect, it, afterAll, beforeAll, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { buildProjectContext, getFanIn, getFanOut, getProjectStats, getComponentInfo, getComposableInfo, getStoreInfo } from '../../src/core/project';
import { buildProjectGraph } from '../../src/core/graph';

describe('project context', () => {
    const tempDir = path.join(os.tmpdir(), `vue-doctor-test-${Date.now()}`);

    beforeAll(async () => {
        fs.mkdirSync(path.join(tempDir, 'components'), { recursive: true });
        fs.mkdirSync(path.join(tempDir, 'composables'), { recursive: true });
        fs.mkdirSync(path.join(tempDir, 'stores'), { recursive: true });
        fs.mkdirSync(path.join(tempDir, 'pages'), { recursive: true });
    });

    afterAll(async () => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    describe('buildProjectContext', () => {
        it('parses files and builds maps', async () => {
            const componentA = path.join(tempDir, 'components', 'Button.vue');
            const componentB = path.join(tempDir, 'components', 'BaseCard.vue');

            fs.writeFileSync(componentA, '<script setup></script>');
            fs.writeFileSync(componentB, '<script setup></script>');

            const context = await buildProjectContext([componentA, componentB]);

            expect(context.files.size).toBe(2);
            expect(context.graph.counts.components).toBe(2);
        });

        it('extracts composable names from composables directory', async () => {
            const composableA = path.join(tempDir, 'composables', 'useAuth.ts');
            const composableB = path.join(tempDir, 'composables', 'useCart.ts');

            fs.writeFileSync(composableA, 'export function useAuth() {}');
            fs.writeFileSync(composableB, 'export function useCart() {}');

            const context = await buildProjectContext([composableA, composableB]);

            expect(context.composableMap.size).toBe(2);
            expect(context.graph.counts.composables).toBe(2);
        });

        it('extracts store names from stores directory', async () => {
            const storeA = path.join(tempDir, 'stores', 'cart.ts');
            const storeB = path.join(tempDir, 'stores', 'user.ts');

            fs.writeFileSync(storeA, 'import { defineStore } from "pinia"; export const useCartStore = defineStore("cart", {})');
            fs.writeFileSync(storeB, 'import { defineStore } from "pinia"; export const useUserStore = defineStore("user", {})');

            const context = await buildProjectContext([storeA, storeB]);

            expect(context.storeMap.size).toBe(2);
            expect(context.graph.counts.stores).toBe(2);
        });

        it('handles index files in directories', async () => {
            const modalDir = path.join(tempDir, 'components', 'Modal');
            fs.mkdirSync(modalDir, { recursive: true });
            const indexFile = path.join(modalDir, 'index.vue');

            fs.writeFileSync(indexFile, '<script setup></script>');

            const context = await buildProjectContext([indexFile]);

            expect(context.componentMap.size).toBe(1);
            const componentName = [...context.componentMap.keys()][0];
            expect(componentName).toBe('Modal');
        });
    });

    describe('getProjectStats', () => {
        it('returns correct statistics', async () => {
            const pageFile = path.join(tempDir, 'pages', 'Home.vue');
            const componentFile = path.join(tempDir, 'components', 'Button.vue');
            const composableFile = path.join(tempDir, 'composables', 'useAuth.ts');
            const storeFile = path.join(tempDir, 'stores', 'cart.ts');

            fs.writeFileSync(pageFile, '<script setup></script>');
            fs.writeFileSync(componentFile, '<script setup></script>');
            fs.writeFileSync(composableFile, 'export function useAuth() {}');
            fs.writeFileSync(storeFile, 'import { defineStore } from "pinia";');

            const context = await buildProjectContext([pageFile, componentFile, composableFile, storeFile]);
            const stats = getProjectStats(context);

            expect(stats.totalFiles).toBe(4);
            expect(stats.pages).toBe(1);
            expect(stats.components).toBe(1);
            expect(stats.composables).toBe(1);
            expect(stats.stores).toBe(1);
        });
    });

    describe('getComponentInfo', () => {
        it('returns component info for known component', async () => {
            const componentFile = path.join(tempDir, 'components', 'MyButton.vue');
            fs.writeFileSync(componentFile, '<script setup></script>');

            const context = await buildProjectContext([componentFile]);

            const componentName = [...context.componentMap.keys()][0];
            expect(componentName).toBeTruthy();

            const info = getComponentInfo(context, componentName);

            expect(info).toBeDefined();
            expect(info?.name).toBe(componentName);
            expect(info?.kind).toBe('component');
        });

        it('returns undefined for unknown component', async () => {
            const context = await buildProjectContext([]);
            const info = getComponentInfo(context, 'NonExistent');

            expect(info).toBeUndefined();
        });
    });

    describe('getComposableInfo', () => {
        it('returns composable info for known composable', async () => {
            const composableFile = path.join(tempDir, 'composables', 'useData.ts');
            fs.writeFileSync(composableFile, 'export function useData() {}');

            const context = await buildProjectContext([composableFile]);
            const info = getComposableInfo(context, 'useData');

            expect(info).toBeDefined();
            expect(info?.name).toBe('useData');
        });

        it('returns undefined for unknown composable', async () => {
            const context = await buildProjectContext([]);
            const info = getComposableInfo(context, 'useUnknown');

            expect(info).toBeUndefined();
        });
    });

    describe('getStoreInfo', () => {
        it('detects Pinia store', async () => {
            const storeFile = path.join(tempDir, 'stores', 'auth.ts');
            fs.writeFileSync(storeFile, 'import { defineStore } from "pinia"; export const useAuthStore = defineStore("auth", {})');

            const context = await buildProjectContext([storeFile]);
            const info = getStoreInfo(context, 'auth');

            expect(info).toBeDefined();
            expect(info?.kind).toBe('pinia');
        });

        it('detects Vuex store', async () => {
            const storeFile = path.join(tempDir, 'stores', 'settings.ts');
            fs.writeFileSync(storeFile, 'import { createStore } from "vuex"; export default createStore({})');

            const context = await buildProjectContext([storeFile]);
            const info = getStoreInfo(context, 'settings');

            expect(info).toBeDefined();
            expect(info?.kind).toBe('vuex');
        });
    });

});
