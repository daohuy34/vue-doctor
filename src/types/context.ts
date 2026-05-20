import type { SFCDescriptor } from '@vue/compiler-sfc';

export interface RuleContext {
    filePath: string;

    source: string;

    descriptor: SFCDescriptor;

    scriptAst: unknown | null;
}
