/**
 * Architecture Diff
 *
 * Compares architecture metrics between commits/branches to detect
 * regressions introduced by PRs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { calculateArchitectureScore } from './score-engine';
import { loadMetricsHistory, saveMetricsSnapshot, type MetricsSnapshot } from './cache';

export interface DiffResult {
    timestamp: string;
    base: string;
    current: string;
    score: ScoreDiff;
    metrics: MetricsDiff;
    newIssues: DiffIssue[];
    resolvedIssues: DiffIssue[];
    newViolations: ViolationDiff[];
    recommendations: DiffRecommendation[];
}

export interface ScoreDiff {
    before: number;
    after: number;
    delta: number;
    percentChange: number;
    status: 'improved' | 'regressed' | 'unchanged';
}

export interface MetricsDiff {
    errors: { before: number; after: number; delta: number };
    warnings: { before: number; after: number; delta: number };
    hotspots: { before: number; after: number; delta: number };
    cycles: { before: number; after: number; delta: number };
    orphans: { before: number; after: number; delta: number };
}

export interface DiffIssue {
    file: string;
    rule: string;
    message: string;
    severity: string;
}

export interface ViolationDiff {
    file: string;
    rule: string;
    before: 'pass' | 'fail';
    after: 'pass' | 'fail';
    impact: 'critical' | 'high' | 'medium' | 'low';
}

export interface DiffRecommendation {
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    action: string;
}

const SCORE_THRESHOLD_REGRESSION = -3;
const SCORE_THRESHOLD_IMPROVEMENT = 3;

/**
 * Get architecture metrics at a specific git ref
 */
export async function getMetricsAtRef(ref: string): Promise<MetricsSnapshot | null> {
    try {
        // Save current state
        const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();

        // Stash any uncommitted changes
        const hasChanges = execSync('git status --porcelain', { encoding: 'utf-8' }).trim().length > 0;

        if (hasChanges) {
            execSync('git stash push -m "vue-doctor-diff-temp"', { encoding: 'utf-8' });
        }

        // Checkout the ref
        execSync(`git checkout ${ref}`, { encoding: 'utf-8' });

        // Run analysis
        const snapshot = await runAnalysis();

        // Go back to original branch
        execSync(`git checkout ${currentBranch}`, { encoding: 'utf-8' });

        // Restore stashed changes
        if (hasChanges) {
            execSync('git stash pop', { encoding: 'utf-8' });
        }

        return snapshot;
    } catch (error) {
        console.error(`Failed to get metrics at ref ${ref}:`, error);
        return null;
    }
}

/**
 * Run architecture analysis and return snapshot
 */
async function runAnalysis(): Promise<MetricsSnapshot> {
    // Import dynamically to avoid circular deps
    const { runEngine } = await import('./engine');
    const result = await runEngine();

    const errors = result.issues.filter(i => i.severity === 'error' || i.severity === 'critical').length;
    const warnings = result.issues.filter(i => i.severity === 'warning').length;
    const info = result.issues.filter(i => i.severity === 'info').length;

    // Calculate score (simplified)
    const totalIssues = errors + warnings;
    let score = 100;
    score -= Math.min(60, errors * 3);
    score -= Math.min(40, warnings * 0.5);

    return {
        timestamp: Date.now(),
        score: Math.max(0, score),
        errors,
        warnings,
        info,
    };
}

/**
 * Compare current state with a git ref
 */
export async function diffWithRef(baseRef: string): Promise<DiffResult> {
    console.log(`\n  Comparing current state with '${baseRef}'...\n`);

    // Get current metrics
    const currentSnapshot = await runAnalysis();

    // Get metrics at the base ref
    const baseSnapshot = await getMetricsAtRef(baseRef);

    if (!baseSnapshot) {
        throw new Error(`Could not analyze at ref '${baseRef}'. Make sure the ref exists.`);
    }

    // Get diff of issues between the two states
    const { newIssues, resolvedIssues } = await getIssueDiff(baseRef);

    // Get file-level violations diff
    const violations = await getViolationsDiff(baseRef);

    // Build result
    const result = buildDiffResult(baseSnapshot, currentSnapshot, newIssues, resolvedIssues, violations, baseRef);

    return result;
}

/**
 * Compare with previous scan from history
 */
export async function diffWithHistory(snapshotIndex?: number): Promise<DiffResult> {
    const history = loadMetricsHistory();

    if (history.length === 0) {
        throw new Error('No historical data found. Run `vue-doctor check` first to create a baseline.');
    }

    const baseSnapshot = snapshotIndex !== undefined
        ? history[snapshotIndex]
        : history[0]; // Oldest entry

    const currentSnapshot = await runAnalysis();

    const { newIssues, resolvedIssues } = [[], []]; // Skip issue diff for history

    const result = buildDiffResult(baseSnapshot, currentSnapshot, newIssues, resolvedIssues, [], 'history');

    return result;
}

/**
 * Build the diff result object
 */
function buildDiffResult(
    base: MetricsSnapshot,
    current: MetricsSnapshot,
    newIssues: DiffIssue[],
    resolved: DiffIssue[],
    violations: ViolationDiff[],
    baseRef: string
): DiffResult {
    // Calculate score diff
    const scoreDelta = current.score - base.score;
    const percentChange = base.score > 0 ? (scoreDelta / base.score) * 100 : 0;
    const status = scoreDelta >= SCORE_THRESHOLD_IMPROVEMENT ? 'improved'
        : scoreDelta <= SCORE_THRESHOLD_REGRESSION ? 'regressed'
        : 'unchanged';

    // Calculate metrics diff
    const metricsDiff: MetricsDiff = {
        errors: {
            before: base.errors,
            after: current.errors,
            delta: current.errors - base.errors,
        },
        warnings: {
            before: base.warnings,
            after: current.warnings,
            delta: current.warnings - base.warnings,
        },
        hotspots: { before: 0, after: 0, delta: 0 }, // TODO: calculate hotspots
        cycles: { before: 0, after: 0, delta: 0 }, // TODO: calculate cycles
        orphans: { before: 0, after: 0, delta: 0 }, // TODO: calculate orphans
    };

    // Generate recommendations
    const recommendations = generateRecommendations(scoreDelta, metricsDiff, violations);

    return {
        timestamp: new Date().toISOString(),
        base: baseRef,
        current: 'HEAD',
        score: {
            before: base.score,
            after: current.score,
            delta: scoreDelta,
            percentChange,
            status,
        },
        metrics: metricsDiff,
        newIssues,
        resolvedIssues,
        newViolations: violations,
        recommendations,
    };
}

/**
 * Get the diff of issues between current and a ref
 */
async function getIssueDiff(baseRef: string): Promise<{ newIssues: DiffIssue[]; resolvedIssues: DiffIssue[] }> {
    try {
        // Get list of changed files
        const changedFiles = execSync(`git diff ${baseRef} --name-only`, { encoding: 'utf-8' })
            .trim()
            .split('\n')
            .filter(f => f.length > 0);

        if (changedFiles.length === 0) {
            return { newIssues: [], resolvedIssues: [] };
        }

        // Get the issues for changed files
        const currentIssues = await getIssuesForFiles(changedFiles);
        const baseIssues = await getIssuesAtRefForFiles(baseRef, changedFiles);

        // Compare
        const baseFingerprints = new Set(baseIssues.map(i => `${i.file}:${i.rule}:${i.message}`));
        const currentFingerprints = new Set(currentIssues.map(i => `${i.file}:${i.rule}:${i.message}`));

        const newIssues = currentIssues.filter(
            i => !baseFingerprints.has(`${i.file}:${i.rule}:${i.message}`)
        );

        const resolvedIssues = baseIssues.filter(
            i => !currentFingerprints.has(`${i.file}:${i.rule}:${i.message}`)
        );

        return { newIssues, resolvedIssues };
    } catch {
        return { newIssues: [], resolvedIssues: [] };
    }
}

/**
 * Get violations diff between current and ref
 */
async function getViolationsDiff(baseRef: string): Promise<ViolationDiff[]> {
    // Simplified implementation - would need full analysis
    return [];
}

/**
 * Get issues for specific files
 */
async function getIssuesForFiles(files: string[]): Promise<DiffIssue[]> {
    const { runEngine } = await import('./engine');
    const result = await runEngine(files.length > 0 ? files : undefined);

    return result.issues.map(issue => ({
        file: issue.file,
        rule: issue.rule,
        message: issue.message,
        severity: issue.severity,
    }));
}

/**
 * Get issues at a git ref for specific files
 */
async function getIssuesAtRefForFiles(ref: string, files: string[]): Promise<DiffIssue[]> {
    try {
        // Save current state
        const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
        const hasChanges = execSync('git status --porcelain', { encoding: 'utf-8' }).trim().length > 0;

        if (hasChanges) {
            execSync('git stash push -m "vue-doctor-diff-temp"', { encoding: 'utf-8' });
        }

        execSync(`git checkout ${ref}`, { encoding: 'utf-8' });

        const { runEngine } = await import('./engine');
        const result = await runEngine(files);

        // Go back
        execSync(`git checkout ${currentBranch}`, { encoding: 'utf-8' });

        if (hasChanges) {
            execSync('git stash pop', { encoding: 'utf-8' });
        }

        return result.issues.map(issue => ({
            file: issue.file,
            rule: issue.rule,
            message: issue.message,
            severity: issue.severity,
        }));
    } catch {
        return [];
    }
}

/**
 * Generate recommendations based on diff
 */
function generateRecommendations(
    scoreDelta: number,
    metrics: MetricsDiff,
    violations: ViolationDiff[]
): DiffRecommendation[] {
    const recommendations: DiffRecommendation[] = [];

    if (scoreDelta <= SCORE_THRESHOLD_REGRESSION) {
        recommendations.push({
            priority: 'high',
            title: 'Architecture Score Regressed',
            description: `Score dropped by ${Math.abs(scoreDelta).toFixed(1)} points.`,
            action: 'Review new issues and prioritize fixing high-severity violations.',
        });
    }

    if (metrics.errors.delta > 0) {
        recommendations.push({
            priority: 'high',
            title: `${metrics.errors.delta} New Errors`,
            description: 'New error-level issues were introduced.',
            action: 'Fix all new errors before merging to prevent build failures.',
        });
    }

    if (metrics.warnings.delta > 10) {
        recommendations.push({
            priority: 'medium',
            title: `${metrics.warnings.delta} New Warnings`,
            description: 'A significant number of new warnings were introduced.',
            action: 'Review and address new warnings to maintain code quality.',
        });
    }

    const criticalViolations = violations.filter(v => v.impact === 'critical');
    if (criticalViolations.length > 0) {
        recommendations.push({
            priority: 'high',
            title: 'Critical Violations Introduced',
            description: `${criticalViolations.length} critical rule violations detected.`,
            action: 'Critical violations must be fixed before merging.',
        });
    }

    return recommendations;
}

/**
 * Format diff result for CLI output
 */
export function formatDiffResult(diff: DiffResult): string {
    const lines: string[] = [];

    lines.push('╔══════════════════════════════════════════════════════════════╗');
    lines.push('║              Architecture Diff Report                       ║');
    lines.push('╚══════════════════════════════════════════════════════════════╝');
    lines.push('');
    lines.push(`  Base:     ${diff.base}`);
    lines.push(`  Current:  ${diff.current}`);
    lines.push(`  Compared: ${new Date(diff.timestamp).toLocaleString()}`);
    lines.push('');

    // Score section
    lines.push('┌─────────────────────────────────────────────────────────────┐');
    lines.push('│  Architecture Score                                          │');
    lines.push('└─────────────────────────────────────────────────────────────┘');

    const scoreIcon = diff.score.status === 'improved' ? '🟢'
        : diff.score.status === 'regressed' ? '🔴'
        : '🟡';

    lines.push(`  ${scoreIcon} ${diff.score.status.toUpperCase()}`);
    lines.push(`     Before: ${diff.score.before.toFixed(1)}`);
    lines.push(`     After:  ${diff.score.after.toFixed(1)}`);
    lines.push(`     Delta:  ${diff.score.delta >= 0 ? '+' : ''}${diff.score.delta.toFixed(1)} (${diff.score.percentChange.toFixed(1)}%)`);
    lines.push('');

    // Metrics section
    lines.push('┌─────────────────────────────────────────────────────────────┐');
    lines.push('│  Metrics Changes                                             │');
    lines.push('└─────────────────────────────────────────────────────────────┘');

    const formatMetric = (label: string, m: { before: number; after: number; delta: number }) => {
        const deltaStr = m.delta >= 0 ? `+${m.delta}` : `${m.delta}`;
        const deltaColor = m.delta > 0 ? '🔴' : m.delta < 0 ? '🟢' : '⚪';
        lines.push(`  ${label}: ${m.before} → ${m.after} (${deltaColor} ${deltaStr})`);
    };

    formatMetric('Errors', diff.metrics.errors);
    formatMetric('Warnings', diff.metrics.warnings);
    lines.push('');

    // New issues
    if (diff.newIssues.length > 0) {
        lines.push('┌─────────────────────────────────────────────────────────────┐');
        lines.push(`│  🔴 New Issues (${diff.newIssues.length})                                       │`);
        lines.push('└─────────────────────────────────────────────────────────────┘');

        for (const issue of diff.newIssues.slice(0, 10)) {
            lines.push(`  ${issue.file.split('/').pop()}`);
            lines.push(`    ${issue.rule}: ${issue.message.slice(0, 60)}`);
        }

        if (diff.newIssues.length > 10) {
            lines.push(`  ... and ${diff.newIssues.length - 10} more`);
        }
        lines.push('');
    }

    // Resolved issues
    if (diff.resolvedIssues.length > 0) {
        lines.push('┌─────────────────────────────────────────────────────────────┐');
        lines.push(`│  🟢 Resolved Issues (${diff.resolvedIssues.length})                             │`);
        lines.push('└─────────────────────────────────────────────────────────────┘');

        for (const issue of diff.resolvedIssues.slice(0, 10)) {
            lines.push(`  ${issue.file.split('/').pop()}`);
            lines.push(`    ${issue.rule}: ${issue.message.slice(0, 60)}`);
        }

        if (diff.resolvedIssues.length > 10) {
            lines.push(`  ... and ${diff.resolvedIssues.length - 10} more`);
        }
        lines.push('');
    }

    // Recommendations
    if (diff.recommendations.length > 0) {
        lines.push('┌─────────────────────────────────────────────────────────────┐');
        lines.push('│  Recommendations                                             │');
        lines.push('└─────────────────────────────────────────────────────────────┘');

        for (const rec of diff.recommendations) {
            const icon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
            lines.push(`  ${icon} [${rec.priority.toUpperCase()}] ${rec.title}`);
            lines.push(`     ${rec.description}`);
            lines.push(`     → ${rec.action}`);
            lines.push('');
        }
    }

    lines.push('─'.repeat(62));
    lines.push(`  Run \`vue-doctor diff --base ${diff.base} --json\` for JSON output.`);
    lines.push('');

    return lines.join('\n');
}
