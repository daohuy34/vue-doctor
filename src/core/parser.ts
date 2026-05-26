import fs from 'node:fs/promises';

import { parse as parseSFC, type SFCDescriptor } from '@vue/compiler-sfc';

import { parse as parseScript } from '@babel/parser';

import { traverse } from '../utils/ast';

export interface ParsedVueFile {
    source: string;

    descriptor: SFCDescriptor;

    scriptAst: unknown | null;
}

export function normalizeScriptAst(scriptAst: unknown, lineOffset: number) {
    if (!scriptAst || typeof scriptAst !== 'object') {
        return;
    }

    traverse(scriptAst as object, {
        enter(path: { node?: { loc?: { start?: { line?: number }; end?: { line?: number } } } }) {
            const loc = path.node?.loc;

            if (loc?.start?.line !== undefined) {
                loc.start.line += lineOffset;
            }

            if (loc?.end?.line !== undefined) {
                loc.end.line += lineOffset;
            }
        },
    });
}

export async function parseVueFile(filePath: string): Promise<ParsedVueFile> {
    const source = await fs.readFile(filePath, 'utf-8');

    const { descriptor } = parseSFC(source);

    const scriptContent =
        descriptor.scriptSetup?.content || descriptor.script?.content || '';

    let scriptAst: unknown | null = null;

    if (scriptContent) {
        const scriptBlock = descriptor.scriptSetup ?? descriptor.script;
        const lineOffset = (scriptBlock?.loc.start.line ?? 1) - 1;

        scriptAst = parseScript(scriptContent, {
            sourceType: 'module',

            plugins: [
                'typescript',
                'jsx',
                'decorators-legacy',
                'classProperties',
            ],
        });

        normalizeScriptAst(scriptAst, lineOffset);
    }

    return {
        source,
        descriptor,
        scriptAst,
    };
}
