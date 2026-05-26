import type { Rule } from '../../types/rule';
import { findFirstMatchLocation } from '../../utils/location';

function hasDocumentUsage(source: string): boolean {
    return /\bdocument\b/.test(source);
}

export const noDocumentInSsrRule: Rule = {
    name: 'no-document-in-ssr',

    meta: {
        severity: 'error',
        category: 'SSR',
        description: 'Detect document usage in SSR contexts.',
        recommended: true,
    },

    async check(context) {
        const location = findFirstMatchLocation(context.source, /\bdocument\b/);

        if (!location) {
            return [];
        }

        return [
            {
                rule: 'no-document-in-ssr',
                severity: 'error',
                file: context.filePath,
                line: location.line,
                column: location.column,
                message: 'Detected SSR unsafe API usage: document.',
                suggestion:
                    'Wrap browser-only APIs inside onMounted() or process.client checks.',
            },
        ];
    },
};
