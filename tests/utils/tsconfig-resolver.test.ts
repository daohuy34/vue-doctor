import { describe, expect, it, afterAll, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { readTsConfig, resolveAliasPath, resolveTsConfigAliases, isAliasPath, type TsConfigInfo } from '../../src/utils/tsconfig-resolver';

describe('tsconfig-resolver', () => {
    const tempDir = path.join(os.tmpdir(), `vue-doctor-tsconfig-test-${Date.now()}`);

    beforeAll(async () => {
        fs.mkdirSync(tempDir, { recursive: true });
    });

    afterAll(async () => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    describe('readTsConfig', () => {
        it('reads tsconfig.json with aliases', async () => {
            const tsconfig = {
                compilerOptions: {
                    baseUrl: './',
                    paths: {
                        '@/*': ['src/*'],
                        '~/*': ['src/*'],
                        '@components/*': ['src/components/*'],
                    },
                },
            };

            fs.writeFileSync(
                path.join(tempDir, 'tsconfig.json'),
                JSON.stringify(tsconfig),
            );

            const result = await readTsConfig(tempDir);

            expect(result).toBeDefined();
            expect(result?.aliases).toHaveLength(3);
            expect(result?.baseUrl).toBe('./');

            const aliasPatterns = result?.aliases.map(a => a.pattern);
            expect(aliasPatterns).toContain('@/');
            expect(aliasPatterns).toContain('~/');
            expect(aliasPatterns).toContain('@components/');
        });

        it('returns null when tsconfig.json does not exist', async () => {
            const result = await readTsConfig('/nonexistent/path');
            expect(result).toBeNull();
        });

        it('handles tsconfig with baseUrl but no paths', async () => {
            const tsconfig = {
                compilerOptions: {
                    baseUrl: './src',
                },
            };

            fs.writeFileSync(
                path.join(tempDir, 'tsconfig.json'),
                JSON.stringify(tsconfig),
            );

            const result = await readTsConfig(tempDir);

            expect(result).toBeDefined();
            expect(result?.aliases).toHaveLength(2);
            expect(result?.aliases.some(a => a.pattern === '@/')).toBe(true);
            expect(result?.aliases.some(a => a.pattern === '~/')).toBe(true);
        });

        it('handles wildcard patterns correctly', async () => {
            const tsconfig = {
                compilerOptions: {
                    baseUrl: './',
                    paths: {
                        '@utils/*': ['src/utils/*'],
                        '@components/*': ['src/components/*'],
                    },
                },
            };

            fs.writeFileSync(
                path.join(tempDir, 'tsconfig.json'),
                JSON.stringify(tsconfig),
            );

            const result = await readTsConfig(tempDir);

            expect(result?.aliases).toHaveLength(2);

            const utilsAlias = result?.aliases.find(a => a.pattern === '@utils/');
            expect(utilsAlias?.replacement).toBe('src/utils/');
        });
    });

    describe('resolveAliasPath', () => {
        it('resolves @/ alias', () => {
            const aliases = [{ pattern: '@/', replacement: 'src/' }];

            expect(resolveAliasPath('@/components/Button.vue', aliases)).toBe('src/components/Button.vue');
            expect(resolveAliasPath('@/utils/helpers.ts', aliases)).toBe('src/utils/helpers.ts');
        });

        it('resolves custom aliases', () => {
            const aliases = [
                { pattern: '@components/', replacement: 'src/components/' },
                { pattern: '@utils/', replacement: 'src/utils/' },
            ];

            expect(resolveAliasPath('@components/Button.vue', aliases)).toBe('src/components/Button.vue');
            expect(resolveAliasPath('@utils/helpers.ts', aliases)).toBe('src/utils/helpers.ts');
        });

        it('returns null for non-aliased paths', () => {
            const aliases = [{ pattern: '@/', replacement: 'src/' }];

            expect(resolveAliasPath('./local/file.vue', aliases)).toBeNull();
            expect(resolveAliasPath('node_modules/package', aliases)).toBeNull();
        });

        it('handles multiple aliases', () => {
            const aliases = [
                { pattern: '@/', replacement: 'src/' },
                { pattern: '~/', replacement: 'src/' },
                { pattern: '@components/', replacement: 'src/components/' },
            ];

            expect(resolveAliasPath('@/file.vue', aliases)).toBe('src/file.vue');
            expect(resolveAliasPath('~/file.vue', aliases)).toBe('src/file.vue');
            expect(resolveAliasPath('@components/Button.vue', aliases)).toBe('src/components/Button.vue');
        });
    });

    describe('isAliasPath', () => {
        it('detects @/ paths', () => {
            expect(isAliasPath('@/components/Button.vue')).toBe(true);
            expect(isAliasPath('@/utils/helpers.ts')).toBe(true);
        });

        it('detects ~/ paths', () => {
            expect(isAliasPath('~/components/Button.vue')).toBe(true);
            expect(isAliasPath('~/utils/helpers.ts')).toBe(true);
        });

        it('detects @ prefix paths', () => {
            expect(isAliasPath('@components/Button.vue')).toBe(true);
            expect(isAliasPath('@utils/helpers.ts')).toBe(true);
        });

        it('returns false for relative paths', () => {
            expect(isAliasPath('./components/Button.vue')).toBe(false);
            expect(isAliasPath('../components/Button.vue')).toBe(false);
        });
    });

    describe('resolveTsConfigAliases', () => {
        it('resolves aliases from tsconfig.json', async () => {
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

            const result = await resolveTsConfigAliases('@/components/Button.vue', tempDir);
            expect(result).toBe('src/components/Button.vue');
        });

        it('falls back to default aliases when tsconfig not found', async () => {
            const result = await resolveTsConfigAliases('@/components/Button.vue', '/nonexistent');
            expect(result).toBe('src/components/Button.vue');
        });

        it('returns null for non-aliased paths', async () => {
            const result = await resolveTsConfigAliases('./local/file.vue', '/nonexistent');
            expect(result).toBeNull();
        });
    });
});
