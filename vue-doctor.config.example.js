/**
 * Vue Doctor Configuration
 *
 * @example { type: 'module' } in package.json for ESM support
 */

export default {
    // Use recommended profile (strict, recommended, minimal)
    profile: 'recommended',

    // Override specific rules
    rules: {
        'ai-monster-component': {
            enabled: true,
            severity: 'warning',
            options: { maxScore: 25 },
        },
        'no-circular': {
            enabled: true,
            severity: 'error',
        },
        'component-coupling': {
            enabled: true,
            severity: 'warning',
            options: { maxDeps: 10 },
        },
    },

    // Architecture policies
    policies: [
        {
            id: 'max-component-size',
            enabled: true,
            severity: 'warning',
            conditions: [{ field: 'componentSize', operator: 'gt', value: 400 }],
        },
        {
            id: 'no-deep-circular-deps',
            enabled: true,
            severity: 'error',
        },
    ],

    // Custom thresholds
    thresholds: {
        maxComponentSize: 400,
        maxCircularDepth: 2,
        maxFanOut: 10,
        maxStoreSize: 30,
        maxWatchers: 8,
    },

    // File patterns
    include: ['src/**/*.{vue,ts}'],
    exclude: ['src/**/*.spec.ts', 'src/**/*.test.ts', 'node_modules/**'],

    // Reporter
    reporter: 'stylish',

    // Fail on severity
    failOn: 'error',
};
