/**
 * Architecture Metrics Engine
 *
 * Provides project-wide architecture health metrics and scoring.
 */

import type { ProjectContext } from './project';
import { findCircularDeps, getFanIn, getFanOut } from './project';

export interface ProjectMetrics {
    /** Overall architecture score (0-100) */
    architectureScore: number;
    /** Component health scores */
    componentHealth: ComponentHealthScore[];
    /** Dependency health metrics */
    dependencyHealth: DependencyHealthMetrics;
    /** Maintainability score */
    maintainability: MaintainabilityScore;
    /** Technical debt index */
    technicalDebt: TechnicalDebtIndex;
}

export interface ComponentHealthScore {
    filePath: string;
    /** Health score (0-100) */
    score: number;
    /** Issues found */
    issues: string[];
    /** Component type */
    type: 'component' | 'composable' | 'store' | 'page' | 'other';
}

export interface DependencyHealthMetrics {
    /** Fan-out statistics */
    fanOutStats: {
        min: number;
        max: number;
        average: number;
        highCoupling: string[]; // Files with high fan-out
    };
    /** Fan-in statistics */
    fanInStats: {
        min: number;
        max: number;
        average: number;
        sharedComponents: string[]; // Components with high fan-in
    };
    /** Circular dependencies */
    circularDeps: {
        count: number;
        affectedFiles: string[];
    };
    /** Dependency distribution score (0-100) */
    distributionScore: number;
}

export interface MaintainabilityScore {
    /** Overall maintainability (0-100) */
    score: number;
    /** Average component size */
    avgComponentSize: number;
    /** Average component complexity */
    avgComplexity: number;
    /** Component distribution */
    sizeDistribution: {
        small: number;  // < 100 lines
        medium: number; // 100-300 lines
        large: number;  // 300-500 lines
        huge: number;   // > 500 lines
    };
}

export interface TechnicalDebtIndex {
    /** Technical debt score (0-100, lower is better) */
    score: number;
    /** Estimated debt in "days" */
    estimatedDays: number;
    /** Debt categories */
    categories: {
        architecture: number;
        code: number;
        tests: number;
        documentation: number;
    };
}

/**
 * Calculate overall architecture score
 */
export function calculateArchitectureScore(context: ProjectContext): ProjectMetrics {
    const componentHealth = calculateComponentHealth(context);
    const dependencyHealth = calculateDependencyHealth(context);
    const maintainability = calculateMaintainability(context);
    const technicalDebt = calculateTechnicalDebt(context, componentHealth, dependencyHealth);

    // Weighted average for overall score
    const architectureScore = Math.round(
        dependencyHealth.distributionScore * 0.3 +
        maintainability.score * 0.3 +
        (100 - technicalDebt.score) * 0.2 +
        componentHealth.reduce((sum, c) => sum + c.score, 0) / Math.max(componentHealth.length, 1) * 0.2
    );

    return {
        architectureScore: Math.min(100, Math.max(0, architectureScore)),
        componentHealth,
        dependencyHealth,
        maintainability,
        technicalDebt,
    };
}

/**
 * Calculate health score for each component
 */
function calculateComponentHealth(context: ProjectContext): ComponentHealthScore[] {
    const healthScores: ComponentHealthScore[] = [];

    for (const [filePath] of context.files) {
        const source = context.files.get(filePath)?.parsed.source ?? '';
        const issues: string[] = [];
        let score = 100;

        // Check component size
        const lineCount = source.split('\n').length;
        if (lineCount > 500) {
            issues.push('Huge component (>500 LOC)');
            score -= 30;
        } else if (lineCount > 300) {
            issues.push('Large component (>300 LOC)');
            score -= 15;
        } else if (lineCount > 100) {
            issues.push('Medium component (>100 LOC)');
            score -= 5;
        }

        // Check fan-out (coupling)
        const fanOut = getFanOut(context, filePath);
        if (fanOut > 15) {
            issues.push(`High coupling (${fanOut} dependencies)`);
            score -= 25;
        } else if (fanOut > 10) {
            issues.push(`Medium coupling (${fanOut} dependencies)`);
            score -= 10;
        }

        // Check fan-in (reusability - inverse)
        const fanIn = getFanIn(context, filePath);
        if (fanIn > 20) {
            score += 10; // Bonus for reusable components
        }

        // Check circular dependencies
        const cycles = context.graph.edges.filter(
            (e) => e.from === filePath && e.to === filePath
        );
        if (cycles.length > 0) {
            issues.push('Self-referencing');
            score -= 20;
        }

        // Determine component type
        const type = classifyComponent(filePath);

        healthScores.push({
            filePath,
            score: Math.min(100, Math.max(0, score)),
            issues,
            type,
        });
    }

    return healthScores;
}

/**
 * Classify component type based on path
 */
function classifyComponent(filePath: string): ComponentHealthScore['type'] {
    const path = filePath.toLowerCase();

    if (path.includes('/pages/') || path.endsWith('.vue') && path.includes('pages')) {
        return 'page';
    }
    if (path.includes('/stores/') || path.includes('/store/') || path.includes('store')) {
        return 'store';
    }
    if (path.includes('/composables/') || path.includes('/composable/')) {
        return 'composable';
    }
    if (path.endsWith('.vue')) {
        return 'component';
    }
    return 'other';
}

/**
 * Calculate dependency health metrics
 */
function calculateDependencyHealth(context: ProjectContext): DependencyHealthMetrics {
    const fanOuts: number[] = [];
    const fanIns: number[] = [];
    const highCoupling: string[] = [];
    const sharedComponents: string[] = [];

    for (const [filePath] of context.files) {
        const fanOut = getFanOut(context, filePath);
        const fanIn = getFanIn(context, filePath);

        fanOuts.push(fanOut);
        fanIns.push(fanIn);

        if (fanOut > 10) {
            highCoupling.push(filePath);
        }
        if (fanIn > 5) {
            sharedComponents.push(filePath);
        }
    }

    // Calculate circular dependencies
    const cycleResult = findCircularDeps(context);
    const affectedFiles = new Set<string>();
    for (const cycle of cycleResult.cycles) {
        for (const node of cycle.nodes) {
            affectedFiles.add(node);
        }
    }

    // Distribution score based on coupling
    const avgFanOut = fanOuts.length > 0 ? fanOuts.reduce((a, b) => a + b, 0) / fanOuts.length : 0;
    const maxFanOut = Math.max(...fanOuts, 0);

    // Score: lower coupling = higher score
    let distributionScore = 100;
    if (maxFanOut > 20) distributionScore -= 30;
    else if (maxFanOut > 15) distributionScore -= 20;
    else if (maxFanOut > 10) distributionScore -= 10;

    if (avgFanOut > 10) distributionScore -= 15;
    else if (avgFanOut > 5) distributionScore -= 5;

    if (cycleResult.hasCycles) {
        distributionScore -= 20;
    }

    return {
        fanOutStats: {
            min: Math.min(...fanOuts, 0),
            max: maxFanOut,
            average: Math.round(avgFanOut * 10) / 10,
            highCoupling,
        },
        fanInStats: {
            min: Math.min(...fanIns, 0),
            max: Math.max(...fanIns, 0),
            average: fanIns.length > 0 ? Math.round(fanIns.reduce((a, b) => a + b, 0) / fanIns.length * 10) / 10 : 0,
            sharedComponents,
        },
        circularDeps: {
            count: cycleResult.count,
            affectedFiles: Array.from(affectedFiles),
        },
        distributionScore: Math.min(100, Math.max(0, distributionScore)),
    };
}

/**
 * Calculate maintainability score
 */
function calculateMaintainability(context: ProjectContext): MaintainabilityScore {
    const sizes = { small: 0, medium: 0, large: 0, huge: 0 };
    let totalSize = 0;
    let totalComplexity = 0;

    for (const [filePath] of context.files) {
        const source = context.files.get(filePath)?.parsed.source ?? '';
        const lineCount = source.split('\n').length;

        totalSize += lineCount;

        if (lineCount < 100) sizes.small++;
        else if (lineCount < 300) sizes.medium++;
        else if (lineCount < 500) sizes.large++;
        else sizes.huge++;

        // Simple complexity based on props/watchers/computed
        const complexity = (
            (source.match(/defineProps/g) || []).length +
            (source.match(/\bwatch\(/g) || []).length +
            (source.match(/\bcomputed\(/g) || []).length
        );
        totalComplexity += complexity;
    }

    const avgComponentSize = context.files.size > 0 ? Math.round(totalSize / context.files.size) : 0;
    const avgComplexity = context.files.size > 0 ? Math.round(totalComplexity / context.files.size * 10) / 10 : 0;

    // Score based on distribution
    let score = 100;
    const hugePercent = (sizes.huge / Math.max(context.files.size, 1)) * 100;
    const largePercent = (sizes.large / Math.max(context.files.size, 1)) * 100;

    if (hugePercent > 10) score -= 30;
    else if (hugePercent > 5) score -= 15;

    if (largePercent > 30) score -= 15;
    else if (largePercent > 20) score -= 5;

    return {
        score: Math.min(100, Math.max(0, score)),
        avgComponentSize,
        avgComplexity,
        sizeDistribution: sizes,
    };
}

/**
 * Calculate technical debt index
 */
function calculateTechnicalDebt(
    context: ProjectContext,
    componentHealth: ComponentHealthScore[],
    dependencyHealth: DependencyHealthMetrics
): TechnicalDebtIndex {
    // Architecture debt
    const architectureDebt = 100 - dependencyHealth.distributionScore;

    // Code debt (based on unhealthy components)
    const unhealthyCount = componentHealth.filter((c) => c.score < 70).length;
    const codeDebt = (unhealthyCount / Math.max(componentHealth.length, 1)) * 100;

    // Test debt (assume 0 for now, could be extended)
    const testsDebt = 10; // Placeholder

    // Documentation debt (based on issues per component)
    const avgIssues = componentHealth.reduce((sum, c) => sum + c.issues.length, 0) / Math.max(componentHealth.length, 1);
    const docsDebt = Math.min(30, avgIssues * 5);

    const totalDebt = Math.round(architectureDebt * 0.4 + codeDebt * 0.3 + testsDebt * 0.1 + docsDebt * 0.2);
    const estimatedDays = Math.round(totalDebt * 0.5); // Rough estimate

    return {
        score: Math.min(100, totalDebt),
        estimatedDays,
        categories: {
            architecture: Math.round(architectureDebt),
            code: Math.round(codeDebt),
            tests: testsDebt,
            documentation: Math.round(docsDebt),
        },
    };
}

/**
 * Format metrics as readable output
 */
export function formatMetrics(metrics: ProjectMetrics): string {
    const lines: string[] = [];

    lines.push('┌─────────────────────────────────────┐');
    lines.push('│      Architecture Health Report       │');
    lines.push('└─────────────────────────────────────┘');
    lines.push('');
    lines.push(`  Overall Score: ${metrics.architectureScore}/100 ${getScoreEmoji(metrics.architectureScore)}`);
    lines.push('');

    lines.push('  Dependency Health:');
    lines.push(`    • Fan-out: avg=${metrics.dependencyHealth.fanOutStats.average}, max=${metrics.dependencyHealth.fanOutStats.max}`);
    lines.push(`    • Circular deps: ${metrics.dependencyHealth.circularDeps.count}`);
    lines.push(`    • Distribution: ${metrics.dependencyHealth.distributionScore}/100`);
    lines.push('');

    lines.push('  Maintainability:');
    lines.push(`    • Avg size: ${metrics.maintainability.avgComponentSize} LOC`);
    lines.push(`    • Size dist: S=${metrics.maintainability.sizeDistribution.small} M=${metrics.maintainability.sizeDistribution.medium} L=${metrics.maintainability.sizeDistribution.large} XL=${metrics.maintainability.sizeDistribution.huge}`);
    lines.push(`    • Score: ${metrics.maintainability.score}/100`);
    lines.push('');

    lines.push('  Technical Debt:');
    lines.push(`    • Debt score: ${metrics.technicalDebt.score}/100`);
    lines.push(`    • Est. fix time: ${metrics.technicalDebt.estimatedDays} days`);
    lines.push(`    • Categories: arch=${metrics.technicalDebt.categories.architecture} code=${metrics.technicalDebt.categories.code} docs=${metrics.technicalDebt.categories.documentation}`);
    lines.push('');

    return lines.join('\n');
}

function getScoreEmoji(score: number): string {
    if (score >= 90) return '🟢 Excellent';
    if (score >= 70) return '🟡 Good';
    if (score >= 50) return '🟠 Fair';
    return '🔴 Poor';
}
