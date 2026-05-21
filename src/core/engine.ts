import { loadConfig } from './config';

import { rules } from '../rules';

import type { Issue } from '../types/issue';

import { parseVueFile } from './parser';

import { scanProject } from './scanner';
import { createFingerprint } from '../utils/fingerprint';

import { loadBaseline } from './baseline';
import { createHash } from '../utils/hash';
import { loadCache, saveCache } from './cache';

export async function runEngine(targetFiles?: string[]) {
    const config = await loadConfig();
    const issues: Issue[] = [];
    const files = await scanProject(targetFiles);
    const seen = new Set<string>();
    const baseline = loadBaseline();
    const cache = loadCache();

    for (const file of files) {
        const parsed = await parseVueFile(file);

        const source = parsed.source;

        const hash = createHash(source);

        const cached = cache[file];

        if (cached && cached.hash === hash) {
            issues.push(...cached.issues);

            continue;
        }
        const fileIssues: Issue[] = [];
        for (const rule of rules) {
            const findings = await rule.check({
                filePath: file,
                source,
                descriptor: parsed.descriptor,
                scriptAst: parsed.scriptAst,
            });

            const normalized = findings
                .map((issue) => {
                    const override = config.rules?.[issue.rule];

                    if (override === 'off') return null;

                    if (override) {
                        issue.severity = override;
                    }

                    issue.fingerprint = createFingerprint(issue);

                    if (seen.has(issue.fingerprint)) return null;
                    if (baseline.has(issue.fingerprint)) return null;

                    seen.add(issue.fingerprint);

                    return issue;
                })
                .filter(Boolean);
            cache[file] = {
                hash,
                issues: fileIssues,
            };
            fileIssues.push(...normalized);
        }
    }
    saveCache(cache);
    return issues;
}
