import type { Rule } from '../../types/rule';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** @vue/compiler-sfc AST node type codes */
const NodeType = {
    ROOT: 0,
    ELEMENT: 1,
    TEXT: 2,
} as const;

/** @vue/compiler-sfc AST prop type codes */
const PropType = {
    ATTRIBUTE: 6,
    DIRECTIVE: 7,
} as const;

/**
 * All three conditional directive names.
 * v-else-if and v-else are also flagged because combining them with v-for
 * on the same element has the same performance and clarity problem.
 */
const CONDITIONAL_DIRECTIVES = new Set(['if', 'else-if', 'else']);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Finds a directive on an ElementNode by directive name.
 * Returns the DirectiveNode or undefined.
 */
function findDirective(elementNode: any, name: string): any {
    return elementNode.props?.find(
        (p: any) => p.type === PropType.DIRECTIVE && p.name === name,
    );
}

/**
 * Returns the conditional directive node (v-if / v-else-if / v-else)
 * if one exists on the element, otherwise undefined.
 */
function findConditionalDirective(elementNode: any): any {
    return elementNode.props?.find(
        (p: any) =>
            p.type === PropType.DIRECTIVE && CONDITIONAL_DIRECTIVES.has(p.name),
    );
}

/**
 * Recursively walks a template AST, calling `visitor` for every ElementNode.
 */
function walkTemplate(node: any, visitor: (node: any) => void): void {
    if (!node) return;

    if (node.type === NodeType.ELEMENT) {
        visitor(node);
    }

    node.children?.forEach((child: any) => walkTemplate(child, visitor));

    // IfNode (type 9) and ForNode (type 11) wrap branches — walk into them
    node.branches?.forEach((branch: any) => {
        branch.children?.forEach((child: any) => walkTemplate(child, visitor));
    });
}

/**
 * Builds a human-readable message explaining why the combination is wrong
 * and which directive wins in Vue 2 vs Vue 3.
 */
function buildMessage(conditionalName: string, forExp: string | null): string {
    const vifLabel = `v-${conditionalName}`;
    const sourceHint = forExp ? ` (iterating "${forExp}")` : '';

    return (
        `v-for${sourceHint} and ${vifLabel} are used on the same element. ` +
        `In Vue 3 v-if has higher priority; in Vue 2 v-for has higher priority. ` +
        `Move ${vifLabel} to a wrapper <template> to make intent explicit and avoid the priority difference.`
    );
}

/**
 * Builds a concrete fix suggestion based on which conditional directive is used.
 */
function buildSuggestion(
    tag: string,
    conditionalName: string,
    forSource: string | null,
    ifCondition: string | null,
): string {
    const src = forSource ?? 'list';
    const cond = ifCondition ?? 'condition';
    const vifLabel = `v-${conditionalName}`;

    if (conditionalName === 'if') {
        return (
            `Wrap with <template>: ` +
            `<template ${vifLabel}="${cond}">` +
            `<${tag} v-for="item in ${src}" :key="item.id">...</${tag}>` +
            `</template>`
        );
    }

    // v-else-if / v-else — harder to give a one-liner, give general advice
    return (
        `Move ${vifLabel} to a wrapping <template> element so the loop and ` +
        `the conditional are on separate elements.`
    );
}

/** Extracts the iteration source string from a v-for directive, e.g. "items" from "item in items" */
function extractForSource(vforDir: any): string | null {
    const content: string | undefined = vforDir?.exp?.content;
    if (!content) return null;

    // "item in items" | "(item, idx) in items" | "item of items"
    const match = content.match(/\bin\b|\bof\b/);
    if (!match || match.index === undefined) return content.trim();

    return content.slice(match.index + match[0].length).trim() || null;
}

/** Extracts the condition expression string from a v-if / v-else-if directive */
function extractIfCondition(vifDir: any): string | null {
    return vifDir?.exp?.content?.trim() ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule
// ─────────────────────────────────────────────────────────────────────────────

export const noVIfWithVForRule: Rule = {
    name: 'no-v-if-with-v-for',

    meta: {
        severity: 'error',
        category: 'vue',
        description:
            'Disallow v-if and v-for directives on the same element. ' +
            'Vue 2 and Vue 3 resolve the priority differently, leading to bugs.',
        recommended: true,
    },

    async check(context) {
        // This rule operates on the template AST, not the script AST
        const templateAst = context.descriptor?.template?.ast;

        if (!templateAst) return [];

        const issues: any[] = [];

        walkTemplate(templateAst, (elementNode) => {
            const vforDir = findDirective(elementNode, 'for');
            const conditionalDir = findConditionalDirective(elementNode);

            // Only flag when BOTH v-for AND a conditional directive exist on
            // the same element node
            if (!vforDir || !conditionalDir) return;

            const forSource = extractForSource(vforDir);
            const ifCondition = extractIfCondition(conditionalDir);
            const condName = conditionalDir.name as string;

            issues.push({
                rule: 'no-v-if-with-v-for',
                severity: 'error',
                file: context.filePath,

                // Use the element's own location for the most useful line number
                line: elementNode.loc?.start.line,
                column: elementNode.loc?.start.column,

                message: buildMessage(condName, forSource),
                suggestion: buildSuggestion(
                    elementNode.tag,
                    condName,
                    forSource,
                    ifCondition,
                ),
            });
        });

        return issues;
    },
};
