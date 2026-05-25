import type { SFCDescriptor } from '@vue/compiler-sfc';
import type { RuleOptions } from './config';

export interface RuleContext {
    filePath: string;

    source: string;

    descriptor: SFCDescriptor;

    scriptAst: unknown | null;

    config?: {
        ruleOptions?: RuleOptions;
    };
}
