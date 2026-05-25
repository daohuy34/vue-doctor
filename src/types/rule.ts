import type { RuleContext } from './context';
import type { Fix } from './fix';
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

    fix?: (context: RuleContext, issue: Issue) => Promise<Fix | null>;
}
