/**
 * Enhanced HTML Reporter
 *
 * Generates a beautiful, interactive HTML report with:
 * - SVG Charts (gauge, donut, bar)
 * - Interactive filtering & search
 * - Embedded dependency graph
 * - Trend comparison with baseline
 */

import type { Issue, ScanResult } from '../types/issue';
import type { ProjectMetrics } from '../core/metrics';
import type { ProjectGraph } from '../core/graph';
import {
    generateGaugeChart,
    generateDonutChart,
    generateBarChart,
    generateLineChart,
    generateDependencyGraph,
    type ChartData,
    type TrendPoint,
} from './charts';

export interface HtmlReporterOptions {
    projectName?: string;
    includeMetrics?: boolean;
    includeGraph?: boolean;
    baselineMetrics?: ProjectMetrics;
    graphData?: ProjectGraph;
}

export function generateHtmlReport(
    result: ScanResult,
    metrics?: ProjectMetrics,
    options: HtmlReporterOptions = {}
): string {
    const projectName = options.projectName ?? 'Vue Project';
    const hasBaseline = options.baselineMetrics !== undefined;
    const score = metrics?.architectureScore ?? 0;

    // Prepare chart data
    const severityData = prepareSeverityChartData(result);
    const categoryData = prepareCategoryChartData(result);
    const sizeDistribution = prepareSizeDistributionData(metrics);
    const trendData = prepareTrendData(metrics, options.baselineMetrics);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vue Doctor Report - ${escapeHtml(projectName)}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --bg-primary: #0f172a;
            --bg-secondary: #1e293b;
            --bg-tertiary: #334155;
            --text-primary: #f1f5f9;
            --text-secondary: #94a3b8;
            --text-muted: #64748b;
            --accent: #38bdf8;
            --accent-secondary: #22d3ee;
            --success: #22c55e;
            --warning: #f59e0b;
            --error: #ef4444;
            --critical: #dc2626;
            --info: #3b82f6;
            --border: #475569;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
            min-height: 100vh;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
        }

        /* Header */
        .header {
            text-align: center;
            margin-bottom: 2rem;
            padding: 2rem;
            background: linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(34, 211, 238, 0.05) 100%);
            border-radius: 16px;
            border: 1px solid rgba(56, 189, 248, 0.2);
        }

        .header h1 {
            font-size: 2.5rem;
            background: linear-gradient(90deg, var(--accent), var(--accent-secondary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 0.5rem;
        }

        .header .subtitle {
            color: var(--text-secondary);
            font-size: 1rem;
        }

        .header .timestamp {
            color: var(--text-muted);
            font-size: 0.875rem;
            margin-top: 0.5rem;
        }

        /* Stats Grid */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }

        .stat-card {
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 1.25rem;
            text-align: center;
            transition: all 0.2s;
            position: relative;
            overflow: hidden;
        }

        .stat-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
        }

        .stat-card.error::before { background: var(--error); }
        .stat-card.warning::before { background: var(--warning); }
        .stat-card.info::before { background: var(--info); }
        .stat-card.success::before { background: var(--success); }

        .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }

        .stat-value {
            font-size: 2.25rem;
            font-weight: 700;
            line-height: 1.2;
        }

        .stat-card.error .stat-value { color: var(--error); }
        .stat-card.warning .stat-value { color: var(--warning); }
        .stat-card.info .stat-value { color: var(--info); }
        .stat-card.success .stat-value { color: var(--success); }

        .stat-label {
            color: var(--text-secondary);
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-top: 0.25rem;
        }

        .stat-delta {
            font-size: 0.75rem;
            margin-top: 0.25rem;
        }

        .stat-delta.positive { color: var(--success); }
        .stat-delta.negative { color: var(--error); }
        .stat-delta.neutral { color: var(--text-muted); }

        /* Sections */
        .section {
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
        }

        .section-title {
            font-size: 1.25rem;
            margin-bottom: 1.25rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            color: var(--text-primary);
        }

        .section-title .icon {
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, var(--accent), var(--accent-secondary));
            border-radius: 6px;
            font-size: 0.875rem;
        }

        /* Score Section */
        .score-section {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 2rem;
            align-items: center;
        }

        @media (max-width: 768px) {
            .score-section {
                grid-template-columns: 1fr;
            }
        }

        .score-gauge {
            text-align: center;
        }

        .score-gauge svg {
            max-width: 200px;
            height: auto;
        }

        .score-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 1rem;
        }

        .score-breakdown-item {
            background: var(--bg-tertiary);
            border-radius: 8px;
            padding: 1rem;
            text-align: center;
        }

        .score-breakdown-item .label {
            font-size: 0.75rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            margin-bottom: 0.5rem;
        }

        .score-breakdown-item .value {
            font-size: 1.5rem;
            font-weight: 700;
        }

        .score-breakdown-item .weight {
            font-size: 0.625rem;
            color: var(--text-muted);
            margin-top: 0.25rem;
        }

        /* Charts Grid */
        .charts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1.5rem;
        }

        .chart-card {
            background: var(--bg-tertiary);
            border-radius: 12px;
            padding: 1.25rem;
            text-align: center;
        }

        .chart-card h4 {
            font-size: 0.875rem;
            color: var(--text-secondary);
            margin-bottom: 1rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .chart-card svg {
            max-width: 100%;
            height: auto;
        }

        /* Dependency Graph */
        .graph-container {
            background: var(--bg-tertiary);
            border-radius: 12px;
            padding: 1rem;
            min-height: 300px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }

        .graph-container svg {
            max-width: 100%;
            max-height: 400px;
        }

        .graph-placeholder {
            color: var(--text-muted);
            text-align: center;
            padding: 2rem;
        }

        /* Filter Bar */
        .filter-bar {
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
            margin-bottom: 1.25rem;
            align-items: center;
        }

        .filter-group {
            display: flex;
            gap: 0.5rem;
            align-items: center;
        }

        .filter-group label {
            font-size: 0.75rem;
            color: var(--text-secondary);
            text-transform: uppercase;
        }

        .filter-btn {
            padding: 0.5rem 1rem;
            border: 1px solid var(--border);
            background: transparent;
            border-radius: 8px;
            color: var(--text-secondary);
            cursor: pointer;
            transition: all 0.2s;
            font-size: 0.875rem;
        }

        .filter-btn:hover {
            background: var(--bg-tertiary);
            color: var(--text-primary);
        }

        .filter-btn.active {
            background: var(--accent);
            border-color: var(--accent);
            color: var(--bg-primary);
        }

        .filter-btn .count {
            margin-left: 0.25rem;
            opacity: 0.7;
        }

        .search-input {
            flex: 1;
            min-width: 200px;
            padding: 0.5rem 1rem;
            border: 1px solid var(--border);
            background: var(--bg-tertiary);
            border-radius: 8px;
            color: var(--text-primary);
            font-size: 0.875rem;
        }

        .search-input:focus {
            outline: none;
            border-color: var(--accent);
        }

        .search-input::placeholder {
            color: var(--text-muted);
        }

        /* Issues Table */
        .issues-table-container {
            overflow-x: auto;
        }

        .issues-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.875rem;
        }

        .issues-table th,
        .issues-table td {
            text-align: left;
            padding: 0.875rem 1rem;
            border-bottom: 1px solid var(--border);
        }

        .issues-table th {
            background: var(--bg-tertiary);
            color: var(--text-secondary);
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-weight: 600;
            cursor: pointer;
            user-select: none;
        }

        .issues-table th:hover {
            color: var(--text-primary);
        }

        .issues-table th.sorted::after {
            content: ' ↓';
        }

        .issues-table th.sorted.desc::after {
            content: ' ↑';
        }

        .issues-table tbody tr {
            transition: background 0.15s;
        }

        .issues-table tbody tr:hover {
            background: rgba(56, 189, 248, 0.05);
        }

        .issues-table tbody tr.hidden {
            display: none;
        }

        /* Severity Badge */
        .severity-badge {
            display: inline-flex;
            align-items: center;
            padding: 0.25rem 0.625rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            white-space: nowrap;
        }

        .severity-badge.critical {
            background: rgba(220, 38, 38, 0.2);
            color: var(--critical);
        }

        .severity-badge.error {
            background: rgba(239, 68, 68, 0.2);
            color: var(--error);
        }

        .severity-badge.warning {
            background: rgba(245, 158, 11, 0.2);
            color: var(--warning);
        }

        .severity-badge.info {
            background: rgba(59, 130, 246, 0.2);
            color: var(--info);
        }

        /* Rule Name */
        .rule-name {
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            font-size: 0.8125rem;
            color: var(--accent);
        }

        /* File Path */
        .file-path {
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            font-size: 0.8125rem;
            color: var(--text-secondary);
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .file-path:hover {
            color: var(--text-primary);
        }

        /* Message */
        .message {
            color: var(--text-primary);
            max-width: 400px;
        }

        /* Line Number */
        .line-number {
            color: var(--text-muted);
            font-family: 'SF Mono', Monaco, monospace;
            font-size: 0.75rem;
        }

        /* No Issues */
        .no-issues {
            text-align: center;
            padding: 3rem;
            color: var(--success);
        }

        .no-issues svg {
            width: 64px;
            height: 64px;
            margin-bottom: 1rem;
        }

        .no-issues p {
            font-size: 1.125rem;
        }

        /* Empty State */
        .empty-state {
            text-align: center;
            padding: 2rem;
            color: var(--text-muted);
        }

        /* Footer */
        .footer {
            text-align: center;
            margin-top: 2rem;
            padding-top: 1.5rem;
            border-top: 1px solid var(--border);
            color: var(--text-muted);
            font-size: 0.875rem;
        }

        .footer a {
            color: var(--accent);
            text-decoration: none;
        }

        .footer a:hover {
            text-decoration: underline;
        }

        /* Summary Bar */
        .summary-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem 1rem;
            background: var(--bg-tertiary);
            border-radius: 8px;
            margin-bottom: 1rem;
            font-size: 0.875rem;
        }

        .summary-bar .count {
            color: var(--text-secondary);
        }

        .summary-bar .count strong {
            color: var(--text-primary);
        }

        /* Chart Legend */
        .chart-legend {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 1rem;
            margin-top: 0.75rem;
            font-size: 0.75rem;
        }

        .legend-item {
            display: flex;
            align-items: center;
            gap: 0.375rem;
        }

        .legend-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
        }

        /* Trend Comparison */
        .trend-comparison {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 0.75rem;
            margin-top: 1rem;
        }

        .trend-item {
            text-align: center;
            padding: 0.75rem;
            background: var(--bg-primary);
            border-radius: 8px;
        }

        .trend-item .label {
            font-size: 0.625rem;
            color: var(--text-muted);
            text-transform: uppercase;
            margin-bottom: 0.25rem;
        }

        .trend-item .values {
            display: flex;
            justify-content: center;
            gap: 0.5rem;
            align-items: baseline;
        }

        .trend-item .current {
            font-size: 1.25rem;
            font-weight: 700;
        }

        .trend-item .previous {
            font-size: 0.875rem;
            color: var(--text-muted);
        }

        .trend-item .change {
            font-size: 0.75rem;
            margin-top: 0.25rem;
        }

        .trend-item .change.positive { color: var(--success); }
        .trend-item .change.negative { color: var(--error); }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>Vue Doctor Report</h1>
            <p class="subtitle">${escapeHtml(projectName)}</p>
            <p class="timestamp">Generated on ${new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })}</p>
        </div>

        <!-- Stats Grid -->
        <div class="stats-grid">
            ${generateStatCard('Errors', result.errorCount, 'error', getBaselineDelta(result.errorCount, options.baselineMetrics?.totalIssues.errors))}
            ${generateStatCard('Warnings', result.warningCount, 'warning', getBaselineDelta(result.warningCount, options.baselineMetrics?.totalIssues.warnings))}
            ${generateStatCard('Info', result.infoCount, 'info', getBaselineDelta(result.infoCount, options.baselineMetrics?.totalIssues.info))}
            ${generateStatCard('Files Scanned', result.filesScanned, 'success')}
            ${generateStatCard('Issues Found', result.issues.length, 'info')}
            ${generateStatCard('Score', score, score >= 80 ? 'success' : score >= 60 ? 'warning' : 'error')}
        </div>

        ${metrics ? generateScoreSection(metrics, options.baselineMetrics) : ''}

        ${metrics ? generateChartsSection(metrics, severityData, categoryData, sizeDistribution) : ''}

        <!-- Dependency Graph -->
        ${options.graphData ? generateGraphSection(options.graphData) : ''}

        <!-- Issues Section -->
        <div class="section">
            <h2 class="section-title">
                <span class="icon">!</span>
                Issues (${result.issues.length})
            </h2>

            <div class="filter-bar">
                <div class="filter-group">
                    <label>Filter:</label>
                    <button class="filter-btn active" data-filter="all">All <span class="count">(${result.issues.length})</span></button>
                    <button class="filter-btn" data-filter="critical">Critical <span class="count">(${result.issues.filter(i => i.severity === 'critical').length})</span></button>
                    <button class="filter-btn" data-filter="error">Error <span class="count">(${result.issues.filter(i => i.severity === 'error').length})</span></button>
                    <button class="filter-btn" data-filter="warning">Warning <span class="count">(${result.issues.filter(i => i.severity === 'warning').length})</span></button>
                    <button class="filter-btn" data-filter="info">Info <span class="count">(${result.issues.filter(i => i.severity === 'info').length})</span></button>
                </div>
                <input type="text" class="search-input" id="search-input" placeholder="Search issues...">
            </div>

            ${result.issues.length === 0 ? generateNoIssues() : generateIssuesTable(result.issues)}
        </div>

        <!-- Footer -->
        <div class="footer">
            Generated by <a href="https://github.com/daohuy34/vue-doctor">Vue Doctor</a> - Static Analysis & Architecture Intelligence
        </div>
    </div>

    <script>
        // Interactive filtering and search
        document.addEventListener('DOMContentLoaded', () => {
            const filterBtns = document.querySelectorAll('.filter-btn[data-filter]');
            const searchInput = document.getElementById('search-input');
            const tableRows = document.querySelectorAll('.issues-table tbody tr');
            const summaryCount = document.getElementById('visible-count');

            let currentFilter = 'all';
            let searchTerm = '';

            function updateVisibility() {
                let visible = 0;
                tableRows.forEach(row => {
                    const severity = row.dataset.severity || '';
                    const text = row.textContent.toLowerCase();
                    const matchesFilter = currentFilter === 'all' || severity === currentFilter;
                    const matchesSearch = searchTerm === '' || text.includes(searchTerm);

                    if (matchesFilter && matchesSearch) {
                        row.classList.remove('hidden');
                        visible++;
                    } else {
                        row.classList.add('hidden');
                    }
                });

                if (summaryCount) {
                    summaryCount.textContent = visible;
                }
            }

            filterBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    filterBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentFilter = btn.dataset.filter;
                    updateVisibility();
                });
            });

            searchInput?.addEventListener('input', (e) => {
                searchTerm = e.target.value.toLowerCase();
                updateVisibility();
            });

            // Sortable columns
            const headers = document.querySelectorAll('.issues-table th[data-sort]');
            headers.forEach(header => {
                header.addEventListener('click', () => {
                    const column = header.dataset.sort;
                    const isDesc = header.classList.contains('sorted');

                    headers.forEach(h => {
                        h.classList.remove('sorted', 'desc');
                    });

                    if (!isDesc) {
                        header.classList.add('sorted');
                    } else {
                        header.classList.add('sorted', 'desc');
                    }

                    sortTable(column, !isDesc);
                });
            });

            function sortTable(column, ascending) {
                const tbody = document.querySelector('.issues-table tbody');
                const rows = Array.from(tbody.querySelectorAll('tr:not(.hidden)'));

                rows.sort((a, b) => {
                    let aVal, bVal;

                    switch(column) {
                        case 'severity':
                            const order = { critical: 0, error: 1, warning: 2, info: 3 };
                            aVal = order[a.dataset.severity] ?? 4;
                            bVal = order[b.dataset.severity] ?? 4;
                            break;
                        case 'rule':
                            aVal = a.querySelector('.rule-name')?.textContent || '';
                            bVal = b.querySelector('.rule-name')?.textContent || '';
                            break;
                        case 'file':
                            aVal = a.querySelector('.file-path')?.textContent || '';
                            bVal = b.querySelector('.file-path')?.textContent || '';
                            break;
                        default:
                            aVal = a.textContent;
                            bVal = b.textContent;
                    }

                    if (typeof aVal === 'string') {
                        return ascending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                    }
                    return ascending ? aVal - bVal : bVal - aVal;
                });

                rows.forEach(row => tbody.appendChild(row));
            }
        });
    </script>
</body>
</html>`;
}

// Helper Functions

function escapeHtml(text: string): string {
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
}

function generateStatCard(
    label: string,
    value: number,
    type: string,
    delta?: { value: number; direction: 'up' | 'down' | 'same' }
): string {
    const deltaHtml = delta && delta.direction !== 'same'
        ? `<div class="stat-delta ${delta.direction === 'down' ? 'positive' : 'negative'}">
             ${delta.direction === 'down' ? '↓' : '↑'} ${Math.abs(delta.value)}
           </div>`
        : '';

    return `
        <div class="stat-card ${type}">
            <div class="stat-value">${value}</div>
            <div class="stat-label">${label}</div>
            ${deltaHtml}
        </div>
    `;
}

function generateScoreSection(metrics: ProjectMetrics, baseline?: ProjectMetrics): string {
    const scoreColor = getScoreColor(metrics.architectureScore);

    return `
        <div class="section">
            <h2 class="section-title">
                <span class="icon">◎</span>
                Architecture Health
            </h2>

            <div class="score-section">
                <div class="score-gauge">
                    ${generateGaugeChart(metrics.architectureScore, {
                        size: 200,
                        strokeWidth: 18,
                    })}
                    <div style="margin-top: 0.5rem; color: ${scoreColor}; font-weight: 600;">
                        ${getScoreLabel(metrics.architectureScore)}
                    </div>
                </div>

                <div class="score-details">
                    ${generateScoreBreakdown('Issues', metrics.scoringBreakdown?.issuesScore ?? 0, 'issuesScore' in (metrics.scoringBreakdown || {}) ? (metrics.scoringBreakdown?.issuesScore ?? 0) > 80 : false)}
                    ${generateScoreBreakdown('Dependency', metrics.scoringBreakdown?.dependencyScore ?? metrics.dependencyHealth.distributionScore, true)}
                    ${generateScoreBreakdown('Maintainability', metrics.scoringBreakdown?.maintainabilityScore ?? metrics.maintainability.score, true)}
                    ${generateScoreBreakdown('Technical Debt', 100 - metrics.technicalDebt.score, true, ' (lower is better)')}
                </div>
            </div>

            ${baseline ? generateTrendComparison(metrics, baseline) : ''}
        </div>
    `;
}

function generateScoreBreakdown(label: string, value: number, isGood: boolean, suffix?: string): string {
    const color = isGood ? 'var(--success)' : value >= 60 ? 'var(--warning)' : 'var(--error)';
    return `
        <div class="score-breakdown-item">
            <div class="label">${label}${suffix || ''}</div>
            <div class="value" style="color: ${color}">${value}</div>
            <div class="weight">/ 100</div>
        </div>
    `;
}

function generateTrendComparison(current: ProjectMetrics, baseline: ProjectMetrics): string {
    const items = [
        {
            label: 'Score',
            current: current.architectureScore,
            previous: baseline.architectureScore,
        },
        {
            label: 'Errors',
            current: current.totalIssues.errors,
            previous: baseline.totalIssues.errors,
            invert: true,
        },
        {
            label: 'Warnings',
            current: current.totalIssues.warnings,
            previous: baseline.totalIssues.warnings,
            invert: true,
        },
    ];

    return `
        <div class="trend-comparison">
            ${items.map(item => {
                const change = item.current - item.previous;
                const direction = change === 0 ? 'same' : (item.invert ? (change < 0 ? 'positive' : 'negative') : (change > 0 ? 'positive' : 'negative'));
                const arrow = change === 0 ? '→' : (change > 0 ? '↑' : '↓');

                return `
                    <div class="trend-item">
                        <div class="label">${item.label}</div>
                        <div class="values">
                            <span class="current">${item.current}</span>
                            <span class="previous">(${item.previous})</span>
                        </div>
                        ${change !== 0 ? `<div class="change ${direction}">${arrow} ${Math.abs(change)}</div>` : ''}
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function generateChartsSection(
    metrics: ProjectMetrics,
    severityData: ChartData[],
    categoryData: ChartData[],
    sizeDistribution: ChartData[]
): string {
    return `
        <div class="section">
            <h2 class="section-title">
                <span class="icon">📊</span>
                Analysis Overview
            </h2>

            <div class="charts-grid">
                <div class="chart-card">
                    <h4>Issues by Severity</h4>
                    ${severityData.length > 0 ? generateDonutChart(severityData, { size: 180, strokeWidth: 24 }) : '<div class="empty-state">No data</div>'}
                    <div class="chart-legend">
                        ${severityData.map((d, i) => `
                            <div class="legend-item">
                                <div class="legend-dot" style="background: ${getSeverityColor(d.label)}"></div>
                                <span>${d.label} (${d.value})</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="chart-card">
                    <h4>Component Size Distribution</h4>
                    ${sizeDistribution.length > 0 ? generateBarChart(sizeDistribution, { width: 250, height: 180 }) : '<div class="empty-state">No data</div>'}
                </div>

                <div class="chart-card">
                    <h4>Dependency Metrics</h4>
                    <div style="text-align: left; padding: 0.5rem;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span style="color: var(--text-secondary);">Circular Deps:</span>
                            <span style="font-weight: 600; color: ${metrics.dependencyHealth.circularDeps.count > 0 ? 'var(--error)' : 'var(--success)'}">
                                ${metrics.dependencyHealth.circularDeps.count}
                            </span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span style="color: var(--text-secondary);">Avg Fan-out:</span>
                            <span style="font-weight: 600;">${metrics.dependencyHealth.fanOutStats.average}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span style="color: var(--text-secondary);">Max Fan-out:</span>
                            <span style="font-weight: 600;">${metrics.dependencyHealth.fanOutStats.max}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-secondary);">Avg Fan-in:</span>
                            <span style="font-weight: 600;">${metrics.dependencyHealth.fanInStats.average}</span>
                        </div>
                    </div>
                </div>

                <div class="chart-card">
                    <h4>Technical Debt</h4>
                    <div style="text-align: left; padding: 0.5rem;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span style="color: var(--text-secondary);">Est. Fix Time:</span>
                            <span style="font-weight: 600;">${metrics.technicalDebt.estimatedDays} days</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span style="color: var(--text-secondary);">Architecture:</span>
                            <span style="font-weight: 600;">${metrics.technicalDebt.categories.architecture}%</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span style="color: var(--text-secondary);">Code:</span>
                            <span style="font-weight: 600;">${metrics.technicalDebt.categories.code}%</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-secondary);">Documentation:</span>
                            <span style="font-weight: 600;">${metrics.technicalDebt.categories.documentation}%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function generateGraphSection(graph: ProjectGraph): string {
    const nodes = graph.nodes.slice(0, 50).map(n => ({
        id: n.filePath,
        type: n.type,
    }));

    const edges = graph.edges.slice(0, 100).map(e => ({
        from: e.from,
        to: e.to,
    }));

    const graphSvg = nodes.length > 0
        ? generateDependencyGraph(nodes, edges, { width: 700, height: 350 })
        : '<div class="graph-placeholder">No graph data available</div>';

    return `
        <div class="section">
            <h2 class="section-title">
                <span class="icon">🕸️</span>
                Dependency Graph
            </h2>
            <div class="graph-container">
                ${graphSvg}
            </div>
            <div style="margin-top: 1rem; display: flex; gap: 1.5rem; justify-content: center; flex-wrap: wrap; font-size: 0.75rem; color: var(--text-secondary);">
                <div class="legend-item"><div class="legend-dot" style="background: #6366f1;"></div> Component</div>
                <div class="legend-item"><div class="legend-dot" style="background: #22c55e;"></div> Page</div>
                <div class="legend-item"><div class="legend-dot" style="background: #f59e0b;"></div> Composable</div>
                <div class="legend-item"><div class="legend-dot" style="background: #ec4899;"></div> Store</div>
                <div class="legend-item"><div class="legend-dot" style="background: #64748b;"></div> Other</div>
            </div>
        </div>
    `;
}

function generateNoIssues(): string {
    return `
        <div class="no-issues">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <p>No issues found! Your code is in great shape.</p>
        </div>
    `;
}

function generateIssuesTable(issues: Issue[]): string {
    const rows = issues.map((issue, index) => `
        <tr data-severity="${issue.severity}" data-index="${index}">
            <td><span class="severity-badge ${issue.severity}">${issue.severity}</span></td>
            <td><span class="rule-name">${escapeHtml(issue.rule)}</span></td>
            <td><span class="file-path" title="${escapeHtml(issue.file)}">${escapeHtml(issue.file)}</span></td>
            <td><span class="message">${escapeHtml(issue.message)}</span></td>
            <td class="line-number">${issue.line ? `:${issue.line}` : ''}</td>
        </tr>
    `).join('');

    return `
        <div class="summary-bar">
            <span class="count">Showing <strong id="visible-count">${issues.length}</strong> of ${issues.length} issues</span>
        </div>
        <div class="issues-table-container">
            <table class="issues-table">
                <thead>
                    <tr>
                        <th data-sort="severity">Severity</th>
                        <th data-sort="rule">Rule</th>
                        <th data-sort="file">File</th>
                        <th>Message</th>
                        <th>Location</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
}

// Data preparation functions

function prepareSeverityChartData(result: ScanResult): ChartData[] {
    const data: ChartData[] = [];
    if (result.errorCount > 0) data.push({ label: 'Errors', value: result.errorCount, color: '#ef4444' });
    if (result.warningCount > 0) data.push({ label: 'Warnings', value: result.warningCount, color: '#f59e0b' });
    if (result.infoCount > 0) data.push({ label: 'Info', value: result.infoCount, color: '#3b82f6' });
    return data;
}

function prepareCategoryChartData(result: ScanResult): ChartData[] {
    const categories = new Map<string, number>();
    result.issues.forEach(issue => {
        const cat = issue.category || 'other';
        categories.set(cat, (categories.get(cat) || 0) + 1);
    });

    const colors: Record<string, string> = {
        performance: '#f59e0b',
        security: '#ef4444',
        maintainability: '#3b82f6',
        'best-practice': '#22c55e',
        architecture: '#8b5cf6',
        ssr: '#ec4899',
        ai: '#06b6d4',
    };

    return Array.from(categories.entries()).map(([label, value]) => ({
        label,
        value,
        color: colors[label] || '#64748b',
    }));
}

function prepareSizeDistributionData(metrics?: ProjectMetrics): ChartData[] {
    if (!metrics) return [];

    const dist = metrics.maintainability.sizeDistribution;
    return [
        { label: 'Small\n(<100)', value: dist.small, color: '#22c55e' },
        { label: 'Medium\n(100-300)', value: dist.medium, color: '#3b82f6' },
        { label: 'Large\n(300-500)', value: dist.large, color: '#f59e0b' },
        { label: 'Huge\n(>500)', value: dist.huge, color: '#ef4444' },
    ];
}

function prepareTrendData(metrics?: ProjectMetrics, baseline?: ProjectMetrics): TrendPoint[] {
    if (!baseline) return [];
    return [
        { date: 'Baseline', value: baseline.architectureScore },
        { date: 'Current', value: metrics?.architectureScore ?? baseline.architectureScore },
    ];
}

// Helper functions

function getScoreColor(score: number): string {
    if (score >= 80) return 'var(--success)';
    if (score >= 60) return 'var(--warning)';
    return 'var(--error)';
}

function getScoreLabel(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Needs Work';
    return 'Poor';
}

function getSeverityColor(severity: string): string {
    const colors: Record<string, string> = {
        'Errors': '#ef4444',
        'Warnings': '#f59e0b',
        'Info': '#3b82f6',
    };
    return colors[severity] || '#64748b';
}

function getBaselineDelta(current: number, previous?: number): { value: number; direction: 'up' | 'down' | 'same' } | undefined {
    if (previous === undefined) return undefined;
    const delta = current - previous;
    if (delta === 0) return { value: 0, direction: 'same' };
    return { value: Math.abs(delta), direction: delta > 0 ? 'up' : 'down' };
}
