/**
 * Async Data Abuse Rule (Nuxt)
 *
 * Detects excessive use of async data fetching in pages.
 * Too many async calls can hurt page load performance.
 */

import { getRuleOption } from '../../utils/rule-options';
import type { Rule, RuleContext } from '../../types/rule';
import type { ProjectContext } from '../../core/project';
import type { NuxtConfig } from '../../core/nuxt';

export interface AsyncDataAbuseOptions {
    /** Maximum number of async data calls (default: 3) */
    maxAsyncCalls?: number;
    /** Severity level (default: warning) */
    severity?: 'info' | 'warning' | 'error';
}

export const asyncDataAbuseRule: Rule<AsyncDataAbuseOptions> = {
    name: 'async-data-abuse',

    meta: {
        severity: 'warning',
        category: 'Performance',
        description:
            'Detect pages with too many async data fetching calls. ' +
            'Excessive parallel requests can hurt performance.',
        recommended: false,
    },

    async check(context: RuleContext & { projectContext?: ProjectContext; nuxtConfig?: NuxtConfig }) {
        const maxAsyncCalls = getRuleOption(context, 'async-data-abuse', 'maxAsyncCalls', 3);
        const severity = getRuleOption(context, 'async-data-abuse', 'severity', 'warning') as
            | 'info'
            | 'warning'
            | 'error';

        // Only apply in Nuxt projects
        if (!context.nuxtConfig) {
            return [];
        }

        // Only apply to pages
        const filePath = context.filePath;
        const pagesDir = context.nuxtConfig.directories.pages.replace(/\\/g, '/');
        const normalizedPath = filePath.replace(/\\/g, '/');

        if (!normalizedPath.includes(`/${pagesDir}/`) && !normalizedPath.endsWith(`/${pagesDir}`)) {
            return [];
        }

        const source = context.source;

        // Count async data calls
        let asyncCallCount = 0;

        // Nuxt 2 patterns
        asyncCallCount += (source.match(/\basyncData\s*\(/g) || []).length;
        asyncCallCount += (source.match(/\bfetch\s*\(/g) || []).length;

        // Nuxt 3 patterns
        asyncCallCount += (source.match(/\buseFetch\s*\(/g) || []).length;
        asyncCallCount += (source.match(/\buseAsyncData\s*\(/g) || []).length;
        asyncCallCount += (source.match(/\buseLazyFetch\s*\(/g) || []).length;
        asyncCallCount += (source.match(/\buseLazyAsyncData\s*\(/g) || []).length;

        if (asyncCallCount <= maxAsyncCalls) {
            return [];
        }

        return [
            {
                rule: 'async-data-abuse',
                severity,

                file: filePath,
                line: 1,
                column: 1,

                message: `Page has ${asyncCallCount} async data calls (max recommended: ${maxAsyncCalls})`,

                suggestion: buildSuggestion(asyncCallCount, maxAsyncCalls),
            },
        ];
    },
};

function buildSuggestion(asyncCallCount: number, maxAsyncCalls: number): string {
    const excess = asyncCallCount - maxAsyncCalls;

    if (excess <= 2) {
        return 'Consider combining multiple API calls into a single endpoint or using a store.';
    }

    return 'Too many async calls. Consider using a store, composables, or server-side composables (useAsyncData) to centralize data fetching.';
}
