import { describe, it, expect } from 'vitest';
import { noDeepWatchRule } from '../../src/rules/vue/no-deep-watch.rule';
import { createContext } from '../helpers';

describe('no-deep-watch', () => {
    describe('Composition API', () => {
        it('detects watch with deep: true', async () => {
            const ctx = createContext(`
<script setup>
import { watch, ref } from 'vue';
const data = ref({});
watch(data, (val) => {}, { deep: true });
</script>
`);
            const issues = await noDeepWatchRule.check(ctx);
            expect(issues).toHaveLength(1);
            expect(issues[0].rule).toBe('no-deep-watch');
            expect(issues[0].suggestion).toContain('data');
        });

        it('detects watch with deep: true and other options', async () => {
            const ctx = createContext(`
<script setup>
import { watch, ref } from 'vue';
const state = ref({});
watch(state, (val) => {}, { immediate: true, deep: true });
</script>
`);
            const issues = await noDeepWatchRule.check(ctx);
            expect(issues).toHaveLength(1);
        });

        it('detects watch on member expression', async () => {
            const ctx = createContext(`
<script setup>
import { watch } from 'vue';
import { state } from './store';
watch(state.user, (val) => {}, { deep: true });
</script>
`);
            const issues = await noDeepWatchRule.check(ctx);
            expect(issues).toHaveLength(1);
            expect(issues[0].suggestion).toContain('state.user');
        });

        it('passes when deep is false', async () => {
            const ctx = createContext(`
<script setup>
import { watch, ref } from 'vue';
const data = ref({});
watch(data, (val) => {}, { deep: false });
</script>
`);
            const issues = await noDeepWatchRule.check(ctx);
            expect(issues).toHaveLength(0);
        });

        it('passes when no options arg', async () => {
            const ctx = createContext(`
<script setup>
import { watch, ref } from 'vue';
const data = ref({});
watch(data, (val) => {});
</script>
`);
            const issues = await noDeepWatchRule.check(ctx);
            expect(issues).toHaveLength(0);
        });
    });

    describe('Options API', () => {
        it('detects deep watch in options', async () => {
            const ctx = createContext(`
<script>
export default {
    watch: {
        todos: {
            handler(val) {},
            deep: true
        }
    }
}
</script>
`);
            const issues = await noDeepWatchRule.check(ctx);
            expect(issues).toHaveLength(1);
            expect(issues[0].suggestion).toContain('todos');
        });

        it('detects deep watch with string key', async () => {
            const ctx = createContext(`
<script>
export default {
    watch: {
        'user.name': {
            handler(val) {},
            deep: true
        }
    }
}
</script>
`);
            const issues = await noDeepWatchRule.check(ctx);
            expect(issues).toHaveLength(1);
        });

        it('passes shorthand watcher', async () => {
            const ctx = createContext(`
<script>
export default {
    watch: {
        todos(val) {}
    }
}
</script>
`);
            const issues = await noDeepWatchRule.check(ctx);
            expect(issues).toHaveLength(0);
        });

        it('ignores non-component watch objects', async () => {
            const ctx = createContext(`
<script>
const config = {
    watch: {
        something: { handler() {}, deep: true }
    }
};
</script>
`);
            const issues = await noDeepWatchRule.check(ctx);
            expect(issues).toHaveLength(0);
        });
    });
});
