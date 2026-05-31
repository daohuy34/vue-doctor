/**
 * Page Complexity Rule (Nuxt)
 *
 * Detects overly complex page components that may hurt performance.
 */

import { getRuleOption } from '../../utils/rule-options';
import type { Rule, RuleContext } from '../../types/rule';
import type { ProjectContext } from '../../core/project';
import type { NuxtConfig } from '../../core/nuxt';

export interface PageComplexityOptions {
    /** Maximum lines in a page (default: 300) */
    maxLines?: number;
    /** Maximum asyncData/fetch calls (default: 3) */
    maxAsyncCalls?: number;
    /** Severity level (default: warning) */
    severity?: 'info' | 'warning' | 'error';
}

export const pageComplexityRule: Rule<PageComplexityOptions> = {
    name: 'page-complexity',

    meta: {
        severity: 'warning',
        category: 'Performance',
        description:
            'Detect overly complex Nuxt page components. ' +
            'Large page components can hurt performance and maintainability.',
        recommended: false,
    },

    async check(context: RuleContext & { projectContext?: ProjectContext; nuxtConfig?: NuxtConfig }) {
        const maxLines = getRuleOption(context, 'page-complexity', 'maxLines', 300);
        const severity = getRuleOption(context, 'page-complexity', 'severity', 'warning') as
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

        const issues = [];

        // Check line count
        const lineCount = context.source.split('\n').length;
        if (lineCount > maxLines) {
            issues.push({
                rule: 'page-complexity',
                severity,

                file: filePath,
                line: 1,
                column: 1,

                message: `Page has ${lineCount} lines (max recommended: ${maxLines})`,

                suggestion: buildSuggestion(lineCount, maxLines),
            });
        }

        // Check for multiple asyncData/fetch calls
        const asyncDataCount = (context.source.match(/\basyncData\s*\(/g) || []).length;
        const fetchCount = (context.source.match(/\bfetch\s*\(/g) || []).length;
        const useFetchCount = (context.source.match(/\buseFetch\s*\(/g) || []).length;
        const useAsyncDataCount = (context.source.match(/\buseAsyncData\s*\(/g) || []).length;

        const totalAsyncCalls = asyncDataCount + fetchCount + useFetchCount + useAsyncDataCount;

        if (totalAsyncCalls > 3) {
            issues.push({
                rule: 'page-complexity',
                severity: 'warning',

                file: filePath,
                line: 1,
                column: 1,

                message: `Page has ${totalAsyncCalls} data fetching calls`,

                suggestion: 'Consider using a store or composable to centralize data fetching.',
            });
        }

        // Check for too many computed properties
        const computedCount = (context.source.match(/\bcomputed\s*\(/g) || []).length;
        if (computedCount > 10) {
            issues.push({
                rule: 'page-complexity',
                severity: 'info',

                file: filePath,
                line: 1,
                column: 1,

                message: `Page has ${computedCount} computed properties`,

                suggestion: 'Consider extracting computed logic into composables.',
            });
        }

        return issues;
    },
};

function buildSuggestion(lineCount: number, maxLines: number): string {
    const excess = lineCount - maxLines;

    if (excess < 50) {
        return 'Consider extracting some logic into composables.';
    }

    if (excess < 150) {
        return 'This page is getting complex. Consider splitting it into smaller components or using composables.';
    }

    return 'This page is too large. Consider a major refactor: extract components, composables, and server-side logic.';
}
