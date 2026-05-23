import type { Rule } from '../../types/rule';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const NodeType = {
    ROOT: 0,
    ELEMENT: 1,
} as const;

const PropType = {
    ATTRIBUTE: 6, // static  key="value"
    DIRECTIVE: 7, // dynamic :key="expr"  or  v-bind:key="expr"
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true when the element has a `:key` / `v-bind:key` binding.
 *
 *   :key="item.id"       →  DirectiveNode { type:7, name:'bind', arg.content:'key' }
 *   v-bind:key="item.id" →  same
 *   key="static"         →  AttributeNode { type:6, name:'key' }  ← also accepted
 */
function hasKeyProp(elementNode: any): boolean {
    return (
        elementNode.props?.some((p: any) => {
            // :key or v-bind:key
            if (
                p.type === PropType.DIRECTIVE &&
                p.name === 'bind' &&
                p.arg?.content === 'key'
            ) {
                return true;
            }

            // static key="..." (uncommon but valid)
            if (p.type === PropType.ATTRIBUTE && p.name === 'key') {
                return true;
            }

            return false;
        }) ?? false
    );
}

/**
 * Returns true when the element has a `v-for` directive.
 */
function hasVFor(elementNode: any): boolean {
    return (
        elementNode.props?.some(
            (p: any) => p.type === PropType.DIRECTIVE && p.name === 'for',
        ) ?? false
    );
}

/**
 * Extracts the v-for directive node from an element.
 */
function getVForDir(elementNode: any): any {
    return elementNode.props?.find(
        (p: any) => p.type === PropType.DIRECTIVE && p.name === 'for',
    );
}

/**
 * Resolves a human-readable source name from a v-for expression.
 *
 *   "item in items"         →  "items"
 *   "(item, idx) in items"  →  "items"
 *   "item of items"         →  "items"
 *   "n in 5"                →  "5"
 */
function extractForSource(vforDir: any): string | null {
    const content: string | undefined = vforDir?.exp?.content;
    if (!content) return null;

    const match = content.match(/\bin\b|\bof\b/);
    if (!match || match.index === undefined) return content.trim();

    return content.slice(match.index + match[0].length).trim() || null;
}

/**
 * Resolves a human-readable alias from a v-for expression.
 *
 *   "item in items"         →  "item"
 *   "(item, idx) in items"  →  "item"
 */
function extractForAlias(vforDir: any): string | null {
    const content: string | undefined = vforDir?.exp?.content;
    if (!content) return null;

    const match = content.match(/\bin\b|\bof\b/);
    if (!match || match.index === undefined) return null;

    return (
        content
            .slice(0, match.index)
            .trim()
            .replace(/^\(|\)$/g, '') // strip outer parens from "(item, idx)"
            .split(',')[0] // take only the value alias, not index
            .trim() || null
    );
}

function buildMessage(tag: string, source: string | null): string {
    const src = source ? ` over "${source}"` : '';
    return `v-for${src} on <${tag}> is missing a :key binding.`;
}

function buildSuggestion(
    tag: string,
    alias: string | null,
    source: string | null,
): string {
    const a = alias ?? 'item';
    const src = source ?? 'list';

    // Suggest a unique id when available, fall back to index as last resort
    return (
        `Add a unique :key to help Vue track DOM nodes efficiently. ` +
        `Prefer a stable unique id: <${tag} v-for="${a} in ${src}" :key="${a}.id">. ` +
        `Using the loop index (:key="index") is a last resort — ` +
        `it disables reordering optimizations and can cause subtle bugs.`
    );
}

/**
 * Recursively walks every ElementNode in the template AST.
 *
 * @vue/compiler-sfc's raw descriptor.template.ast preserves the original
 * ElementNode structure before any transform — each element's directives
 * live directly in its `props[]` array.
 */
function walkTemplate(node: any, visitor: (node: any) => void): void {
    if (!node) return;

    if (node.type === NodeType.ELEMENT) {
        visitor(node);
        node.children?.forEach((child: any) => walkTemplate(child, visitor));
    }

    // RootNode and branch wrappers also carry children
    if (node.type === NodeType.ROOT) {
        node.children?.forEach((child: any) => walkTemplate(child, visitor));
    }

    // IfNode (type 9) / IfBranchNode (type 10) — walk branches
    node.branches?.forEach((branch: any) => {
        branch.children?.forEach((child: any) => walkTemplate(child, visitor));
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule
// ─────────────────────────────────────────────────────────────────────────────

export const requireKeyInVForRule: Rule = {
    name: 'require-key-in-v-for',

    meta: {
        severity: 'error',
        category: 'vue',
        description:
            'Require a :key binding on every element with v-for. ' +
            'Without a key Vue cannot efficiently track and reorder DOM nodes.',
        recommended: true,
    },

    async check(context) {
        const templateAst = context.descriptor?.template?.ast;

        if (!templateAst) return [];

        const issues: any[] = [];

        walkTemplate(templateAst, (elementNode) => {
            // Only care about elements that have v-for
            if (!hasVFor(elementNode)) return;

            // Already has :key — nothing to do
            if (hasKeyProp(elementNode)) return;

            const vforDir = getVForDir(elementNode);
            const source = extractForSource(vforDir);
            const alias = extractForAlias(vforDir);

            issues.push({
                rule: 'require-key-in-v-for',
                severity: 'error',
                file: context.filePath,
                line: elementNode.loc?.start.line,
                column: elementNode.loc?.start.column,
                message: buildMessage(elementNode.tag, source),
                suggestion: buildSuggestion(elementNode.tag, alias, source),
            });
        });

        return issues;
    },
};
