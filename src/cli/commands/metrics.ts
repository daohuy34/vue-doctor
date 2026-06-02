/**
 * Metrics Command
 *
 * Display architecture metrics and health scores.
 */

import { buildProjectContext } from '../../core/project';
import { calculateArchitectureScore, formatMetrics } from '../../core/metrics';
import { collectFiles } from '../../utils/file-collector';
import { getProfile, type RuleProfile } from '../../config/profiles';

export async function metricsCommand(options: {
    path?: string;
    json?: boolean;
    onlyScore?: boolean;
    profile?: string;
    format?: string;
}): Promise<void> {
    try {
        const projectPath = options.path ?? process.cwd();
        const files = await collectFiles({
            cwd: projectPath,
            include: ['**/*.vue', '**/*.ts'],
            exclude: ['node_modules/**', 'dist/**', 'build/**'],
        });

        if (files.length === 0) {
            console.log('No Vue files found.');
            return;
        }

        console.log(`Analyzing ${files.length} files...`);

        const context = await buildProjectContext(files);
        const metrics = calculateArchitectureScore(context);

        // Get profile if specified
        let profile: RuleProfile | undefined;
        if (options.profile) {
            profile = getProfile(options.profile);
            if (profile) {
                console.log(`Using profile: ${profile.name} (${profile.description})`);
            }
        }

        if (options.json || options.format === 'json') {
            console.log(JSON.stringify({ metrics, profile: profile?.name }, null, 2));
        } else if (options.onlyScore) {
            console.log(metrics.architectureScore);
        } else {
            console.log(formatMetrics(metrics));

            // Show problematic components
            const problems = metrics.componentHealth
                .filter((c) => c.score < 70)
                .sort((a, b) => a.score - b.score)
                .slice(0, 5);

            if (problems.length > 0) {
                console.log('\n  Top Issues:');
                for (const p of problems) {
                    console.log(`    • ${p.filePath}: ${p.score}/100`);
                    for (const issue of p.issues.slice(0, 2)) {
                        console.log(`      - ${issue}`);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error calculating metrics:', error);
        process.exit(1);
    }
}
