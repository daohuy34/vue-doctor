/**
 * Feature Boundary Tests
 *
 * Tests for feature detection and feature leakage detection.
 */

import { describe, it, expect } from 'vitest';
import {
    detectFeature,
    getFeatureName,
    isSameFeature,
    isPublicApi,
    isCrossFeatureImport,
    detectFeatureLeakage,
    DefaultFeaturePatterns,
} from '../../src/core/features';

describe('feature detection', () => {
    describe('detectFeature', () => {
        it('detects features from features/ directory', () => {
            const feature = detectFeature('src/features/auth/components/Login.vue');
            expect(feature?.name).toBe('auth');
            expect(feature?.path).toContain('auth');
        });

        it('detects features from modules/ directory', () => {
            const feature = detectFeature('src/modules/users/api.ts');
            expect(feature?.name).toBe('users');
        });

        it('detects features from domains/ directory', () => {
            const feature = detectFeature('domains/orders/services.ts');
            expect(feature?.name).toBe('orders');
        });

        it('returns null for non-feature paths', () => {
            expect(detectFeature('src/components/Button.vue')).toBeNull();
            expect(detectFeature('src/utils/helper.ts')).toBeNull();
        });

        it('ignores node_modules', () => {
            const feature = detectFeature('node_modules/vue/dist/vue.js');
            expect(feature).toBeNull();
        });

        it('handles Windows paths', () => {
            const feature = detectFeature('src\\features\\auth\\api.ts');
            expect(feature?.name).toBe('auth');
        });
    });

    describe('getFeatureName', () => {
        it('returns feature name', () => {
            expect(getFeatureName('features/cart/components/Cart.vue')).toBe('cart');
            expect(getFeatureName('src/components/Button.vue')).toBeNull();
        });
    });

    describe('isSameFeature', () => {
        it('detects same feature', () => {
            expect(isSameFeature(
                'features/auth/components/Login.vue',
                'features/auth/api/login.ts'
            )).toBe(true);
        });

        it('detects different features', () => {
            expect(isSameFeature(
                'features/auth/api/login.ts',
                'features/cart/api/cart.ts'
            )).toBe(false);
        });

        it('returns false for non-feature paths', () => {
            expect(isSameFeature(
                'src/components/Button.vue',
                'src/components/Modal.vue'
            )).toBe(false);
        });
    });

    describe('isPublicApi', () => {
        it('detects public API files', () => {
            expect(isPublicApi('features/auth/index.ts')).toBe(true);
            expect(isPublicApi('modules/users/public.ts')).toBe(true);
            expect(isPublicApi('features/auth/api.ts')).toBe(true);
        });

        it('detects non-public API files', () => {
            expect(isPublicApi('features/auth/components/Button.vue')).toBe(false);
            expect(isPublicApi('features/auth/api/internal.ts')).toBe(false);
        });
    });

    describe('isCrossFeatureImport', () => {
        it('detects cross-feature imports', () => {
            expect(isCrossFeatureImport(
                'features/auth/api/login.ts',
                '@/features/cart/api/cart'
            )).toBe(true);
        });

        it('allows same-feature imports', () => {
            expect(isCrossFeatureImport(
                'features/auth/api/login.ts',
                '@/features/auth/components/Login'
            )).toBe(false);
        });

        it('ignores non-feature targets', () => {
            expect(isCrossFeatureImport(
                'features/auth/api/login.ts',
                '@/components/Button'
            )).toBe(false);
        });
    });

    describe('detectFeatureLeakage', () => {
        it('detects feature leakage', () => {
            const leakage = detectFeatureLeakage(
                'features/auth/api/login.ts',
                '@/features/cart/api/internal'
            );

            expect(leakage).not.toBeNull();
            expect(leakage?.sourceFeature).toBe('auth');
            expect(leakage?.targetFeature).toBe('cart');
            expect(leakage?.isPublicApi).toBe(false);
        });

        it('allows public API imports', () => {
            const leakage = detectFeatureLeakage(
                'features/auth/api/login.ts',
                '@/features/cart/index.ts'
            );

            expect(leakage).not.toBeNull();
            expect(leakage?.isPublicApi).toBe(true);
        });

        it('allows relative imports', () => {
            const leakage = detectFeatureLeakage(
                'features/auth/components/Login.vue',
                '../api/login'
            );

            expect(leakage).toBeNull();
        });

        it('returns null for non-feature source', () => {
            const leakage = detectFeatureLeakage(
                'src/components/Button.vue',
                '@/features/cart'
            );

            expect(leakage).toBeNull();
        });
    });

    describe('DefaultFeaturePatterns', () => {
        it('contains expected patterns', () => {
            expect(DefaultFeaturePatterns).toContain('features/');
            expect(DefaultFeaturePatterns).toContain('modules/');
            expect(DefaultFeaturePatterns).toContain('domains/');
        });
    });
});
