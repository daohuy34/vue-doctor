import fs from 'node:fs/promises';

import { parse as parseSFC, type SFCDescriptor } from '@vue/compiler-sfc';

import { parse as parseScript } from '@babel/parser';

export interface ParsedVueFile {
    source: string;

    descriptor: SFCDescriptor;

    scriptAst: unknown | null;
}

export async function parseVueFile(filePath: string): Promise<ParsedVueFile> {
    const source = await fs.readFile(filePath, 'utf-8');

    const { descriptor } = parseSFC(source);

    const scriptContent =
        descriptor.scriptSetup?.content ?? descriptor.script?.content ?? '';
    console.log(scriptContent);
    let scriptAst: unknown | null = null;

    if (scriptContent) {
        scriptAst = parseScript(scriptContent, {
            sourceType: 'module',

            plugins: ['typescript', 'jsx'],
        });
    }

    return {
        source,
        descriptor,
        scriptAst,
    };
}
