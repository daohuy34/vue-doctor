import type { Rule } from '../../types/rule';
import { traverse } from '../../utils/ast';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DataProp {
    name: string;
    line?: number;
    column?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — data() property extraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts the return object properties from an ObjectExpression.
 * Supports both shorthand `{ a, b }` and keyed `{ a: 1, b: 2 }` forms.
 */
function extractPropsFromObject(objNode: any): DataProp[] {
    const props: DataProp[] = [];
    objNode.properties?.forEach((p: any) => {
        if (p.type !== 'ObjectProperty' && p.type !== 'ObjectMethod') return;
        const name = p.key?.name ?? p.key?.value;
        if (!name) return;
        props.push({
            name,
            line: p.loc?.start.line,
            column: p.loc?.start.column,
        });
    });
    return props;
}

/**
 * Extracts DataProp names from a function body (ObjectMethod or
 * FunctionExpression / ArrowFunctionExpression).
 * Handles:
 *   data() { return { a, b } }
 *   data: function() { return { a, b } }
 *   data: () => ({ a, b })            ← arrow with object expression body
 *   data: () => { return { a, b } }   ← arrow with block body
 */
function extractDataProps(fnNode: any): DataProp[] {
    // ObjectMethod or FunctionExpression — has .body BlockStatement
    const body = fnNode.body ?? fnNode.value?.body;

    if (body?.type === 'BlockStatement') {
        for (const stmt of body.body ?? []) {
            if (
                stmt.type === 'ReturnStatement' &&
                stmt.argument?.type === 'ObjectExpression'
            ) {
                return extractPropsFromObject(stmt.argument);
            }
        }
    }

    // ArrowFunctionExpression with object expression body: () => ({ a, b })
    const arrowBody = fnNode.value?.body ?? fnNode.body;
    if (arrowBody?.type === 'ObjectExpression') {
        return extractPropsFromObject(arrowBody);
    }

    return [];
}

/**
 * Returns true when `path` belongs to a component-level `data` key.
 */
function isComponentDataKey(path: any): boolean {
    const gp = path.parentPath?.parent;
    if (!gp) return false;
    return (
        gp.type === 'ExportDefaultDeclaration' ||
        (gp.type === 'CallExpression' && gp.callee?.name === 'defineComponent')
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — usage detection in script AST
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Collects all `this.xxx` member expression property names that appear
 * anywhere in the script AST, excluding the data() function itself to
 * avoid counting the return object keys as usages.
 */
function collectScriptUsages(
    scriptAst: any,
    dataProps: Set<string>,
): Set<string> {
    const used = new Set<string>();

    traverse(scriptAst as any, {
        ObjectMethod(path) {
            // Skip the data() method itself — its return object keys are
            // declarations, not usages
            const key = path.node.key?.name ?? path.node.key?.value;
            if (key === 'data' && isComponentDataKey(path)) {
                path.skip();
            }
        },

        ObjectProperty(path) {
            const key = path.node.key?.name ?? path.node.key?.value;

            // Skip the data: () => ({}) property
            if (key === 'data' && isComponentDataKey(path)) {
                path.skip();
                return;
            }

            // Options API watch: { propName(v) {} } or watch: { 'prop.nested': { handler } }
            // The watch key string directly references a data prop (or its root)
            if (key === 'watch' && isComponentDataKey(path)) {
                const watchObj = path.node.value as any;
                if (watchObj?.type !== 'ObjectExpression') return;

                watchObj.properties?.forEach((entry: any) => {
                    const watchKey: string =
                        entry.key?.name ?? entry.key?.value ?? '';
                    // 'user.name' → root is 'user'
                    const rootName = watchKey.split('.')[0];
                    if (rootName && dataProps.has(rootName)) used.add(rootName);
                });
            }
        },

        MemberExpression(path) {
            if (path.node.object?.type !== 'ThisExpression') return;
            const name = path.node.property?.name ?? path.node.property?.value;
            if (name && dataProps.has(name)) used.add(name);
        },
    });

    return used;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — usage detection in template AST
// ─────────────────────────────────────────────────────────────────────────────

const TEMPLATE_NODE = {
    ROOT: 0,
    ELEMENT: 1,
    TEXT: 2,
    INTERPOLATION: 5,
} as const;
const PROP_TYPE = { ATTRIBUTE: 6, DIRECTIVE: 7 } as const;

/**
 * Extracts all bare identifier names from a template expression string.
 *
 * We use a simple regex rather than a full JS parser because template
 * expressions are small and this avoids a second parse step.
 *
 * Conservative: if a name appears anywhere in any expression it is marked
 * as referenced. This may produce false negatives (unused data that shadows
 * a loop variable) but avoids false positives which are more harmful.
 */
function extractNamesFromExpr(expr: string, into: Set<string>): void {
    const matches = expr.match(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g) ?? [];
    matches.forEach((m) => into.add(m));
}

/**
 * Recursively walks the template AST and collects every identifier name
 * referenced in directive expressions and interpolations.
 */
function collectTemplateUsages(templateAst: any): Set<string> {
    const names = new Set<string>();

    function walk(node: any): void {
        if (!node) return;

        // RootNode (0) and ElementNode (1)
        if (
            node.type === TEMPLATE_NODE.ROOT ||
            node.type === TEMPLATE_NODE.ELEMENT
        ) {
            node.props?.forEach((p: any) => {
                if (p.type === PROP_TYPE.DIRECTIVE) {
                    // v-if, v-show, v-model, @event, :bind expressions
                    if (p.exp?.content)
                        extractNamesFromExpr(p.exp.content, names);
                    // Dynamic argument :  :[dynamicKey]
                    if (p.arg?.content && !p.arg?.isStatic) {
                        extractNamesFromExpr(p.arg.content, names);
                    }
                }
            });
            node.children?.forEach(walk);
        }

        // Interpolation {{ expr }} — type 5
        if (node.type === TEMPLATE_NODE.INTERPOLATION) {
            if (node.content?.content)
                extractNamesFromExpr(node.content.content, names);
        }

        // IfNode / ForNode branches
        node.branches?.forEach((branch: any) => {
            // Branch condition (v-if expression)
            if (branch.condition?.content)
                extractNamesFromExpr(branch.condition.content, names);
            branch.children?.forEach(walk);
        });
    }

    walk(templateAst);
    return names;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule
// ─────────────────────────────────────────────────────────────────────────────

export const noUnusedComponentDataRule: Rule = {
    name: 'no-unused-component-data',

    meta: {
        severity: 'warning',
        category: 'vue',
        description:
            'Disallow data() properties that are never referenced in the template or script. ' +
            'Unused reactive data wastes memory and adds noise to the component.',
        recommended: true,
    },

    async check(context) {
        if (!context.scriptAst) return [];

        const issues: any[] = [];

        // ── Step 1: extract declared data() props ────────────────────────────
        const dataProps: DataProp[] = [];

        traverse(context.scriptAst as any, {
            // data() { return { ... } }  ← ObjectMethod
            ObjectMethod(path) {
                const key = path.node.key?.name ?? path.node.key?.value;
                if (key !== 'data') return;
                if (!isComponentDataKey(path)) return;
                dataProps.push(...extractDataProps(path.node));
                path.skip();
            },

            // data: function() { return { ... } }  or  data: () => ({ ... })
            ObjectProperty(path) {
                const key = path.node.key?.name ?? path.node.key?.value;
                if (key !== 'data') return;
                if (!isComponentDataKey(path)) return;
                dataProps.push(...extractDataProps(path.node));
                path.skip();
            },
        });

        if (dataProps.length === 0) return [];

        const dataPropNames = new Set(dataProps.map((p) => p.name));

        // ── Step 2: collect usages from script (this.xxx) ────────────────────
        const usedInScript = collectScriptUsages(
            context.scriptAst,
            dataPropNames,
        );

        // ── Step 3: collect usages from template ─────────────────────────────
        const templateAst = context.descriptor?.template?.ast;
        const usedInTemplate = templateAst
            ? collectTemplateUsages(templateAst)
            : new Set<string>();

        // ── Step 4: report unused props ──────────────────────────────────────
        dataProps.forEach((prop) => {
            const usedInSc = usedInScript.has(prop.name);
            const usedInTp = usedInTemplate.has(prop.name);

            if (usedInSc || usedInTp) return;

            issues.push({
                rule: 'no-unused-component-data',
                severity: 'warning',
                file: context.filePath,
                line: prop.line,
                column: prop.column,
                message: `data() property "${prop.name}" is declared but never used.`,
                suggestion:
                    `Remove "${prop.name}" from data() to reduce unnecessary reactivity overhead, ` +
                    `or use it in the template or a method/computed/watcher.`,
            });
        });

        return issues;
    },
};
