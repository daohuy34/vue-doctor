import fs from 'node:fs/promises';
import path from 'node:path';

export interface TsConfigAlias {
    pattern: string;
    replacement: string;
}

export interface TsConfigInfo {
    baseUrl: string | null;
    aliases: TsConfigAlias[];
    compilerOptions: Record<string, unknown>;
}

export async function readTsConfig(cwd: string = process.cwd()): Promise<TsConfigInfo | null> {
    const tsconfigPath = path.join(cwd, 'tsconfig.json');

    try {
        const content = await fs.readFile(tsconfigPath, 'utf-8');
        const tsconfig = JSON.parse(content);

        const compilerOptions = tsconfig.compilerOptions || {};

        const baseUrl = compilerOptions.baseUrl || null;

        const aliases: TsConfigAlias[] = [];

        if (compilerOptions.paths) {
            for (const [pattern, targets] of Object.entries(compilerOptions.paths)) {
                const targetArray = targets as string[];
                if (targetArray.length > 0) {
                    aliases.push({
                        pattern: pattern.replace(/\*$/, ''),
                        replacement: targetArray[0].replace(/\*$/, ''),
                    });
                }
            }
        }

        if (compilerOptions.baseUrl && aliases.length === 0) {
            const defaultAliases = [
                { pattern: '@/', replacement: 'src/' },
                { pattern: '~/', replacement: 'src/' },
            ];
            aliases.push(...defaultAliases);
        }

        return {
            baseUrl,
            aliases,
            compilerOptions,
        };
    } catch {
        return null;
    }
}

export function resolveAliasPath(
    importPath: string,
    aliases: TsConfigAlias[],
): string | null {
    for (const alias of aliases) {
        if (importPath.startsWith(alias.pattern)) {
            const afterAlias = importPath.slice(alias.pattern.length);
            return alias.replacement + afterAlias;
        }
    }
    return null;
}

export function isAliasPath(path: string): boolean {
    return path.startsWith('@/') || path.startsWith('~/') || path.startsWith('@');
}

export async function resolveTsConfigAliases(
    importPath: string,
    cwd: string = process.cwd(),
): Promise<string | null> {
    const tsconfig = await readTsConfig(cwd);

    if (!tsconfig) {
        const defaultAliases: TsConfigAlias[] = [
            { pattern: '@/', replacement: 'src/' },
            { pattern: '~/', replacement: 'src/' },
        ];
        return resolveAliasPath(importPath, defaultAliases);
    }

    return resolveAliasPath(importPath, tsconfig.aliases);
}
