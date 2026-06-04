/**
 * Metrics Command
 *
 * Display architecture metrics and health scores.
 */

import fs from 'node:fs/promises';
import { buildProjectContext } from '../../core/project';
import { calculateArchitectureScore, formatMetrics } from '../../core/metrics';
import { collectFiles } from '../../utils/file-collector';
import { getProfile, type RuleProfile } from '../../config/profiles';
import { runEngine } from '../../core/engine';
import { buildProjectGraph } from '../../core/graph';
import {
    analyzeFeatureBoundaries,
    formatBoundaryViolations,
    analyzeRouteComplexity,
    formatRouteComplexity,
    calculateBoundaryCoupling,
    formatCouplingAnalysis,
} from '../../core/feature-boundary';
import { loadConfig } from '../../core/config';
import { getSharedModules } from '../../core/graph';

export async function metricsCommand(options: {
    path?: string;
    json?: boolean;
    onlyScore?: boolean;
    profile?: string;
    format?: string;
    boundaries?: boolean;
    routes?: boolean;
    shared?: boolean;
    coupling?: boolean;
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

        // Run engine to get issues
        const profileName = options.profile || 'recommended';
        const profile = getProfile(profileName);
        if (profile) {
            console.log(`Using profile: ${profile.name} (${profile.description})`);
        }

        const engineResult = await runEngine(files);

        // Count issues by severity
        const issues = {
            errors: engineResult.issues.filter((i) => i.severity === 'error').length,
            warnings: engineResult.issues.filter((i) => i.severity === 'warning').length,
            info: engineResult.issues.filter((i) => i.severity === 'info').length,
        };

        const metrics = calculateArchitectureScore(context, { issues });

        // Build graph for additional analysis
        const sources = new Map<string, string>();
        for (const file of files) {
            try {
                const content = await fs.readFile(file, 'utf-8');
                sources.set(file, content);
            } catch {
                // Skip unreadable files
            }
        }
        const graph = buildProjectGraph(files, sources, projectPath);

        // Load config for boundaries
        const config = await loadConfig();

        // Handle special analysis modes
        if (options.boundaries || options.format === 'boundaries') {
            if (!config.boundaries || config.boundaries.length === 0) {
                console.log('\n⚠ No boundaries configured.');
                console.log('Add boundaries to your vue-doctor.config.ts:');
                console.log(`
export default {
  boundaries: [
    { name: 'feature-a', pattern: 'src/features/a/**' },
    { name: 'feature-b', pattern: 'src/features/b/**' },
  ]
}`);
                return;
            }

            const boundaryAnalysis = analyzeFeatureBoundaries(graph, config.boundaries);
            console.log('\n' + formatBoundaryViolations(boundaryAnalysis));
            return;
        }

        if (options.routes || options.format === 'routes') {
            const routeAnalysis = analyzeRouteComplexity(graph, sources);
            console.log('\n' + formatRouteComplexity(routeAnalysis));
            return;
        }

        if (options.shared || options.format === 'shared') {
            const threshold = config.sharedModuleThreshold || 50;
            const sharedModules = getSharedModules(graph, threshold);

            console.log('\nShared Module Analysis');
            console.log('═'.repeat(60));

            if (sharedModules.length === 0) {
                console.log('No over-shared modules found.');
            } else {
                console.log(`Modules imported by ${threshold}+ files:`);
                console.log('');
                for (const module of sharedModules.slice(0, 10)) {
                    const fileName = module.filePath.split('/').pop();
                    console.log(`  ${fileName} - Fan-In: ${module.fanIn}`);
                }
            }
            return;
        }

        if (options.coupling || options.format === 'coupling') {
            if (!config.boundaries || config.boundaries.length === 0) {
                console.log('\n⚠ No boundaries configured.');
                console.log('Add boundaries to vue-doctor.config.js to see coupling analysis.');
                return;
            }

            const couplings = calculateBoundaryCoupling(graph, config.boundaries);
            console.log('\n' + formatCouplingAnalysis(couplings));
            return;
        }

        if (options.json || options.format === 'json') {
            console.log(
                JSON.stringify(
                    {
                        metrics,
                        profile: profile?.name,
                        graph: {
                            nodes: graph.nodes.length,
                            edges: graph.edges.length,
                        },
                    },
                    null,
                    2,
                ),
            );
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

            // Show architecture section
            console.log('\n╔════════════════════════════════════════════════════════════╗');
            console.log('║               Architecture Analysis                      ║');
            console.log('╚════════════════════════════════════════════════════════════╝');

            console.log(`\n  📊 Graph Statistics:`);
            console.log(`     Nodes: ${graph.nodes.length}`);
            console.log(`     Edges: ${graph.edges.length}`);

            // Check for boundaries
            if (config.boundaries && config.boundaries.length > 0) {
                const boundaryAnalysis = analyzeFeatureBoundaries(graph, config.boundaries);
                console.log(`\n  🏛️  Feature Boundaries:`);
                console.log(`     Configured: ${config.boundaries.length}`);
                console.log(`     Violations: ${boundaryAnalysis.summary.totalViolations}`);

                if (boundaryAnalysis.summary.totalViolations > 0) {
                    console.log(`\n     Run 'vue-doctor metrics --boundaries' for details`);
                }
            }

            // Show route complexity if pages exist
            const pages = graph.nodes.filter((n) => n.type === 'page');
            if (pages.length > 0) {
                console.log(`\n  📄 Route Complexity:`);
                console.log(`     Pages: ${pages.length}`);
                const routeAnalysis = analyzeRouteComplexity(graph, sources);
                const complexRoutes = routeAnalysis.filter((r) => r.score > 50);
                console.log(`     Complex routes (>50): ${complexRoutes.length}`);
                console.log(`\n     Run 'vue-doctor metrics --routes' for details`);
            }
        }
    } catch (error) {
        console.error('Error calculating metrics:', error);
        process.exit(1);
    }
}
