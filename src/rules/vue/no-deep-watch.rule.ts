import type { ObjectExpression } from '@babel/types';

import { traverse } from '../../utils/ast';
import { toFileLine } from '../../utils/line-utils';
import type { Rule } from '../../types/rule';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true when an ObjectExpression has a property whose key matches
 * `name` and whose value is the BooleanLiteral `true`.
 *
 * Handles both forms:
 *   Identifier key   →  { deep: true }
 *   StringLiteral key →  { 'deep': true }
 */
function hasBooleanTrueProp(obj: ObjectExpression, name: string): boolean {
    return obj.properties.some((prop: any) => {
        if (prop.type !== 'ObjectProperty') return false;

        const keyMatch =
            (prop.key.type === 'Identifier' && prop.key.name === name) ||
            (prop.key.type === 'StringLiteral' && prop.key.value === name);

        return (
            keyMatch &&
            prop.value.type === 'BooleanLiteral' &&
            prop.value.value === true
        );
    });
}

/**
 * Resolves a human-readable label from a watch source AST node.
 *
 *   watch(todos,         fn, opts)  →  "todos"
 *   watch(state.user,   fn, opts)  →  "state.user"
 *   watch(userRef.value, fn, opts) →  "userRef.value"
 *   watch('user.name',  fn, opts)  →  "user.name"
 *   watch([a, b],       fn, opts)  →  null  (array → generic message)
 *   watch(() => x,      fn, opts)  →  null  (arrow fn → generic message)
 */
function resolveSourceName(node: any): string | null {
    if (!node) return null;
    if (node.type === 'StringLiteral') return node.value;
    if (node.type === 'Identifier') return node.name;

    if (node.type === 'MemberExpression') {
        const obj = resolveSourceName(node.object);
        const prop =
            node.property.type === 'Identifier'
                ? node.property.name
                : node.property.type === 'StringLiteral'
                  ? node.property.value
                  : null;
        return obj && prop ? `${obj}.${prop}` : null;
    }

    return null;
}

/** Build a contextual suggestion for Composition API watch() calls. */
function compositionSuggestion(sourceName: string | null): string {
    return sourceName
        ? `Avoid deep watch on "${sourceName}". Watch a specific nested property instead: watch(() => ${sourceName}.yourProp, handler)`
        : 'Avoid deep watch on large objects. Watch a specific nested property via a getter: watch(() => obj.specificProp, handler)';
}

/** Build a contextual suggestion for Options API watcher entries. */
function optionsSuggestion(watchedKey: string | null): string {
    return watchedKey
        ? `Avoid deep watch on "${watchedKey}". Watch a specific nested path instead: watch: { '${watchedKey}.yourProp': handler }`
        : 'Avoid deep watch on large objects. Watch a specific nested path to avoid performance issues.';
}

/**
 * Returns true when the given path's parent chain indicates the `watch` key
 * belongs to a component options object — either:
 *
 *   export default { watch: ... }
 *   export default defineComponent({ watch: ... })
 *   const Comp = defineComponent({ watch: ... })
 *
 * Excludes plain objects assigned to variables or nested inside other objects.
 */
function isComponentOptionsWatch(path: any): boolean {
    // path.parent            = ObjectExpression (the component options object)
    // path.parentPath.parent = what wraps that ObjectExpression
    const grandParent = path.parentPath?.parent;
    if (!grandParent) return false;

    // export default { ... }
    if (grandParent.type === 'ExportDefaultDeclaration') return true;

    // export default defineComponent({ ... })  or
    // const Comp = defineComponent({ ... })
    if (
        grandParent.type === 'CallExpression' &&
        grandParent.callee?.type === 'Identifier' &&
        grandParent.callee?.name === 'defineComponent'
    ) {
        return true;
    }

    return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule
// ─────────────────────────────────────────────────────────────────────────────

export const noDeepWatchRule: Rule = {
    name: 'no-deep-watch',

    meta: {
        severity: 'warning',
        category: 'vue',
        description:
            'Avoid using deep watch as it may cause performance issues.',
        recommended: true,
    },

    async check(context) {
        if (!context.scriptAst) {
            return [];
        }

        const issues: any[] = [];

        traverse(context.scriptAst as any, {
            // ─────────────────────────────────────────────────────────────────
            // 1. Composition API  —  watch(source, handler, { deep: true })
            //
            //    Covered patterns:
            //      watch(obj, fn, { deep: true })
            //      watch(obj, fn, { immediate: true, deep: true })
            //      watch(obj, fn, { deep: true, once: true })       ← Vue 3.4
            //      watch(state.user, fn, { deep: true })            ← MemberExpression
            //      watch(userRef.value, fn, { deep: true })         ← .value
            //      watch(() => state.user, fn, { deep: true })      ← getter fn
            //      watch([a, b], fn, { deep: true })                ← array source
            //      watch('user.profile', fn, { deep: true })        ← string source
            //
            //    Not flagged:
            //      watch(src, fn)                    ← no options arg
            //      watch(src, fn, { deep: false })   ← deep is false
            //      watch(src, fn, { immediate: true })← no deep key
            //      watchEffect(...)                  ← different function
            //      someLib.watch(...)                ← MemberExpression callee
            // ─────────────────────────────────────────────────────────────────
            CallExpression(path) {
                const callee = path.node.callee;

                // Only bare `watch(...)` calls — not `someLib.watch(...)`
                if (callee.type !== 'Identifier' || callee.name !== 'watch') {
                    return;
                }

                const optionsArg = path.node.arguments[2];

                if (
                    !optionsArg ||
                    optionsArg.type !== 'ObjectExpression' ||
                    !hasBooleanTrueProp(optionsArg as ObjectExpression, 'deep')
                ) {
                    return;
                }

                const sourceName = resolveSourceName(path.node.arguments[0]);

                issues.push({
                    rule: 'no-deep-watch',
                    severity: 'warning',
                    file: context.filePath,
                    line: toFileLine(path.node.loc?.start.line, context.scriptStartLine),
                    column: path.node.loc?.start.column,
                    message: 'Deep watch detected.',
                    suggestion: compositionSuggestion(sourceName),
                });
            },

            // ─────────────────────────────────────────────────────────────────
            // 2. Options API  —  watch: { key: { handler, deep: true } }
            //
            //    Covered patterns:
            //      watch: { todos:       { handler() {}, deep: true } }
            //      watch: { 'user.name': { handler() {}, deep: true } }  ← string key
            //      watch: { a: { deep: true }, b: { deep: true } }       ← multiple
            //
            //    Not flagged:
            //      watch: { todos(val) {} }                ← shorthand fn (ObjectMethod)
            //      watch: { todos: { deep: false } }       ← deep is false
            //      watch: { todos: { immediate: true } }   ← no deep key
            //      const x = { watch: { ... deep: true } } ← not a component options object
            // ─────────────────────────────────────────────────────────────────
            ObjectProperty(path) {
                const keyNode = path.node.key;

                const isWatchKey =
                    (keyNode.type === 'Identifier' &&
                        keyNode.name === 'watch') ||
                    (keyNode.type === 'StringLiteral' &&
                        keyNode.value === 'watch');

                if (!isWatchKey) return;

                // Guard: only flag inside a real component options object,
                // not in arbitrary plain objects that happen to have a "watch" key.
                if (!isComponentOptionsWatch(path)) return;

                const watchersObj = path.node.value;

                if (watchersObj.type !== 'ObjectExpression') return;

                // Iterate each watched source entry
                (watchersObj as ObjectExpression).properties.forEach(
                    (entry: any) => {
                        // ObjectMethod = shorthand  todos(val) {}  → no deep possible, skip
                        if (entry.type !== 'ObjectProperty') return;

                        const config = entry.value;

                        // Must be object config form  { handler, deep: true }
                        if (
                            config.type !== 'ObjectExpression' ||
                            !hasBooleanTrueProp(
                                config as ObjectExpression,
                                'deep',
                            )
                        ) {
                            return;
                        }

                        const watchedKey =
                            entry.key.type === 'Identifier'
                                ? entry.key.name
                                : entry.key.type === 'StringLiteral'
                                  ? entry.key.value
                                  : null;

                        issues.push({
                            rule: 'no-deep-watch',
                            severity: 'warning',
                            file: context.filePath,
                            line: toFileLine(entry.loc?.start.line, context.scriptStartLine),
                            column: entry.loc?.start.column,
                            message: 'Deep watch detected.',
                            suggestion: optionsSuggestion(watchedKey),
                        });
                    },
                );
            },
        });

        return issues;
    },
};
