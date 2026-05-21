import ora from 'ora';

import { scanProject } from '../../core/scanner';
import { runEngine } from '../../core/engine';
import { reporters } from '../../reporters'

import { getChangedFiles } from '../../utils/git'

export async function checkCommand(options: {
    options: {
        reporter?: string
        changed?: boolean
    }
  }) {
    
    const spinner = ora('Scanning project...').start();

    let targetFiles: string[] | undefined

    if (options.changed) {
        targetFiles = getChangedFiles()
    }

    if (
        options.changed &&
        (!targetFiles || !targetFiles.length)
    ) {
        console.log(
            '✔ No changed files found'
        )

        process.exit(0)
    }

    try {
        const files = await scanProject();

        spinner.text = `Analyzing ${files.length} files...`;

        const issues = await runEngine(targetFiles)

        spinner.stop();

        const reporter =
        reporters[
            options.reporter as keyof typeof reporters
        ] ?? reporters.stylish

        reporter(issues)

        const hasWarnings = issues.some(
            (issue) => issue.severity === 'warning',
        );

        const hasErrors = issues.some((issue) => issue.severity === 'error');

        if (hasErrors) {
            process.exit(2);
        }

        if (hasWarnings) {
            process.exit(1);
        }

        process.exit(0);
    } catch (error) {
        spinner.fail('vue-doctor failed');

        console.error(error);

        process.exit(1);
    }
}
