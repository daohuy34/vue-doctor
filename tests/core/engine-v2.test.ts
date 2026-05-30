import { describe, expect, it, afterAll, beforeAll, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runEngineWithContext, buildContext } from '../../src/core/engine-v2';

describe('engine-v2', () => {
    const tempDir = path.join(os.tmpdir(), `vue-doctor-engine-test-${Date.now()}`);

    beforeAll(async () => {
        fs.mkdirSync(path.join(tempDir, 'src', 'components'), { recursive: true });
        fs.mkdirSync(path.join(tempDir, 'src', 'composables'), { recursive: true });
        fs.mkdirSync(path.join(tempDir, 'src', 'stores'), { recursive: true });
    });

    afterAll(async () => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    describe('buildContext', () => {
        it('builds project context from files', async () => {
            const componentFile = path.join(tempDir, 'src', 'components', 'Button.vue');
            const composableFile = path.join(tempDir, 'src', 'composables', 'useAuth.ts');
            const storeFile = path.join(tempDir, 'src', 'stores', 'cart.ts');

            fs.writeFileSync(componentFile, '<template><button>Click</button></template>');
            fs.writeFileSync(composableFile, 'export function useAuth() {}');
            fs.writeFileSync(storeFile, 'import { defineStore } from "pinia";');

            const context = await buildContext([componentFile, composableFile, storeFile]);

            expect(context).toBeDefined();
            expect(context.files.size).toBe(3);
        });
    });

    describe('runEngineWithContext', () => {
        it('runs engine without project context', async () => {
            const componentFile = path.join(tempDir, 'src', 'components', 'Test.vue');

            fs.writeFileSync(componentFile, '<script setup>const x = 1;</script>');

            const result = await runEngineWithContext([componentFile]);

            expect(result).toBeDefined();
            expect(result.issues).toBeDefined();
            expect(Array.isArray(result.issues)).toBe(true);
            expect(result.context).toBeUndefined();
        });

        it('runs engine with project context enabled', async () => {
            const componentFile = path.join(tempDir, 'src', 'components', 'Test.vue');

            fs.writeFileSync(componentFile, '<script setup>const x = 1;</script>');

            const result = await runEngineWithContext([componentFile], {
                enableProjectContext: true,
            });

            expect(result.context).toBeDefined();
            expect(result.context?.files.size).toBeGreaterThan(0);
        });

        it('runs engine with graph analysis enabled', async () => {
            const componentFile = path.join(tempDir, 'src', 'components', 'Test.vue');
            const composableFile = path.join(tempDir, 'src', 'composables', 'useTest.ts');

            fs.writeFileSync(componentFile, '<script setup>const x = 1;</script>');
            fs.writeFileSync(composableFile, 'export function useTest() {}');

            const result = await runEngineWithContext([componentFile, composableFile], {
                enableProjectContext: true,
                enableGraphAnalysis: true,
            });

            expect(result.graphStats).toBeDefined();
            expect(result.graphStats?.composables).toBeDefined();
        });

        it('returns metrics', async () => {
            const componentFile = path.join(tempDir, 'src', 'components', 'Test.vue');

            fs.writeFileSync(componentFile, '<script setup>const x = 1;</script>');

            const result = await runEngineWithContext([componentFile]);

            expect(result.metrics).toBeDefined();
            expect(result.metrics.files).toBe(1);
            expect(result.metrics.duration).toBeDefined();
        });
    });
});
