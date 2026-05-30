import { describe, expect, it, afterAll, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
    buildComposableGraph,
    getComposableInfo,
    getComposableUsages,
    getComposablesByKind,
} from '../../src/core/composable-graph';

describe('composable-graph', () => {
    const tempDir = path.join(os.tmpdir(), `vue-doctor-composable-test-${Date.now()}`);

    beforeAll(async () => {
        fs.mkdirSync(path.join(tempDir, 'src', 'composables'), { recursive: true });
        fs.mkdirSync(path.join(tempDir, 'src', 'hooks'), { recursive: true });
        fs.mkdirSync(path.join(tempDir, 'src', 'components'), { recursive: true });
    });

    afterAll(async () => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    describe('buildComposableGraph', () => {
        it('detects composables in composables directory', async () => {
            const useAuth = path.join(tempDir, 'src', 'composables', 'useAuth.ts');
            const useCart = path.join(tempDir, 'src', 'composables', 'useCart.ts');

            fs.writeFileSync(useAuth, `
                export function useAuth() {
                    return { user: ref(null) }
                }
            `);
            fs.writeFileSync(useCart, `
                export function useCart() {
                    return { items: ref([]) }
                }
            `);

            const graph = await buildComposableGraph([useAuth, useCart]);

            expect(graph.composables.size).toBe(2);
            expect(graph.composables.has('Auth')).toBe(true);
            expect(graph.composables.has('Cart')).toBe(true);
        });

        it('detects composables in hooks directory', async () => {
            const useTheme = path.join(tempDir, 'src', 'hooks', 'useTheme.ts');

            fs.writeFileSync(useTheme, `
                export function useTheme() {
                    const theme = ref('light')
                    return { theme }
                }
            `);

            const graph = await buildComposableGraph([useTheme]);

            expect(graph.composables.size).toBe(1);
            expect(graph.composables.has('Theme')).toBe(true);
        });

        it('detects composable kind (composition vs options)', async () => {
            const compositionFile = path.join(tempDir, 'src', 'composables', 'useComposition.ts');
            const optionsFile = path.join(tempDir, 'src', 'composables', 'useOptions.ts');

            fs.writeFileSync(compositionFile, `
                import { ref, computed } from 'vue'
                export function useComposition() {
                    const count = ref(0)
                    return { count }
                }
            `);
            fs.writeFileSync(optionsFile, `
                export default {
                    data() { return { count: 0 } }
                }
            `);

            const graph = await buildComposableGraph([compositionFile, optionsFile]);

            const composition = graph.composables.get('Composition');
            const options = graph.composables.get('Options');

            expect(composition?.kind).toBe('composition');
            expect(options?.kind).toBe('options');
        });

        it('skips non-composable files', async () => {
            const componentFile = path.join(tempDir, 'src', 'components', 'Button.vue');
            const utilFile = path.join(tempDir, 'src', 'composables', 'utils.ts');

            fs.writeFileSync(componentFile, '<template><button>Click</button></template>');
            fs.writeFileSync(utilFile, `
                export function formatDate(date) {
                    return date.toISOString()
                }
            `);

            const graph = await buildComposableGraph([componentFile, utilFile]);

            expect(graph.composables.size).toBe(0);
        });

        it('extracts exports from composable', async () => {
            const composableFile = path.join(tempDir, 'src', 'composables', 'useMulti.ts');

            fs.writeFileSync(composableFile, `
                export const useHelper = () => {}
                export const useHelper2 = () => {}
                export function useHelper3() {}
            `);

            const graph = await buildComposableGraph([composableFile]);

            expect(graph.composables.size).toBeGreaterThan(0);
        });
    });

    describe('getComposableInfo', () => {
        it('returns composable definition', async () => {
            const useAuth = path.join(tempDir, 'src', 'composables', 'useAuth.ts');

            fs.writeFileSync(useAuth, `
                export function useAuth() {
                    return { user: ref(null) }
                }
            `);

            const graph = await buildComposableGraph([useAuth]);
            const info = getComposableInfo(graph, 'Auth');

            expect(info).toBeDefined();
            expect(info?.name).toBe('Auth');
            expect(info?.filePath).toContain('useAuth.ts');
            expect(info?.type).toBe('function');
        });

        it('returns undefined for unknown composable', async () => {
            const graph = await buildComposableGraph([]);
            const info = getComposableInfo(graph, 'NonExistent');

            expect(info).toBeUndefined();
        });
    });

    describe('getComposableUsages', () => {
        it('finds files that use a composable', async () => {
            const useAuth = path.join(tempDir, 'src', 'composables', 'useAuth.ts');
            const consumer1 = path.join(tempDir, 'src', 'components', 'Login.vue');
            const consumer2 = path.join(tempDir, 'src', 'components', 'Profile.vue');

            fs.writeFileSync(useAuth, `
                export function useAuth() {
                    return { user: ref(null) }
                }
            `);
            fs.writeFileSync(consumer1, `
                <script setup>
                    import { useAuth } from '../composables/useAuth'
                    const { user } = useAuth()
                </script>
            `);
            fs.writeFileSync(consumer2, `
                <script setup>
                    import { useAuth } from '../composables/useAuth'
                    const { user } = useAuth()
                </script>
            `);

            const graph = await buildComposableGraph([useAuth, consumer1, consumer2]);
            const usages = getComposableUsages(graph, 'Auth');

            expect(usages.length).toBe(2);
        });
    });

    describe('getComposablesByKind', () => {
        it('filters composables by kind', async () => {
            const useComposition = path.join(tempDir, 'src', 'composables', 'useComposition.ts');
            const useOptions = path.join(tempDir, 'src', 'composables', 'useOptions.ts');

            fs.writeFileSync(useComposition, `
                import { ref } from 'vue'
                export function useComposition() {
                    return { count: ref(0) }
                }
            `);
            fs.writeFileSync(useOptions, `
                export default {
                    data() { return { count: 0 } }
                }
            `);

            const graph = await buildComposableGraph([useComposition, useOptions]);

            const compositionComposables = getComposablesByKind(graph, 'composition');
            const optionsComposables = getComposablesByKind(graph, 'options');

            expect(compositionComposables.length).toBe(1);
            expect(compositionComposables[0].name).toBe('Composition');
            expect(optionsComposables.length).toBe(1);
            expect(optionsComposables[0].name).toBe('Options');
        });
    });

    describe('graph.files', () => {
        it('contains paths of composable files', async () => {
            const useAuth = path.join(tempDir, 'src', 'composables', 'useAuth.ts');

            fs.writeFileSync(useAuth, `
                export function useAuth() {
                    return { user: ref(null) }
                }
            `);

            const graph = await buildComposableGraph([useAuth]);

            const normalizedPath = useAuth.replace(/\\/g, '/');
            expect(graph.files.has(normalizedPath)).toBe(true);
        });
    });
});
