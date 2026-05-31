import { describe, it, expect } from 'vitest';
import { parse as parseSFC } from '@vue/compiler-sfc';
import {
    trackComponentUsage,
    normalizeComponentName,
    isLikelyComponent,
    findUnusedComponents,
    type ComponentUsageMap,
} from '../../src/utils/component-usage-tracker';

describe('normalizeComponentName', () => {
    it('should normalize to lowercase', () => {
        expect(normalizeComponentName('MyComponent')).toBe('mycomponent');
        expect(normalizeComponentName('BASE-CARD')).toBe('base-card');
    });

    it('should handle namespaced components', () => {
        expect(normalizeComponentName('Base:Button')).toBe('base:button');
    });
});

describe('isLikelyComponent', () => {
    it('should detect PascalCase names as components', () => {
        expect(isLikelyComponent('MyComponent')).toBe(true);
        expect(isLikelyComponent('UserCard')).toBe(true);
    });

    it('should detect kebab-case names as components', () => {
        expect(isLikelyComponent('my-component')).toBe(true);
        expect(isLikelyComponent('base-button')).toBe(true);
    });

    it('should return false for HTML elements', () => {
        expect(isLikelyComponent('div')).toBe(false);
        expect(isLikelyComponent('span')).toBe(false);
        expect(isLikelyComponent('button')).toBe(false);
        expect(isLikelyComponent('input')).toBe(false);
    });

    it('should return false for Vue built-in components', () => {
        expect(isLikelyComponent('router-link')).toBe(false);
        expect(isLikelyComponent('nuxt-link')).toBe(false);
        expect(isLikelyComponent('slot')).toBe(false);
        expect(isLikelyComponent('teleport')).toBe(false);
    });
});

describe('trackComponentUsage', () => {
    it('should track basic component usage', () => {
        const source = `
            <template>
                <BaseCard>
                    <UserProfile />
                </BaseCard>
            </template>
        `;
        const { descriptor } = parseSFC(source);
        const result = trackComponentUsage(descriptor as any);

        expect(result.allTags.has('basecard')).toBe(true);
        expect(result.allTags.has('userprofile')).toBe(true);
        expect(result.usages.get('basecard')).toHaveLength(1);
        expect(result.usages.get('userprofile')).toHaveLength(1);
    });

    it('should track components with v-for', () => {
        const source = `
            <template>
                <TodoItem v-for="todo in todos" :key="todo.id" :todo="todo" />
            </template>
        `;
        const { descriptor } = parseSFC(source);
        const result = trackComponentUsage(descriptor as any);

        const usage = result.usages.get('todoitem');
        expect(usage).toBeDefined();
        expect(usage?.[0].hasVFor).toBe(true);
    });

    it('should track components with v-if', () => {
        const source = `
            <template>
                <Modal v-if="isOpen">
                    <ConfirmDialog v-else />
                </Modal>
            </template>
        `;
        const { descriptor } = parseSFC(source);
        const result = trackComponentUsage(descriptor as any);

        const modalUsage = result.usages.get('modal');
        expect(modalUsage?.[0].hasVIf).toBe(true);

        const dialogUsage = result.usages.get('confirmdialog');
        expect(dialogUsage?.[0].hasVIf).toBe(true);
    });

    it('should track components with v-model', () => {
        const source = `
            <template>
                <SearchInput v-model="query" />
            </template>
        `;
        const { descriptor } = parseSFC(source);
        const result = trackComponentUsage(descriptor as any);

        const usage = result.usages.get('searchinput');
        expect(usage?.[0].hasVModel).toBe(true);
    });

    it('should track nested components', () => {
        const source = `
            <template>
                <div>
                    <BaseCard>
                        <UserProfile>
                            <Avatar />
                        </UserProfile>
                    </BaseCard>
                </div>
            </template>
        `;
        const { descriptor } = parseSFC(source);
        const result = trackComponentUsage(descriptor as any);

        expect(result.allTags.has('div')).toBe(false); // HTML element
        expect(result.allTags.has('basecard')).toBe(true);
        expect(result.allTags.has('userprofile')).toBe(true);
        expect(result.allTags.has('avatar')).toBe(true);
    });

    it('should handle components with hyphens and capitals', () => {
        const source = `
            <template>
                <base-card>
                    <User-Profile />
                </base-card>
            </template>
        `;
        const { descriptor } = parseSFC(source);
        const result = trackComponentUsage(descriptor as any);

        expect(result.allTags.has('base-card')).toBe(true);
        expect(result.allTags.has('user-profile')).toBe(true);
    });

    it('should return empty result for empty template', () => {
        const source = `
            <template></template>
        `;
        const { descriptor } = parseSFC(source);
        const result = trackComponentUsage(descriptor as any);

        expect(result.usages.size).toBe(0);
        expect(result.allTags.size).toBe(0);
    });

    it('should return empty result for no template', () => {
        const source = `<script>export default {}</script>`;
        const { descriptor } = parseSFC(source);
        const result = trackComponentUsage(descriptor as any);

        expect(result.usages.size).toBe(0);
    });
});

describe('findUnusedComponents', () => {
    it('should find imported components that are not used', () => {
        const source = `
            <template>
                <UsedComponent />
            </template>
        `;
        const { descriptor } = parseSFC(source);

        const importedComponents = new Map([
            ['UsedComponent', '/path/to/UsedComponent.vue'],
            ['UnusedComponent', '/path/to/UnusedComponent.vue'],
        ]);

        const descriptors = new Map([['/path/to/Test.vue', descriptor as any]]);

        const unused = findUnusedComponents(importedComponents, descriptors);

        expect(unused.size).toBe(1);
        expect(unused.has('UnusedComponent')).toBe(true);
        expect(unused.has('UsedComponent')).toBe(false);
    });

    it('should handle component used with different casing', () => {
        const source = `
            <template>
                <used-component />
            </template>
        `;
        const { descriptor } = parseSFC(source);

        const importedComponents = new Map([
            ['UsedComponent', '/path/to/UsedComponent.vue'],
        ]);

        const descriptors = new Map([['/path/to/Test.vue', descriptor as any]]);

        const unused = findUnusedComponents(importedComponents, descriptors);

        expect(unused.size).toBe(0);
    });
});
