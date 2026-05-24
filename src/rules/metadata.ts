export interface RuleMetadata {
    name: string;
    description: string;
    severity: 'warning' | 'error';
    category: string;
    recommended: boolean;
    docs: string;
}

export const ruleMetadata: RuleMetadata[] = [
    // ── Performance ────────────────────────────────────────────────────────

    {
        name: 'no-deep-watch',
        description:
            'Avoid using deep watch as it traverses the entire object tree on every change ' +
            'and may cause performance issues. ' +
            'Watch a specific nested property via a getter instead.',
        severity: 'warning',
        category: 'Performance',
        recommended: true,
        docs: 'docs/rules/no-deep-watch.md',
    },

    // ── Reactivity ─────────────────────────────────────────────────────────

    {
        name: 'no-mutate-props',
        description:
            'Disallow mutating component props directly. ' +
            'Props are read-only; direct mutation breaks one-way data flow and causes ' +
            'unpredictable behavior. Emit an event or use a writable computed instead.',
        severity: 'error',
        category: 'Reactivity',
        recommended: true,
        docs: 'docs/rules/no-mutate-props.md',
    },

    {
        name: 'no-side-effect-in-computed',
        description:
            'Disallow side effects (console, fetch, state mutation, store commit, router navigation, ' +
            'storage writes, event emission) inside computed properties. ' +
            'Computed must be pure functions; side effects cause infinite update loops ' +
            'and unpredictable behavior.',
        severity: 'error',
        category: 'Reactivity',
        recommended: true,
        docs: 'docs/rules/no-side-effect-in-computed.md',
    },

    // ── Template ───────────────────────────────────────────────────────────

    {
        name: 'no-v-if-with-v-for',
        description:
            'Disallow v-if and v-for directives on the same element. ' +
            'Vue 2 and Vue 3 resolve their priority differently (v-for wins in Vue 2, ' +
            'v-if wins in Vue 3), leading to subtle bugs. ' +
            'Move the conditional to a wrapper <template> element.',
        severity: 'error',
        category: 'Template',
        recommended: true,
        docs: 'docs/rules/no-v-if-with-v-for.md',
    },

    {
        name: 'require-key-in-v-for',
        description:
            'Require a :key binding on every element that uses v-for. ' +
            'Without a unique key Vue cannot efficiently track and reorder DOM nodes, ' +
            'leading to incorrect rendering and degraded performance.',
        severity: 'error',
        category: 'Template',
        recommended: true,
        docs: 'docs/rules/require-key-in-v-for.md',
    },

    {
        name: 'no-v-html',
        description:
            'Disallow v-html with dynamic content. ' +
            'Rendering unsanitized user input as HTML is a cross-site scripting (XSS) vulnerability. ' +
            'Prefer text interpolation {{ }} which Vue escapes automatically, ' +
            'or sanitize input with DOMPurify before binding.',
        severity: 'error',
        category: 'Template',
        recommended: true,
        docs: 'docs/rules/no-v-html.md',
    },

    // ── Maintainability ────────────────────────────────────────────────────

    {
        name: 'no-large-component',
        description:
            'Warn when a Single File Component exceeds a configurable line threshold. ' +
            'Large components are harder to read, test, and maintain. ' +
            'Consider splitting into smaller, focused components.',
        severity: 'warning',
        category: 'Maintainability',
        recommended: true,
        docs: 'docs/rules/no-large-component.md',
    },

    {
        name: 'no-unused-component-data',
        description:
            'Disallow data() properties that are never referenced in the template, ' +
            'computed properties, methods, watchers, or lifecycle hooks. ' +
            'Unused reactive properties waste memory and add noise to the component.',
        severity: 'warning',
        category: 'Maintainability',
        recommended: true,
        docs: 'docs/rules/no-unused-component-data.md',
    },

    // ── Best Practices ─────────────────────────────────────────────────────

    {
        name: 'no-console',
        description:
            'Disallow console.log, console.warn, console.error and similar calls ' +
            'inside Vue components. Debug statements left in production code ' +
            'expose implementation details and clutter the browser console.',
        severity: 'warning',
        category: 'Best Practices',
        recommended: true,
        docs: 'docs/rules/no-console.md',
    },

    // ── SSR / Nuxt ─────────────────────────────────────────────────────────

    {
        name: 'no-window-in-ssr',
        description:
            'Disallow browser-only globals (window, document, navigator, localStorage, ' +
            'sessionStorage) in code that runs during server-side rendering. ' +
            'These APIs do not exist on the server and will throw at runtime.',
        severity: 'error',
        category: 'SSR',
        recommended: true,
        docs: 'docs/rules/no-window-in-ssr.md',
    },
];
