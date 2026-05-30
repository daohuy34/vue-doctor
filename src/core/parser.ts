import fs from 'node:fs/promises';

import { parse as parseSFC, type SFCDescriptor } from '@vue/compiler-sfc';

import { parse as parseScript } from '@babel/parser';

export interface ParsedVueFile {
    source: string;

    descriptor: SFCDescriptor;

    scriptAst: unknown | null;

    scriptStartLine: number;
}

export async function parseVueFile(filePath: string): Promise<ParsedVueFile> {
    const source = await fs.readFile(filePath, 'utf-8');

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

    return {
        source,
        descriptor,
        scriptAst,
        scriptStartLine,
    };
}
