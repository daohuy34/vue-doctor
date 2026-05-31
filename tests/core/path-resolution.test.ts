/**
 * Path Resolution Tests
 *
 * Tests for complex alias paths:
 * - @/* paths
 * - ~/* paths
 * - Custom aliases
 * - Relative paths
 */

import { describe, it, expect } from 'vitest';
import {
    extractImports,
    extractDynamicImports,
} from '../../src/core/graph';
import {
    parseImports,
} from '../../src/utils/import-parser';

describe('path resolution', () => {
    describe('alias paths', () => {
        it('extracts @/ alias imports', () => {
            const source = `
                import Button from '@/components/Button.vue';
                import { Card } from '@/components';
                import useAuth from '@/composables/useAuth';
            `;

            const imports = extractImports(source);

            expect(imports).toContain('@/components/Button.vue');
            expect(imports).toContain('@/components');
            expect(imports).toContain('@/composables/useAuth');
        });

        it('extracts ~/ alias imports', () => {
            const source = `
                import Button from '~/components/Button.vue';
                import { Modal } from '~/ui';
            `;

            const imports = extractImports(source);

            expect(imports).toContain('~/components/Button.vue');
            expect(imports).toContain('~/ui');
        });

        it('extracts mixed alias and relative imports', () => {
            const source = `
                import A from '@/components/A.vue';
                import B from './B.vue';
                import C from '../utils/C.vue';
                import D from '~/stores/D.ts';
            `;

            const imports = extractImports(source);

            expect(imports).toContain('@/components/A.vue');
            expect(imports).toContain('./B.vue');
            expect(imports).toContain('../utils/C.vue');
            expect(imports).toContain('~/stores/D.ts');
        });

        it('handles deep alias paths', () => {
            const source = `
                import Utils from '@/lib/utils/helpers';
                import Types from '@/types/generated';
            `;

            const imports = extractImports(source);

            expect(imports).toContain('@/lib/utils/helpers');
            expect(imports).toContain('@/types/generated');
        });
    });

    describe('relative paths', () => {
        it('resolves single dot relative paths', () => {
            const source = `import Button from './Button.vue';`;
            expect(extractImports(source)).toContain('./Button.vue');
        });

        it('resolves double dot relative paths', () => {
            const source = `import Modal from '../components/Modal.vue';`;
            expect(extractImports(source)).toContain('../components/Modal.vue');
        });

        it('resolves deep relative paths', () => {
            const source = `import Config from '../../config/settings.ts';`;
            expect(extractImports(source)).toContain('../../config/settings.ts');
        });

        it('handles absolute paths', () => {
            const source = `import utils from '/utils/helpers.js';`;
            expect(extractImports(source)).toContain('/utils/helpers.js');
        });
    });

    describe('dynamic imports with aliases', () => {
        it('extracts dynamic imports with @/ alias', () => {
            const source = `
                const HeavyModal = () => import('@/components/HeavyModal.vue');
                const Settings = () => import('@/pages/Settings.vue');
            `;

            const dynamicImports = extractDynamicImports(source);

            expect(dynamicImports.some(i => i.includes('@/components/HeavyModal'))).toBe(true);
            expect(dynamicImports.some(i => i.includes('@/pages/Settings'))).toBe(true);
        });

        it('extracts dynamic imports with ~/ alias', () => {
            const source = `
                const Chart = () => import('~//components/Charts/LineChart.vue');
            `;

            const dynamicImports = extractDynamicImports(source);

            expect(dynamicImports.some(i => i.includes('~/'))).toBe(true);
        });

        it('extracts dynamic imports with relative paths', () => {
            const source = `
                const Modal = () => import('./components/Modal.vue');
            `;

            const dynamicImports = extractDynamicImports(source);

            expect(dynamicImports.some(i => i.includes('./components/Modal'))).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('handles empty import paths', () => {
            const source = `import '';`;
            const imports = extractImports(source);
            expect(imports).toHaveLength(0);
        });

        it('handles template literals in imports', () => {
            const source = 'import { BASE_URL } from "./config";';
            expect(extractImports(source)).toContain('./config');
        });

        it('handles imports with comments', () => {
            const source = `
                // import { Old } from '@/old';
                import { Current } from '@/current';
            `;
            expect(extractImports(source)).toContain('@/current');
            expect(extractImports(source)).not.toContain('@/old');
        });

        it('handles exports from with aliases', () => {
            const source = `
                export { Button } from '@/components/Button.vue';
                export * from '@/utils/helpers';
                export { default as Card } from '~/components/Card.vue';
            `;

            const imports = extractImports(source);

            expect(imports).toContain('@/components/Button.vue');
            expect(imports).toContain('@/utils/helpers');
            expect(imports).toContain('~/components/Card.vue');
        });

        it('handles require with aliases', () => {
            const source = `
                const Button = require('@/components/Button.vue');
                const Modal = require('~/components/Modal.vue');
            `;

            const imports = extractImports(source);

            expect(imports).toContain('@/components/Button.vue');
            expect(imports).toContain('~/components/Modal.vue');
        });
    });

    describe('edge cases with newlines and formatting', () => {
        it('handles imports spanning multiple lines', () => {
            const source = `
                import {
                    Button,
                    Card,
                    Modal
                } from '@/components';
            `;

            expect(extractImports(source)).toContain('@/components');
        });

        it('handles imports with trailing comma', () => {
            const source = `import { Button, } from '@/components/Button.vue';`;
            expect(extractImports(source)).toContain('@/components/Button.vue');
        });

        it('handles imports with semicolons', () => {
            const source = `import Button from '@/components/Button.vue';`;
            expect(extractImports(source)).toContain('@/components/Button.vue');
        });

        it('handles imports without semicolons', () => {
            const source = `import Button from '@/components/Button.vue'`;
            expect(extractImports(source)).toContain('@/components/Button.vue');
        });
    });
});
