/**
 * Architecture Score Engine
 *
 * Implements the transparent Architecture Score Formula from Phase 8 spec.
 * Score = Base (100) - Deductions
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { ProjectGraph, GraphNode } from './graph';
import { findCircularDependencies, getHotspots } from './graph';

export interface ArchitectureScore {
    overall: number;
    architecture: number;
    maintainability: number;
    performance: number;
    ssrSafety: number;
    deductions: ScoreDeductions;
    details: ScoreDetails;
}

export interface ScoreDeductions {
    circularDep: {
        critical: number;
        high: number;
        medium: number;
        total: number;
    };
    featureLeakage: {
        high: number;
        medium: number;
        total: number;
    };
    hotspots: {
        critical: number;
        high: number;
        total: number;
    };
    orphans: number;
    smells: {
        critical: number;
        warning: number;
        total: number;
    };
}

export interface ScoreDetails {
    circularDepCount: number;
    featureLeakageCount: number;
    hotspotCount: number;
    orphanCount: number;
    criticalFiles: string[];
}

export interface ArchitectureDebt {
    total: number;
    breakdown: {
        circularDep: number;
        featureLeakage: number;
        orphans: number;
        other: number;
    };
    estimatedHours: number;
}

export interface ScoreHistoryEntry {
    date: string;
    overall: number;
    architecture: number;
    maintainability: number;
    performance: number;
    ssrSafety: number;
}

export interface ScoreHistory {
    entries: ScoreHistoryEntry[];
    lastUpdated: string;
}

export interface ScoreDelta {
    previous: ArchitectureScore;
    current: ArchitectureScore;
    delta: {
        overall: number;
        architecture: number;
        maintainability: number;
        performance: number;
        ssrSafety: number;
    };
    improved: DeltaItem[];
    regressed: DeltaItem[];
}

export interface DeltaItem {
    metric: string;
    delta: number;
    description: string;
}

// Default thresholds
const HOTSPOT_CRITICAL_THRESHOLD = 80;
const HOTSPOT_HIGH_THRESHOLD = 60;
const ORPHAN_PENALTY = 0.5;

/**
 * Calculate Architecture Score based on Phase 8 spec
 *
 * Base Score: 100
 * Deductions:
 *   - Circular dependency (critical)   -8  per cycle
 *   - Circular dependency (high)       -5  per cycle
 *   - Circular dependency (medium)     -2  per cycle
 *   - Feature leakage (high)           -4  per violation
 *   - Feature leakage (medium)         -2  per violation
 *   - Hotspot (score > 80)            -3  per file
 *   - Hotspot (score > 60)            -1  per file
 *   - Orphan component                 -0.5 per file
 *   - Architecture smell (critical)    -5  per smell
 *   - Architecture smell (warning)     -2  per smell
 *
 * Floor: 0
 */
export function calculateArchitectureScoreV2(
    graph: ProjectGraph,
    options: {
        circularDeps?: { severity: 'critical' | 'high' | 'medium' | 'low'; nodes: string[] }[];
        featureViolations?: { severity: 'high' | 'medium' | 'low' }[];
        ssrViolations?: number;
        hydrationScore?: number;
    } = {},
): ArchitectureScore {
    const deductions: ScoreDeductions = {
        circularDep: { critical: 0, high: 0, medium: 0, total: 0 },
        featureLeakage: { high: 0, medium: 0, total: 0 },
        hotspots: { critical: 0, high: 0, total: 0 },
        orphans: 0,
        smells: { critical: 0, warning: 0, total: 0 },
    };

    const details: ScoreDetails = {
        circularDepCount: 0,
        featureLeakageCount: 0,
        hotspotCount: 0,
        orphanCount: 0,
        criticalFiles: [],
    };

    // Calculate circular dependency deductions
    const cycles = findCircularDependencies(graph);
    details.circularDepCount = cycles.length;

    for (const cycle of cycles) {
        switch (cycle.severity) {
            case 'critical':
                deductions.circularDep.critical += 8;
                break;
            case 'high':
                deductions.circularDep.high += 5;
                break;
            case 'medium':
                deductions.circularDep.medium += 2;
                break;
        }
    }
    deductions.circularDep.total =
        deductions.circularDep.critical +
        deductions.circularDep.high +
        deductions.circularDep.medium;

    // Calculate feature leakage deductions
    if (options.featureViolations) {
        details.featureLeakageCount = options.featureViolations.length;

        for (const v of options.featureViolations) {
            if (v.severity === 'high') {
                deductions.featureLeakage.high += 4;
            } else if (v.severity === 'medium') {
                deductions.featureLeakage.medium += 2;
            }
        }
        deductions.featureLeakage.total =
            deductions.featureLeakage.high + deductions.featureLeakage.medium;
    }

    // Calculate hotspot deductions
    const hotspots = getHotspots(graph, 100);
    details.hotspotCount = hotspots.filter((h) => h.score > HOTSPOT_HIGH_THRESHOLD).length;

    for (const hotspot of hotspots) {
        if (hotspot.score > HOTSPOT_CRITICAL_THRESHOLD) {
            deductions.hotspots.critical += 3;
            details.criticalFiles.push(hotspot.node.filePath);
        } else if (hotspot.score > HOTSPOT_HIGH_THRESHOLD) {
            deductions.hotspots.high += 1;
        }
    }
    deductions.hotspots.total = deductions.hotspots.critical + deductions.hotspots.high;

    // Calculate orphan deductions
    const orphanNodes = graph.nodes.filter((n) => {
        const isImported = graph.edges.some((e) => e.to === n.filePath);
        if (isImported) return false;
        // Exclude auto-loaded types
        if (['page', 'layout', 'middleware', 'plugin'].includes(n.type)) return false;
        return true;
    });
    details.orphanCount = orphanNodes.length;
    deductions.orphans = orphanNodes.length * ORPHAN_PENALTY;

    // Calculate smell deductions from options or default
    const smells = options.ssrViolations || 0;
    deductions.smells.critical = smells * 5;
    deductions.smells.total = deductions.smells.critical + deductions.smells.warning;

    // Calculate category scores
    const baseScore = 100;

    // Architecture Score (circular deps, feature leakage)
    const archDeductions =
        deductions.circularDep.total + deductions.featureLeakage.total;
    const architecture = Math.max(0, baseScore - archDeductions);

    // Maintainability Score (hotspots, orphans, smells)
    const maintDeductions =
        deductions.hotspots.total + Math.round(deductions.orphans) + deductions.smells.total;
    const maintainability = Math.max(0, baseScore - maintDeductions);

    // Performance Score (simplified - could be enhanced with actual perf metrics)
    const performance = Math.max(0, baseScore - Math.floor(deductions.hotspots.high / 2));

    // SSR Safety Score
    const ssrBase = 100;
    const ssrDeductions = options.hydrationScore
        ? Math.floor(options.hydrationScore / 10)
        : deductions.smells.critical;
    const ssrSafety = Math.max(0, ssrBase - ssrDeductions);

    // Overall Score (weighted average)
    const overall = Math.round(
        architecture * 0.3 +
            maintainability * 0.3 +
            performance * 0.2 +
            ssrSafety * 0.2
    );

    return {
        overall: Math.min(100, Math.max(0, overall)),
        architecture: Math.min(100, Math.max(0, architecture)),
        maintainability: Math.min(100, Math.max(0, maintainability)),
        performance: Math.min(100, Math.max(0, performance)),
        ssrSafety: Math.min(100, Math.max(0, ssrSafety)),
        deductions,
        details,
    };
}

/**
 * Calculate Architecture Debt
 */
export function calculateArchitectureDebt(
    graph: ProjectGraph,
    options: {
        circularDeps?: { severity: string; length: number }[];
        featureViolations?: { severity: string }[];
    } = {},
): ArchitectureDebt {
    let total = 0;
    const breakdown = {
        circularDep: 0,
        featureLeakage: 0,
        orphans: 0,
        other: 0,
    };

    // Circular dependency debt
    const cycles = findCircularDependencies(graph);
    for (const cycle of cycles) {
        let hours = 0;
        if (cycle.severity === 'critical') hours = 8;
        else if (cycle.severity === 'high') hours = 4;
        else if (cycle.severity === 'medium') hours = 2;
        else hours = 1;

        breakdown.circularDep += hours;
        total += hours;
    }

    // Feature leakage debt
    if (options.featureViolations) {
        for (const v of options.featureViolations) {
            breakdown.featureLeakage += 1; // 1h per violation
            total += 1;
        }
    }

    // Orphan debt
    const orphans = graph.nodes.filter((n) => {
        const isImported = graph.edges.some((e) => e.to === n.filePath);
        if (isImported) return false;
        return !['page', 'layout', 'middleware', 'plugin'].includes(n.type);
    });
    breakdown.orphans = orphans.length * 0.5;
    total += breakdown.orphans;

    return {
        total: Math.round(total),
        breakdown,
        estimatedHours: Math.round(total),
    };
}

/**
 * Load score history from file
 */
export async function loadScoreHistory(cwd: string = process.cwd()): Promise<ScoreHistory> {
    const historyPath = path.join(cwd, '.vue-doctor-history.json');

    try {
        const content = await fs.readFile(historyPath, 'utf-8');
        return JSON.parse(content);
    } catch {
        return { entries: [], lastUpdated: new Date().toISOString() };
    }
}

/**
 * Save score history to file
 */
export async function saveScoreHistory(
    history: ScoreHistory,
    cwd: string = process.cwd(),
): Promise<void> {
    const historyPath = path.join(cwd, '.vue-doctor-history.json');

    // Keep only last 90 entries
    if (history.entries.length > 90) {
        history.entries = history.entries.slice(-90);
    }

    history.lastUpdated = new Date().toISOString();

    await fs.writeFile(historyPath, JSON.stringify(history, null, 2));
}

/**
 * Add new score to history
 */
export async function addScoreToHistory(
    score: ArchitectureScore,
    cwd: string = process.cwd(),
): Promise<ScoreHistory> {
    const history = await loadScoreHistory(cwd);

    const entry: ScoreHistoryEntry = {
        date: new Date().toISOString().split('T')[0],
        overall: score.overall,
        architecture: score.architecture,
        maintainability: score.maintainability,
        performance: score.performance,
        ssrSafety: score.ssrSafety,
    };

    // Only add if it's a different day or different score
    const lastEntry = history.entries[history.entries.length - 1];
    if (!lastEntry || lastEntry.date !== entry.date || lastEntry.overall !== entry.overall) {
        history.entries.push(entry);
    }

    await saveScoreHistory(history, cwd);
    return history;
}

/**
 * Calculate score delta between two scores
 */
export function calculateScoreDelta(
    previous: ArchitectureScore,
    current: ArchitectureScore,
): ScoreDelta {
    const delta = {
        overall: current.overall - previous.overall,
        architecture: current.architecture - previous.architecture,
        maintainability: current.maintainability - previous.maintainability,
        performance: current.performance - previous.performance,
        ssrSafety: current.ssrSafety - previous.ssrSafety,
    };

    const improved: DeltaItem[] = [];
    const regressed: DeltaItem[] = [];

    // Check for improvements
    if (delta.overall > 0) {
        improved.push({
            metric: 'Overall',
            delta: delta.overall,
            description: `Score improved by ${delta.overall} points`,
        });
    } else if (delta.overall < 0) {
        regressed.push({
            metric: 'Overall',
            delta: delta.overall,
            description: `Score decreased by ${Math.abs(delta.overall)} points`,
        });
    }

    // Check circular deps
    const prevCycles = previous.details.circularDepCount;
    const currCycles = current.details.circularDepCount;
    if (currCycles < prevCycles) {
        improved.push({
            metric: 'Circular Dependencies',
            delta: prevCycles - currCycles,
            description: `Fixed ${prevCycles - currCycles} circular dependencies`,
        });
    } else if (currCycles > prevCycles) {
        regressed.push({
            metric: 'Circular Dependencies',
            delta: currCycles - prevCycles,
            description: `${currCycles - prevCycles} new circular dependencies detected`,
        });
    }

    // Check hotspots
    const prevHotspots = previous.details.hotspotCount;
    const currHotspots = current.details.hotspotCount;
    if (currHotspots < prevHotspots) {
        improved.push({
            metric: 'Hotspots',
            delta: prevHotspots - currHotspots,
            description: `Resolved ${prevHotspots - currHotspots} hotspots`,
        });
    }

    return { previous, current, delta, improved, regressed };
}

/**
 * Format score for CLI output
 */
export function formatArchitectureScore(score: ArchitectureScore): string {
    const lines: string[] = [];

    lines.push('');
    lines.push('╔═══════════════════════════════════════════════════════════════╗');
    lines.push('║                 Architecture Score Report                   ║');
    lines.push('╚═══════════════════════════════════════════════════════════════╝');
    lines.push('');

    // Overall score with large display
    lines.push(`   Overall Score: ${score.overall}/100  ${getScoreEmoji(score.overall)}`);
    lines.push('');

    // Category scores
    lines.push('   Category Scores:');
    lines.push('   ─────────────────────────────────────────────────────────');
    lines.push(`   Architecture      ${score.architecture.toString().padStart(3)}/100  ${getScoreBar(score.architecture)}`);
    lines.push(`   Maintainability  ${score.maintainability.toString().padStart(3)}/100  ${getScoreBar(score.maintainability)}`);
    lines.push(`   Performance      ${score.performance.toString().padStart(3)}/100  ${getScoreBar(score.performance)}`);
    lines.push(`   SSR Safety       ${score.ssrSafety.toString().padStart(3)}/100  ${getScoreBar(score.ssrSafety)}`);
    lines.push('');

    // Deductions
    lines.push('   Deductions:');
    lines.push('   ─────────────────────────────────────────────────────────');

    if (score.deductions.circularDep.total > 0) {
        lines.push(`   Circular Dependencies: -${score.deductions.circularDep.total}`);
        if (score.deductions.circularDep.critical > 0) {
            lines.push(`     Critical (${score.deductions.circularDep.critical / 8}): -${score.deductions.circularDep.critical}`);
        }
        if (score.deductions.circularDep.high > 0) {
            lines.push(`     High (${score.deductions.circularDep.high / 5}): -${score.deductions.circularDep.high}`);
        }
        if (score.deductions.circularDep.medium > 0) {
            lines.push(`     Medium (${score.deductions.circularDep.medium / 2}): -${score.deductions.circularDep.medium}`);
        }
    }

    if (score.deductions.featureLeakage.total > 0) {
        lines.push(`   Feature Leakage: -${score.deductions.featureLeakage.total}`);
    }

    if (score.deductions.hotspots.total > 0) {
        lines.push(`   Hotspots: -${score.deductions.hotspots.total}`);
    }

    if (score.deductions.orphans > 0) {
        lines.push(`   Orphans: -${score.deductions.orphans}`);
    }

    if (score.deductions.smells.total > 0) {
        lines.push(`   Smells: -${score.deductions.smells.total}`);
    }

    lines.push('');
    lines.push('   Formula:');
    lines.push('   ─────────────────────────────────────────────────────────');
    lines.push('   Base: 100');
    lines.push('   - Circular Dep (critical:-8, high:-5, medium:-2)');
    lines.push('   - Feature Leakage (high:-4, medium:-2)');
    lines.push('   - Hotspots (critical>80:-3, high>60:-1)');
    lines.push('   - Orphans (-0.5 per file)');
    lines.push('');

    return lines.join('\n');
}

/**
 * Format score delta for CLI output
 */
export function formatScoreDelta(delta: ScoreDelta): string {
    const lines: string[] = [];

    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('                   Score Delta                          ');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');
    lines.push(`   Previous: ${delta.previous.overall}  →  Current: ${delta.current.overall}  ${delta.delta.overall >= 0 ? '↑' : '↓'} ${Math.abs(delta.delta.overall)}`);
    lines.push('');

    if (delta.improved.length > 0) {
        lines.push('   ✅ Improved:');
        for (const item of delta.improved) {
            lines.push(`      +${item.delta} ${item.description}`);
        }
        lines.push('');
    }

    if (delta.regressed.length > 0) {
        lines.push('   ❌ Regressed:');
        for (const item of delta.regressed) {
            lines.push(`      ${item.delta} ${item.description}`);
        }
        lines.push('');
    }

    if (delta.improved.length === 0 && delta.regressed.length === 0) {
        lines.push('   No changes detected since last scan.');
        lines.push('');
    }

    return lines.join('\n');
}

function getScoreEmoji(score: number): string {
    if (score >= 90) return '🟢 Excellent';
    if (score >= 70) return '🟡 Good';
    if (score >= 50) return '🟠 Fair';
    return '🔴 Poor';
}

function getScoreBar(score: number): string {
    const filled = Math.round(score / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}
