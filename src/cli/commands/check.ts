import ora from 'ora';

import { loadConfig } from '../../core/config';

import { runEngine } from '../../core/engine';
import { reporters } from '../../reporters';
import { getFailureExitCode, resolveFailOn } from '../check-utils';

import { getChangedFiles } from '../../utils/git';

export async function checkCommand(options: {
    changed?: boolean;
    reporter?: 'stylish' | 'json' | 'github';
    failOn?: 'info' | 'warning' | 'error' | 'critical';
}) {
    const config = await loadConfig();

    const spinner = ora('Scanning project...').start();

    let targetFiles: string[] | undefined;

    if (options.changed) {
        const changedFiles = getChangedFiles();

        if (changedFiles === null) {
            console.log('⚠ Git information unavailable; scanning the full project');
        } else {
            targetFiles = changedFiles;

            if (!targetFiles.length) {
                console.log('✔ No changed files found');

                process.exit(0);
            }
        }
    }

    try {
        const { issues, metrics } = await runEngine(targetFiles);

        spinner.text = `Analyzed ${metrics.files} files`;
        spinner.stop();

        const reporter =
            reporters[options.reporter as keyof typeof reporters] ??
            reporters.stylish;

        reporter(issues);

        console.log('\nPerformance:');

        console.log(`Files scanned: ${metrics.files}`);

        console.log(`Cache hits: ${metrics.cacheHits}`);

        console.log(`Cache misses: ${metrics.cacheMisses}`);

        console.log(`Time: ${metrics.duration}s`);

        const failOn = resolveFailOn(config, options.failOn);
        const exitCode = getFailureExitCode(issues, failOn);

        process.exit(exitCode);
    } catch (error) {
        spinner.fail('vue-doctor failed');

        console.error(error);

        process.exit(1);
    }
}
