/**
 * Duplicate Fetch Rule (Nuxt)
 *
 * Detects duplicate API calls within the same component.
 * Duplicate fetches waste bandwidth and can cause race conditions.
 */

import { getRuleOption } from '../../utils/rule-options';
import type { Rule, RuleContext } from '../../types/rule';
import type { ProjectContext } from '../../core/project';
import type { NuxtConfig } from '../../core/nuxt';

export interface DuplicateFetchOptions {
    /** Severity level (default: warning) */
    severity?: 'info' | 'warning' | 'error';
}

interface FetchCall {
    endpoint: string;
    line: number;
}

export const duplicateFetchRule: Rule<DuplicateFetchOptions> = {
    name: 'duplicate-fetch',

    meta: {
        severity: 'warning',
        category: 'Performance',
        description:
            'Detect duplicate API fetch calls within the same component. ' +
            'Duplicate fetches waste bandwidth and can cause race conditions.',
        recommended: false,
    },

    async check(context: RuleContext & { projectContext?: ProjectContext; nuxtConfig?: NuxtConfig }) {
        const severity = getRuleOption(context, 'duplicate-fetch', 'severity', 'warning') as
            | 'info'
            | 'warning'
            | 'error';

        // Only apply in Nuxt projects
        if (!context.nuxtConfig) {
            return [];
        }

        const filePath = context.filePath;
        const source = context.source;

        // Extract fetch calls
        const fetchCalls = extractFetchCalls(source);

        // Find duplicates
        const duplicates = findDuplicateCalls(fetchCalls);

        if (duplicates.length === 0) {
            return [];
        }

        return duplicates.map((dup) => ({
            rule: 'duplicate-fetch',
            severity,

            file: filePath,
            line: dup.line,
            column: 1,

            message: `Duplicate API call: '${dup.endpoint}' is fetched ${dup.count} times`,

            suggestion: 'Use a composable or store to share data between components and avoid duplicate fetches.',
        }));
    },
};

function extractFetchCalls(source: string): FetchCall[] {
    const calls: FetchCall[] = [];
    const lines = source.split('\n');

    // Pattern to match fetch URLs
    const fetchPatterns = [
        // useFetch('/api/...')
        /useFetch\s*\(\s*['"`]([^'"`]+)['"`]/g,
        // useAsyncData('key', () => fetch('/api/...'))
        /fetch\s*\(\s*['"`]([^'"`]+)['"`]/g,
        // $fetch('/api/...')
        /\$fetch\s*\(\s*['"`]([^'"`]+)['"`]/g,
        // axios.get('/api/...')
        /(?:axios|fetch|axios\.get|axios\.post)\s*\(\s*['"`]([^'"`]+)['"`]/g,
    ];

    lines.forEach((line, index) => {
        for (const pattern of fetchPatterns) {
            const regex = new RegExp(pattern.source, pattern.flags);
            let match;

            while ((match = regex.exec(line)) !== null) {
                const endpoint = normalizeEndpoint(match[1]);
                if (endpoint && isApiEndpoint(endpoint)) {
                    calls.push({
                        endpoint,
                        line: index + 1,
                    });
                }
            }
        }
    });

    return calls;
}

function normalizeEndpoint(endpoint: string): string {
    // Remove query parameters
    let normalized = endpoint.split('?')[0];

    // Normalize template literals
    normalized = normalized.replace(/\$\{[^}]+\}/g, ':param');

    // Normalize variable interpolations
    normalized = normalized.replace(/\$\w+/g, ':param');

    return normalized;
}

function isApiEndpoint(endpoint: string): boolean {
    return (
        endpoint.startsWith('/api/') ||
        endpoint.startsWith('/') ||
        endpoint.startsWith('http')
    );
}

function findDuplicateCalls(calls: FetchCall[]): Array<{ endpoint: string; line: number; count: number }> {
    const endpointCount = new Map<string, { count: number; firstLine: number }>();

    for (const call of calls) {
        const existing = endpointCount.get(call.endpoint);
        if (existing) {
            existing.count++;
        } else {
            endpointCount.set(call.endpoint, { count: 1, firstLine: call.line });
        }
    }

    const duplicates: Array<{ endpoint: string; line: number; count: number }> = [];

    for (const [endpoint, info] of endpointCount) {
        if (info.count > 1) {
            duplicates.push({
                endpoint,
                line: info.firstLine,
                count: info.count,
            });
        }
    }

    return duplicates;
}
