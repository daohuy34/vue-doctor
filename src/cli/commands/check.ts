import ora from 'ora';

import { loadConfig } from '../../core/config';

import { runEngine } from '../../core/engine';
import { reporters } from '../../reporters';
import { getFailureExitCode, resolveFailOn } from '../check-utils';
import { resolvePlugins } from '../../core/plugins';

import { getChangedFiles, getFilesSinceRef } from '../../utils/git';
import { getCachedScore, saveMetricsSnapshot, loadCache } from '../../core/cache';

export async function checkCommand(options: {
    changed?: boolean;
    since?: string;
    cacheOnly?: boolean;
    reporter?: 'stylish' | 'json' | 'github';
    failOn?: 'info' | 'warning' | 'error' | 'critical';
}) {
    const config = await loadConfig();

    const { runner } = await resolvePlugins(config.plugins ?? []);

    if (options.cacheOnly) {
        const cachedScore = getCachedScore();

        if (cachedScore) {
            console.log('Using cached results:');
            console.log(`  Score: ${cachedScore.score}/100`);
            console.log(`  Errors: ${cachedScore.errors}`);
            console.log(`  Warnings: ${cachedScore.warnings}`);
            console.log(`  Timestamp: ${new Date(cachedScore.timestamp).toISOString()}`);

            const failOn = resolveFailOn(config, options.failOn);
            let exitCode = 0;
            const total = cachedScore.errors + cachedScore.warnings + cachedScore.info;

            if (failOn === 'error' && cachedScore.errors > 0) exitCode = 1;
            else if (failOn === 'warning' && (cachedScore.errors > 0 || cachedScore.warnings > 0)) exitCode = 1;
            else if (failOn === 'info' && total > 0) exitCode = 1;

            process.exit(exitCode);
        } else {
            console.log('No cached results available. Run without --cache-only first.');
            process.exit(1);
        }
    }

    const spinner = ora('Scanning project...').start();

    let targetFiles: string[] | undefined;

    if (options.changed || options.since) {
        let changedFiles: string[] | null = null;

        if (options.since) {
            changedFiles = getFilesSinceRef(options.since);
        } else {
            changedFiles = getChangedFiles();
        }

        if (changedFiles === null) {
            console.log('⚠ Git information unavailable; scanning the full project');
        } else {
            targetFiles = changedFiles;

            if (!targetFiles.length) {
                console.log('✔ No changed files found');

                process.exit(0);
            }

            spinner.text = `Analyzing ${targetFiles.length} changed file(s)`;
        }
    }

    try {
        await runner.runHook('before:analysis');

        const { issues, metrics } = await runEngine(targetFiles);

        spinner.text = `Analyzed ${metrics.files} files`;
        spinner.stop();

        const issuesWithPluginContext = await runner.runHook('after:analysis', {
            issues,
        });

        const reportIssues = issuesWithPluginContext.issues;

        const errors = reportIssues.filter((i) => i.severity === 'error').length;
        const warnings = reportIssues.filter((i) => i.severity === 'warning').length;
        const info = reportIssues.filter((i) => i.severity === 'info').length;

        const cache = loadCache();
        const totalIssues = reportIssues.length;

        let score = 100;
        score -= Math.min(40, errors * 2);
        score -= Math.min(30, warnings * 0.5);
        score -= Math.min(10, info * 0.2);

        saveMetricsSnapshot({
            timestamp: Date.now(),
            score: Math.max(0, score),
            errors,
            warnings,
            info,
        });

        const reporter =
            reporters[options.reporter as keyof typeof reporters] ??
            reporters.stylish;

        reporter(reportIssues);

        console.log('\nPerformance:');

        console.log(`Files scanned: ${metrics.files}`);

        console.log(`Cache hits: ${metrics.cacheHits}`);

        console.log(`Cache misses: ${metrics.cacheMisses}`);

        console.log(`Time: ${metrics.duration}s`);

        const failOn = resolveFailOn(config, options.failOn);
        const exitCode = getFailureExitCode(reportIssues, failOn);

        process.exit(exitCode);
    } catch (error) {
        spinner.fail('vue-doctor failed');

        console.error(error);

        process.exit(1);
    }
}
