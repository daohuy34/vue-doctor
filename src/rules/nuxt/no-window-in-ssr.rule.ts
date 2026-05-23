import type { Rule } from '../../types/rule';

const SSR_UNSAFE_APIS = [
    'window',
    'document',
    'localStorage',
    'sessionStorage',
];

export const noWindowInSsrRule: Rule = {
    name: 'no-window-in-ssr',

    meta: {
        severity: 'error',
        category: 'nuxt',
        description: 'Detect browser-only APIs that may break SSR.',
        recommended: true,
    },

    async check(context) {
        const issues = [];

        for (const api of SSR_UNSAFE_APIS) {
            if (!context.source.includes(api)) {
                continue;
            }

            issues.push({
                rule: 'no-window-in-ssr',

                severity: 'error',

                file: context.filePath,

                message: `Detected SSR unsafe API usage: ${api}`,

                suggestion:
                    'Wrap browser-only APIs inside onMounted() or process.client checks.',
            });
        }

        return issues;
    },
};
