import type {
    ObjectExpression,
    ObjectMethod,
    ObjectProperty,
} from '@babel/types';

import { traverse } from '../../utils/ast';
import type { Rule } from '../../types/rule';
import { toFileLine } from '../../utils/line-utils';

// ─────────────────────────────────────────────────────────────────────────────
// Side-effect detection configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Console methods — logging inside computed pollutes output on every access
 * and is a clear sign the developer is debugging a reactive cycle.
 */
const CONSOLE_METHODS = new Set([
    'log',
    'warn',
    'error',
    'info',
    'debug',
    'trace',
]);

/**
 * Top-level async/network call names.
 * Computed must be synchronous; calling these introduces async state changes
 * that Vue cannot track.
 */
const ASYNC_GLOBALS = new Set([
    'fetch',
    'axios',
    'setTimeout',
    'setInterval',
    'queueMicrotask',
]);

/**
 * Known mutating array methods. Calling these on a reactive ref/prop inside
 * computed triggers further reactivity updates creating infinite loops.
 */
const MUTATING_ARRAY_METHODS = new Set([
    'push',
    'pop',
    'shift',
    'unshift',
    'splice',
    'sort',
    'reverse',
    'fill',
    'copyWithin',
]);

/**
 * State-management commit/dispatch patterns.
 * store.commit(), store.dispatch(), useStore().commit() etc.
 */
const STORE_METHODS = new Set(['commit', 'dispatch']);

/**
 * Router navigation methods that cause side effects.
 */
const ROUTER_METHODS = new Set(['push', 'replace', 'go', 'back', 'forward']);

/**
 * Browser storage mutation methods.
 */
const STORAGE_METHODS = new Set(['setItem', 'removeItem', 'clear']);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Flatten a callee node to a dotted string: console.log, store.commit, etc. */
function calleeToString(node: any): string {
    if (!node) return '?';
    if (node.type === 'Identifier') return node.name;
    if (node.type === 'MemberExpression') {
        return `${calleeToString(node.object)}.${node.property?.name ?? node.property?.value ?? '?'}`;
    }
    return '?';
}

interface SideEffect {
    kind: string; // category label for the message
    callee: string; // human-readable callee string
    line?: number;
    column?: number;
    scriptStartLine: number;
}

/**
 * Inspects a CallExpression node and returns a SideEffect descriptor when
 * the call is considered a side effect, or null otherwise.
 *
 * @param callNode - The AST node to inspect
 * @param scriptStartLine - The line number where the script block starts in the file
 */
function detectCallSideEffect(callNode: any, scriptStartLine: number): SideEffect | null {
    const callee = callNode.callee;
    const str = calleeToString(callee);
    const loc = callNode.loc;

    // ── console.* ────────────────────────────────────────────────────────────
    if (
        callee.type === 'MemberExpression' &&
        callee.object?.name === 'console' &&
        CONSOLE_METHODS.has(callee.property?.name)
    ) {
        return {
            kind: 'console',
            callee: str,
            line: loc?.start.line,
            column: loc?.start.column,
            scriptStartLine,
        };
    }

    // ── fetch / axios / setTimeout / setInterval ──────────────────────────
    if (callee.type === 'Identifier' && ASYNC_GLOBALS.has(callee.name)) {
        return {
            kind: 'async/timer',
            callee: str,
            line: loc?.start.line,
            column: loc?.start.column,
            scriptStartLine,
        };
    }

    // ── axios.get / axios.post / axios.put / axios.delete / axios.patch ───
    if (callee.type === 'MemberExpression' && callee.object?.name === 'axios') {
        return {
            kind: 'async/network',
            callee: str,
            line: loc?.start.line,
            column: loc?.start.column,
            scriptStartLine,
        };
    }

    // ── store.commit / store.dispatch / useStore().commit ─────────────────
    if (
        callee.type === 'MemberExpression' &&
        STORE_METHODS.has(callee.property?.name)
    ) {
        const obj = calleeToString(callee.object);
        if (/store/i.test(obj)) {
            return {
                kind: 'store mutation',
                callee: str,
                line: loc?.start.line,
                column: loc?.start.column,
                scriptStartLine,
            };
        }
    }

    // ── router.push / router.replace / router.go ──────────────────────────
    if (
        callee.type === 'MemberExpression' &&
        ROUTER_METHODS.has(callee.property?.name)
    ) {
        const obj = calleeToString(callee.object);
        if (/router/i.test(obj)) {
            return {
                kind: 'router navigation',
                callee: str,
                line: loc?.start.line,
                column: loc?.start.column,
                scriptStartLine,
            };
        }
    }

    // ── localStorage / sessionStorage setItem / removeItem / clear ───────
    if (
        callee.type === 'MemberExpression' &&
        STORAGE_METHODS.has(callee.property?.name)
    ) {
        const obj = calleeToString(callee.object);
        if (/storage/i.test(obj)) {
            return {
                kind: 'storage mutation',
                callee: str,
                line: loc?.start.line,
                column: loc?.start.column,
                scriptStartLine,
            };
        }
    }

    // ── Array mutating methods on reactive data ───────────────────────────
    // this.items.push() / state.list.push() / ref.value.push()
    if (
        callee.type === 'MemberExpression' &&
        MUTATING_ARRAY_METHODS.has(callee.property?.name)
    ) {
        const receiver = callee.object;
        // this.xxx.push()  →  receiver is MemberExpression with ThisExpression root
        if (
            receiver?.type === 'MemberExpression' &&
            receiver.object?.type === 'ThisExpression'
        ) {
            return {
                kind: 'array mutation',
                callee: str,
                line: loc?.start.line,
                column: loc?.start.column,
                scriptStartLine,
            };
        }
        // ref.value.push()  →  receiver.property.name === 'value'
        if (
            receiver?.type === 'MemberExpression' &&
            receiver.property?.name === 'value'
        ) {
            return {
                kind: 'array mutation',
                callee: str,
                line: loc?.start.line,
                column: loc?.start.column,
                scriptStartLine,
            };
        }
    }

    // ── emit() inside computed ────────────────────────────────────────────
    if (callee.type === 'Identifier' && callee.name === 'emit') {
        return {
            kind: 'event emission',
            callee: str,
            line: loc?.start.line,
            column: loc?.start.column,
            scriptStartLine,
        };
    }

    // ── $emit() (Options API) ─────────────────────────────────────────────
    if (
        callee.type === 'MemberExpression' &&
        callee.object?.type === 'ThisExpression' &&
        callee.property?.name === '$emit'
    ) {
        return {
            kind: 'event emission',
            callee: str,
            line: loc?.start.line,
            column: loc?.start.column,
            scriptStartLine,
        };
    }

    return null;
}

/**
 * Traverses only inside a single computed method body and collects all
 * side effects found.
 *
 * @param methodNode - The computed method node
 * @param scriptStartLine - The line number where the script block starts in the file
 */
function collectSideEffects(methodNode: any, scriptStartLine: number): SideEffect[] {
    const effects: SideEffect[] = [];

    // body: ObjectMethod has .body (BlockStatement)
    //       ObjectProperty with ArrowFunctionExpression/FunctionExpression value
    const body = methodNode.body ?? methodNode.value?.body ?? methodNode.value;
    if (!body) return effects;

    // @babel/traverse requires a Program/File root when traversing sub-nodes.
    // Wrap the body in a synthetic File > Program so traverse works correctly
    // without needing scope + parentPath arguments.
    const wrappedRoot: any = {
        type: 'File',
        program: {
            type: 'Program',
            sourceType: 'module',
            body:
                body.type === 'BlockStatement'
                    ? body.body
                    : [{ type: 'ExpressionStatement', expression: body }],
            directives: [],
        },
    };

    traverse(wrappedRoot as any, {
        // ── Direct assignment to this.xxx  (Options API mutation) ──────────
        AssignmentExpression(path) {
            const left = path.node.left;
            if (
                left.type === 'MemberExpression' &&
                left.object?.type === 'ThisExpression'
            ) {
                const propName =
                    left.property?.name ?? left.property?.value ?? '?';
                effects.push({
                    kind: 'state mutation',
                    callee: `this.${propName}`,
                    line: path.node.loc?.start.line,
                    column: path.node.loc?.start.column,
                    scriptStartLine,
                });
            }
        },

        // ── All call expressions ───────────────────────────────────────────
        CallExpression(path) {
            const effect = detectCallSideEffect(path.node, scriptStartLine);
            if (effect) effects.push(effect);
        },
    });

    return effects;
}

function buildMessage(computedName: string, effect: SideEffect): string {
    return (
        `Computed property "${computedName}" has a side effect: ` +
        `${effect.kind} via \`${effect.callee}\`.`
    );
}

function buildSuggestion(computedName: string, effect: SideEffect): string {
    switch (effect.kind) {
        case 'console':
            return (
                `Remove the ${effect.callee} call. ` +
                `Use Vue DevTools to inspect computed values instead.`
            );
        case 'async/network':
        case 'async/timer':
            return (
                `Computed properties must be synchronous. ` +
                `Move the async call into a method or a watcher: ` +
                `watch(() => dependency, async () => { const result = await ${effect.callee}(...) })`
            );
        case 'state mutation':
            return (
                `Do not mutate state inside computed "${computedName}". ` +
                `Return a derived value instead, or use a writable computed with get/set.`
            );
        case 'array mutation':
            return (
                `Do not call \`${effect.callee}\` inside computed "${computedName}". ` +
                `Use a non-mutating alternative: spread [...arr], map(), filter(), or slice().`
            );
        case 'store mutation':
            return (
                `Do not call \`${effect.callee}\` inside computed "${computedName}". ` +
                `Move store mutations to a method or watcher.`
            );
        case 'router navigation':
            return (
                `Do not call \`${effect.callee}\` inside computed "${computedName}". ` +
                `Move router navigation to a method triggered by user interaction.`
            );
        case 'storage mutation':
            return (
                `Do not call \`${effect.callee}\` inside computed "${computedName}". ` +
                `Move storage writes to a watcher: watch(${computedName}, val => ${effect.callee}(...)).`
            );
        case 'event emission':
            return (
                `Do not emit events inside computed "${computedName}". ` +
                `Computed may run multiple times; emit from a method or watcher instead.`
            );
        default:
            return `Move the side effect out of computed "${computedName}" into a method or watcher.`;
    }
}

/**
 * Checks whether `path` is a component-level computed options key.
 * Guards against flagging arbitrary objects that happen to have a "computed" key.
 */
function isComponentComputedProperty(path: any): boolean {
    const gp = path.parentPath?.parent;
    if (!gp) return false;
    return (
        gp.type === 'ExportDefaultDeclaration' ||
        (gp.type === 'CallExpression' && gp.callee?.name === 'defineComponent')
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule
// ─────────────────────────────────────────────────────────────────────────────

export const noSideEffectInComputedRule: Rule = {
    name: 'no-side-effect-in-computed',

    meta: {
        severity: 'error',
        category: 'vue',
        description:
            'Disallow side effects inside computed properties. ' +
            'Computed must be pure functions — side effects cause infinite update loops ' +
            'and unpredictable behavior.',
        recommended: true,
    },

    async check(context) {
        if (!context.scriptAst) return [];

        const issues: any[] = [];

        traverse(context.scriptAst as any, {
            // ─────────────────────────────────────────────────────────────────
            // Options API
            //
            //   export default {
            //     computed: {
            //       fullName() { console.log(...); return ... }
            //     }
            //   }
            // ─────────────────────────────────────────────────────────────────
            ObjectProperty(path) {
                const keyName =
                    path.node.key?.type === 'Identifier'
                        ? path.node.key.name
                        : path.node.key?.type === 'StringLiteral'
                          ? path.node.key.value
                          : null;

                if (keyName !== 'computed') return;
                if (!isComponentComputedProperty(path)) return;

                const computedObj = path.node.value as ObjectExpression;
                if (computedObj.type !== 'ObjectExpression') return;

                computedObj.properties.forEach((methodNode: any) => {
                    // ObjectMethod:   fullName() { ... }
                    // ObjectProperty: fullName: () => { ... }
                    if (
                        methodNode.type !== 'ObjectMethod' &&
                        methodNode.type !== 'ObjectProperty'
                    )
                        return;

                    // Computed can also be { get() {}, set() {} } object form
                    // In that case only check the getter
                    let targetNode = methodNode;
                    if (methodNode.type === 'ObjectProperty') {
                        const val = methodNode.value;
                        // { myProp: { get() {}, set() {} } }
                        if (val?.type === 'ObjectExpression') {
                            const getter = val.properties.find(
                                (p: any) =>
                                    p.type === 'ObjectMethod' &&
                                    (p.key?.name === 'get' ||
                                        p.key?.value === 'get'),
                            );
                            if (getter) targetNode = getter;
                            else return; // no getter found — skip
                        }
                    }

                    const computedName =
                        methodNode.key?.name ??
                        methodNode.key?.value ??
                        'unknown';

                    const effects = collectSideEffects(targetNode, context.scriptStartLine);

                    effects.forEach((effect) => {
                        issues.push({
                            rule: 'no-side-effect-in-computed',
                            severity: 'error',
                            file: context.filePath,
                            line: toFileLine(effect.line, effect.scriptStartLine),
                            column: effect.column,
                            message: buildMessage(computedName, effect),
                            suggestion: buildSuggestion(computedName, effect),
                        });
                    });
                });
            },

            // ─────────────────────────────────────────────────────────────────
            // Composition API
            //
            //   const total = computed(() => {
            //     console.log('x')  // ← side effect
            //     return items.value.length
            //   })
            //
            //   const writable = computed({
            //     get: () => { console.log(...); return val.value },
            //     set: (v) => { val.value = v }
            //   })
            // ─────────────────────────────────────────────────────────────────
            CallExpression(path) {
                const callee = path.node.callee;
                if (callee.type !== 'Identifier' || callee.name !== 'computed')
                    return;

                const firstArg = path.node.arguments[0];
                if (!firstArg) return;

                // Resolve the computed name from the variable declarator if available
                // const myProp = computed(...)
                const computedName = (() => {
                    const parent = path.parent;
                    if (
                        parent?.type === 'VariableDeclarator' &&
                        parent.id?.type === 'Identifier'
                    ) {
                        return parent.id.name;
                    }
                    return 'computed';
                })();

                let getterNode: any = null;

                // computed(() => ...)  or  computed(function() { ... })
                if (
                    firstArg.type === 'ArrowFunctionExpression' ||
                    firstArg.type === 'FunctionExpression'
                ) {
                    getterNode = firstArg;
                }

                // computed({ get: () => ..., set: () => ... })
                if (firstArg.type === 'ObjectExpression') {
                    const getter = firstArg.properties.find(
                        (p: any) =>
                            (p.type === 'ObjectMethod' ||
                                p.type === 'ObjectProperty') &&
                            (p.key?.name === 'get' || p.key?.value === 'get'),
                    );
                    if (getter) getterNode = getter;
                }

                if (!getterNode) return;

                const effects = collectSideEffects(getterNode, context.scriptStartLine);

                effects.forEach((effect) => {
                    issues.push({
                        rule: 'no-side-effect-in-computed',
                        severity: 'error',
                        file: context.filePath,
                        line: toFileLine(effect.line, effect.scriptStartLine),
                        column: effect.column,
                        message: buildMessage(computedName, effect),
                        suggestion: buildSuggestion(computedName, effect),
                    });
                });
            },
        });

        return issues;
    },
};
