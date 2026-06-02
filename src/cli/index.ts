#!/usr/bin/env node

import { cac } from 'cac';

import { checkCommand } from './commands/check';
import { fixCommand } from './commands/fix';
import { metricsCommand } from './commands/metrics';
import { baselineCommand } from './commands/baseline';
import { graphCommand } from './commands/graph';
import { rulesCommand } from './commands/rules';
import { ruleCommand } from './commands/rule';
import { dashboardCommand } from './commands/dashboard';
import { trendCommand } from './commands/trend';

const cli = cac('vue-doctor');

cli.command('check', 'Run project analysis')

    .option('--changed', 'Analyze changed files only')

    .option('--since <ref>', 'Analyze files changed since a commit/date/ref')

    .option('--cache-only', 'Use cached results only (for CI)')

    .option('--reporter <type>', 'Reporter type', {
        default: 'stylish',
    })

    .option('--fail-on <severity>', 'Minimum severity that should fail the command')

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

// Graph command with options
cli.command('graph', 'Inspect project dependency graph')
    .option('--type <kind>', 'Filter by node type: page, component, store, composable, all', {
        default: 'all',
    })
    .option('--depth <n>', 'Maximum depth to traverse')
    .option('--format <fmt>', 'Output format: text, tree, json, stats', {
        default: 'text',
    })
    .option('--filter <pattern>', 'Filter by file path pattern (regex)')
    .action(async (options) => {
        await graphCommand(options);
    });

cli.command('rules', 'List available rules').action(async () => {
    await rulesCommand();
});

cli.command('rule <name>', 'Show rule details').action(async (name) => {
    await ruleCommand(name);
});

cli.command('metrics', 'Show architecture metrics and health scores')
    .option('--profile <name>', 'Rule profile: strict, recommended, minimal', {
        default: 'recommended',
    })
    .option('--format <type>', 'Output format: text, json, html', {
        default: 'text',
    })
    .action(async (options) => {
        await metricsCommand(options);
    });

cli.command('dashboard', 'Start interactive web dashboard')
    .option('--port <number>', 'Port to run dashboard on', {
        default: 3000,
    })
    .action(async (options) => {
        await dashboardCommand(options);
    });

cli.command('trend', 'Show metrics trends over time')
    .option('--since <date>', 'Show trends since date')
    .option('--format <type>', 'Output format: text, json, chart', {
        default: 'text',
    })
    .action(async (options) => {
        await trendCommand(options);
    });

cli.help();

cli.parse();
