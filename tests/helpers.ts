import { parse as parseSFC } from '@vue/compiler-sfc';
import { parse as parseScript } from '@babel/parser';
import type { RuleContext } from '../src/types/context';

export function createContext(
    source: string,
    filePath = 'Test.vue',
    config?: RuleContext['config'],
): RuleContext {
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
                plugins: ['typescript', 'jsx', 'decorators-legacy', 'classProperties'],
            });
        } catch {
            scriptAst = null;
        }
    }

    return { filePath, source, descriptor, scriptAst, scriptStartLine, config };
}
