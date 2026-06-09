/**
 * HTML Report Generator
 *
 * Generates comprehensive HTML reports with embedded JavaScript for
 * interactive visualizations without requiring a server.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { exec } from 'node:child_process';

import { collectFiles } from '../../utils/file-collector';
import { buildProjectGraph, getHotspots, findCircularDependencies, findOrphanNodes } from '../../core/graph';
import {
    calculateArchitectureScoreV2,
    calculateArchitectureDebt,
    loadScoreHistory,
    calculateScoreDelta,
    type ArchitectureScore,
} from '../../core/score-engine';
import { analyzeFeatureBoundaries, analyzeRouteComplexity } from '../../core/feature-boundary';
import { loadConfig } from '../../core/config';
import {
    generateGaugeChart,
    generateDonutChart,
    generateBarChart,
    type ChartData,
} from '../../reporters/charts';

export interface HtmlReportOptions {
    output?: string;
    open?: boolean;
}

interface ReportData {
    timestamp: string;
    score: ArchitectureScore;
    debt: { total: number; breakdown: Record<string, number> };
    hotspots: { node: { name: string; filePath: string; fanIn: number; fanOut: number; loc: number }; score: number; rank: number }[];
    cycles: { nodes: string[]; length: number; severity: string }[];
    orphans: { filePath: string; type: string }[];
    boundaries: { violations: { sourceFile: string; targetFile: string; sourceBoundary: string; targetBoundary: string }[]; summary: Record<string, number> };
    routes: { filePath: string; route: string; score: number; metrics: Record<string, number> }[];
    graph: { nodes: number; edges: number };
    history: { date: string; overall: number }[];
}

export async function htmlReportCommand(options: HtmlReportOptions = {}) {
    const cwd = process.cwd();
    const outputPath = options.output || 'vue-doctor-report.html';

    console.log('Generating HTML report...');

    // Collect files
    const files = await collectFiles({
        cwd,
        include: ['**/*.vue', '**/*.ts'],
        exclude: ['node_modules/**', 'dist/**', 'build/**'],
    });

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
    const config = await loadConfig();

    // Calculate scores
    let featureViolations: { severity: 'high' | 'medium' | 'low' }[] = [];
    let boundarySummary: Record<string, number> = {};
    let boundaryViolations: { sourceFile: string; targetFile: string; sourceBoundary: string; targetBoundary: string }[] = [];

    if (config.boundaries && config.boundaries.length > 0) {
        const analysis = analyzeFeatureBoundaries(graph, config.boundaries);
        featureViolations = analysis.violations.map((v) => ({ severity: v.severity as 'high' | 'medium' | 'low' }));
        boundarySummary = analysis.summary.byBoundary;
        boundaryViolations = analysis.violations.map((v) => ({
            sourceFile: v.sourceFile,
            targetFile: v.targetFile,
            sourceBoundary: v.sourceBoundary,
            targetBoundary: v.targetBoundary,
        }));
    }

    const score = calculateArchitectureScoreV2(graph, { featureViolations });
    const debt = calculateArchitectureDebt(graph, { featureViolations });

    // Get hotspots
    const hotspots = getHotspots(graph, 10).map((h) => ({
        node: {
            name: h.node.name,
            filePath: h.node.filePath,
            fanIn: h.node.fanIn,
            fanOut: h.node.fanOut,
            loc: h.node.loc,
        },
        score: h.score,
        rank: h.rank,
    }));

    // Get cycles
    const cycles = findCircularDependencies(graph).map((c) => ({
        nodes: c.nodes,
        length: c.length,
        severity: c.severity,
    }));

    // Get orphans
    const orphans = findOrphanNodes(graph).map((n) => ({
        filePath: n.filePath,
        type: n.type,
    }));

    // Get route complexity
    const routes = analyzeRouteComplexity(graph, sources).slice(0, 10).map((r) => ({
        filePath: r.filePath,
        route: r.route,
        score: r.score,
        metrics: r.metrics,
    }));

    // Get history
    const history = await loadScoreHistory(cwd);
    const historyData = history.entries.slice(-30).map((e) => ({
        date: e.date,
        overall: e.overall,
    }));

    // Build report data
    const reportData: ReportData = {
        timestamp: new Date().toISOString(),
        score,
        debt: { total: debt.total, breakdown: debt.breakdown },
        hotspots,
        cycles,
        orphans,
        boundaries: { violations: boundaryViolations, summary: boundarySummary },
        routes,
        graph: { nodes: graph.nodes.length, edges: graph.edges.length },
        history: historyData,
    };

    // Generate HTML
    const html = generateHtmlReport(reportData);

    // Write file
    await fs.writeFile(outputPath, html, 'utf-8');

    console.log(`Report generated: ${outputPath}`);

    // Open browser if requested
    if (options.open) {
        const absolutePath = path.resolve(cwd, outputPath);
        const url = `file://${absolutePath}`;

        // Use platform-specific command to open browser
        if (process.platform === 'darwin') {
            exec(`open "${url}"`);
        } else if (process.platform === 'win32') {
            exec(`start "" "${url}"`);
        } else {
            exec(`xdg-open "${url}"`);
        }
    }
}

function generateHtmlReport(data: ReportData): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vue Doctor - Architecture Report</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            line-height: 1.6;
            padding: 20px;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        h1 { color: #38bdf8; margin-bottom: 10px; }
        h2 { color: #f1f5f9; margin: 30px 0 15px; border-bottom: 1px solid #334155; padding-bottom: 10px; font-size: 1.25rem; }
        h3 { color: #e2e8f0; margin: 15px 0 10px; }
        .header { text-align: center; margin-bottom: 30px; }
        .timestamp { color: #64748b; font-size: 14px; }

        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .grid-3 { grid-template-columns: repeat(3, 1fr); }
        @media (max-width: 900px) { .grid-3 { grid-template-columns: 1fr; } }
        .card {
            background: #1e293b;
            border-radius: 12px;
            padding: 20px;
            border: 1px solid #334155;
        }
        .card-title { color: #94a3b8; font-size: 14px; text-transform: uppercase; margin-bottom: 10px; }

        /* Score Display with Gauge */
        .score-display-wrapper {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
        }
        .score-display-wrapper svg { max-width: 200px; }
        .score-label {
            font-size: 1.25rem;
            font-weight: 600;
        }
        .score-excellent { color: #22c55e; }
        .score-good { color: #eab308; }
        .score-fair { color: #f97316; }
        .score-poor { color: #ef4444; }

        .category-scores { display: flex; flex-direction: column; gap: 15px; }
        .category-item { display: flex; align-items: center; gap: 15px; }
        .category-label { width: 150px; color: #94a3b8; font-size: 0.875rem; }
        .category-bar { flex: 1; height: 24px; background: #334155; border-radius: 12px; overflow: hidden; }
        .category-fill { height: 100%; border-radius: 12px; transition: width 0.5s ease; }
        .category-value { width: 60px; text-align: right; font-weight: 600; }

        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #334155; }
        th { color: #94a3b8; font-weight: 600; cursor: pointer; }
        th:hover { color: #e2e8f0; }
        tr:hover { background: rgba(56, 189, 248, 0.05); }
        tr.hidden { display: none; }

        .severity-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
        }
        .severity-critical { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
        .severity-high { background: rgba(249, 115, 22, 0.2); color: #f97316; }
        .severity-medium { background: rgba(234, 179, 8, 0.2); color: #eab308; }
        .severity-low { background: rgba(34, 197, 94, 0.2); color: #22c55e; }

        .type-badge {
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            background: #334155;
            color: #94a3b8;
        }

        .tab-container { margin-bottom: 20px; }
        .tabs { display: flex; gap: 5px; border-bottom: 1px solid #334155; padding-bottom: 0; flex-wrap: wrap; }
        .tab {
            padding: 10px 20px;
            background: transparent;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            margin-bottom: -1px;
            font-size: 0.875rem;
        }
        .tab:hover { color: #e2e8f0; }
        .tab.active { color: #38bdf8; border-bottom-color: #38bdf8; }
        .tab-content { display: none; padding: 20px 0; }
        .tab-content.active { display: block; }

        .debt-summary { display: flex; gap: 20px; flex-wrap: wrap; }
        .debt-item {
            background: #334155;
            padding: 15px 25px;
            border-radius: 8px;
            text-align: center;
            min-width: 100px;
        }
        .debt-value { font-size: 32px; font-weight: bold; color: #f97316; }
        .debt-label { color: #94a3b8; font-size: 14px; }

        .formula {
            background: #0f172a;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 13px;
            white-space: pre;
            overflow-x: auto;
        }

        /* Chart Containers */
        .chart-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .chart-card {
            background: #334155;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
        }
        .chart-card h4 {
            color: #94a3b8;
            font-size: 0.75rem;
            text-transform: uppercase;
            margin-bottom: 15px;
        }
        .chart-card svg { max-width: 100%; height: auto; }
        .chart-legend {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 12px;
            margin-top: 10px;
            font-size: 0.75rem;
        }
        .legend-item {
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .legend-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
        }

        /* History Chart */
        .history-chart {
            height: 200px;
            display: flex;
            align-items: flex-end;
            gap: 2px;
            padding: 10px 0;
        }
        .history-bar {
            flex: 1;
            background: #38bdf8;
            border-radius: 4px 4px 0 0;
            min-height: 10px;
            transition: height 0.3s ease;
        }
        .history-bar:hover { background: #22d3ee; }

        /* Filter Bar */
        .filter-bar { display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap; align-items: center; }
        .filter-btn {
            padding: 8px 16px;
            background: #334155;
            border: 1px solid #475569;
            border-radius: 6px;
            color: #94a3b8;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 0.875rem;
        }
        .filter-btn:hover { background: #475569; color: #e2e8f0; }
        .filter-btn.active { background: #38bdf8; color: #0f172a; border-color: #38bdf8; }
        .search-input {
            padding: 8px 12px;
            background: #334155;
            border: 1px solid #475569;
            border-radius: 6px;
            color: #e2e8f0;
            font-size: 0.875rem;
            min-width: 200px;
        }
        .search-input:focus { outline: none; border-color: #38bdf8; }
        .search-input::placeholder { color: #64748b; }

        /* Summary Bar */
        .summary-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 15px;
            background: #334155;
            border-radius: 8px;
            margin-bottom: 15px;
            font-size: 0.875rem;
            color: #94a3b8;
        }
        .summary-bar strong { color: #e2e8f0; }

        /* Navigation */
        .nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
        .nav-brand { font-size: 24px; font-weight: bold; color: #38bdf8; }
        .nav-links { display: flex; gap: 20px; flex-wrap: wrap; }
        .nav-links a { color: #94a3b8; text-decoration: none; transition: color 0.2s; }
        .nav-links a:hover { color: #38bdf8; }

        .footer { text-align: center; padding: 30px; color: #64748b; font-size: 14px; }
        .footer a { color: #38bdf8; text-decoration: none; }
        .footer a:hover { text-decoration: underline; }

        /* Trend Badge */
        .trend-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
        }
        .trend-up { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
        .trend-down { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
        .trend-same { background: rgba(100, 116, 139, 0.2); color: #64748b; }

        /* Delta Display */
        .delta-display {
            display: flex;
            gap: 15px;
            margin-top: 10px;
            justify-content: center;
            flex-wrap: wrap;
        }
        .delta-item {
            text-align: center;
            padding: 10px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 8px;
            min-width: 80px;
        }
        .delta-label { font-size: 0.625rem; color: #64748b; text-transform: uppercase; }
        .delta-value { font-size: 1.25rem; font-weight: 700; }
    </style>
</head>
<body>
    <div class="container">
        <nav class="nav">
            <div class="nav-brand">🏥 Vue Doctor</div>
            <div class="nav-links">
                <a href="#overview">Overview</a>
                <a href="#charts">Charts</a>
                <a href="#hotspots">Hotspots</a>
                <a href="#cycles">Cycles</a>
                <a href="#debt">Debt</a>
                <a href="#history">History</a>
            </div>
        </nav>

        <header class="header">
            <h1>Architecture Report</h1>
            <p class="timestamp">Generated: ${new Date(data.timestamp).toLocaleString()}</p>
        </header>

        <!-- Overview Section -->
        <section id="overview">
            <h2>📊 Architecture Score</h2>
            <div class="grid">
                <div class="card">
                    <div class="score-display-wrapper">
                        ${generateGaugeChart(data.score.overall, { size: 200, strokeWidth: 20 })}
                        <div class="score-label ${getScoreClass(data.score.overall)}">
                            ${getScoreLabel(data.score.overall)}
                        </div>
                    </div>
                    ${data.history.length > 1 ? generateScoreDelta(data.history) : ''}
                </div>
                <div class="card">
                    <div class="card-title">Category Scores</div>
                    <div class="category-scores">
                        ${generateCategoryBars(data.score)}
                    </div>
                </div>
            </div>
        </section>

        <!-- Charts Section -->
        <section id="charts">
            <h2>📈 Analysis Charts</h2>
            <div class="chart-grid">
                <div class="chart-card">
                    <h4>Score Breakdown</h4>
                    ${generateDonutChart(getScoreBreakdownData(data.score), { size: 200, strokeWidth: 24 })}
                    <div class="chart-legend">
                        ${generateScoreLegend(data.score)}
                    </div>
                </div>
                <div class="chart-card">
                    <h4>Component Distribution</h4>
                    ${generateBarChart(getComponentTypeData(data.graph), { width: 280, height: 180, barColor: '#38bdf8' })}
                </div>
                <div class="chart-card">
                    <h4>Debt Breakdown</h4>
                    ${generateBarChart(getDebtData(data.debt), { width: 280, height: 180, barColor: '#f97316' })}
                </div>
            </div>
        </section>

        <!-- Score Formula -->
        <section>
            <h2>📐 Score Formula</h2>
            <div class="card">
                <div class="formula">Base Score: 100

Deductions:
  Circular dependency (critical)   -8  per cycle
  Circular dependency (high)       -5  per cycle
  Circular dependency (medium)   -2  per cycle
  Feature leakage (high)          -4  per violation
  Feature leakage (medium)        -2  per violation
  Hotspot (score > 80)           -3  per file
  Hotspot (score > 60)           -1  per file
  Orphan component                -0.5 per file
  Architecture smell (critical)   -5  per smell

Floor: 0</div>
            </div>
        </section>

        <!-- Graph Stats -->
        <section>
            <h2>🔗 Project Graph</h2>
            <div class="grid">
                <div class="card">
                    <div class="card-title">Statistics</div>
                    <p>Nodes: <strong>${data.graph.nodes}</strong></p>
                    <p>Edges: <strong>${data.graph.edges}</strong></p>
                </div>
                <div class="card">
                    <div class="card-title">Score Breakdown</div>
                    <p>Architecture: <strong>${data.score.architecture}/100</strong></p>
                    <p>Maintainability: <strong>${data.score.maintainability}/100</strong></p>
                    <p>Performance: <strong>${data.score.performance}/100</strong></p>
                    <p>SSR Safety: <strong>${data.score.ssrSafety}/100</strong></p>
                </div>
            </div>
        </section>

        <!-- Hotspots -->
        <section id="hotspots">
            <h2>🔥 Top Hotspots</h2>
            ${data.hotspots.length > 0 ? `
            <div class="card">
                <div class="filter-bar">
                    <input type="text" class="search-input" id="hotspot-search" placeholder="Search hotspots...">
                    <button class="filter-btn active" data-filter="all">All</button>
                    <button class="filter-btn" data-filter="critical">Critical</button>
                    <button class="filter-btn" data-filter="high">High</button>
                </div>
                <div class="summary-bar">
                    <span>Showing <strong id="hotspot-visible-count">${data.hotspots.length}</strong> of ${data.hotspots.length} hotspots</span>
                </div>
                <table id="hotspots-table">
                    <thead>
                        <tr>
                            <th data-sort="rank">#</th>
                            <th data-sort="name">File</th>
                            <th data-sort="score">Score</th>
                            <th data-sort="fanIn">Fan-In</th>
                            <th data-sort="fanOut">Fan-Out</th>
                            <th data-sort="loc">LOC</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.hotspots.map(h => `
                        <tr data-severity="${getHotspotSeverity(h.score)}" data-name="${h.node.name.toLowerCase()}">
                            <td>#${h.rank}</td>
                            <td style="font-family: monospace; font-size: 0.875rem;">${escapeHtml(h.node.name)}</td>
                            <td><span class="severity-badge severity-${getHotspotSeverity(h.score)}">${h.score.toFixed(0)}</span></td>
                            <td>${h.node.fanIn}</td>
                            <td>${h.node.fanOut}</td>
                            <td>${h.node.loc}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : '<p style="color: #22c55e;">✅ No hotspots detected!</p>'}
        </section>

        <!-- Circular Dependencies -->
        <section id="cycles">
            <h2>🔄 Circular Dependencies</h2>
            ${data.cycles.length > 0 ? `
            <div class="card">
                <div class="filter-bar">
                    <input type="text" class="search-input" id="cycle-search" placeholder="Search cycles...">
                    <button class="filter-btn active" data-filter="all">All</button>
                    <button class="filter-btn" data-filter="critical">Critical</button>
                    <button class="filter-btn" data-filter="high">High</button>
                    <button class="filter-btn" data-filter="medium">Medium</button>
                </div>
                <div class="summary-bar">
                    <span>Showing <strong id="cycle-visible-count">${data.cycles.length}</strong> of ${data.cycles.length} cycles</span>
                </div>
                <table id="cycles-table">
                    <thead>
                        <tr>
                            <th>Severity</th>
                            <th>Length</th>
                            <th>Path</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.cycles.map(c => `
                        <tr data-severity="${c.severity}" data-path="${c.nodes.join(' ').toLowerCase()}">
                            <td><span class="severity-badge severity-${c.severity}">${c.severity.toUpperCase()}</span></td>
                            <td>${c.length}</td>
                            <td style="font-family: monospace; font-size: 0.75rem; color: #94a3b8;">
                                ${c.nodes.map((n, i) => `${i > 0 ? ' → ' : ''}${escapeHtml(n.split('/').pop() || n)}`).join('')}
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : '<p style="color: #22c55e;">✅ No circular dependencies!</p>'}
        </section>

        <!-- Orphans -->
        <section>
            <h2>👻 Orphan Files</h2>
            <p>${data.orphans.length} orphan file(s) detected</p>
            ${data.orphans.length > 0 ? `
            <div class="card" style="max-height: 300px; overflow-y: auto;">
                <table>
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>File</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.orphans.slice(0, 20).map(o => `
                        <tr>
                            <td><span class="type-badge">${o.type}</span></td>
                            <td style="font-size: 12px; color: #94a3b8;">${escapeHtml(o.filePath)}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : '<p style="color: #22c55e;">✅ No orphan files!</p>'}
        </section>

        <!-- Architecture Debt -->
        <section id="debt">
            <h2>💰 Architecture Debt</h2>
            <div class="debt-summary">
                <div class="debt-item">
                    <div class="debt-value">${data.debt.total}h</div>
                    <div class="debt-label">Total Estimated</div>
                </div>
                ${Object.entries(data.debt.breakdown).map(([key, value]) => value > 0 ? `
                <div class="debt-item">
                    <div class="debt-value">${value}h</div>
                    <div class="debt-label">${key.replace(/([A-Z])/g, ' $1').trim()}</div>
                </div>
                ` : '').join('')}
            </div>
        </section>

        <!-- Route Complexity -->
        ${data.routes.length > 0 ? `
        <section>
            <h2>🛤️ Route Complexity</h2>
            <div class="card">
                <table>
                    <thead>
                        <tr>
                            <th>Route</th>
                            <th>Score</th>
                            <th>Components</th>
                            <th>Stores</th>
                            <th>Composables</th>
                            <th>API Calls</th>
                            <th>LOC</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.routes.map(r => `
                        <tr>
                            <td>${escapeHtml(r.route)}</td>
                            <td><span class="severity-badge severity-${r.score > 50 ? 'high' : 'low'}">${r.score}</span></td>
                            <td>${r.metrics.componentCount || 0}</td>
                            <td>${r.metrics.storeCount || 0}</td>
                            <td>${r.metrics.composableCount || 0}</td>
                            <td>${r.metrics.apiCallCount || 0}</td>
                            <td>${r.metrics.totalLoc || 0}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </section>
        ` : ''}

        <!-- Feature Boundaries -->
        ${data.boundaries.violations.length > 0 ? `
        <section>
            <h2>🏛️ Feature Boundary Violations</h2>
            <div class="card">
                <table>
                    <thead>
                        <tr>
                            <th>Source</th>
                            <th>Target</th>
                            <th>Violation</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.boundaries.violations.map(v => `
                        <tr>
                            <td>${escapeHtml(v.sourceBoundary)}</td>
                            <td>${escapeHtml(v.targetBoundary)}</td>
                            <td>${escapeHtml(v.sourceFile.split('/').pop() || '')} → ${escapeHtml(v.targetFile.split('/').pop() || '')}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </section>
        ` : ''}

        <!-- History Chart -->
        ${data.history.length > 1 ? `
        <section>
            <h2>📈 Score History</h2>
            <div class="card">
                <div class="history-chart">
                    ${data.history.map(h => {
                        const height = (h.overall / 100) * 180 + 10;
                        return `<div class="history-bar" style="height: ${height}px;" title="${h.date}: ${h.overall}"></div>`;
                    }).join('')}
                </div>
                <div style="display: flex; justify-content: space-between; color: #64748b; font-size: 12px;">
                    <span>${data.history[0]?.date}</span>
                    <span>${data.history[data.history.length - 1]?.date}</span>
                </div>
            </div>
        </section>
        ` : ''}

        <footer class="footer">
            <p>Generated by Vue Doctor - Architecture Analysis Tool</p>
            <p>Report data embedded for offline viewing</p>
        </footer>
    </div>

    <script>
        // Embedded report data
        const reportData = ${JSON.stringify(data)};

        // Tab functionality
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(tabId)?.classList.add('active');
            });
        });

        // Smooth scroll for nav links
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(link.getAttribute('href'));
                target?.scrollIntoView({ behavior: 'smooth' });
            });
        });

        // Interactive filtering for hotspots
        function setupTableFilter(tableId, searchId, countId, severityColumn, nameColumn) {
            severityColumn = severityColumn || 'data-severity';
            nameColumn = nameColumn || 'data-name';
            const searchInput = document.getElementById(searchId);
            const countEl = document.getElementById(countId);
            const selector = '#' + tableId + ' .filter-btn[data-filter]';
            const filterBtns = document.querySelectorAll(selector);
            const table = document.getElementById(tableId);
            const tbody = table && table.querySelector('tbody');
            const rows = (tbody ? Array.from(tbody.querySelectorAll('tr')) : []) as HTMLElement[];

            let currentFilter = 'all';
            let searchTerm = '';

            function updateVisibility() {
                let visible = 0;
                rows.forEach(row => {
                    const severity = row.getAttribute(severityColumn) || '';
                    const name = row.getAttribute(nameColumn) || '';
                    const matchesFilter = currentFilter === 'all' || severity === currentFilter;
                    const matchesSearch = searchTerm === '' || name.includes(searchTerm) || row.textContent.toLowerCase().includes(searchTerm);

                    if (matchesFilter && matchesSearch) {
                        row.classList.remove('hidden');
                        visible++;
                    } else {
                        row.classList.add('hidden');
                    }
                });
                if (countEl) countEl.textContent = visible;
            }

            searchInput?.addEventListener('input', (e) => {
                searchTerm = e.target.value.toLowerCase();
                updateVisibility();
            });

            filterBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    filterBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentFilter = btn.dataset.filter;
                    updateVisibility();
                });
            });
        }

        // Setup table filters
        setupTableFilter('hotspots-table', 'hotspot-search', 'hotspot-visible-count');
        setupTableFilter('cycles-table', 'cycle-search', 'cycle-visible-count');

        // Table sorting
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const column = th.dataset.sort;
                const isDesc = th.classList.contains('sorted');
                const table = th.closest('table');
                const tbody = table?.querySelector('tbody');
                const rows = Array.from(tbody?.querySelectorAll('tr:not(.hidden)') || []);

                document.querySelectorAll('th[data-sort]').forEach(h => {
                    h.classList.remove('sorted', 'desc');
                });

                if (!isDesc) {
                    th.classList.add('sorted');
                } else {
                    th.classList.add('sorted', 'desc');
                }

                rows.sort((a, b) => {
                    let aVal, bVal;
                    const idx = Array.from(th.parentNode.children).indexOf(th) + 1;
                    const aCell = a.querySelectorAll('td')[idx - 1];
                    const bCell = b.querySelectorAll('td')[idx - 1];

                    if (column === 'rank') {
                        aVal = parseInt(aCell?.textContent?.replace('#', '') || '0');
                        bVal = parseInt(bCell?.textContent?.replace('#', '') || '0');
                    } else if (column === 'score') {
                        aVal = parseFloat(aCell?.textContent || '0');
                        bVal = parseFloat(bCell?.textContent || '0');
                    } else if (column === 'fanIn' || column === 'fanOut' || column === 'loc') {
                        aVal = parseInt(aCell?.textContent || '0');
                        bVal = parseInt(bCell?.textContent || '0');
                    } else {
                        aVal = aCell?.textContent || '';
                        bVal = bCell?.textContent || '';
                    }

                    if (typeof aVal === 'number') {
                        return isDesc ? bVal - aVal : aVal - bVal;
                    }
                    return isDesc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
                });

                rows.forEach(row => tbody?.appendChild(row));
            });
        });
    </script>
</body>
</html>`;
}

function getScoreClass(score: number): string {
    if (score >= 90) return 'score-excellent';
    if (score >= 70) return 'score-good';
    if (score >= 50) return 'score-fair';
    return 'score-poor';
}

function getScoreLabel(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Poor';
}

function getHotspotSeverity(score: number): string {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
}

function generateCategoryBars(score: ArchitectureScore): string {
    const categories = [
        { label: 'Architecture', value: score.architecture, color: '#38bdf8' },
        { label: 'Maintainability', value: score.maintainability, color: '#a855f7' },
        { label: 'Performance', value: score.performance, color: '#22c55e' },
        { label: 'SSR Safety', value: score.ssrSafety, color: '#f97316' },
    ];

    return categories.map(cat => `
        <div class="category-item">
            <span class="category-label">${cat.label}</span>
            <div class="category-bar">
                <div class="category-fill" style="width: ${cat.value}%; background: ${cat.color};"></div>
            </div>
            <span class="category-value">${cat.value}</span>
        </div>
    `).join('');
}

function escapeHtml(text: string): string {
    const htmlEscapes: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    };
    return text.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char);
}

// Chart data generators
function getScoreBreakdownData(score: ArchitectureScore): ChartData[] {
    return [
        { label: 'Architecture', value: score.architecture, color: '#38bdf8' },
        { label: 'Maintainability', value: score.maintainability, color: '#a855f7' },
        { label: 'Performance', value: score.performance, color: '#22c55e' },
        { label: 'SSR Safety', value: score.ssrSafety, color: '#f97316' },
    ];
}

function generateScoreLegend(score: ArchitectureScore): string {
    const items = [
        { label: 'Architecture', value: score.architecture, color: '#38bdf8' },
        { label: 'Maintainability', value: score.maintainability, color: '#a855f7' },
        { label: 'Performance', value: score.performance, color: '#22c55e' },
        { label: 'SSR Safety', value: score.ssrSafety, color: '#f97316' },
    ];

    return items.map(item => `
        <div class="legend-item">
            <div class="legend-dot" style="background: ${item.color}"></div>
            <span>${item.label}: ${item.value}</span>
        </div>
    `).join('');
}

function getComponentTypeData(graph: { nodes: number; edges: number }): ChartData[] {
    return [
        { label: 'Nodes', value: graph.nodes, color: '#38bdf8' },
        { label: 'Edges', value: graph.edges, color: '#a855f7' },
    ];
}

function getDebtData(debt: { total: number; breakdown: Record<string, number> }): ChartData[] {
    const colors: Record<string, string> = {
        architecture: '#38bdf8',
        code: '#a855f7',
        performance: '#22c55e',
        ssr: '#f97316',
    };

    return Object.entries(debt.breakdown)
        .filter(([_, value]) => value > 0)
        .map(([key, value]) => ({
            label: key.charAt(0).toUpperCase() + key.slice(1),
            value: value as number,
            color: colors[key] || '#64748b',
        }));
}

function generateScoreDelta(history: { date: string; overall: number }[]): string {
    if (history.length < 2) return '';

    const latest = history[history.length - 1].overall;
    const previous = history[history.length - 2].overall;
    const delta = latest - previous;

    let trendClass = 'trend-same';
    let arrow = '→';
    if (delta > 0) {
        trendClass = 'trend-down';
        arrow = '↑';
    } else if (delta < 0) {
        trendClass = 'trend-up';
        arrow = '↓';
    }

    return `
        <div class="delta-display">
            <div class="delta-item">
                <div class="delta-label">Previous</div>
                <div class="delta-value" style="color: #94a3b8;">${previous}</div>
            </div>
            <div class="delta-item">
                <div class="delta-label">Current</div>
                <div class="delta-value">${latest}</div>
            </div>
            <div class="delta-item">
                <div class="delta-label">Change</div>
                <div class="delta-value ${delta > 0 ? 'score-excellent' : delta < 0 ? 'score-poor' : ''}">
                    ${arrow} ${Math.abs(delta)}
                </div>
            </div>
        </div>
    `;
}
