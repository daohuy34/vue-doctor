import { noLargeComponentRule } from './vue/no-large-component.rule';
import { noLargeAssetRule } from './performance/no-large-asset.rule';
import { noWindowInSsrRule } from './nuxt/no-window-in-ssr.rule';
import { noDocumentInSsrRule } from './nuxt/no-document-in-ssr.rule';
import { noLocalStorageInSsrRule } from './nuxt/no-localstorage-in-ssr.rule';
import { noSessionStorageInSsrRule } from './nuxt/no-sessionstorage-in-ssr.rule';
import { pageComplexityRule } from './nuxt/page-complexity.rule';
import { asyncDataAbuseRule } from './nuxt/async-data-abuse.rule';
import { duplicateFetchRule } from './nuxt/duplicate-fetch.rule';
import { hydrationRiskRule } from './nuxt/hydration-risk.rule';
import { storeBloatRule } from './pinia/store-bloat.rule';
import { storeGodObjectRule } from './pinia/store-god-object.rule';
import { crossStoreDependencyRule } from './pinia/cross-store-dependency.rule';
import { circularStoreDependencyRule } from './pinia/circular-store-dependency.rule';
import { piniaBestPracticesRule } from './pinia/pinia-best-practices.rule';
import { noDeepWatchRule } from './vue/no-deep-watch.rule';
import { noConsoleRule } from './vue/no-console.rule';
import { noMutatePropsRule } from './vue/no-mutate-props.rule';
import { noVIfWithVForRule } from './vue/no-v-if-with-v-for.rule';
import { requireKeyInVForRule } from './vue/require-key-in-v-for.rule';
import { noSideEffectInComputedRule } from './vue/no-side-effect-in-computed.rule';
import { noUnusedComponentDataRule } from './vue/no-unused-component-data.rule';
import { noVHtmlRule } from './vue/no-v-html.rule';
import { noDebuggerRule } from './vue/no-debugger.rule';
import { noEmptyCatchRule } from './vue/no-empty-catch.rule';
import { excessivePropsRule } from './vue/excessive-props.rule';
import { excessiveWatchersRule } from './vue/excessive-watchers.rule';
import { excessiveComputedPropertiesRule } from './vue/excessive-computed-properties.rule';
import { noLargeTemplateRule } from './vue/no-large-template.rule';
import { excessiveDomDepthRule } from './vue/excessive-dom-depth.rule';
import { excessiveVForNestingRule } from './vue/excessive-v-for-nesting.rule';
import { aiMonsterComponentRule } from './vue/ai-monster-component.rule';
import { excessiveReactiveStateRule } from './vue/excessive-reactive-state.rule';
import { excessiveComponentResponsibilityRule } from './vue/excessive-component-responsibility.rule';
import { noCircularDependencyRule } from './architecture/no-circular-dependency.rule';
import { componentCouplingRule } from './architecture/component-coupling.rule';
import { composableCouplingRule } from './architecture/composable-coupling.rule';
import { storeCouplingRule } from './architecture/store-coupling.rule';
import { layerViolationRule } from './architecture/layer-violation.rule';
import { forbiddenDependencyRule } from './architecture/forbidden-dependency.rule';
import { featureLeakageRule } from './architecture/feature-leakage.rule';

export const rules = [
    noLargeComponentRule,
    noLargeAssetRule,
    noWindowInSsrRule,
    noDocumentInSsrRule,
    noLocalStorageInSsrRule,
    noSessionStorageInSsrRule,
    noDeepWatchRule,
    noConsoleRule,
    noMutatePropsRule,
    noVIfWithVForRule,
    requireKeyInVForRule,
    noSideEffectInComputedRule,
    noUnusedComponentDataRule,
    noVHtmlRule,
    noDebuggerRule,
    noEmptyCatchRule,
    excessivePropsRule,
    excessiveWatchersRule,
    excessiveComputedPropertiesRule,
    noLargeTemplateRule,
    excessiveDomDepthRule,
    excessiveVForNestingRule,
    aiMonsterComponentRule,
    excessiveReactiveStateRule,
    excessiveComponentResponsibilityRule,
    noCircularDependencyRule,
    componentCouplingRule,
    composableCouplingRule,
    storeCouplingRule,
    layerViolationRule,
    forbiddenDependencyRule,
    featureLeakageRule,
    pageComplexityRule,
    asyncDataAbuseRule,
    duplicateFetchRule,
    hydrationRiskRule,
    storeBloatRule,
    storeGodObjectRule,
    crossStoreDependencyRule,
    circularStoreDependencyRule,
    piniaBestPracticesRule,
];
