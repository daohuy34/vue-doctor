import { parse as parseSFC } from '@vue/compiler-sfc';
import { parse as parseScript } from '@babel/parser';
import { normalizeScriptAst } from '../src/core/parser';
import type { RuleContext } from '../src/types/context';

export function createContext(
    source: string,
    filePath = 'Test.vue',
    config?: RuleContext['config'],
): RuleContext {
    const { descriptor } = parseSFC(source);

    const scriptContent =
        descriptor.scriptSetup?.content || descriptor.script?.content || '';

    let scriptAst: unknown | null = null;

    if (scriptContent) {
        const scriptBlock = descriptor.scriptSetup ?? descriptor.script;
        const lineOffset = (scriptBlock?.loc.start.line ?? 1) - 1;

        scriptAst = parseScript(scriptContent, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx', 'decorators-legacy', 'classProperties'],
        });

        normalizeScriptAst(scriptAst, lineOffset);
    }

    return { filePath, source, descriptor, scriptAst, config };
}
