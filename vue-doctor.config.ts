export default {
    rules: {
        'no-console': 'warning',
        'no-deep-watch': 'error',
        'no-large-component': 'warning',
    },
    ruleOptions: {
        'no-large-component': {
            maxLines: 600,
        },
        'no-large-template': {
            maxLines: 450,
            maxNodes: 250,
        },
        'excessive-props': {
            maxProps: 12,
        },
        'excessive-watchers': {
            maxWatchers: 8,
        },
        'excessive-computed-properties': {
            maxComputed: 18,
        },
        'excessive-dom-depth': {
            maxDepth: 5,
        },
        'excessive-v-for-nesting': {
            maxNesting: 2,
        },
    },
    failOnWarning: false,
    plugins: [],
};
