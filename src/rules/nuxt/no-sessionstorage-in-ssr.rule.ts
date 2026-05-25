import type { Rule } from '../../types/rule';

function hasSessionStorageUsage(source: string): boolean {
    return /\bsessionStorage\b/.test(source);
}

export const noSessionStorageInSsrRule: Rule = {
    name: 'no-sessionstorage-in-ssr',

    meta: {
        severity: 'error',
        category: 'SSR',
        description: 'Detect sessionStorage usage in SSR contexts.',
        recommended: true,
    },

    async check(context) {
        if (!hasSessionStorageUsage(context.source)) {
            return [];
        }

        return [
            {
                rule: 'no-sessionstorage-in-ssr',
                severity: 'error',
                file: context.filePath,
                message: 'Detected SSR unsafe API usage: sessionStorage.',
                suggestion:
                    'Wrap browser-only APIs inside onMounted() or process.client checks.',
            },
        ];
    },
};
