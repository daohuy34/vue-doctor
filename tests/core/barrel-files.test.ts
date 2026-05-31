/**
 * Barrel Files (index.ts) Re-exports Tests
 *
 * Tests for barrel file patterns:
 * - index.ts re-exporting all modules
 * - Selective re-exports
 * - Deep barrel files
 * - Cross-barrel resolution
 */

import { describe, it, expect } from 'vitest';
import { extractImports } from '../../src/core/graph';

describe('barrel files (index.ts re-exports)', () => {
    describe('basic re-exports', () => {
        it('extracts re-exports from index.ts', () => {
            const source = `
                export { default as Button } from './Button.vue';
                export { default as Card } from './Card.vue';
                export { default as Modal } from './Modal.vue';
            `;

            const imports = extractImports(source);

            expect(imports).toContain('./Button.vue');
            expect(imports).toContain('./Card.vue');
            expect(imports).toContain('./Modal.vue');
            expect(imports).toHaveLength(3);
        });

        it('extracts named re-exports', () => {
            const source = `
                export { Button, Card } from './components';
                export { useAuth, useUser } from './composables';
            `;

            const imports = extractImports(source);

            expect(imports).toContain('./components');
            expect(imports).toContain('./composables');
        });

        it('extracts default re-export', () => {
            const source = `export { default } from './BaseComponent.vue';`;
            expect(extractImports(source)).toContain('./BaseComponent.vue');
        });

        it('handles wildcard re-exports', () => {
            const source = `export * from './utils';`;
            expect(extractImports(source)).toContain('./utils');
        });
    });

    describe('deep barrel files', () => {
        it('extracts re-exports from nested index.ts', () => {
            const source = `
                export { Button } from './Button.vue';
                export { Card } from './nested/Card.vue';
            `;

            const imports = extractImports(source);

            expect(imports).toContain('./Button.vue');
            expect(imports).toContain('./nested/Card.vue');
        });

        it('handles multi-level barrel chains', () => {
            const source = `
                // Level 1
                export { Button } from './Button.vue';
                // Level 2
                export { Card } from '../shared/Card.vue';
                // Level 3
                export { Modal } from '../../ui/Modal.vue';
            `;

            const imports = extractImports(source);

            expect(imports).toContain('./Button.vue');
            expect(imports).toContain('../shared/Card.vue');
            expect(imports).toContain('../../ui/Modal.vue');
        });

        it('handles mixed exports and re-exports', () => {
            const source = `
                export { Button } from './Button.vue';
                export const VERSION = '1.0.0';
                export function helper() {}
                export { Card } from './Card.vue';
            `;

            const imports = extractImports(source);

            expect(imports).toContain('./Button.vue');
            expect(imports).toContain('./Card.vue');
            expect(imports).toHaveLength(2);
        });
    });

    describe('selective re-exports', () => {
        it('handles type-only re-exports', () => {
            const source = `
                export type { ButtonProps } from './Button.vue';
                export type { CardProps } from './Card.vue';
            `;

            const imports = extractImports(source);

            expect(imports).toContain('./Button.vue');
            expect(imports).toContain('./Card.vue');
        });

        it('handles mixed type and value re-exports', () => {
            const source = `
                export { Button, type ButtonProps } from './Button.vue';
            `;

            const imports = extractImports(source);
            expect(imports).toContain('./Button.vue');
        });

        it('handles re-export with alias', () => {
            const source = `
                export { Button as BaseButton } from './Button.vue';
                export { default as PrimaryButton, type ButtonProps } from './Button.vue';
            `;

            const imports = extractImports(source);
            expect(imports).toContain('./Button.vue');
        });
    });

    describe('edge cases', () => {
        it('handles empty re-export block', () => {
            const source = `
                export {};
            `;

            const imports = extractImports(source);
            expect(imports).toHaveLength(0);
        });

        it('handles re-export with trailing comma', () => {
            const source = `
                export { Button, Card, } from './components';
            `;

            const imports = extractImports(source);
            expect(imports).toContain('./components');
        });

        it('handles re-exports with semicolons', () => {
            const source = `
                export { Button } from './Button.vue';
                export { Card } from './Card.vue';
            `;

            const imports = extractImports(source);

            expect(imports).toContain('./Button.vue');
            expect(imports).toContain('./Card.vue');
        });

        it('handles re-exports without semicolons', () => {
            const source = `
                export { Button } from './Button.vue'
                export { Card } from './Card.vue'
            `;

            const imports = extractImports(source);

            expect(imports).toContain('./Button.vue');
            expect(imports).toContain('./Card.vue');
        });

        it('handles multiline re-exports', () => {
            const source = `
                export {
                    Button,
                    Card,
                    Modal
                } from './components';
            `;

            const imports = extractImports(source);
            expect(imports).toContain('./components');
        });
    });

    describe('complex patterns', () => {
        it('handles re-exports with comments', () => {
            const source = `
                // Re-export all components
                export { Button } from './Button.vue';
                export { Card } from './Card.vue';
            `;

            const imports = extractImports(source);

            expect(imports).toContain('./Button.vue');
            expect(imports).toContain('./Card.vue');
        });

        it('handles conditional re-exports', () => {
            const source = `
                export { Button } from './Button.vue';
                // #ifndef EXCLUDE_MODAL
                export { Modal } from './Modal.vue';
                // #endif
            `;

            const imports = extractImports(source);

            expect(imports).toContain('./Button.vue');
            expect(imports).toContain('./Modal.vue');
        });

        it('handles re-export all with alias', () => {
            const source = `
                export * as Components from './components';
                export * as Utils from './utils';
            `;

            const imports = extractImports(source);

            expect(imports).toContain('./components');
            expect(imports).toContain('./utils');
        });
    });
});
