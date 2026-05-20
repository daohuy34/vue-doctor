import type { RuleContext } from './context';
import type { Issue, Severity } from './issue';

export interface Rule {
    name: string;

    meta: {
        severity: Severity;

        category: string;

        description: string;

        recommended: boolean;
    };

    check(context: RuleContext): Promise<Issue[]>;
}
