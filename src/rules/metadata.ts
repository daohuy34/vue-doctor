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
        description: 'Detect console usage inside Vue components.',
        severity: 'warning',
        category: 'Best Practices',
        docs: 'docs/rules/no-console.md',
    },
    {
        name: 'no-deep-watch',
        description:
            'Avoid using deep watch as it may cause performance issues.',
        severity: 'warning',
        category: 'Performance',
        docs: 'docs/rules/no-deep-watch.md',
    },
    {
        name: 'no-large-component',
        description: 'Detect oversized Vue Single File Components.',
        severity: 'warning',
        category: 'Maintainability',
        docs: 'docs/rules/no-large-component.md',
    },
    {
        name: 'no-window-in-ssr',
        description: 'Detect browser-only APIs that may break SSR.',
        severity: 'error',
        category: 'SSR',
        docs: 'docs/rules/no-window-in-ssr.md',
    },
    {
        name: 'no-mutate-props',
        description:
            'Disallow mutating props directly. Props are read-only; mutations cause unpredictable behavior.',
        severity: 'error',
        category: 'Reactivity',
        docs: 'docs/rules/no-mutate-props.md',
    },
    {
        name: 'no-v-if-with-v-for',
        description:
            'Disallow v-if and v-for on the same element. Vue 2 and Vue 3 resolve priority differently.',
        severity: 'error',
        category: 'Template',
        docs: 'docs/rules/no-v-if-with-v-for.md',
    },
    {
        name: 'require-key-in-v-for',
        description:
            'Disallow v-if and v-for on the same element. Vue 2 and Vue 3 resolve priority differently.',
        severity: 'error',
        category: 'Template',
        docs: 'docs/rules/require-key-in-v-for.md',
    },
];
