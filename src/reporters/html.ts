/**
 * HTML Reporter
 *
 * Generates a beautiful HTML report for vue-doctor analysis results.
 */

import type { Issue, ScanResult } from '../types/issue';
import type { ProjectMetrics } from '../core/metrics';

export interface HtmlReporterOptions {
    /** Project name */
    projectName?: string;
    /** Include metrics */
    includeMetrics?: boolean;
}

export function generateHtmlReport(
    result: ScanResult,
    metrics?: ProjectMetrics,
    options: HtmlReporterOptions = {}
): string {
    const projectName = options.projectName ?? 'Vue Project';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vue Doctor Report - ${projectName}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            color: #e4e4e7;
            padding: 2rem;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        .header {
            text-align: center;
            margin-bottom: 2rem;
        }

        .header h1 {
            font-size: 2.5rem;
            background: linear-gradient(90deg, #00d9ff, #00ff88);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 0.5rem;
        }

        .header .subtitle {
            color: #71717a;
            font-size: 1rem;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }

        .stat-card {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 1.5rem;
            text-align: center;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .stat-card.error { border-left: 4px solid #ef4444; }
        .stat-card.warning { border-left: 4px solid #f59e0b; }
        .stat-card.info { border-left: 4px solid #3b82f6; }
        .stat-card.success { border-left: 4px solid #10b981; }

        .stat-value {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 0.25rem;
        }

        .stat-card.error .stat-value { color: #ef4444; }
        .stat-card.warning .stat-value { color: #f59e0b; }
        .stat-card.info .stat-value { color: #3b82f6; }
        .stat-card.success .stat-value { color: #10b981; }

        .stat-label {
            color: #71717a;
            font-size: 0.875rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .section {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
        }

        .section-title {
            font-size: 1.25rem;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .section-title::before {
            content: '';
            display: inline-block;
            width: 4px;
            height: 1.25rem;
            background: linear-gradient(180deg, #00d9ff, #00ff88);
            border-radius: 2px;
        }

        .score-circle {
            width: 180px;
            height: 180px;
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1rem;
            position: relative;
        }

        .score-circle::before {
            content: '';
            position: absolute;
            inset: -4px;
            border-radius: 50%;
            background: conic-gradient(
                var(--score-color) calc(var(--score) * 3.6deg),
                rgba(255,255,255,0.1) 0deg
            );
        }

        .score-value {
            font-size: 3rem;
            font-weight: 700;
            z-index: 1;
        }

        .score-label {
            font-size: 0.875rem;
            color: #71717a;
            z-index: 1;
        }

        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
        }

        .metric-item {
            background: rgba(255, 255, 255, 0.03);
            border-radius: 8px;
            padding: 1rem;
        }

        .metric-label {
            font-size: 0.75rem;
            color: #71717a;
            text-transform: uppercase;
            margin-bottom: 0.25rem;
        }

        .metric-value {
            font-size: 1.25rem;
            font-weight: 600;
        }

        .issues-table {
            width: 100%;
            border-collapse: collapse;
        }

        .issues-table th,
        .issues-table td {
            text-align: left;
            padding: 0.75rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .issues-table th {
            color: #71717a;
            font-size: 0.75rem;
            text-transform: uppercase;
            font-weight: 600;
        }

        .issues-table tr:hover {
            background: rgba(255, 255, 255, 0.02);
        }

        .severity-badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .severity-badge.error {
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
        }

        .severity-badge.warning {
            background: rgba(245, 158, 11, 0.2);
            color: #f59e0b;
        }

        .severity-badge.info {
            background: rgba(59, 130, 246, 0.2);
            color: #3b82f6;
        }

        .rule-name {
            font-family: 'SF Mono', Monaco, monospace;
            font-size: 0.875rem;
            color: #00d9ff;
        }

        .file-path {
            font-family: 'SF Mono', Monaco, monospace;
            font-size: 0.875rem;
            color: #a1a1aa;
        }

        .message {
            color: #e4e4e7;
        }

        .no-issues {
            text-align: center;
            padding: 3rem;
            color: #10b981;
        }

        .no-issues svg {
            width: 64px;
            height: 64px;
            margin-bottom: 1rem;
        }

        .filter-bar {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1rem;
            flex-wrap: wrap;
        }

        .filter-btn {
            padding: 0.5rem 1rem;
            border: 1px solid rgba(255, 255, 255, 0.1);
            background: transparent;
            border-radius: 8px;
            color: #71717a;
            cursor: pointer;
            transition: all 0.2s;
        }

        .filter-btn:hover,
        .filter-btn.active {
            background: rgba(0, 217, 255, 0.1);
            border-color: #00d9ff;
            color: #00d9ff;
        }

        .footer {
            text-align: center;
            margin-top: 2rem;
            color: #52525b;
            font-size: 0.875rem;
        }

        .footer a {
            color: #00d9ff;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Vue Doctor Report</h1>
            <p class="subtitle">${projectName} - Generated on ${new Date().toLocaleDateString()}</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card ${result.errorCount > 0 ? 'error' : 'success'}">
                <div class="stat-value">${result.errorCount}</div>
                <div class="stat-label">Errors</div>
            </div>
            <div class="stat-card ${result.warningCount > 0 ? 'warning' : 'success'}">
                <div class="stat-value">${result.warningCount}</div>
                <div class="stat-label">Warnings</div>
            </div>
            <div class="stat-card info">
                <div class="stat-value">${result.filesScanned}</div>
                <div class="stat-label">Files Scanned</div>
            </div>
            <div class="stat-card info">
                <div class="stat-value">${result.issues.length}</div>
                <div class="stat-label">Total Issues</div>
            </div>
        </div>

        ${metrics ? generateMetricsSection(metrics) : ''}

        <div class="section">
            <h2 class="section-title">Issues</h2>
            ${result.issues.length === 0 ? generateNoIssues() : generateIssuesTable(result.issues)}
        </div>

        <div class="footer">
            Generated by <a href="https://github.com/daohuy34/vue-doctor">Vue Doctor</a>
        </div>
    </div>
</body>
</html>`;
}

function generateMetricsSection(metrics: ProjectMetrics): string {
    const scoreColor = metrics.architectureScore >= 80 ? '#10b981' :
                       metrics.architectureScore >= 60 ? '#f59e0b' : '#ef4444';

    return `
    <div class="section">
        <h2 class="section-title">Architecture Health</h2>
        <div style="display: flex; gap: 2rem; align-items: center; flex-wrap: wrap;">
            <div class="score-circle" style="--score: ${metrics.architectureScore}; --score-color: ${scoreColor}">
                <span class="score-value">${metrics.architectureScore}</span>
                <span class="score-label">Score</span>
            </div>
            <div class="metrics-grid" style="flex: 1;">
                <div class="metric-item">
                    <div class="metric-label">Technical Debt</div>
                    <div class="metric-value">${metrics.technicalDebt.estimatedDays} days</div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">Circular Deps</div>
                    <div class="metric-value">${metrics.dependencyHealth.circularDeps.count}</div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">Avg Fan-out</div>
                    <div class="metric-value">${metrics.dependencyHealth.fanOutStats.average}</div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">Huge Components</div>
                    <div class="metric-value">${metrics.maintainability.sizeDistribution.huge}</div>
                </div>
            </div>
        </div>
    </div>`;
}

function generateNoIssues(): string {
    return `
    <div class="no-issues">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <p>No issues found! Your code is in great shape.</p>
    </div>`;
}

function generateIssuesTable(issues: Issue[]): string {
    const rows = issues.map((issue) => `
        <tr>
            <td><span class="severity-badge ${issue.severity}">${issue.severity}</span></td>
            <td><span class="rule-name">${issue.rule}</span></td>
            <td><span class="file-path">${issue.file}</span></td>
            <td><span class="message">${escapeHtml(issue.message)}</span></td>
        </tr>
    `).join('');

    return `
        <table class="issues-table">
            <thead>
                <tr>
                    <th>Severity</th>
                    <th>Rule</th>
                    <th>File</th>
                    <th>Message</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}

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
