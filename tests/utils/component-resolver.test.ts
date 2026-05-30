import { describe, expect, it } from 'vitest';
import { parse as parseSFC } from '@vue/compiler-sfc';
import {
    normalizeFilename,
    extractInlineComponentName,
    resolveComponentName,
    isValidComponentName,
    normalizeToPascalCase,
    normalizeToKebabCase,
} from '../../src/utils/component-resolver';

describe('component-resolver', () => {
    describe('normalizeFilename', () => {
        it('handles PascalCase filenames', () => {
            expect(normalizeFilename('src/components/Button.vue')).toBe('Button');
            expect(normalizeFilename('src/components/BaseCard.vue')).toBe('BaseCard');
        });

        it('handles kebab-case filenames', () => {
            expect(normalizeFilename('src/components/base-button.vue')).toBe('BaseButton');
            expect(normalizeFilename('src/components/my-component.vue')).toBe('MyComponent');
        });

        it('handles index files', () => {
            expect(normalizeFilename('src/components/Modal/index.vue')).toBe('Modal');
            expect(normalizeFilename('src/components/base-card/index.vue')).toBe('BaseCard');
        });

        it('handles .ts and .tsx files', () => {
            expect(normalizeFilename('src/composables/useAuth.ts')).toBe('useAuth');
            expect(normalizeFilename('src/components/Hello.tsx')).toBe('Hello');
        });

        it('handles Windows paths', () => {
            expect(normalizeFilename('src\\components\\Button.vue')).toBe('Button');
        });
    });

    describe('extractInlineComponentName', () => {
        it('extracts name from defineProps', () => {
            const source = `
                <script setup lang="ts">
                    defineProps<{
                        name?: string
                    }>()
                </script>
            `;
            const { descriptor } = parseSFC(source);
            const name = extractInlineComponentName(descriptor);
            expect(name).toBeNull();
        });

        it('extracts name from defineComponent options', () => {
            const source = `
                <script>
                    export default {
                        name: 'MyCustomComponent'
                    }
                </script>
            `;
            const { descriptor } = parseSFC(source);
            const name = extractInlineComponentName(descriptor);
            expect(name).toBe('MyCustomComponent');
        });

        it('returns null when no inline name found', () => {
            const source = `
                <script setup>
                    const count = ref(0)
                </script>
            `;
            const { descriptor } = parseSFC(source);
            const name = extractInlineComponentName(descriptor);
            expect(name).toBeNull();
        });

        it('handles empty script blocks', () => {
            const { descriptor } = parseSFC('<template><div>Hello</div></template>');
            const name = extractInlineComponentName(descriptor);
            expect(name).toBeNull();
        });
    });

    describe('resolveComponentName', () => {
        it('prefers inline name over filename', () => {
            const source = `
                <script>
                    export default {
                        name: 'OverrideName'
                    }
                </script>
            `;
            const { descriptor } = parseSFC(source);
            const result = resolveComponentName('src/components/Button.vue', descriptor);

            expect(result.name).toBe('OverrideName');
            expect(result.source).toBe('inline');
        });

        it('uses PascalCase name from filename', () => {
            const result = resolveComponentName('src/components/BaseButton.vue');
            expect(result.name).toBe('BaseButton');
            expect(result.source).toBe('PascalCase');
        });

        it('converts kebab-case to PascalCase', () => {
            const result = resolveComponentName('src/components/base-button.vue');
            expect(result.name).toBe('BaseButton');
            expect(result.source).toBe('kebab-case');
        });

        it('handles index files with parent directory', () => {
            const result = resolveComponentName('src/components/MyModal/index.vue');
            expect(result.name).toBe('MyModal');
            expect(result.source).toBe('index');
        });
    });

    describe('isValidComponentName', () => {
        it('accepts valid PascalCase names', () => {
            expect(isValidComponentName('Button')).toBe(true);
            expect(isValidComponentName('BaseCard')).toBe(true);
            expect(isValidComponentName('MyComponent123')).toBe(true);
        });

        it('accepts names with underscores and $', () => {
            expect(isValidComponentName('_Private')).toBe(true);
            expect(isValidComponentName('$Root')).toBe(true);
            expect(isValidComponentName('Vue_Component')).toBe(true);
        });

        it('rejects invalid names', () => {
            expect(isValidComponentName('')).toBe(false);
            expect(isValidComponentName('123Button')).toBe(false);
            expect(isValidComponentName('-Button')).toBe(false);
        });
    });

    describe('normalizeToPascalCase', () => {
        it('converts kebab-case', () => {
            expect(normalizeToPascalCase('base-button')).toBe('BaseButton');
            expect(normalizeToPascalCase('my-custom-component')).toBe('MyCustomComponent');
        });

        it('converts snake_case', () => {
            expect(normalizeToPascalCase('base_button')).toBe('BaseButton');
            expect(normalizeToPascalCase('my_custom_component')).toBe('MyCustomComponent');
        });

        it('handles already PascalCase', () => {
            expect(normalizeToPascalCase('Button')).toBe('Button');
        });
    });

    describe('normalizeToKebabCase', () => {
        it('converts PascalCase to kebab-case', () => {
            expect(normalizeToKebabCase('BaseButton')).toBe('base-button');
            expect(normalizeToKebabCase('MyCustomComponent')).toBe('my-custom-component');
        });

        it('converts snake_case to kebab-case', () => {
            expect(normalizeToKebabCase('base_button')).toBe('base-button');
        });

        it('handles already kebab-case', () => {
            expect(normalizeToKebabCase('base-button')).toBe('base-button');
        });
    });
});
