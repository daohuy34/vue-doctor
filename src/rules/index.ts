import { noLargeComponentRule } from './vue/no-large-component.rule';
import { noWindowInSsrRule } from './nuxt/no-window-in-ssr.rule';
import { noDeepWatchRule } from './vue/no-deep-watch.rule';
import { noConsoleRule } from './vue/no-console.rule';

export const rules = [
    noLargeComponentRule,
    noWindowInSsrRule,
    noDeepWatchRule,
    noConsoleRule,
];
