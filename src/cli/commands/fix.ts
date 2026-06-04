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
    dry?: boolean;
}) {
    const config = await loadConfig();

    const targetFiles = options.changed
        ? getChangedFiles() ?? (await scanProject())
        : await scanProject();

    if (!targetFiles.length) {
        console.log('✔ No files found');

        return;
    }

    const ruleMap = new Map(rules.map((rule) => [rule.name, rule]));

    let modifiedFiles = 0;
    let fixableIssues = 0;

    for (const file of targetFiles) {
        const parsed = await parseVueFile(file);

        const context: RuleContext = {
            filePath: file,
            source: parsed.source,
            descriptor: parsed.descriptor,
            scriptAst: parsed.scriptAst,
            scriptStartLine: 0,
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

            fixableIssues++;
            seenLines.add(issue.line);

            const fix = await rule.fix(context, issue as Issue);

            if (!fix) {
                continue;
            }

            replacements.push(...fix.replacements);
        }

        if (!replacements.length) {
            continue;
        }

        const nextSource = applyFixes(parsed.source, replacements);

        if (nextSource !== parsed.source) {
            if (!options.dry) {
                fs.writeFileSync(file, nextSource);
            }
            modifiedFiles++;

            if (options.dry) {
                console.log(`📝 [DRY] Would fix: ${file}`);
            }
        }
    }

    if (options.dry) {
        console.log(`📝 [DRY] Preview mode - no files were modified`);
        console.log(`   Fixable issues: ${fixableIssues}`);
        console.log(`   Files to modify: ${modifiedFiles}`);
    } else {
        console.log(`✔ Applied fixes to ${modifiedFiles} file(s)`);
    }
}
