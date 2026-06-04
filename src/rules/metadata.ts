export interface RuleMetadata {
    name: string;
    description: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    category: string;
    recommended: boolean;
    docs: string;
}

export const ruleMetadata: RuleMetadata[] = [
    // ── Performance ────────────────────────────────────────────────────────

    {
        name: 'no-large-asset',
        description:
            'Warn when static assets (images, SVGs, fonts) exceed the configured size threshold. ' +
            'Large assets increase bundle size and slow down page load times. ' +
            'Consider optimizing with imagemin, svgo, or using a CDN.',
        severity: 'warning',
        category: 'performance',
        recommended: true,
        docs: 'docs/rules/no-large-asset.md',
    },

    {
        name: 'no-deep-watch',
        description:
            'Avoid using deep watch as it traverses the entire object tree on every change ' +
            'and may cause performance issues. ' +
            'Watch a specific nested property via a getter instead.',
        severity: 'warning',
        category: 'performance',
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
        category: 'best-practice',
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
        category: 'best-practice',
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
        category: 'maintainability',
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
        category: 'maintainability',
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
        severity: 'critical',
        category: 'security',
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
        category: 'maintainability',
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
        category: 'maintainability',
        recommended: true,
        docs: 'docs/rules/no-unused-component-data.md',
    },

    {
        name: 'no-debugger',
        description: 'Disallow debugger statements in Vue components.',
        severity: 'warning',
        category: 'best-practice',
        recommended: true,
        docs: 'docs/rules/no-debugger.md',
    },

    {
        name: 'no-empty-catch',
        description: 'Disallow empty catch blocks.',
        severity: 'warning',
        category: 'best-practice',
        recommended: true,
        docs: 'docs/rules/no-empty-catch.md',
    },

    {
        name: 'excessive-props',
        description: 'Warn when a component declares too many props.',
        severity: 'warning',
        category: 'maintainability',
        recommended: true,
        docs: 'docs/rules/excessive-props.md',
    },

    {
        name: 'excessive-watchers',
        description: 'Warn when a component declares too many watchers.',
        severity: 'warning',
        category: 'maintainability',
        recommended: true,
        docs: 'docs/rules/excessive-watchers.md',
    },

    {
        name: 'excessive-computed-properties',
        description: 'Warn when a component declares too many computed properties.',
        severity: 'info',
        category: 'maintainability',
        recommended: true,
        docs: 'docs/rules/excessive-computed-properties.md',
    },

    {
        name: 'no-large-template',
        description: 'Warn when a template exceeds line or node thresholds.',
        severity: 'warning',
        category: 'maintainability',
        recommended: true,
        docs: 'docs/rules/no-large-template.md',
    },

    {
        name: 'excessive-dom-depth',
        description: 'Warn when template nesting exceeds a configurable depth.',
        severity: 'warning',
        category: 'maintainability',
        recommended: true,
        docs: 'docs/rules/excessive-dom-depth.md',
    },

    {
        name: 'excessive-v-for-nesting',
        description: 'Warn when templates contain nested v-for loops beyond the configured limit.',
        severity: 'warning',
        category: 'maintainability',
        recommended: true,
        docs: 'docs/rules/excessive-v-for-nesting.md',
    },

    // ── AI ────────────────────────────────────────────────────────────────

    {
        name: 'ai-monster-component',
        description: 'Warn when a component appears excessively complex based on size and structure.',
        severity: 'warning',
        category: 'ai',
        recommended: true,
        docs: 'docs/rules/ai-monster-component.md',
    },

    {
        name: 'excessive-reactive-state',
        description: 'Warn when a component contains too much reactive state.',
        severity: 'warning',
        category: 'ai',
        recommended: true,
        docs: 'docs/rules/excessive-reactive-state.md',
    },

    {
        name: 'excessive-component-responsibility',
        description: 'Warn when a component appears to have multiple responsibilities.',
        severity: 'warning',
        category: 'ai',
        recommended: true,
        docs: 'docs/rules/excessive-component-responsibility.md',
    },

    // ── Best Practices ─────────────────────────────────────────────────────

    {
        name: 'no-console',
        description:
            'Disallow console.log, console.warn, console.error and similar calls ' +
            'inside Vue components. Debug statements left in production code ' +
            'expose implementation details and clutter the browser console.',
        severity: 'warning',
        category: 'best-practice',
        recommended: true,
        docs: 'docs/rules/no-console.md',
    },

    // ── SSR / Nuxt ─────────────────────────────────────────────────────────

    {
        name: 'no-window-in-ssr',
        description:
            'Disallow window access in code that runs during server-side rendering. ' +
            'The browser global does not exist on the server and will throw at runtime.',
        severity: 'error',
        category: 'ssr',
        recommended: true,
        docs: 'docs/rules/no-window-in-ssr.md',
    },

    {
        name: 'no-document-in-ssr',
        description:
            'Disallow document access in code that runs during server-side rendering. ' +
            'The browser global does not exist on the server and will throw at runtime.',
        severity: 'error',
        category: 'ssr',
        recommended: true,
        docs: 'docs/rules/no-document-in-ssr.md',
    },

    {
        name: 'no-localstorage-in-ssr',
        description:
            'Disallow localStorage access in code that runs during server-side rendering. ' +
            'The browser global does not exist on the server and will throw at runtime.',
        severity: 'error',
        category: 'ssr',
        recommended: true,
        docs: 'docs/rules/no-localstorage-in-ssr.md',
    },

    {
        name: 'no-sessionstorage-in-ssr',
        description:
            'Disallow sessionStorage access in code that runs during server-side rendering. ' +
            'The browser global does not exist on the server and will throw at runtime.',
        severity: 'error',
        category: 'ssr',
        recommended: true,
        docs: 'docs/rules/no-sessionstorage-in-ssr.md',
    },

    // ── Architecture ─────────────────────────────────────────────────────

    {
        name: 'no-circular-dependency',
        description:
            'Detect circular dependencies between modules. ' +
            'Circular dependencies make code harder to test, understand, and maintain. ' +
            'They can also cause issues with module loading and create tight coupling.',
        severity: 'error',
        category: 'architecture',
        recommended: true,
        docs: 'docs/rules/no-circular-dependency.md',
    },

    // ── Coupling ─────────────────────────────────────────────────────────

    {
        name: 'component-coupling',
        description:
            'Detect components with excessive dependencies (high fan-out). ' +
            'Components that import too many other modules are harder to test, reuse, and maintain.',
        severity: 'warning',
        category: 'architecture',
        recommended: false,
        docs: 'docs/rules/component-coupling.md',
    },

    {
        name: 'composable-coupling',
        description:
            'Detect composables with excessive dependencies. ' +
            'Highly coupled composables may indicate code that should be split.',
        severity: 'warning',
        category: 'architecture',
        recommended: false,
        docs: 'docs/rules/composable-coupling.md',
    },

    {
        name: 'store-coupling',
        description:
            'Detect stores with excessive dependencies. ' +
            'Store-to-store coupling can lead to circular dependencies and make state management harder.',
        severity: 'warning',
        category: 'architecture',
        recommended: false,
        docs: 'docs/rules/store-coupling.md',
    },

    {
        name: 'layer-violation',
        description:
            'Detect architectural layer violations. ' +
            'Files in higher layers should not depend on files in lower layers.',
        severity: 'warning',
        category: 'architecture',
        recommended: false,
        docs: 'docs/rules/layer-violation.md',
    },

    {
        name: 'forbidden-dependency',
        description:
            'Detect specific forbidden dependencies. ' +
            'Use this to enforce project-specific architectural rules.',
        severity: 'error',
        category: 'architecture',
        recommended: false,
        docs: 'docs/rules/forbidden-dependency.md',
    },

    {
        name: 'feature-leakage',
        description:
            'Detect when features import internal modules of other features. ' +
            'Features should only use the public API (index.ts) of other features.',
        severity: 'warning',
        category: 'architecture',
        recommended: false,
        docs: 'docs/rules/feature-leakage.md',
    },

    // ── Nuxt ─────────────────────────────────────────────────────────

    {
        name: 'page-complexity',
        description:
            'Detect overly complex Nuxt page components. ' +
            'Large pages can hurt performance and maintainability.',
        severity: 'warning',
        category: 'performance',
        recommended: false,
        docs: 'docs/rules/page-complexity.md',
    },

    {
        name: 'async-data-abuse',
        description:
            'Detect pages with too many async data fetching calls. ' +
            'Excessive parallel requests can hurt performance.',
        severity: 'warning',
        category: 'performance',
        recommended: false,
        docs: 'docs/rules/async-data-abuse.md',
    },

    {
        name: 'duplicate-fetch',
        description:
            'Detect duplicate API fetch calls within the same component. ' +
            'Duplicate fetches waste bandwidth and can cause race conditions.',
        severity: 'warning',
        category: 'performance',
        recommended: false,
        docs: 'docs/rules/duplicate-fetch.md',
    },

    {
        name: 'hydration-risk',
        description:
            'Detect patterns that may cause SSR/hydration mismatches. ' +
            'Hydration issues cause errors and poor user experience.',
        severity: 'warning',
        category: 'ssr',
        recommended: false,
        docs: 'docs/rules/hydration-risk.md',
    },

    // ── Pinia ─────────────────────────────────────────────────────────

    {
        name: 'store-bloat',
        description:
            'Detect overly large Pinia stores. ' +
            'Large stores hurt maintainability.',
        severity: 'warning',
        category: 'maintainability',
        recommended: false,
        docs: 'docs/rules/store-bloat.md',
    },

    {
        name: 'store-god-object',
        description:
            'Detect Pinia stores with too many responsibilities. ' +
            'God objects are hard to maintain and test.',
        severity: 'warning',
        category: 'architecture',
        recommended: false,
        docs: 'docs/rules/store-god-object.md',
    },

    {
        name: 'cross-store-dependency',
        description:
            'Detect when Pinia stores depend on other stores. ' +
            'Cross-store dependencies can create tight coupling.',
        severity: 'warning',
        category: 'architecture',
        recommended: false,
        docs: 'docs/rules/cross-store-dependency.md',
    },

    {
        name: 'circular-store-dependency',
        description:
            'Detect circular dependencies between Pinia stores. ' +
            'Circular store dependencies cause initialization issues.',
        severity: 'error',
        category: 'architecture',
        recommended: true,
        docs: 'docs/rules/circular-store-dependency.md',
    },

    {
        name: 'pinia-best-practices',
        description:
            'Detect Pinia best practice violations. ' +
            'Follow Pinia best practices for better maintainability.',
        severity: 'warning',
        category: 'best-practice',
        recommended: false,
        docs: 'docs/rules/pinia-best-practices.md',
    },
];
