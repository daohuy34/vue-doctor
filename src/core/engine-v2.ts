import { performance } from 'node:perf_hooks';

import { loadConfig } from './config';
import { parseVueFile } from './parser';
import { scanProject } from '../utils/file-collector';
import { loadCache, saveCache } from './cache';

import { rules } from '../rules';
import { ruleMetadata } from '../rules/metadata';

import { createHash } from '../utils/hash';
import { createFingerprint } from '../utils/fingerprint';

import type { Issue } from '../types/issue';
import { loadBaseline } from './baseline';
import { normalizePlugins } from './plugins';

import {
    buildProjectContext,
    type ProjectContext,
    getProjectStats,
} from './project';

import {
    buildComposableGraph,
    getComposablesByKind,
} from './composable-graph';

import {
    buildStoreGraph,
    getStoreStats,
} from './store-graph';

export interface EngineOptions {
    enableProjectContext?: boolean;
    enableGraphAnalysis?: boolean;
}

function attachCategory(issue: Issue): Issue {
    const metadata = ruleMetadata.find((entry) => entry.name === issue.rule);

    if (metadata) {
        issue.category = metadata.category;
    }

    return issue;
}

function applyConfigOverrides(issue: Issue, config: Awaited<ReturnType<typeof loadConfig>>) {
    const override = config.rules?.[issue.rule];

    if (override === 'off') {
        return null;
    }

    if (override === 'warning' || override === 'error' || override === 'critical') {
        issue.severity = override;
    }

    attachCategory(issue);

    return issue;
}

export async function buildContext(files: string[]): Promise<ProjectContext> {
    return await buildProjectContext(files);
}

export async function runEngineWithContext(
    files: string[],
    options: EngineOptions = {}
): Promise<{
    issues: Issue[];
    metrics: {
        files: number;
        cacheHits: number;
        cacheMisses: number;
        duration: string;
        ruleTimings: Record<string, string>;
    };
    context?: ProjectContext;
    graphStats?: {
        composables: { total: number; composition: number; options: number };
        stores: { total: number; pinia: number; vuex: number; other: number };
    };
}> {
    const config = await loadConfig();
    const issues: Issue[] = [];

    let context: ProjectContext | undefined;
    let composableGraph;
    let storeGraph;

    if (options.enableProjectContext) {
        const contextBuildStart = performance.now();
        context = await buildProjectContext(files);
        composableGraph = await buildComposableGraph(files, context.files);
        storeGraph = await buildStoreGraph(files, context.files);
    }

    const seen = new Set<string>();
    const baseline = loadBaseline();
    const cache = loadCache();

    const start = performance.now();

    let cacheHits = 0;
    let cacheMisses = 0;

    const ruleTimings = new Map<string, number>();

    const allRules = [...rules, ...normalizePlugins(config.plugins)];

    for (const file of files) {
        let parsed;
        try {
            parsed = await parseVueFile(file);
        } catch {
            continue;
        }

        const source = parsed.source;

        const hash = createHash(source);

        const cached = cache[file];

        if (cached && cached.hash === hash) {
            cacheHits++;

            const cachedIssues = (cached.issues as Issue[] | undefined) ?? [];

            issues.push(
                ...cachedIssues
                    .map((issue) => applyConfigOverrides(issue, config) ?? null)
                    .filter((issue): issue is Issue => issue !== null),
            );

            continue;
        }

        cacheMisses++;

        const results = await Promise.all(
            allRules.map(async (rule) => {
                const ruleStart = performance.now();

                const result = await rule.check({
                    filePath: file,
                    source,
                    descriptor: parsed.descriptor,
                    scriptAst: parsed.scriptAst,
                    config: {
                        ruleOptions: config.ruleOptions,
                    },
                });

                const ruleEnd = performance.now();

                ruleTimings.set(
                    rule.name,
                    (ruleTimings.get(rule.name) ?? 0) + (ruleEnd - ruleStart),
                );

                return result;
            }),
        );

        const findings = results.flat();

        const fileIssues = findings
            .map((issue) => {
                const normalized = applyConfigOverrides(issue, config);

                if (!normalized) {
                    return null;
                }

                normalized.fingerprint = createFingerprint(normalized);

                if (seen.has(normalized.fingerprint)) {
                    return null;
                }

                if (baseline.has(normalized.fingerprint)) {
                    return null;
                }

                seen.add(normalized.fingerprint);

                return normalized;
            })
            .filter((issue): issue is Issue => issue !== null);

        cache[file] = {
            hash,
            issues: fileIssues,
        };

        issues.push(...fileIssues);
    }

    saveCache(cache);

    const end = performance.now();

    const graphStats = options.enableGraphAnalysis && composableGraph && storeGraph ? {
        composables: {
            total: composableGraph.composables.size,
            composition: getComposablesByKind(composableGraph, 'composition').length,
            options: getComposablesByKind(composableGraph, 'options').length,
        },
        stores: getStoreStats(storeGraph),
    } : undefined;

    return {
        issues,
        metrics: {
            files: files.length,
            cacheHits,
            cacheMisses,
            duration: ((end - start) / 1000).toFixed(2),
            ruleTimings: Object.fromEntries(
                [...ruleTimings.entries()].map(([rule, time]) => [
                    rule,
                    time.toFixed(2),
                ]),
            ),
        },
        context,
        graphStats,
    };
}

export { runEngineWithContext as runEngine };
