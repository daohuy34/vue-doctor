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
import { nuxtCommand } from './commands/nuxt';
import { reportCommand } from './commands/report';
import { smellCommand } from './commands/smell';
import { initCommand } from './commands/init';
import { assetCommand } from './commands/asset';
import { bundleCommand } from './commands/bundle';
import { viewerCommand } from './commands/viewer';
import { diffCommand } from './commands/diff';

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
    .option('--dry', 'Preview changes without modifying files')
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
    .option('--format <fmt>', 'Output format: text, tree, json, stats, hotspots, cycles, orphans', {
        default: 'text',
    })
    .option('--filter <pattern>', 'Filter by file path pattern (regex)')
    .option('--hotspots', 'Show top hotspots')
    .option('--cycles', 'Show circular dependencies')
    .option('--orphans', 'Show orphan nodes')
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
    .option('--format <type>', 'Output format: text, json, html, boundaries, routes, shared, coupling', {
        default: 'text',
    })
    .option('--boundaries', 'Show feature boundary violations')
    .option('--routes', 'Show route complexity analysis')
    .option('--shared', 'Show shared module analysis')
    .option('--coupling', 'Show feature coupling analysis')
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

cli.command('nuxt', 'Analyze Nuxt-specific patterns')
    .option('--async', 'Analyze async data fetching patterns')
    .option('--hydration', 'Analyze hydration risks')
    .option('--apis', 'Analyze API usage patterns')
    .option('--format <type>', 'Output format: text, json', {
        default: 'text',
    })
    .action(async (options) => {
        await nuxtCommand(options);
    });

cli.command('report', 'Generate architecture score report')
    .option('--json', 'Output as JSON')
    .option('--html', 'Generate HTML report')
    .option('--open', 'Open HTML report in browser')
    .option('--output <file>', 'Output file for HTML report')
    .option('--history', 'Show score history')
    .option('--delta', 'Show score delta from previous scan')
    .option('--no-save', 'Do not save to history')
    .action(async (options) => {
        await reportCommand(options);
    });

cli.command('smell', 'Detect architecture smells')
    .option('--json', 'Output as JSON')
    .option('--only <type>', 'Only detect specific smell: god-component, god-composable, smart-component, service-layer, drift')
    .action(async (options) => {
        await smellCommand(options);
    });

cli.command('init', 'Initialize Vue Doctor in a project')
    .option('--force', 'Force reinitialize even if config exists')
    .option('--type <type>', 'Project type: vue3, nuxt3, auto')
    .option('--ci', 'Generate GitHub Actions workflow')
    .action(async (options) => {
        await initCommand(options);
    });

cli.command('asset', 'Analyze static assets (images, SVGs, fonts)')
    .option('--json', 'Output as JSON')
    .option('--threshold <kb>', 'Maximum size in KB before warning', {
        default: 50,
    })
    .option('--dirs <dirs>', 'Directories to scan (comma-separated)')
    .action(async (options) => {
        await assetCommand({
            json: options.json,
            threshold: options.threshold,
            directories: options.dirs?.split(','),
        });
    });

cli.command('bundle', 'Analyze bundle size and dependencies')
    .option('--json', 'Output as JSON')
    .option('--html', 'Generate interactive HTML report')
    .option('--open', 'Open report in browser')
    .option('--output <file>', 'Output file path')
    .action(async (options) => {
        await bundleCommand(options);
    });

cli.command('viewer', 'Start interactive graph viewer')
    .option('--port <number>', 'Port to run viewer on', {
        default: 3456,
    })
    .option('--open', 'Open browser automatically')
    .option('--type <kind>', 'Filter by node type: page, component, store, composable, all', {
        default: 'all',
    })
    .action(async (options) => {
        await viewerCommand(options);
    });

cli.command('diff', 'Compare architecture metrics between commits/branches')
    .option('--base <ref>', 'Git ref to compare with (branch, tag, commit)')
    .option('--json', 'Output as JSON')
    .option('--history', 'Compare with historical scan')
    .option('--index <n>', 'Historical entry index (0 = oldest)', {
        default: 0,
    })
    .action(async (options) => {
        await diffCommand(options);
    });

cli.help();

cli.parse();
