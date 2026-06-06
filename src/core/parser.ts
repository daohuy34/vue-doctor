import fs from 'node:fs';
import { parse as parseSFC, type SFCDescriptor } from '@vue/compiler-sfc';

import { parse as parseScript } from '@babel/parser';

export interface ParsedVueFile {
    source: string;

    descriptor: SFCDescriptor;

    scriptAst: unknown | null;

    scriptStartLine: number;
}

// Simple LRU cache for parsed files (in-memory cache)
const parseCache = new Map<string, ParsedVueFile>();
const MAX_CACHE_SIZE = 100;

export async function parseVueFile(filePath: string): Promise<ParsedVueFile> {
    // Check in-memory cache first
    const cached = parseCache.get(filePath);
    if (cached) {
        return cached;
    }

    const source = await fs.promises.readFile(filePath, 'utf-8');

    const { descriptor } = parseSFC(source);

    const scriptContent =
        descriptor.scriptSetup?.content || descriptor.script?.content || '';

    const scriptBlock = descriptor.scriptSetup ?? descriptor.script;
    const scriptStartLine = scriptBlock?.loc.start.line ?? 1;

    let scriptAst: unknown | null = null;

    if (scriptContent) {
        try {
            scriptAst = parseScript(scriptContent, {
                sourceType: 'module',

                plugins: [
                    'typescript',
                    'jsx',
                    'decorators-legacy',
                    'classProperties',
                ],
            });
        } catch {
            scriptAst = null;
        }
    }

    const result: ParsedVueFile = {
        source,
        descriptor,
        scriptAst,
        scriptStartLine,
    };

    // Add to cache with LRU eviction
    if (parseCache.size >= MAX_CACHE_SIZE) {
        const firstKey = parseCache.keys().next().value;
        if (firstKey) {
            parseCache.delete(firstKey);
        }
    }
    parseCache.set(filePath, result);

    return result;
}

/**
 * Clear the parse cache
 */
export function clearParseCache() {
    parseCache.clear();
}

/**
 * Get cache statistics
 */
export function getParseCacheStats() {
    return {
        size: parseCache.size,
        maxSize: MAX_CACHE_SIZE,
    };
}
