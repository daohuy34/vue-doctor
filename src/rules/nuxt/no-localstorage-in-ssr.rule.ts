import type { Rule } from '../../types/rule';

function hasLocalStorageUsage(source: string): boolean {
    return /\blocalStorage\b/.test(source);
}

export const noLocalStorageInSsrRule: Rule = {
    name: 'no-localstorage-in-ssr',

    meta: {
        severity: 'error',
        category: 'SSR',
        description: 'Detect localStorage usage in SSR contexts.',
        recommended: true,
    },

    async check(context) {
        if (!hasLocalStorageUsage(context.source)) {
            return [];
        }

        return [
            {
                rule: 'no-localstorage-in-ssr',
                severity: 'error',
                file: context.filePath,
                message: 'Detected SSR unsafe API usage: localStorage.',
                suggestion:
                    'Wrap browser-only APIs inside onMounted() or process.client checks.',
            },
        ];
    },
};
