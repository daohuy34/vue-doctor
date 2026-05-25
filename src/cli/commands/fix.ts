import fs from 'node:fs';

import { scanProject } from '../../core/scanner';
import { parseVueFile } from '../../core/parser';
import { loadConfig } from '../../core/config';
import { getChangedFiles } from '../../utils/git';
import { applyFixes } from '../../utils/fix';
import { rules } from '../../rules';
import type { RuleContext } from '../../types/context';
import type { Issue } from '../../types/issue';

export async function fixCommand(options: {
    changed?: boolean;
}) {
    const config = await loadConfig();

    const targetFiles = options.changed
        ? getChangedFiles()
        : await scanProject();

    if (!targetFiles.length) {
        console.log('✔ No files found');

        return;
    }

    const ruleMap = new Map(rules.map((rule) => [rule.name, rule]));

    let modifiedFiles = 0;

    for (const file of targetFiles) {
        const parsed = await parseVueFile(file);

        const context: RuleContext = {
            filePath: file,
            source: parsed.source,
            descriptor: parsed.descriptor,
            scriptAst: parsed.scriptAst,
            config: {
                ruleOptions: config.ruleOptions,
            },
        };

        const issues = (await Promise.all(rules.map((rule) => rule.check(context)))).flat();
        const seenLines = new Set<number>();
        const replacements = [];

        for (const issue of issues) {
            if (!issue.line || seenLines.has(issue.line)) {
                continue;
            }

            const rule = ruleMap.get(issue.rule);

            if (!rule?.fix) {
                continue;
            }

            const fix = await rule.fix(context, issue as Issue);

            if (!fix) {
                continue;
            }

            seenLines.add(issue.line);
            replacements.push(...fix.replacements);
        }

        if (!replacements.length) {
            continue;
        }

        const nextSource = applyFixes(parsed.source, replacements);

        if (nextSource !== parsed.source) {
            fs.writeFileSync(file, nextSource);
            modifiedFiles++;
        }
    }

    console.log(`✔ Applied fixes to ${modifiedFiles} file(s)`);
}
