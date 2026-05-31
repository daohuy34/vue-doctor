/**
 * Layer System Tests
 *
 * Tests for layer detection and dependency validation.
 */

import { describe, it, expect } from 'vitest';
import {
    Layer,
    detectLayer,
    getLayerLevel,
    isValidLayerDependency,
    getLayerViolationDetails,
    getFilesInLayer,
    isForbiddenDependency,
    DefaultLayerHierarchy,
} from '../../src/core/layers';

describe('layer system', () => {
    describe('detectLayer', () => {
        it('detects UI layer from components', () => {
            expect(detectLayer('src/components/Button.vue')).toBe(Layer.UI);
            expect(detectLayer('pages/Dashboard.vue')).toBe(Layer.UI);
            expect(detectLayer('layouts/Default.vue')).toBe(Layer.UI);
            expect(detectLayer('views/About.vue')).toBe(Layer.UI);
        });

        it('detects Business layer', () => {
            expect(detectLayer('src/composables/useAuth.ts')).toBe(Layer.Business);
            expect(detectLayer('stores/user.ts')).toBe(Layer.Business);
            expect(detectLayer('hooks/useData.ts')).toBe(Layer.Business);
        });

        it('detects Service layer', () => {
            expect(detectLayer('src/services/api.ts')).toBe(Layer.Service);
            expect(detectLayer('api/client.ts')).toBe(Layer.Service);
            expect(detectLayer('adapters/payment.ts')).toBe(Layer.Service);
        });

        it('detects Utils layer', () => {
            expect(detectLayer('src/utils/format.ts')).toBe(Layer.Utils);
            expect(detectLayer('helpers/date.ts')).toBe(Layer.Utils);
            expect(detectLayer('formatters/price.ts')).toBe(Layer.Utils);
        });

        it('detects Types layer', () => {
            expect(detectLayer('types/index.ts')).toBe(Layer.Types);
            expect(detectLayer('interfaces/user.ts')).toBe(Layer.Types);
        });

        it('detects Config layer', () => {
            expect(detectLayer('config/app.ts')).toBe(Layer.Config);
            expect(detectLayer('configs/api.ts')).toBe(Layer.Config);
        });

        it('returns null for unknown paths', () => {
            expect(detectLayer('src/something/else.ts')).toBeNull();
        });

        it('handles Windows paths', () => {
            expect(detectLayer('src\\components\\Button.vue')).toBe(Layer.UI);
        });

        it('handles nested paths', () => {
            expect(detectLayer('src/components/ui/Button.vue')).toBe(Layer.UI);
            expect(detectLayer('src/composables/auth/useLogin.ts')).toBe(Layer.Business);
        });
    });

    describe('getLayerLevel', () => {
        it('returns correct levels', () => {
            expect(getLayerLevel(Layer.UI)).toBe(0);
            expect(getLayerLevel(Layer.Business)).toBe(1);
            expect(getLayerLevel(Layer.Service)).toBe(2);
            expect(getLayerLevel(Layer.Utils)).toBe(3);
            expect(getLayerLevel(Layer.Types)).toBe(4);
            expect(getLayerLevel(Layer.Config)).toBe(5);
        });
    });

    describe('isValidLayerDependency', () => {
        it('allows same layer dependencies', () => {
            expect(isValidLayerDependency(Layer.UI, Layer.UI)).toBe(true);
            expect(isValidLayerDependency(Layer.Business, Layer.Business)).toBe(true);
        });

        it('allows downward dependencies', () => {
            // UI can depend on Business
            expect(isValidLayerDependency(Layer.UI, Layer.Business)).toBe(true);
            // UI can depend on Utils
            expect(isValidLayerDependency(Layer.UI, Layer.Utils)).toBe(true);
            // Business can depend on Service
            expect(isValidLayerDependency(Layer.Business, Layer.Service)).toBe(true);
        });

        it('allows jumping multiple layers', () => {
            // UI can directly depend on Utils
            expect(isValidLayerDependency(Layer.UI, Layer.Utils)).toBe(true);
            // Business can directly depend on Types
            expect(isValidLayerDependency(Layer.Business, Layer.Types)).toBe(true);
        });

        it('prevents upward dependencies', () => {
            // Utils cannot depend on Business
            expect(isValidLayerDependency(Layer.Utils, Layer.Business)).toBe(false);
            // Types cannot depend on Service
            expect(isValidLayerDependency(Layer.Types, Layer.Service)).toBe(false);
            // Service cannot depend on UI
            expect(isValidLayerDependency(Layer.Service, Layer.UI)).toBe(false);
        });

        it('respects custom hierarchy', () => {
            const custom = [Layer.Business, Layer.UI, Layer.Utils];
            expect(isValidLayerDependency(Layer.UI, Layer.Business, custom)).toBe(false);
            expect(isValidLayerDependency(Layer.Business, Layer.UI, custom)).toBe(true);
        });
    });

    describe('getLayerViolationDetails', () => {
        it('returns no violation for valid dependency', () => {
            const result = getLayerViolationDetails(
                'src/components/Button.vue',
                'src/composables/useAuth.ts'
            );

            expect(result.isViolation).toBe(false);
            expect(result.fromLayer).toBe(Layer.UI);
            expect(result.toLayer).toBe(Layer.Business);
        });

        it('returns violation for invalid dependency', () => {
            const result = getLayerViolationDetails(
                'src/utils/helper.ts',
                'src/components/Button.vue'
            );

            expect(result.isViolation).toBe(true);
            expect(result.fromLayer).toBe(Layer.Utils);
            expect(result.toLayer).toBe(Layer.UI);
            expect(result.message).toBeDefined();
        });

        it('returns no violation for unknown layers', () => {
            const result = getLayerViolationDetails(
                'unknown/path/a.ts',
                'unknown/path/b.ts'
            );

            expect(result.isViolation).toBe(false);
            expect(result.fromLayer).toBeNull();
        });
    });

    describe('getFilesInLayer', () => {
        it('filters files by layer', () => {
            const files = [
                'src/components/Button.vue',
                'src/composables/useAuth.ts',
                'src/services/api.ts',
                'src/utils/format.ts',
                'src/components/Modal.vue',
            ];

            expect(getFilesInLayer(files, Layer.UI)).toHaveLength(2);
            expect(getFilesInLayer(files, Layer.Business)).toHaveLength(1);
            expect(getFilesInLayer(files, Layer.Service)).toHaveLength(1);
            expect(getFilesInLayer(files, Layer.Utils)).toHaveLength(1);
        });
    });

    describe('isForbiddenDependency', () => {
        it('detects forbidden dependencies', () => {
            const forbidden = [
                { from: 'ui', to: 'utils' },
                { from: 'business', to: 'ui' },
            ];

            expect(isForbiddenDependency(
                'src/components/Button.vue',
                'src/utils/helper.ts',
                forbidden
            )).toBe(true);

            expect(isForbiddenDependency(
                'src/composables/useAuth.ts',
                'src/components/Button.vue',
                forbidden
            )).toBe(true);
        });

        it('allows non-forbidden dependencies', () => {
            const forbidden = [
                { from: 'ui', to: 'utils' },
            ];

            expect(isForbiddenDependency(
                'src/composables/useAuth.ts',
                'src/utils/helper.ts',
                forbidden
            )).toBe(false);
        });
    });

    describe('DefaultLayerHierarchy', () => {
        it('is in correct order', () => {
            expect(DefaultLayerHierarchy).toEqual([
                Layer.UI,
                Layer.Business,
                Layer.Service,
                Layer.Utils,
                Layer.Types,
                Layer.Config,
            ]);
        });
    });
});
