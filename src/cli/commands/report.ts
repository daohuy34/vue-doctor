/**
 * Report Command
 *
 * Generate comprehensive architecture reports with score tracking.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import { collectFiles } from '../../utils/file-collector';
import { buildProjectGraph } from '../../core/graph';
import {
    calculateArchitectureScoreV2,
    calculateArchitectureDebt,
    loadScoreHistory,
    addScoreToHistory,
    calculateScoreDelta,
    formatArchitectureScore,
    formatScoreDelta,
    type ArchitectureScore,
} from '../../core/score-engine';
import { analyzeFeatureBoundaries } from '../../core/feature-boundary';
import { loadConfig } from '../../core/config';
import { htmlReportCommand } from './html-report';

export interface ReportOptions {
    json?: boolean;
    history?: boolean;
    delta?: boolean;
    save?: boolean;
    html?: boolean;
    open?: boolean;
    output?: string;
}

export async function reportCommand(options: ReportOptions = {}) {
    // Handle HTML report
    if (options.html) {
        await htmlReportCommand({
            output: options.output,
            open: options.open,
        });
        return;
    }

    const cwd = process.cwd();

    console.log('Analyzing project architecture...');

    // Collect files
    const files = await collectFiles({
        cwd,
        include: ['**/*.vue', '**/*.ts'],
        exclude: ['node_modules/**', 'dist/**', 'build/**'],
    });

    if (files.length === 0) {
        console.log('No files found to analyze.');
        return;
    }

    console.log(`Analyzing ${files.length} files...`);

    // Build graph
    const sources = new Map<string, string>();
    for (const file of files) {
        try {
            const content = await fs.readFile(file, 'utf-8');
            sources.set(file, content);
        } catch {
            // Skip unreadable files
        }
    }

    const graph = buildProjectGraph(files, sources, cwd);

    // Load config for boundaries
    const config = await loadConfig();

    // Calculate scores
    let featureViolations: { severity: 'high' | 'medium' | 'low' }[] = [];
    if (config.boundaries && config.boundaries.length > 0) {
        const boundaryAnalysis = analyzeFeatureBoundaries(graph, config.boundaries);
        featureViolations = boundaryAnalysis.violations.map((v) => ({
            severity: v.severity as 'high' | 'medium' | 'low',
        }));
    }

    const score = calculateArchitectureScoreV2(graph, {
        featureViolations,
        ssrViolations: 0,
    });

    const debt = calculateArchitectureDebt(graph, { featureViolations });

    // Load previous score for delta
    let previousScore: ArchitectureScore | null = null;
    try {
        const history = await loadScoreHistory(cwd);
        if (history.entries.length > 0) {
            const lastEntry = history.entries[history.entries.length - 1];
            previousScore = {
                overall: lastEntry.overall,
                architecture: lastEntry.architecture,
                maintainability: lastEntry.maintainability,
                performance: lastEntry.performance,
                ssrSafety: lastEntry.ssrSafety,
                deductions: {
                    circularDep: { critical: 0, high: 0, medium: 0, total: 0 },
                    featureLeakage: { high: 0, medium: 0, total: 0 },
                    hotspots: { critical: 0, high: 0, total: 0 },
                    orphans: 0,
                    smells: { critical: 0, warning: 0, total: 0 },
                },
                details: {
                    circularDepCount: 0,
                    featureLeakageCount: 0,
                    hotspotCount: 0,
                    orphanCount: 0,
                    criticalFiles: [],
                },
            };
        }
    } catch {
        // No previous score
    }

    // Output based on options
    if (options.json) {
        console.log(
            JSON.stringify(
                {
                    score,
                    debt,
                    graph: {
                        nodes: graph.nodes.length,
                        edges: graph.edges.length,
                    },
                    timestamp: new Date().toISOString(),
                },
                null,
                2,
            ),
        );
        return;
    }

    // Print score report
    console.log(formatArchitectureScore(score));

    // Print debt
    console.log('   Architecture Debt:');
    console.log('   ─────────────────────────────────────────────────────────');
    console.log(`   Total estimated: ${debt.total} hours`);
    if (debt.breakdown.circularDep > 0) {
        console.log(`   Circular dependencies: ${debt.breakdown.circularDep}h`);
    }
    if (debt.breakdown.featureLeakage > 0) {
        console.log(`   Feature leakage: ${debt.breakdown.featureLeakage}h`);
    }
    if (debt.breakdown.orphans > 0) {
        console.log(`   Orphans: ${debt.breakdown.orphans}h`);
    }
    console.log('');

    // Print delta if available
    if (previousScore && options.delta) {
        const delta = calculateScoreDelta(previousScore, score);
        console.log(formatScoreDelta(delta));
    } else if (previousScore) {
        const delta = previousScore.overall - score.overall;
        if (delta > 0) {
            console.log(`   📈 Previous score: ${previousScore.overall} (current: ${score.overall})`);
        } else if (delta < 0) {
            console.log(`   📉 Previous score: ${previousScore.overall} (current: ${score.overall})`);
        }
        console.log(`   Use --delta to see detailed changes`);
    }

    // Save to history
    if (options.save !== false) {
        await addScoreToHistory(score, cwd);
        console.log('   Score saved to .vue-doctor-history.json');
    }

    console.log('');
}
