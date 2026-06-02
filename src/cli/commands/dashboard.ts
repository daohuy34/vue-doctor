/**
 * Dashboard Command
 *
 * Start an interactive web dashboard for Vue Doctor metrics.
 */

import http from 'node:http';
import { resolve } from 'node:path';
import { loadMetricsHistory, type MetricsSnapshot } from '../../core/cache';
import { loadConfig } from '../../core/config';
import { runEngine } from '../../core/engine';
import { buildProjectContext } from '../../core/project';
import { collectFiles } from '../../utils/file-collector';
import { calculateArchitectureScore } from '../../core/metrics';

interface DashboardOptions {
    port?: number;
    open?: boolean;
}

export async function dashboardCommand(options: DashboardOptions = {}) {
    const port = options.port || 3000;

    console.log(`
╔═══════════════════════════════════════════════════════════╗
║           Vue Doctor Interactive Dashboard                ║
╚═══════════════════════════════════════════════════════════╝

🌐 Opening dashboard at http://localhost:${port}

Press Ctrl+C to stop the server
`);

    const server = http.createServer(async (req, res) => {
        if (req.url === '/' || req.url === '/index.html') {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(getDashboardHtml());
        } else if (req.url === '/api/metrics') {
            try {
                const metrics = await getCurrentMetrics();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(metrics));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to get metrics' }));
            }
        } else if (req.url === '/api/history') {
            const history = loadMetricsHistory();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(history));
        } else {
            res.writeHead(404);
            res.end('Not found');
        }
    });

    server.listen(port, () => {
        console.log(`✅ Server running at http://localhost:${port}`);
    });

    server.on('error', (err) => {
        if (err.message.includes('EADDRINUSE')) {
            console.error(`❌ Port ${port} is already in use. Try a different port.`);
        } else {
            console.error('❌ Server error:', err.message);
        }
        process.exit(1);
    });
}

async function getCurrentMetrics() {
    const projectPath = process.cwd();
    const files = await collectFiles({
        cwd: projectPath,
        include: ['**/*.vue', '**/*.ts'],
        exclude: ['node_modules/**', 'dist/**', 'build/**'],
    });

    const context = await buildProjectContext(files);
    const engineResult = await runEngine(files);

    const issues = {
        errors: engineResult.issues.filter((i) => i.severity === 'error').length,
        warnings: engineResult.issues.filter((i) => i.severity === 'warning').length,
        info: engineResult.issues.filter((i) => i.severity === 'info').length,
    };

    const architectureMetrics = calculateArchitectureScore(context, { issues });

    return {
        timestamp: Date.now(),
        files: files.length,
        issues,
        architecture: {
            score: architectureMetrics.architectureScore,
            dependencyScore: architectureMetrics.dependencyHealth.distributionScore,
            maintainabilityScore: architectureMetrics.maintainability.score,
            technicalDebt: architectureMetrics.technicalDebt,
            sizeDistribution: architectureMetrics.maintainability.sizeDistribution,
        },
        recentIssues: engineResult.issues.slice(0, 20),
    };
}

function getDashboardHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vue Doctor Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --bg-primary: #0f172a;
            --bg-secondary: #1e293b;
            --bg-card: #334155;
            --text-primary: #f1f5f9;
            --text-secondary: #94a3b8;
            --accent: #00d9ff;
            --accent-secondary: #00ff88;
            --error: #ef4444;
            --warning: #f59e0b;
            --info: #3b82f6;
            --success: #10b981;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            min-height: 100vh;
            overflow-x: hidden;
        }

        .header {
            background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
            padding: 2rem;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .header h1 {
            font-size: 2rem;
            background: linear-gradient(90deg, var(--accent), var(--accent-secondary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 0.5rem;
        }

        .header p {
            color: var(--text-secondary);
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }

        .card {
            background: var(--bg-secondary);
            border-radius: 16px;
            padding: 1.5rem;
            border: 1px solid rgba(255,255,255,0.05);
        }

        .card-title {
            font-size: 0.875rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 1rem;
        }

        .score-display {
            display: flex;
            align-items: center;
            gap: 1.5rem;
        }

        .score-circle {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
            font-size: 2.5rem;
            font-weight: 700;
        }

        .score-circle::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 50%;
            background: conic-gradient(
                var(--score-color, var(--accent)) calc(var(--score, 0) * 3.6deg),
                rgba(255,255,255,0.1) 0deg
            );
        }

        .score-circle span {
            position: relative;
            z-index: 1;
        }

        .score-details {
            flex: 1;
        }

        .score-value {
            font-size: 3rem;
            font-weight: 700;
            color: var(--accent);
        }

        .score-label {
            color: var(--text-secondary);
            font-size: 0.875rem;
        }

        .stat-row {
            display: flex;
            justify-content: space-between;
            padding: 0.75rem 0;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .stat-row:last-child {
            border-bottom: none;
        }

        .stat-label {
            color: var(--text-secondary);
        }

        .stat-value {
            font-weight: 600;
        }

        .stat-value.error { color: var(--error); }
        .stat-value.warning { color: var(--warning); }
        .stat-value.info { color: var(--info); }
        .stat-value.success { color: var(--success); }

        .issues-table {
            width: 100%;
            border-collapse: collapse;
        }

        .issues-table th,
        .issues-table td {
            text-align: left;
            padding: 0.75rem;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .issues-table th {
            color: var(--text-secondary);
            font-size: 0.75rem;
            text-transform: uppercase;
        }

        .severity-badge {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
        }

        .severity-badge.error {
            background: rgba(239,68,68,0.2);
            color: var(--error);
        }

        .severity-badge.warning {
            background: rgba(245,158,11,0.2);
            color: var(--warning);
        }

        .severity-badge.info {
            background: rgba(59,130,246,0.2);
            color: var(--info);
        }

        .rule-name {
            font-family: 'SF Mono', Monaco, monospace;
            font-size: 0.875rem;
            color: var(--accent);
        }

        .chart-container {
            height: 200px;
            display: flex;
            align-items: flex-end;
            gap: 0.25rem;
            padding: 1rem 0;
        }

        .chart-bar {
            flex: 1;
            background: linear-gradient(to top, var(--accent), var(--accent-secondary));
            border-radius: 4px 4px 0 0;
            min-height: 10px;
            transition: height 0.3s ease;
        }

        .refresh-btn {
            background: linear-gradient(135deg, var(--accent), var(--accent-secondary));
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            color: var(--bg-primary);
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
        }

        .refresh-btn:hover {
            transform: scale(1.05);
        }

        .loading {
            opacity: 0.5;
            pointer-events: none;
        }

        .trend-chart {
            display: flex;
            align-items: flex-end;
            gap: 8px;
            height: 150px;
            padding: 1rem 0;
        }

        .trend-bar {
            flex: 1;
            background: linear-gradient(to top, var(--accent), rgba(0,217,255,0.3));
            border-radius: 4px 4px 0 0;
            position: relative;
            min-height: 5px;
        }

        .trend-bar:hover::after {
            content: attr(data-value);
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: var(--bg-card);
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            white-space: nowrap;
        }

        .empty-state {
            text-align: center;
            padding: 3rem;
            color: var(--text-secondary);
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .updating {
            animation: pulse 1s infinite;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Vue Doctor Dashboard</h1>
        <p>Real-time architecture health monitoring</p>
    </div>

    <div class="container">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <h2>Project Health</h2>
            <button class="refresh-btn" onclick="refreshMetrics()">Refresh</button>
        </div>

        <div class="grid" id="metrics-grid">
            <div class="card loading">
                <div class="card-title">Overall Score</div>
                <div class="score-display">
                    <div class="score-circle" style="--score: 0; --score-color: var(--accent)">
                        <span id="overall-score">--</span>
                    </div>
                    <div class="score-details">
                        <div class="score-value" id="score-label">Loading...</div>
                        <div class="score-label" id="files-count">-- files</div>
                    </div>
                </div>
            </div>

            <div class="card loading">
                <div class="card-title">Issues Found</div>
                <div class="stat-row">
                    <span class="stat-label">Errors</span>
                    <span class="stat-value error" id="error-count">--</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Warnings</span>
                    <span class="stat-value warning" id="warning-count">--</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Info</span>
                    <span class="stat-value info" id="info-count">--</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Total</span>
                    <span class="stat-value" id="total-count">--</span>
                </div>
            </div>

            <div class="card loading">
                <div class="card-title">Architecture</div>
                <div class="stat-row">
                    <span class="stat-label">Dependency Score</span>
                    <span class="stat-value" id="dep-score">--</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Maintainability</span>
                    <span class="stat-value" id="maint-score">--</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Technical Debt</span>
                    <span class="stat-value" id="debt-score">--</span>
                </div>
            </div>

            <div class="card loading">
                <div class="card-title">Component Sizes</div>
                <div class="stat-row">
                    <span class="stat-label">Small (&lt;100 LOC)</span>
                    <span class="stat-value success" id="size-small">--</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Medium (100-300)</span>
                    <span class="stat-value" id="size-medium">--</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Large (300-500)</span>
                    <span class="stat-value warning" id="size-large">--</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Huge (&gt;500)</span>
                    <span class="stat-value error" id="size-huge">--</span>
                </div>
            </div>
        </div>

        <div class="card" style="margin-bottom: 2rem;">
            <div class="card-title">Score Trend (Last 30 runs)</div>
            <div class="trend-chart" id="trend-chart">
                <div class="empty-state">No history data yet. Run 'vue-doctor check' multiple times to build history.</div>
            </div>
        </div>

        <div class="card">
            <div class="card-title">Recent Issues</div>
            <div id="issues-container">
                <div class="empty-state">Loading issues...</div>
            </div>
        </div>
    </div>

    <script>
        async function refreshMetrics() {
            const grid = document.getElementById('metrics-grid');
            grid.classList.add('loading');

            try {
                const response = await fetch('/api/metrics');
                const data = await response.json();

                // Update overall score
                document.getElementById('overall-score').textContent = data.architecture.score;
                document.getElementById('score-label').textContent = getScoreLabel(data.architecture.score);
                document.getElementById('files-count').textContent = data.files + ' files';

                const scoreCircle = document.querySelector('.score-circle');
                scoreCircle.style.setProperty('--score', data.architecture.score);
                scoreCircle.style.setProperty('--score-color', getScoreColor(data.architecture.score));

                // Update issues
                document.getElementById('error-count').textContent = data.issues.errors;
                document.getElementById('warning-count').textContent = data.issues.warnings;
                document.getElementById('info-count').textContent = data.issues.info;
                document.getElementById('total-count').textContent =
                    data.issues.errors + data.issues.warnings + data.issues.info;

                // Update architecture
                document.getElementById('dep-score').textContent = data.architecture.dependencyScore + '/100';
                document.getElementById('maint-score').textContent = data.architecture.maintainabilityScore + '/100';
                document.getElementById('debt-score').textContent = data.architecture.technicalDebt.score + '/100';

                // Update size distribution
                document.getElementById('size-small').textContent = data.architecture.sizeDistribution.small;
                document.getElementById('size-medium').textContent = data.architecture.sizeDistribution.medium;
                document.getElementById('size-large').textContent = data.architecture.sizeDistribution.large;
                document.getElementById('size-huge').textContent = data.architecture.sizeDistribution.huge;

                // Update recent issues
                updateIssues(data.recentIssues);

                grid.classList.remove('loading');
            } catch (error) {
                console.error('Failed to fetch metrics:', error);
                grid.classList.remove('loading');
            }
        }

        async function loadTrend() {
            try {
                const response = await fetch('/api/history');
                const history = await response.json();

                if (history.length > 0) {
                    const chart = document.getElementById('trend-chart');
                    chart.innerHTML = history.slice(-30).map(h => {
                        const height = Math.max(5, h.score * 1.5);
                        return '<div class="trend-bar" style="height: ' + height + 'px" data-value="' + h.score + '/100 (' + new Date(h.timestamp).toLocaleDateString() + ')"></div>';
                    }).join('');
                }
            } catch (error) {
                console.error('Failed to load trend:', error);
            }
        }

        function updateIssues(issues) {
            const container = document.getElementById('issues-container');

            if (!issues || issues.length === 0) {
                container.innerHTML = '<div class="empty-state">No issues found! Your code is in great shape.</div>';
                return;
            }

            let html = '<table class="issues-table"><thead><tr><th>Severity</th><th>Rule</th><th>File</th><th>Message</th></tr></thead><tbody>';

            issues.forEach(issue => {
                const file = issue.file.split('/').pop();
                html += '<tr>';
                html += '<td><span class="severity-badge ' + issue.severity + '">' + issue.severity + '</span></td>';
                html += '<td><span class="rule-name">' + issue.rule + '</span></td>';
                html += '<td>' + file + ':' + issue.line + '</td>';
                html += '<td>' + (issue.message || '').substring(0, 60) + '...</td>';
                html += '</tr>';
            });

            html += '</tbody></table>';
            container.innerHTML = html;
        }

        function getScoreLabel(score) {
            if (score >= 90) return '🟢 Excellent';
            if (score >= 70) return '🟡 Good';
            if (score >= 50) return '🟠 Fair';
            return '🔴 Poor';
        }

        function getScoreColor(score) {
            if (score >= 90) return '#10b981';
            if (score >= 70) return '#f59e0b';
            if (score >= 50) return '#f97316';
            return '#ef4444';
        }

        // Initial load
        refreshMetrics();
        loadTrend();

        // Auto-refresh every 30 seconds
        setInterval(refreshMetrics, 30000);
        setInterval(loadTrend, 30000);
    </script>
</body>
</html>`;
}
