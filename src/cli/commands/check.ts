import ora from 'ora';

import { loadConfig } from '../../core/config';

import { scanProject } from '../../core/scanner';
import { runEngine } from '../../core/engine';
import { reporters } from '../../reporters';

import { getChangedFiles } from '../../utils/git';

export async function checkCommand(options: {
    changed: any;
    reporter: 'stylish' | 'json' | 'github';
    options: {
        reporter?: string;
        changed?: boolean;
    };
}) {
    const config = await loadConfig();

    const spinner = ora('Scanning project...').start();

    let targetFiles: string[] | undefined;

    if (options.changed) {
        targetFiles = getChangedFiles();
    }

    if (options.changed && (!targetFiles || !targetFiles.length)) {
        console.log('✔ No changed files found');

        process.exit(0);
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

        const hasWarnings = issues.some(
            (issue) => issue.severity === 'warning',
        );

        const hasErrors = issues.some((issue) => issue.severity === 'error');

        if (hasErrors) {
            process.exit(2);
        }

        if (config.failOnWarning !== false && hasWarnings) {
            process.exit(1);
        }

        process.exit(0);
    } catch (error) {
        spinner.fail('vue-doctor failed');

        console.error(error);

        process.exit(1);
    }
}
