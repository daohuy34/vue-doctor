import { loadConfig } from './config';

import { rules } from '../rules';

import type { Issue } from '../types/issue';

import { parseVueFile } from './parser';

import { scanProject } from './scanner'
import { createFingerprint } from '../utils/fingerprint';

export async function runEngine(targetFiles?: string[]) {
    const config = await loadConfig();
    const issues: Issue[] = [];
    const files = await scanProject(targetFiles)
    for (const file of files) {
        const parsed = await parseVueFile(file);

        const source = parsed.source;

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

                    if (override === 'off') {
                        return null;
                    }

                    if (override) {
                        issue.severity = override;
                    }

                    issue.fingerprint = createFingerprint(issue)

                    return issue;
                })
                .filter(Boolean);

            issues.push(...normalized);
        }
    }

    return issues;
}
