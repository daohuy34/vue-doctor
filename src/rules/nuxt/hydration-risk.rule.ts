/**
 * Hydration Risk Rule (Nuxt)
 *
 * Detects patterns that may cause SSR/hydration mismatches.
 * Hydration issues cause "hydration mismatch" errors and poor UX.
 */

import { getRuleOption } from '../../utils/rule-options';
import type { Rule, RuleContext } from '../../types/rule';
import type { ProjectContext } from '../../core/project';

export interface HydrationRiskOptions {
    /** Severity level (default: warning) */
    severity?: 'info' | 'warning' | 'error';
}

export const hydrationRiskRule: Rule<HydrationRiskOptions> = {
    name: 'hydration-risk',

    meta: {
        severity: 'warning',
        category: 'SSR',
        description:
            'Detect patterns that may cause SSR/hydration mismatches. ' +
            'Hydration issues cause errors and poor user experience.',
        recommended: false,
    },

    async check(context: RuleContext) {
        const severity = getRuleOption(context, 'hydration-risk', 'severity', 'warning') as
            | 'info'
            | 'warning'
            | 'error';

        const source = context.source;
        const issues = [];

        // Check for window/document access in setup
        if (hasWindowInSetup(source)) {
            issues.push({
                rule: 'hydration-risk',
                severity: 'error',

                file: context.filePath,
                line: findLineNumber(source, /\bwindow\./),
                column: 1,

                message: 'window access in component setup may cause hydration mismatch',

                suggestion: 'Use onMounted or process.client to guard browser-only code.',
            });
        }

        // Check for Math.random() in template
        if (hasMathRandom(source)) {
            issues.push({
                rule: 'hydration-risk',
                severity: 'error',

                file: context.filePath,
                line: findLineNumber(source, /Math\.random/),
                column: 1,

                message: 'Math.random() in template causes hydration mismatch',

                suggestion: 'Use a computed value or state instead of random values in templates.',
            });
        }

        // Check for Date.now() in template
        if (hasDateNow(source)) {
            issues.push({
                rule: 'hydration-risk',
                severity: 'warning',

                file: context.filePath,
                line: findLineNumber(source, /Date\.now/),
                column: 1,

                message: 'Date.now() in template causes hydration mismatch',

                suggestion: 'Use a computed or reactive date value instead.',
            });
        }

        // Check for inline style with random values
        if (hasInlineStyleRandom(source)) {
            issues.push({
                rule: 'hydration-risk',
                severity: 'warning',

                file: context.filePath,
                line: 1,
                column: 1,

                message: 'Random values in inline styles may cause hydration mismatch',

                suggestion: 'Use CSS classes or scoped styles instead of inline random values.',
            });
        }

        // Check for localStorage/sessionStorage access
        if (hasStorageAccess(source)) {
            issues.push({
                rule: 'hydration-risk',
                severity: 'error',

                file: context.filePath,
                line: findLineNumber(source, /(?:localStorage|sessionStorage)\./),
                column: 1,

                message: 'Storage access in setup may cause hydration mismatch',

                suggestion: 'Use onMounted or useNuxtApp to access storage safely.',
            });
        }

        // Check for Math() in template expressions
        if (hasMathInTemplate(source)) {
            issues.push({
                rule: 'hydration-risk',
                severity: 'warning',

                file: context.filePath,
                line: 1,
                column: 1,

                message: 'Math operations in template may cause hydration mismatch if non-deterministic',

                suggestion: 'Ensure computed values are deterministic.',
            });
        }

        return issues;
    },
};

function hasWindowInSetup(source: string): boolean {
    // Check if window is accessed outside of onMounted or process.client
    const scriptMatch = source.match(/<script[^>]*>([\s\S]*?)<\/script>/);

    if (!scriptMatch) {
        return false;
    }

    const script = scriptMatch[1];

    // If using <script setup>, check for window without guards
    if (script.includes('setup')) {
        const hasWindow = /\bwindow\./.test(script);
        const hasOnMounted = /onMounted\s*\(/.test(script);
        const hasProcessClient = /process\.client/.test(script);
        const hasIfClient = /import\.meta\.env\.CLIENT/.test(script);

        return hasWindow && !hasOnMounted && !hasProcessClient && !hasIfClient;
    }

    return false;
}

function hasMathRandom(source: string): boolean {
    // Check in template section
    const templateMatch = source.match(/<template>([\s\S]*?)<\/template>/);

    if (!templateMatch) {
        return false;
    }

    const template = templateMatch[1];

    // Check for Math.random() usage in template expressions
    return /\{\{[^}]*Math\.random\(\)[^}]*\}\}/.test(template);
}

function hasDateNow(source: string): boolean {
    const templateMatch = source.match(/<template>([\s\S]*?)<\/template>/);

    if (!templateMatch) {
        return false;
    }

    const template = templateMatch[1];

    return /\{\{[^}]*Date\.now\(\)[^}]*\}\}/.test(template);
}

function hasInlineStyleRandom(source: string): boolean {
    const templateMatch = source.match(/<template>([\s\S]*?)<\/template>/);

    if (!templateMatch) {
        return false;
    }

    const template = templateMatch[1];

    // Check for style with Math.random or inline dynamic values
    return /:style\s*=/.test(template) && /random/i.test(template);
}

function hasStorageAccess(source: string): boolean {
    const scriptMatch = source.match(/<script[^>]*>([\s\S]*?)<\/script>/);

    if (!scriptMatch) {
        return false;
    }

    const script = scriptMatch[1];

    // Check for storage access in setup without guards
    const hasStorage = /(?:localStorage|sessionStorage)\./.test(script);
    const hasOnMounted = /onMounted\s*\(/.test(script);
    const hasProcessClient = /process\.client/.test(script);

    return hasStorage && !hasOnMounted && !hasProcessClient;
}

function hasMathInTemplate(source: string): boolean {
    const templateMatch = source.match(/<template>([\s\S]*?)<\/template>/);

    if (!templateMatch) {
        return false;
    }

    const template = templateMatch[1];

    // Check for Math without deterministic operations
    return /\{\{[^}]*Math\.(?:random|now)[^}]*\}\}/.test(template);
}

function findLineNumber(source: string, pattern: RegExp): number {
    const lines = source.split('\n');

    for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
            return i + 1;
        }
    }

    return 1;
}
