/**
 * Nuxt Detection Tests
 *
 * Tests for Nuxt framework detection utilities.
 */

import { describe, it, expect } from 'vitest';
import { DefaultNuxtDirectories } from '../../src/core/nuxt';

describe('Nuxt detection', () => {
    describe('DefaultNuxtDirectories', () => {
        it('has all required directories', () => {
            expect(DefaultNuxtDirectories.pages).toBe('pages');
            expect(DefaultNuxtDirectories.layouts).toBe('layouts');
            expect(DefaultNuxtDirectories.components).toBe('components');
            expect(DefaultNuxtDirectories.composables).toBe('composables');
            expect(DefaultNuxtDirectories.server).toBe('server');
        });

        it('has correct structure', () => {
            expect(typeof DefaultNuxtDirectories.pages).toBe('string');
            expect(typeof DefaultNuxtDirectories.components).toBe('string');
        });
    });
});
