import type { Rule } from '../../types/rule';
import { findFirstMatchLocation } from '../../utils/location';

function hasWindowUsage(source: string): boolean {
    return /\bwindow\b/.test(source);
}

export const noWindowInSsrRule: Rule = {
    name: 'no-window-in-ssr',

    meta: {
        severity: 'error',
        category: 'SSR',
        description: 'Detect window usage in SSR contexts.',
        recommended: true,
    },

    async check(context) {
        const location = findFirstMatchLocation(context.source, /\bwindow\b/);

        if (!location) {
            return [];
        }

        return [
            {
                rule: 'no-window-in-ssr',
                severity: 'error',
                file: context.filePath,
                line: location.line,
                column: location.column,
                message: 'Detected SSR unsafe API usage: window.',
                suggestion:
                    'Wrap browser-only APIs inside onMounted() or process.client checks.',
            },
        ];
    },
};
