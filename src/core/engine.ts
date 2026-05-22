import { performance } from 'node:perf_hooks';

import { loadConfig } from './config';
import { parseVueFile } from './parser';
import { scanProject } from './scanner';
import { loadCache, saveCache } from './cache';

import { rules } from '../rules';

import { createHash } from '../utils/hash';
import { createFingerprint } from '../utils/fingerprint';

import type { Issue } from '../types/issue';
import { loadBaseline } from './baseline';
import { normalizePlugins } from './plugins';

export async function runEngine(targetFiles?: string[]) {
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

    for (const file of files) {
        const parsed = await parseVueFile(file);

        const source = parsed.source;

        const hash = createHash(source);

        const cached = cache[file];

        if (cached && cached.hash === hash) {
            cacheHits++;

            issues.push(...cached.issues);

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
                const override = config.rules?.[issue.rule];

                if (override === 'off') {
                    return null;
                }

                if (override === 'warning' || override === 'error') {
                    issue.severity = override;
                }

                issue.fingerprint = createFingerprint(issue);

                if (seen.has(issue.fingerprint)) {
                    return null;
                }

                if (baseline.has(issue.fingerprint)) {
                    return null;
                }

                seen.add(issue.fingerprint);

                return issue;
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
    };
}
