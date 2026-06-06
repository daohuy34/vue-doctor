import { performance } from 'node:perf_hooks';

import { loadConfig } from './config';
import { parseVueFile } from './parser';
import { scanProject } from './scanner';
import { loadCache, saveCache } from './cache';

import { rules } from '../rules';
import { ruleMetadata } from '../rules/metadata';

import { createHash } from '../utils/hash';
import { createFingerprint } from '../utils/fingerprint';

import type { Issue } from '../types/issue';
import { loadBaseline } from './baseline';
import { normalizePlugins } from './plugins';

// Performance configuration
const PARALLEL_PARSE_BATCH_SIZE = 10;

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

/**
 * Parse files in parallel batches for better performance
 */
async function parseFilesParallel(
    files: string[],
    onProgress?: (current: number, total: number) => void
): Promise<Map<string, Awaited<ReturnType<typeof parseVueFile>>>> {
    const results = new Map<string, Awaited<ReturnType<typeof parseVueFile>>>();
    const total = files.length;

    for (let i = 0; i < total; i += PARALLEL_PARSE_BATCH_SIZE) {
        const batch = files.slice(i, i + PARALLEL_PARSE_BATCH_SIZE);
        const parsed = await Promise.all(batch.map(async (file) => {
            const result = await parseVueFile(file);
            onProgress?.(Math.min(i + PARALLEL_PARSE_BATCH_SIZE, total), total);
            return { file, result };
        }));

        for (const { file, result } of parsed) {
            results.set(file, result);
        }
    }

    return results;
}

/**
 * Run rules in parallel with optimized batching
 */
async function runRulesParallel(
    file: string,
    source: string,
    descriptor: any,
    scriptAst: unknown,
    scriptStartLine: number,
    allRules: any[],
    config: Awaited<ReturnType<typeof loadConfig>>,
    ruleTimings: Map<string, number>
): Promise<Issue[]> {
    // Split rules into batches for better parallelization
    const BATCH_SIZE = 8;
    const batches: any[][] = [];

    for (let i = 0; i < allRules.length; i += BATCH_SIZE) {
        batches.push(allRules.slice(i, i + BATCH_SIZE));
    }

    const batchResults = await Promise.all(
        batches.map(async (batch) => {
            return Promise.all(
                batch.map(async (rule) => {
                    const ruleStart = performance.now();

                    const result = await rule.check({
                        filePath: file,
                        source,
                        descriptor,
                        scriptAst,
                        scriptStartLine,
                        config: {
                            ruleOptions: config.ruleOptions,
                        },
                    });

                    const ruleEnd = performance.now();
                    ruleTimings.set(
                        rule.name,
                        (ruleTimings.get(rule.name) ?? 0) + (ruleEnd - ruleStart)
                    );

                    return result;
                })
            );
        })
    );

    return batchResults.flat().flat();
}

export async function runEngine(targetFiles?: string[], options: { incremental?: boolean } = {}) {
    const config = await loadConfig();

    const issues: Issue[] = [];

    const files = await scanProject(targetFiles);

    const seen = new Set<string>();

    const baseline = loadBaseline();

    const cache = loadCache();

    const start = performance.now();

    let cacheHits = 0;
    let cacheMisses = 0;

    const ruleTimings = new Map<string, number>();

    const allRules = [...rules, ...normalizePlugins(config.plugins)];

    // Parse all files in parallel for better performance
    const parseStart = performance.now();
    const parsedFiles = await parseFilesParallel(files);
    const parseDuration = ((performance.now() - parseStart) / 1000).toFixed(2);

    for (const file of files) {
        const parsed = parsedFiles.get(file)!;

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

        const findings = await runRulesParallel(
            file,
            source,
            parsed.descriptor,
            parsed.scriptAst,
            parsed.scriptStartLine,
            allRules,
            config,
            ruleTimings
        );

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

    // Find slowest rules for optimization hints
    const sortedTimings = [...ruleTimings.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const slowRules = sortedTimings
        .filter(([, time]) => time > 100)
        .map(([name, time]) => ({ name, time: `${(time / 1000).toFixed(2)}s` }));

    return {
        issues,

        metrics: {
            files: files.length,

            cacheHits,

            cacheMisses,

            parseDuration,

            duration: ((end - start) / 1000).toFixed(2),

            slowRules,

            ruleTimings: Object.fromEntries(
                [...ruleTimings.entries()].map(([rule, time]) => [
                    rule,
                    time.toFixed(2),
                ]),
            ),
        },
    };
}
