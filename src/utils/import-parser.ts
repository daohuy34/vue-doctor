/**
 * Advanced Import Statement Parser
 *
 * Parses ES6 import statements to extract detailed information about:
 * - Named imports:      import { Button, Icon } from './components'
 * - Default imports:    import React from 'react'
 * - Namespace imports:  import * as utils from './utils'
 * - Aliased imports:    import { foo as bar } from './module'
 * - Type-only imports: import type { Type } from './types'
 * - Re-exports:        export { Button } from './Button'
 * - Side-effect imports: import './styles.css'
 * - Dynamic imports:    import('./module') - detected separately
 */

import { traverse } from './ast';

export type ImportKind =
    | 'named'
    | 'default'
    | 'namespace'
    | 'type'
    | 'reexport'
    | 'side-effect';

export interface ImportSpecifier {
    /** Original name as written in source */
    originalName: string;
    /** Name used locally (after alias) */
    localName: string;
    /** Whether this is a type-only import */
    isType: boolean;
}

export interface ParsedImport {
    /** The full import path */
    source: string;
    /** Kind of import */
    kind: ImportKind;
    /** All imported specifiers */
    specifiers: ImportSpecifier[];
    /** Whether this is a re-export */
    isReExport: boolean;
    /** Whether this is a dynamic import */
    isDynamic: boolean;
    /** Line number in source */
    line: number;
    /** Column number in source */
    column: number;
}

export interface ImportParseResult {
    imports: ParsedImport[];
    dynamicImports: string[];
    reExports: ParsedImport[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function isTypeOnly(node: any): boolean {
    if (node.type === 'ImportDeclaration') {
        return node.importKind === 'type' ||
               (node.attributes?.some?.((a: any) => a.key?.name === 'type'));
    }
    if (node.type === 'ExportNamedDeclaration') {
        return node.exportKind === 'type';
    }
    return false;
}

function extractSpecifierName(node: any): string {
    if (node.type === 'Identifier') {
        return node.name;
    }
    if (node.type === 'StringLiteral') {
        return node.value;
    }
    return '';
}

function extractImportSpecifiers(node: any, isType: boolean): ImportSpecifier[] {
    const specifiers: ImportSpecifier[] = [];

    if (node.type === 'ImportDeclaration' || node.type === 'ExportNamedDeclaration') {
        for (const spec of node.specifiers ?? []) {
            if (spec.type === 'ImportSpecifier') {
                specifiers.push({
                    originalName: extractSpecifierName(spec.imported),
                    localName: extractSpecifierName(spec.local),
                    isType,
                });
            } else if (spec.type === 'ImportDefaultSpecifier') {
                specifiers.push({
                    originalName: 'default',
                    localName: extractSpecifierName(spec.local),
                    isType,
                });
            } else if (spec.type === 'ImportNamespaceSpecifier') {
                specifiers.push({
                    originalName: '*',
                    localName: extractSpecifierName(spec.local),
                    isType,
                });
            }
        }
    }

    return specifiers;
}

function classifyImportKind(
    node: any,
    specifiers: ImportSpecifier[],
    source: string,
): ImportKind {
    // Side-effect only (no specifiers with source)
    if (specifiers.length === 0 && node.type === 'ImportDeclaration') {
        return 'side-effect';
    }

    // Check for type-only
    if (isTypeOnly(node)) {
        return 'type';
    }

    // Check specifier types
    const hasNamespace = specifiers.some(s => s.originalName === '*');
    const hasDefault = specifiers.some(s => s.originalName === 'default');
    const hasNamed = specifiers.some(s => s.originalName !== 'default' && s.originalName !== '*');

    if (hasNamespace) {
        return 'namespace';
    }

    if (hasNamed) {
        return 'named';
    }

    if (hasDefault) {
        return 'default';
    }

    return 'side-effect';
}

function getSourcePath(node: any): string | null {
    if (node.source?.type === 'StringLiteral') {
        return node.source.value;
    }
    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Parser
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses all import/export statements from a JavaScript/TypeScript source file.
 *
 * @param source - The source code to parse
 * @returns Detailed import information including named imports, default imports,
 *          type imports, re-exports, and dynamic imports
 */
/**
 * Recursively finds all dynamic import paths in an AST node.
 */
function findDynamicImportsInNode(node: any, dynamicImports: string[]): void {
    if (!node) return;

    if (node.type === 'CallExpression') {
        // import('./module')
        if (
            node.callee?.type === 'Import' &&
            node.arguments?.[0]?.type === 'StringLiteral'
        ) {
            dynamicImports.push(node.arguments[0].value);
        }

        // defineAsyncComponent(() => import('./module'))
        if (
            node.callee?.type === 'Identifier' &&
            node.callee?.name === 'defineAsyncComponent'
        ) {
            // Check direct call argument
            if (node.arguments?.[0]?.type === 'CallExpression') {
                findDynamicImportsInNode(node.arguments[0], dynamicImports);
            }
            // Check arrow function wrapper: () => import('./x')
            if (
                node.arguments?.[0]?.type === 'ArrowFunctionExpression' &&
                node.arguments[0].body?.type === 'CallExpression'
            ) {
                findDynamicImportsInNode(node.arguments[0].body, dynamicImports);
            }
        }
    }

    // Recurse into children
    if (typeof node === 'object') {
        for (const key of Object.keys(node)) {
            if (key === 'loc') continue; // Skip location info
            const value = node[key];
            if (Array.isArray(value)) {
                for (const item of value) {
                    findDynamicImportsInNode(item, dynamicImports);
                }
            } else if (value && typeof value === 'object') {
                findDynamicImportsInNode(value, dynamicImports);
            }
        }
    }
}

export function parseImports(source: string): ImportParseResult {
    const result: ImportParseResult = {
        imports: [],
        dynamicImports: [],
        reExports: [],
    };

    if (!source) {
        return result;
    }

    try {
        const ast = JSON.parse(source);
        if (ast.type !== 'File') {
            return result;
        }

        const body = ast.program?.body ?? [];

        // First pass: collect all dynamic imports by traversing the entire AST
        for (const node of body) {
            findDynamicImportsInNode(node, result.dynamicImports);
        }

        // Second pass: collect static imports and re-exports
        for (const node of body) {
            const sourcePath = getSourcePath(node);
            if (!sourcePath) continue;

            // ── ImportDeclaration ──────────────────────────────────────────────
            if (node.type === 'ImportDeclaration') {
                const isType = isTypeOnly(node);
                const specifiers = extractImportSpecifiers(node, isType);
                const kind = classifyImportKind(node, specifiers, sourcePath);

                result.imports.push({
                    source: sourcePath,
                    kind,
                    specifiers,
                    isReExport: false,
                    isDynamic: false,
                    line: node.loc?.start?.line ?? 1,
                    column: node.loc?.start?.column ?? 0,
                });
            }

            // ── ExportNamedDeclaration (re-exports) ───────────────────────────
            if (node.type === 'ExportNamedDeclaration' && node.source) {
                const isType = isTypeOnly(node);
                const specifiers = extractImportSpecifiers(node, isType);

                result.reExports.push({
                    source: sourcePath,
                    kind: 'reexport',
                    specifiers,
                    isReExport: true,
                    isDynamic: false,
                    line: node.loc?.start?.line ?? 1,
                    column: node.loc?.start?.column ?? 0,
                });
            }
        }
    } catch {
        // If AST parsing fails, return empty result
    }

    return result;
}

/**
 * Extracts all component names from a set of imports.
 * Useful for building component usage maps.
 *
 * @param imports - The parsed imports to analyze
 * @returns Array of component names that could be Vue components
 */
export function extractComponentNames(imports: ParsedImport[]): string[] {
    const names: string[] = [];

    for (const imp of imports) {
        // Skip type-only imports and side-effect imports
        if (imp.kind === 'type' || imp.kind === 'side-effect') {
            continue;
        }

        for (const spec of imp.specifiers) {
            // Filter out known non-component names
            const name = spec.localName;
            if (
                name &&
                !name.startsWith('use') &&  // composables
                !name.startsWith('on') &&    // lifecycle hooks
                !name.match(/^[a-z]/)        // PascalCase only (components)
            ) {
                names.push(name);
            }
        }
    }

    return names;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────

function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Determines if an import path refers to a Vue component.
 * Uses heuristics like file location, naming convention, and known patterns.
 */
export function isLikelyComponent(importPath: string, localName: string): boolean {
    const normalizedPath = importPath.replace(/\\/g, '/');

    // File-based heuristics
    const isVueFile = normalizedPath.endsWith('.vue');
    const isInComponentsDir = /\/components?\//i.test(normalizedPath);
    const isInUiDir = /\/ui\//i.test(normalizedPath);

    // Naming convention (PascalCase suggests component)
    const isPascalCase = /^[A-Z][A-Za-z0-9]*$/.test(localName);

    // Known non-component patterns
    const isKnownNonComponent =
        localName.startsWith('use') ||      // composable
        localName.startsWith('on') ||        // lifecycle hook
        localName === 'defineComponent';     // Vue API

    return (
        !isKnownNonComponent &&
        (isVueFile || isInComponentsDir || isInUiDir || isPascalCase)
    );
}
