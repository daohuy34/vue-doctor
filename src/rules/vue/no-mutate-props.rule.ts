import type { Rule } from '../../types/rule';
import { traverse } from '../../utils/ast';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Array mutation methods that modify in-place.
 * Calling any of these on a prop reference counts as a mutation.
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

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — prop name extraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves a property key node to a string name.
 * Handles both Identifier keys and StringLiteral keys.
 */
function keyName(node: any): string | null {
    if (!node) return null;
    if (node.type === 'Identifier') return node.name;
    if (node.type === 'StringLiteral') return node.value;
    return null;
}

/**
 * Extracts declared prop names from the Options API `props` field.
 *
 *   props: ['modelValue', 'items']              ← ArrayExpression
 *   props: { modelValue: String, items: Array } ← ObjectExpression
 */
function extractOptionsApiProps(propsNode: any): Set<string> {
    const names = new Set<string>();

    if (propsNode.type === 'ArrayExpression') {
        propsNode.elements.forEach((el: any) => {
            if (el?.type === 'StringLiteral') names.add(el.value);
        });
    }

    if (propsNode.type === 'ObjectExpression') {
        propsNode.properties.forEach((prop: any) => {
            if (prop.type !== 'ObjectProperty') return;
            const name = keyName(prop.key);
            if (name) names.add(name);
        });
    }

    return names;
}

/**
 * Extracts declared prop names from a Composition API `defineProps()` call.
 *
 *   defineProps(['modelValue', 'items'])              ← array runtime
 *   defineProps({ modelValue: String })               ← object runtime
 *   defineProps<{ modelValue: string; items: [] }>()  ← TypeScript generic
 */
function extractDefineProps(callNode: any): Set<string> {
    const names = new Set<string>();

    // TypeScript generic form: defineProps<{ a: string; b: number }>()
    const typeParams = callNode.typeParameters?.params?.[0];
    if (typeParams?.type === 'TSTypeLiteral') {
        typeParams.members?.forEach((member: any) => {
            const name = keyName(member.key);
            if (name) names.add(name);
        });
        return names;
    }

    const arg = callNode.arguments?.[0];
    if (!arg) return names;

    // Array form: defineProps(['a', 'b'])
    if (arg.type === 'ArrayExpression') {
        arg.elements.forEach((el: any) => {
            if (el?.type === 'StringLiteral') names.add(el.value);
        });
    }

    // Object form: defineProps({ a: String, b: { type: Array } })
    if (arg.type === 'ObjectExpression') {
        arg.properties.forEach((prop: any) => {
            if (prop.type !== 'ObjectProperty') return;
            const name = keyName(prop.key);
            if (name) names.add(name);
        });
    }

    return names;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — mutation detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks whether a MemberExpression's root is `this` and the first
 * property name is a known prop.
 *
 *   this.propName           → { isProp: true, propName: 'propName' }
 *   this.propName.nested    → { isProp: true, propName: 'propName' }
 *   this.localData          → { isProp: false }
 */
function resolvePropFromThis(
    node: any,
    props: Set<string>,
): { isProp: boolean; propName: string | null } {
    if (node.type !== 'MemberExpression')
        return { isProp: false, propName: null };

    const obj = node.object;
    const prop = keyName(node.property);

    // this.propName  (direct access)
    if (obj.type === 'ThisExpression' && prop && props.has(prop)) {
        return { isProp: true, propName: prop };
    }

    // this.propName.nested  (nested access — root is still this.propName)
    if (
        obj.type === 'MemberExpression' &&
        obj.object?.type === 'ThisExpression'
    ) {
        const rootProp = keyName(obj.property);
        if (rootProp && props.has(rootProp)) {
            return { isProp: true, propName: rootProp };
        }
    }

    return { isProp: false, propName: null };
}

/**
 * Checks whether a MemberExpression's root is the `props` proxy and
 * the first property name is a known prop.
 *
 *   props.modelValue        → { isProp: true, propName: 'modelValue' }
 *   props.items.nested      → { isProp: true, propName: 'items' }
 */
function resolvePropFromProxy(
    node: any,
    props: Set<string>,
    proxyName: string,
): { isProp: boolean; propName: string | null } {
    if (node.type !== 'MemberExpression')
        return { isProp: false, propName: null };

    const obj = node.object;
    const prop = keyName(node.property);

    // props.propName  (direct)
    if (
        obj.type === 'Identifier' &&
        obj.name === proxyName &&
        prop &&
        props.has(prop)
    ) {
        return { isProp: true, propName: prop };
    }

    // props.propName.nested
    if (
        obj.type === 'MemberExpression' &&
        obj.object?.type === 'Identifier' &&
        obj.object?.name === proxyName
    ) {
        const rootProp = keyName(obj.property);
        if (rootProp && props.has(rootProp)) {
            return { isProp: true, propName: rootProp };
        }
    }

    return { isProp: false, propName: null };
}

function buildMessage(propName: string): string {
    return `Prop "${propName}" is mutated directly.`;
}

function buildSuggestion(propName: string): string {
    return (
        `Props are read-only. ` +
        `Emit an event to let the parent update "${propName}": ` +
        `this.$emit('update:${propName}', newValue) ` +
        `or use a writable computed with get/set.`
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule
// ─────────────────────────────────────────────────────────────────────────────

export const noMutatePropsRule: Rule = {
    name: 'no-mutate-props',

    meta: {
        severity: 'error',
        category: 'vue',
        description:
            'Disallow mutating props directly. Props are read-only; mutations cause unpredictable behavior.',
        recommended: true,
    },

    async check(context) {
        if (!context.scriptAst) return [];

        const issues: any[] = [];

        // ── Pass 1: collect declared prop names and defineProps proxy name ──

        /** Prop names declared via Options API `props: [...]` or `props: {...}` */
        const optionsProps = new Set<string>();

        /** Prop names declared via Composition API `defineProps(...)` */
        const compositionProps = new Set<string>();

        /**
         * The variable name that holds the defineProps return value.
         *
         *   const props = defineProps(...)  →  'props'
         *   const p     = defineProps(...)  →  'p'
         *
         * Defaults to 'props' as a fallback since that is the universal convention.
         */
        let propsProxyName = 'props';

        traverse(context.scriptAst as any, {
            // Options API — `props:` key inside the component options object
            ObjectProperty(path: any) {
                const name = keyName(path.node.key);
                if (name !== 'props') return;

                // Ensure it's a component-level props definition, not a nested
                // object that happens to have a key named 'props'
                const grandParent = path.parentPath?.parent;
                if (!grandParent) return;

                const isComponentRoot =
                    grandParent.type === 'ExportDefaultDeclaration' ||
                    (grandParent.type === 'CallExpression' &&
                        grandParent.callee?.name === 'defineComponent');

                if (!isComponentRoot) return;

                const extracted = extractOptionsApiProps(path.node.value);
                extracted.forEach((p) => optionsProps.add(p));
            },

            // Composition API — `const xxx = defineProps(...)` or
            //                   `const xxx = withDefaults(defineProps(...), {})`
            VariableDeclarator(path: any) {
                const init = path.node.init;
                if (!init) return;

                let definePropsCall: any = null;

                // const props = defineProps(...)
                if (
                    init.type === 'CallExpression' &&
                    init.callee?.type === 'Identifier' &&
                    init.callee?.name === 'defineProps'
                ) {
                    definePropsCall = init;
                }

                // const props = withDefaults(defineProps(...), {...})
                if (
                    init.type === 'CallExpression' &&
                    init.callee?.type === 'Identifier' &&
                    init.callee?.name === 'withDefaults'
                ) {
                    const firstArg = init.arguments?.[0];
                    if (
                        firstArg?.type === 'CallExpression' &&
                        firstArg?.callee?.name === 'defineProps'
                    ) {
                        definePropsCall = firstArg;
                    }
                }

                if (!definePropsCall) return;

                // Record the proxy variable name used in this file
                const varId = path.node.id;
                if (varId?.type === 'Identifier') {
                    propsProxyName = varId.name;
                }

                const extracted = extractDefineProps(definePropsCall);
                extracted.forEach((p) => compositionProps.add(p));
            },
        });

        // Nothing to check if no props are declared
        if (optionsProps.size === 0 && compositionProps.size === 0) return [];

        // ── Pass 2: detect mutations ─────────────────────────────────────────

        traverse(context.scriptAst as any, {
            // ── AssignmentExpression ─────────────────────────────────────────
            //
            //   Options:     this.propName = value
            //                this.propName.nested = value
            //                this.propName[0] = value
            //
            //   Composition: props.propName = value
            //                props.propName.nested = value
            //
            AssignmentExpression(path: any) {
                const left = path.node.left;
                if (left.type !== 'MemberExpression') return;

                // Options API mutations
                if (optionsProps.size > 0) {
                    const { isProp, propName } = resolvePropFromThis(
                        left,
                        optionsProps,
                    );
                    if (isProp && propName) {
                        issues.push({
                            rule: 'no-mutate-props',
                            severity: 'error',
                            file: context.filePath,
                            line: path.node.loc?.start.line,
                            column: path.node.loc?.start.column,
                            message: buildMessage(propName),
                            suggestion: buildSuggestion(propName),
                        });
                        return;
                    }
                }

                // Composition API mutations
                if (compositionProps.size > 0) {
                    const { isProp, propName } = resolvePropFromProxy(
                        left,
                        compositionProps,
                        propsProxyName,
                    );
                    if (isProp && propName) {
                        issues.push({
                            rule: 'no-mutate-props',
                            severity: 'error',
                            file: context.filePath,
                            line: path.node.loc?.start.line,
                            column: path.node.loc?.start.column,
                            message: buildMessage(propName),
                            suggestion: buildSuggestion(propName),
                        });
                    }
                }
            },

            // ── CallExpression ───────────────────────────────────────────────
            //
            //   Options:     this.propName.push(x)
            //                this.propName.splice(0, 1)
            //
            //   Composition: props.propName.push(x)
            //                props.propName.splice(0, 1)
            //
            CallExpression(path: any) {
                const callee = path.node.callee;
                if (callee.type !== 'MemberExpression') return;

                const method = keyName(callee.property);
                if (!method || !MUTATING_ARRAY_METHODS.has(method)) return;

                // The receiver is callee.object  (e.g. this.items or props.items)
                const receiver = callee.object;

                // Options API
                if (optionsProps.size > 0) {
                    const { isProp, propName } = resolvePropFromThis(
                        receiver,
                        optionsProps,
                    );
                    if (isProp && propName) {
                        issues.push({
                            rule: 'no-mutate-props',
                            severity: 'error',
                            file: context.filePath,
                            line: path.node.loc?.start.line,
                            column: path.node.loc?.start.column,
                            message: buildMessage(propName),
                            suggestion: buildSuggestion(propName),
                        });
                        return;
                    }
                }

                // Composition API
                if (compositionProps.size > 0) {
                    const { isProp, propName } = resolvePropFromProxy(
                        receiver,
                        compositionProps,
                        propsProxyName,
                    );
                    if (isProp && propName) {
                        issues.push({
                            rule: 'no-mutate-props',
                            severity: 'error',
                            file: context.filePath,
                            line: path.node.loc?.start.line,
                            column: path.node.loc?.start.column,
                            message: buildMessage(propName),
                            suggestion: buildSuggestion(propName),
                        });
                    }
                }
            },
        });

        return issues;
    },
};
