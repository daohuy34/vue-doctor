import type { Rule } from '../../types/rule';

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
        if (!hasDocumentUsage(context.source)) {
            return [];
        }

        return [
            {
                rule: 'no-document-in-ssr',
                severity: 'error',
                file: context.filePath,
                message: 'Detected SSR unsafe API usage: document.',
                suggestion:
                    'Wrap browser-only APIs inside onMounted() or process.client checks.',
            },
        ];
    },
};
