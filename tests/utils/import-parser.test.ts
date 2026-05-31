import { describe, it, expect } from 'vitest';
import {
    parseImports,
    extractComponentNames,
    isLikelyComponent,
    type ImportParseResult,
} from '../../src/utils/import-parser';

describe('parseImports', () => {
    it('should parse named imports', () => {
        const ast = {
            type: 'File',
            program: {
                body: [
                    {
                        type: 'ImportDeclaration',
                        source: { type: 'StringLiteral', value: './Button' },
                        specifiers: [
                            {
                                type: 'ImportSpecifier',
                                imported: { type: 'Identifier', name: 'Button' },
                                local: { type: 'Identifier', name: 'Button' },
                            },
                            {
                                type: 'ImportSpecifier',
                                imported: { type: 'Identifier', name: 'Icon' },
                                local: { type: 'Identifier', name: 'Icon' },
                            },
                        ],
                        loc: { start: { line: 1, column: 0 } },
                    },
                ],
            },
        };
        const source = JSON.stringify(ast);

        const result = parseImports(source);

        expect(result.imports).toHaveLength(1);
        expect(result.imports[0].source).toBe('./Button');
        expect(result.imports[0].kind).toBe('named');
        expect(result.imports[0].specifiers).toHaveLength(2);
        expect(result.imports[0].specifiers[0].localName).toBe('Button');
        expect(result.imports[0].specifiers[1].localName).toBe('Icon');
    });

    it('should parse default imports', () => {
        const ast = {
            type: 'File',
            program: {
                body: [
                    {
                        type: 'ImportDeclaration',
                        source: { type: 'StringLiteral', value: 'react' },
                        specifiers: [
                            {
                                type: 'ImportDefaultSpecifier',
                                local: { type: 'Identifier', name: 'React' },
                            },
                        ],
                        loc: { start: { line: 1, column: 0 } },
                    },
                ],
            },
        };
        const source = JSON.stringify(ast);

        const result = parseImports(source);

        expect(result.imports).toHaveLength(1);
        expect(result.imports[0].source).toBe('react');
        expect(result.imports[0].kind).toBe('default');
        expect(result.imports[0].specifiers[0].localName).toBe('React');
    });

    it('should parse namespace imports', () => {
        const ast = {
            type: 'File',
            program: {
                body: [
                    {
                        type: 'ImportDeclaration',
                        source: { type: 'StringLiteral', value: './utils' },
                        specifiers: [
                            {
                                type: 'ImportNamespaceSpecifier',
                                local: { type: 'Identifier', name: 'utils' },
                            },
                        ],
                        loc: { start: { line: 1, column: 0 } },
                    },
                ],
            },
        };
        const source = JSON.stringify(ast);

        const result = parseImports(source);

        expect(result.imports).toHaveLength(1);
        expect(result.imports[0].kind).toBe('namespace');
        expect(result.imports[0].specifiers[0].originalName).toBe('*');
    });

    it('should parse aliased imports', () => {
        const ast = {
            type: 'File',
            program: {
                body: [
                    {
                        type: 'ImportDeclaration',
                        source: { type: 'StringLiteral', value: './module' },
                        specifiers: [
                            {
                                type: 'ImportSpecifier',
                                imported: { type: 'Identifier', name: 'foo' },
                                local: { type: 'Identifier', name: 'bar' },
                            },
                        ],
                        loc: { start: { line: 1, column: 0 } },
                    },
                ],
            },
        };
        const source = JSON.stringify(ast);

        const result = parseImports(source);

        expect(result.imports[0].specifiers[0].originalName).toBe('foo');
        expect(result.imports[0].specifiers[0].localName).toBe('bar');
    });

    it('should parse type-only imports', () => {
        const ast = {
            type: 'File',
            program: {
                body: [
                    {
                        type: 'ImportDeclaration',
                        importKind: 'type',
                        source: { type: 'StringLiteral', value: './types' },
                        specifiers: [
                            {
                                type: 'ImportSpecifier',
                                imported: { type: 'Identifier', name: 'User' },
                                local: { type: 'Identifier', name: 'User' },
                            },
                        ],
                        loc: { start: { line: 1, column: 0 } },
                    },
                ],
            },
        };
        const source = JSON.stringify(ast);

        const result = parseImports(source);

        expect(result.imports[0].kind).toBe('type');
        expect(result.imports[0].specifiers[0].isType).toBe(true);
    });

    it('should parse re-exports', () => {
        const ast = {
            type: 'File',
            program: {
                body: [
                    {
                        type: 'ExportNamedDeclaration',
                        source: { type: 'StringLiteral', value: './Button' },
                        specifiers: [
                            {
                                type: 'ExportSpecifier',
                                local: { type: 'Identifier', name: 'Button' },
                                exported: { type: 'Identifier', name: 'Button' },
                            },
                        ],
                        loc: { start: { line: 1, column: 0 } },
                    },
                ],
            },
        };
        const source = JSON.stringify(ast);

        const result = parseImports(source);

        expect(result.reExports).toHaveLength(1);
        expect(result.reExports[0].source).toBe('./Button');
        expect(result.reExports[0].kind).toBe('reexport');
        expect(result.reExports[0].isReExport).toBe(true);
    });

    it('should parse dynamic imports', () => {
        const ast = {
            type: 'File',
            program: {
                body: [
                    {
                        type: 'CallExpression',
                        callee: { type: 'Import' },
                        arguments: [{ type: 'StringLiteral', value: './HeavyComponent' }],
                    },
                ],
            },
        };
        const source = JSON.stringify(ast);

        const result = parseImports(source);

        expect(result.dynamicImports).toContain('./HeavyComponent');
    });

    it('should parse side-effect imports', () => {
        const ast = {
            type: 'File',
            program: {
                body: [
                    {
                        type: 'ImportDeclaration',
                        source: { type: 'StringLiteral', value: './styles.css' },
                        specifiers: [],
                        loc: { start: { line: 1, column: 0 } },
                    },
                ],
            },
        };
        const source = JSON.stringify(ast);

        const result = parseImports(source);

        expect(result.imports).toHaveLength(1);
        expect(result.imports[0].kind).toBe('side-effect');
    });

    it('should handle empty source', () => {
        const result = parseImports('');
        expect(result.imports).toHaveLength(0);
        expect(result.dynamicImports).toHaveLength(0);
        expect(result.reExports).toHaveLength(0);
    });

    it('should handle invalid JSON gracefully', () => {
        const result = parseImports('not valid json');
        expect(result.imports).toHaveLength(0);
    });
});

describe('extractComponentNames', () => {
    it('should extract component names from imports', () => {
        const imports = [
            {
                source: './components',
                kind: 'named' as const,
                specifiers: [
                    { originalName: 'Button', localName: 'Button', isType: false },
                    { originalName: 'Icon', localName: 'Icon', isType: false },
                ],
                isReExport: false,
                isDynamic: false,
                line: 1,
                column: 0,
            },
        ];

        const names = extractComponentNames(imports);

        expect(names).toContain('Button');
        expect(names).toContain('Icon');
    });

    it('should filter out composables (use prefix)', () => {
        const imports = [
            {
                source: './composables',
                kind: 'named' as const,
                specifiers: [
                    { originalName: 'useCounter', localName: 'useCounter', isType: false },
                ],
                isReExport: false,
                isDynamic: false,
                line: 1,
                column: 0,
            },
        ];

        const names = extractComponentNames(imports);

        expect(names).not.toContain('useCounter');
    });

    it('should filter out lifecycle hooks (on prefix)', () => {
        const imports = [
            {
                source: './hooks',
                kind: 'named' as const,
                specifiers: [
                    { originalName: 'onMounted', localName: 'onMounted', isType: false },
                ],
                isReExport: false,
                isDynamic: false,
                line: 1,
                column: 0,
            },
        ];

        const names = extractComponentNames(imports);

        expect(names).not.toContain('onMounted');
    });

    it('should filter out lowercase names', () => {
        const imports = [
            {
                source: './utils',
                kind: 'named' as const,
                specifiers: [
                    { originalName: 'helper', localName: 'helper', isType: false },
                ],
                isReExport: false,
                isDynamic: false,
                line: 1,
                column: 0,
            },
        ];

        const names = extractComponentNames(imports);

        expect(names).not.toContain('helper');
    });

    it('should filter out type-only imports', () => {
        const imports = [
            {
                source: './types',
                kind: 'type' as const,
                specifiers: [
                    { originalName: 'UserType', localName: 'UserType', isType: true },
                ],
                isReExport: false,
                isDynamic: false,
                line: 1,
                column: 0,
            },
        ];

        const names = extractComponentNames(imports);

        expect(names).not.toContain('UserType');
    });
});

describe('isLikelyComponent', () => {
    it('should detect Vue files as components', () => {
        expect(isLikelyComponent('./Button.vue', 'Button')).toBe(true);
        expect(isLikelyComponent('../components/BaseCard.vue', 'BaseCard')).toBe(true);
    });

    it('should detect files in components directory', () => {
        expect(isLikelyComponent('@/components/Header.vue', 'Header')).toBe(true);
        expect(isLikelyComponent('~/components/Modal.vue', 'Modal')).toBe(true);
    });

    it('should detect PascalCase names as components', () => {
        expect(isLikelyComponent('./some/path', 'UserProfile')).toBe(true);
        expect(isLikelyComponent('./some/path', 'ModalDialog')).toBe(true);
    });

    it('should exclude composables', () => {
        expect(isLikelyComponent('./useCounter.ts', 'useCounter')).toBe(false);
        expect(isLikelyComponent('./useAuth.ts', 'useAuth')).toBe(false);
    });

    it('should exclude lifecycle hooks', () => {
        expect(isLikelyComponent('./hooks.ts', 'onMounted')).toBe(false);
    });

    it('should exclude defineComponent', () => {
        expect(isLikelyComponent('vue', 'defineComponent')).toBe(false);
    });

    it('should detect UI directory', () => {
        expect(isLikelyComponent('@/ui/Button.vue', 'Button')).toBe(true);
    });
});
