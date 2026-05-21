import ora from 'ora';

import { scanProject } from '../../core/scanner';
import { runEngine } from '../../core/engine';
import { reporters } from '../../reporters'

export async function checkCommand(options: {
    reporter?: string
  }) {
    
    const spinner = ora('Scanning project...').start();

    try {
        const files = await scanProject();

        spinner.text = `Analyzing ${files.length} files...`;

        const issues = await runEngine(files);

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
