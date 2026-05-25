#!/usr/bin/env node

import { cac } from 'cac';

import { checkCommand } from './commands/check';
import { fixCommand } from './commands/fix';

import { baselineCommand } from './commands/baseline';
import { rulesCommand } from './commands/rules';
import { ruleCommand } from './commands/rule';

const cli = cac('vue-doctor');

cli.command('check', 'Run project analysis')

    .option('--changed', 'Analyze changed files only')

    .option('--reporter <type>', 'Reporter type', {
        default: 'stylish',
    })

    .action(async (options) => {
        await checkCommand(options);
    });

cli.command('fix', 'Apply safe autofixes for supported rules')
    .option('--changed', 'Apply fixes only to changed files')
    .action(async (options) => {
        await fixCommand(options);
    });

cli.command('baseline', 'Generate baseline file').action(async () => {
    await baselineCommand();
});

cli.command('rules', 'List available rules').action(async () => {
    await rulesCommand();
});

cli.command('rule <name>', 'Show rule details').action(async (name) => {
    await ruleCommand(name);
});

cli.help();

cli.parse();
