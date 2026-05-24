import { noLargeComponentRule } from './vue/no-large-component.rule';
import { noWindowInSsrRule } from './nuxt/no-window-in-ssr.rule';
import { noDeepWatchRule } from './vue/no-deep-watch.rule';
import { noConsoleRule } from './vue/no-console.rule';
import { noMutatePropsRule } from './vue/no-mutate-props.rule';
import { noVIfWithVForRule } from './vue/no-v-if-with-v-for.rule';
import { requireKeyInVForRule } from './vue/require-key-in-v-for.rule';
import { noSideEffectInComputedRule } from './vue/no-side-effect-in-computed.rule';
import { noUnusedComponentDataRule } from './vue/no-unused-component-data.rule';
import { noVHtmlRule } from './vue/no-v-html.rule';

export const rules = [
    noLargeComponentRule,
    noWindowInSsrRule,
    noDeepWatchRule,
    noConsoleRule,
    noMutatePropsRule,
    noVIfWithVForRule,
    requireKeyInVForRule,
    noSideEffectInComputedRule,
    noUnusedComponentDataRule,
    noVHtmlRule,
];
