/**
 * Trend Command
 *
 * Display metrics trends over time.
 */

import { loadMetricsHistory, type MetricsSnapshot } from '../../core/cache';
import { loadConfig } from '../../core/config';
import { runEngine } from '../../core/engine';
import { buildProjectContext } from '../../core/project';
import { collectFiles } from '../../utils/file-collector';
import { calculateArchitectureScore } from '../../core/metrics';
import { resolveFailOn } from '../check-utils';

interface TrendOptions {
    since?: string;
    format?: 'text' | 'json' | 'chart';
}

export async function trendCommand(options: TrendOptions = {}) {
    const history = loadMetricsHistory();

    if (history.length === 0) {
        console.log(`
╔═══════════════════════════════════════════════════════════╗
║               Vue Doctor Trend Analysis                 ║
╚═══════════════════════════════════════════════════════════╝

📊 No historical data available yet.

Run 'vue-doctor check' multiple times to build up trend data.
Each run will automatically save a metrics snapshot.
`);
        return;
    }

    // Filter by date if --since is provided
    let filteredHistory = history;
    if (options.since) {
        const sinceDate = new Date(options.since);
        if (!isNaN(sinceDate.getTime())) {
            filteredHistory = history.filter(h => h.timestamp >= sinceDate.getTime());
            if (filteredHistory.length === 0) {
                console.log(`No data since ${options.since}`);
                return;
            }
        }
    }

    if (options.format === 'json') {
        console.log(JSON.stringify(filteredHistory, null, 2));
        return;
    }

    if (options.format === 'chart') {
        printChart(filteredHistory);
        return;
    }

    printTextReport(filteredHistory);
}

function printTextReport(history: MetricsSnapshot[]) {
    const first = history[0];
    const last = history[history.length - 1];
    const scoreDiff = last.score - first.score;

    console.log(`
╔═══════════════════════════════════════════════════════════╗
║               Vue Doctor Trend Analysis                 ║
╚═══════════════════════════════════════════════════════════╝
`);

    console.log('📈 Score Trend:');
    console.log(`   First run: ${first.score}/100 (${formatDate(first.timestamp)})`);
    console.log(`   Latest:    ${last.score}/100 (${formatDate(last.timestamp)})`);
    console.log(`   Change:    ${scoreDiff >= 0 ? '+' : ''}${scoreDiff}/100`);
    console.log('');

    console.log('📊 Issues Trend:');
    const errorDiff = last.errors - first.errors;
    const warningDiff = last.warnings - first.warnings;
    const infoDiff = last.info - first.info;

    console.log(`   Errors:   ${first.errors} → ${last.errors} (${formatDiff(errorDiff)})`);
    console.log(`   Warnings: ${first.warnings} → ${last.warnings} (${formatDiff(warningDiff)})`);
    console.log(`   Info:     ${first.info} → ${last.info} (${formatDiff(infoDiff)})`);
    console.log('');

    console.log('📈 Run History:');
    console.log('   ' + '─'.repeat(70));

    // Print last 10 runs
    const recent = history.slice(-10);
    recent.forEach((h, i) => {
        const bar = generateBar(h.score, 30);
        const date = formatDate(h.timestamp).padEnd(12);
        console.log(`   ${date} ${bar} ${h.score}/100 (E:${h.errors} W:${h.warnings})`);
    });

    console.log('   ' + '─'.repeat(70));
    console.log('');

    // Calculate statistics
    const scores = history.map(h => h.score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const min = Math.min(...scores);
    const max = Math.max(...scores);

    console.log('📉 Statistics:');
    console.log(`   Average score: ${avg.toFixed(1)}/100`);
    console.log(`   Best score:    ${max}/100`);
    console.log(`   Worst score:   ${min}/100`);
    console.log(`   Total runs:    ${history.length}`);
    console.log('');
}

function printChart(history: MetricsSnapshot[]) {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║               Vue Doctor Trend Chart                    ║
╚═══════════════════════════════════════════════════════════╝
`);

    const maxScore = 100;
    const chartHeight = 15;

    // Take last 20 data points
    const data = history.slice(-20);

    // Print header
    console.log('  Score');
    console.log('  ' + '─'.repeat(74) + ` ${maxScore}`);

    // Print chart
    for (let row = chartHeight; row >= 0; row--) {
        const scoreThreshold = (row / chartHeight) * maxScore;
        let line = row.toString().padStart(3) + ' │';

        data.forEach(h => {
            const normalizedScore = (h.score / maxScore) * chartHeight;
            if (normalizedScore >= row) {
                line += '██';
            } else if (normalizedScore >= row - 0.5) {
                line += '▓';
            } else {
                line += '  ';
            }
        });

        console.log(line);
    }

    // Print baseline
    console.log('   ' + '─'.repeat(74) + ' 0');
    console.log('');

    // Print dates
    let dateLine = '     ';
    data.forEach((h, i) => {
        if (i % Math.max(1, Math.floor(data.length / 10)) === 0) {
            const d = new Date(h.timestamp);
            dateLine += d.toLocaleDateString('en', { month: 'short', day: 'numeric' }).slice(0, 2) + ' ';
        }
    });
    console.log(dateLine);
    console.log('');

    // Summary
    const first = data[0];
    const last = data[data.length - 1];
    const scoreDiff = last.score - first.score;

    console.log('  Summary:');
    console.log(`  First: ${first.score}/100  Latest: ${last.score}/100  Change: ${scoreDiff >= 0 ? '+' : ''}${scoreDiff}/100`);
    console.log('');
}

function generateBar(score: number, width: number): string {
    const filled = Math.round((score / 100) * width);
    return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('en', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatDiff(diff: number): string {
    if (diff === 0) return '(0)';
    return `(${diff > 0 ? '+' : ''}${diff})`;
}
