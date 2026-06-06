/**
 * Diff CLI Command
 *
 * Options:
 * --base <ref>     Compare with a git ref (branch, tag, commit)
 * --json           Output as JSON
 * --history        Compare with historical scan
 * --index <n>      Which historical entry to compare (0 = oldest)
 */

import {
    diffWithRef,
    diffWithHistory,
    formatDiffResult,
    type DiffResult,
} from '../../core/diff';

export interface DiffCommandOptions {
    base?: string;
    json?: boolean;
    history?: boolean;
    index?: number;
}

export async function diffCommand(options: DiffCommandOptions = {}) {
    const { base, json, history, index } = options;

    try {
        let result: DiffResult;

        if (base) {
            result = await diffWithRef(base);
        } else if (history) {
            result = await diffWithHistory(index);
        } else {
            // Default: compare with main/master
            try {
                result = await diffWithRef('main');
            } catch {
                try {
                    result = await diffWithRef('master');
                } catch {
                    throw new Error(
                        'No base specified. Use --base <ref> or --history to compare with previous scans.'
                    );
                }
            }
        }

        if (json) {
            console.log(JSON.stringify(result, null, 2));
        } else {
            console.log(formatDiffResult(result));
        }

        // Exit with error code if regressed
        if (result.score.status === 'regressed') {
            process.exit(1);
        }
    } catch (error) {
        if (json) {
            console.log(JSON.stringify({ error: (error as Error).message }, null, 2));
        } else {
            console.error(`\n  ❌ Error: ${(error as Error).message}\n`);
        }
        process.exit(1);
    }
}
