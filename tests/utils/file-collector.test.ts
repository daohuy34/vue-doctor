import { describe, expect, it, afterAll, beforeAll, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { collectFiles, collectFilesWithAliasSupport, getTsConfigInfo, clearTsConfigCache } from '../../src/utils/file-collector';

describe('file-collector', () => {
    const tempDir = path.join(os.tmpdir(), `vue-doctor-file-collector-test-${Date.now()}`);

    beforeAll(async () => {
        fs.mkdirSync(tempDir, { recursive: true });
        fs.mkdirSync(path.join(tempDir, 'src', 'components'), { recursive: true });
        fs.mkdirSync(path.join(tempDir, 'src', 'composables'), { recursive: true });
        fs.mkdirSync(path.join(tempDir, 'src', 'stores'), { recursive: true });
    });

    afterAll(async () => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    beforeEach(() => {
        clearTsConfigCache();
    });

    describe('collectFiles', () => {
        it('collects .vue files', async () => {
            fs.writeFileSync(path.join(tempDir, 'src', 'components', 'Button.vue'), '<template></template>');
            fs.writeFileSync(path.join(tempDir, 'src', 'components', 'Card.vue'), '<template></template>');

            const files = await collectFiles({ cwd: tempDir });

            expect(files.some(f => f.includes('Button.vue'))).toBe(true);
            expect(files.some(f => f.includes('Card.vue'))).toBe(true);
        });

        it('collects .ts files when included', async () => {
            fs.writeFileSync(path.join(tempDir, 'src', 'composables', 'useAuth.ts'), 'export function useAuth() {}');

            const files = await collectFiles({
                cwd: tempDir,
                include: ['**/*.vue', '**/*.ts']
            });

            expect(files.some(f => f.includes('useAuth.ts'))).toBe(true);
        });

        it('respects exclude patterns', async () => {
            fs.mkdirSync(path.join(tempDir, 'node_modules', 'fake-package'), { recursive: true });
            fs.writeFileSync(path.join(tempDir, 'node_modules', 'fake-package', 'Component.vue'), '<template></template>');

            const files = await collectFiles({ cwd: tempDir });

            expect(files.some(f => f.includes('fake-package'))).toBe(false);
        });

        it('ignores dist directory', async () => {
            fs.mkdirSync(path.join(tempDir, 'dist'), { recursive: true });
            fs.writeFileSync(path.join(tempDir, 'dist', 'index.vue'), '<template></template>');

            const files = await collectFiles({ cwd: tempDir });

            expect(files.some(f => f.includes('dist'))).toBe(false);
        });
    });

    describe('collectFilesWithAliasSupport', () => {
        it('collects files and loads tsconfig', async () => {
            const tsconfig = {
                compilerOptions: {
                    baseUrl: './',
                    paths: {
                        '@/*': ['src/*'],
                    },
                },
            };

            fs.writeFileSync(
                path.join(tempDir, 'tsconfig.json'),
                JSON.stringify(tsconfig),
            );

            const files = await collectFilesWithAliasSupport({ cwd: tempDir });

            expect(Array.isArray(files)).toBe(true);
        });

        it('handles missing tsconfig gracefully', async () => {
            const files = await collectFilesWithAliasSupport({ cwd: tempDir });

            expect(Array.isArray(files)).toBe(true);
        });
    });

    describe('getTsConfigInfo', () => {
        it('returns tsconfig info when available', async () => {
            const tsconfig = {
                compilerOptions: {
                    baseUrl: './',
                    paths: {
                        '@/*': ['src/*'],
                        '~/*': ['src/*'],
                    },
                },
            };

            fs.writeFileSync(
                path.join(tempDir, 'tsconfig.json'),
                JSON.stringify(tsconfig),
            );

            const info = await getTsConfigInfo(tempDir);

            expect(info).toBeDefined();
            expect(info?.aliases.length).toBeGreaterThan(0);
        });

        it('returns null when tsconfig not found', async () => {
            const info = await getTsConfigInfo('/nonexistent/path');
            expect(info).toBeNull();
        });

        it('caches tsconfig info', async () => {
            const tsconfig = {
                compilerOptions: {
                    baseUrl: './',
                    paths: {
                        '@/*': ['src/*'],
                    },
                },
            };

            fs.writeFileSync(
                path.join(tempDir, 'tsconfig.json'),
                JSON.stringify(tsconfig),
            );

            const info1 = await getTsConfigInfo(tempDir);
            const info2 = await getTsConfigInfo(tempDir);

            expect(info1).toEqual(info2);
        });

        it('clears cache on clearTsConfigCache', async () => {
            const tsconfig = {
                compilerOptions: {
                    baseUrl: './',
                    paths: {
                        '@/*': ['src/*'],
                    },
                },
            };

            fs.writeFileSync(
                path.join(tempDir, 'tsconfig.json'),
                JSON.stringify(tsconfig),
            );

            await getTsConfigInfo(tempDir);
            clearTsConfigCache();

            fs.writeFileSync(
                path.join(tempDir, 'tsconfig.json'),
                JSON.stringify({
                    compilerOptions: {
                        baseUrl: './',
                        paths: {
                            '@utils/*': ['src/utils/*'],
                        },
                    },
                }),
            );

            const info = await getTsConfigInfo(tempDir);
            expect(info?.aliases.some(a => a.pattern === '@utils/')).toBe(true);
        });
    });
});
