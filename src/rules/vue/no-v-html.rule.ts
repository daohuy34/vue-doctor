import type { Rule } from '../../types/rule';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const NodeType = { ROOT: 0, ELEMENT: 1 } as const;
const PropType = { DIRECTIVE: 7 } as const;

/**
 * Known sanitization function names.
 * When the v-html expression is *only* a call to one of these the rule
 * downgrades to a warning instead of an error, because the developer has
 * shown intent to sanitize. We still warn because the sanitizer may be
 * misconfigured or bypassed.
 */
const SANITIZER_NAMES = new Set([
    'sanitize', // generic / custom
    'sanitizeHtml', // sanitize-html
    'DOMPurify', // called as DOMPurify.sanitize(...)
    'purify',
    'xss', // xss library
    'escapeHtml',
    'escape',
]);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true when `expr` is a pure string literal — the only truly safe
 * value for v-html because it is not influenced by runtime data.
 *
 *   '<b>static</b>'        → true
 *   "<em>static</em>"      → true
 *   `<em>static</em>`      → true   (template literal with no substitutions)
 *   userContent            → false
 *   '<b>' + title + '</b>' → false  (contains a variable)
 */
function isPureStringLiteral(expr: string): boolean {
    const t = expr.trim();
    if (!t) return false;

    // Single-quoted string with no embedded expression
    if (t.startsWith("'") && t.endsWith("'") && !t.slice(1, -1).includes("'"))
        return true;

    // Double-quoted string
    if (t.startsWith('"') && t.endsWith('"') && !t.slice(1, -1).includes('"'))
        return true;

    // Template literal with no ${} substitutions
    if (t.startsWith('`') && t.endsWith('`') && !t.includes('${')) return true;

    return false;
}

/**
 * Returns true when `expr` is (or contains) a call to a known HTML
 * sanitizer, e.g.:
 *   DOMPurify.sanitize(html)
 *   sanitizeHtml(content)
 *   xss(userInput)
 */
function callsSanitizer(expr: string): boolean {
    for (const name of SANITIZER_NAMES) {
        if (expr.includes(name)) return true;
    }
    return false;
}

/**
 * Recursively walks the template AST, calling `visitor` for every node
 * that has a `v-html` directive.
 */
function walkTemplate(
    node: any,
    visitor: (elementNode: any, directive: any) => void,
): void {
    if (!node) return;

    if (node.type === NodeType.ROOT || node.type === NodeType.ELEMENT) {
        node.props?.forEach((p: any) => {
            if (p.type === PropType.DIRECTIVE && p.name === 'html') {
                visitor(node, p);
            }
        });
        node.children?.forEach((child: any) => walkTemplate(child, visitor));
    }

    node.branches?.forEach((branch: any) => {
        branch.children?.forEach((child: any) => walkTemplate(child, visitor));
    });
}

function buildMessage(
    tag: string,
    expr: string,
    hasSanitizer: boolean,
): string {
    if (hasSanitizer) {
        return (
            `v-html on <${tag}> uses a sanitizer, but v-html is still a XSS risk ` +
            `if the sanitizer is misconfigured or bypassed.`
        );
    }
    if (!expr) {
        return `v-html on <${tag}> has no expression — it will render undefined as HTML.`;
    }
    return (
        `v-html on <${tag}> with dynamic content "${expr}" is a XSS vulnerability. ` +
        `Unsanitized user input rendered as HTML allows script injection.`
    );
}

function buildSuggestion(expr: string, hasSanitizer: boolean): string {
    if (hasSanitizer) {
        return (
            `Verify the sanitizer is configured to strip all dangerous tags and attributes. ` +
            `Consider using a Content Security Policy (CSP) as an additional defense layer.`
        );
    }
    if (!expr) {
        return `Provide a valid HTML string expression or remove v-html entirely.`;
    }
    return (
        `Prefer text interpolation {{ ${expr} }} which Vue automatically escapes. ` +
        `If HTML rendering is required, sanitize the input first: ` +
        `v-html="DOMPurify.sanitize(${expr})" and install a trusted sanitizer library.`
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule
// ─────────────────────────────────────────────────────────────────────────────

export const noVHtmlRule: Rule = {
    name: 'no-v-html',

    meta: {
        severity: 'critical',
        category: 'security',
        description:
            'Disallow v-html with dynamic content. ' +
            'Rendering unsanitized user input as HTML is a cross-site scripting (XSS) vulnerability.',
        recommended: true,
    },

    async check(context) {
        const templateAst = context.descriptor?.template?.ast;
        if (!templateAst) return [];

        const issues: any[] = [];

        walkTemplate(templateAst, (elementNode, directive) => {
            const expr = directive.exp?.content?.trim() ?? '';

            // Pure static string literals are safe — skip
            if (isPureStringLiteral(expr)) return;

            const hasSanitizer = callsSanitizer(expr);

            // Sanitizer usage: downgrade to warning, still report
            const severity = hasSanitizer ? 'warning' : 'critical';

            issues.push({
                rule: 'no-v-html',
                severity,
                file: context.filePath,
                line: elementNode.loc?.start.line,
                column: elementNode.loc?.start.column,
                message: buildMessage(elementNode.tag, expr, hasSanitizer),
                suggestion: buildSuggestion(expr, hasSanitizer),
            });
        });

        return issues;
    },
};
