import type { Rule } from '../../types/rule';
import { findFirstMatchLocation } from '../../utils/location';

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
        const location = findFirstMatchLocation(
            context.source,
            /\blocalStorage\b/,
        );

        if (!location) {
            return [];
        }

        return [
            {
                rule: 'no-localstorage-in-ssr',
                severity: 'error',
                file: context.filePath,
                line: location.line,
                column: location.column,
                message: 'Detected SSR unsafe API usage: localStorage.',
                suggestion:
                    'Wrap browser-only APIs inside onMounted() or process.client checks.',
            },
        ];
    },
};
