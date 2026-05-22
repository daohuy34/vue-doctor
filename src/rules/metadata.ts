export interface RuleMetadata {
    name: string;
    description: string;
    severity: 'warning' | 'error';
    category: string;
    docs: string;
}

export const ruleMetadata: RuleMetadata[] = [
    {
        name: 'no-console',
        description: 'Detect console usage in application code.',
        severity: 'warning',
        category: 'Best Practices',
        docs: 'docs/rules/no-console.md',
    },

    {
        name: 'no-deep-watch',
        description: 'Detect Vue deep watch usage.',
        severity: 'error',
        category: 'Performance',
        docs: 'docs/rules/no-deep-watch.md',
    },

    {
        name: 'no-large-component',
        description: 'Detect oversized Vue components.',
        severity: 'warning',
        category: 'Maintainability',
        docs: 'docs/rules/no-large-component.md',
    },

    {
        name: 'no-window-in-ssr',
        description: 'Detect browser-only APIs used in SSR context.',
        severity: 'error',
        category: 'SSR',
        docs: 'docs/rules/no-window-in-ssr.md',
    },
];
