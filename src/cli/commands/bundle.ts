/**
 * Bundle CLI Command
 *
 * Options:
 * --json       Output as JSON
 * --html       Generate interactive HTML report
 * --open       Open report in browser
 * --output     Output file path
 */

import { analyzeBundle, formatBundleAnalysis, type BundleAnalysis } from '../../core/bundle-analyzer';
import fs from 'node:fs';
import open from 'open';

export interface BundleCommandOptions {
    json?: boolean;
    html?: boolean;
    open?: boolean;
    output?: string;
}

export async function bundleCommand(options: BundleCommandOptions = {}) {
    const { json, html, open: shouldOpen, output } = options;

    console.log('Analyzing bundle patterns...\n');

    const analysis = await analyzeBundle();

    if (json) {
        const jsonOutput = JSON.stringify(analysis, null, 2);
        if (output) {
            fs.writeFileSync(output, jsonOutput);
            console.log(`Saved to ${output}`);
        } else {
            console.log(jsonOutput);
        }
        return;
    }

    if (html) {
        const htmlOutput = generateBundleHtml(analysis);
        const filePath = output || 'vue-doctor-bundle-report.html';
        fs.writeFileSync(filePath, htmlOutput);
        console.log(`Bundle report saved to ${filePath}`);

        if (shouldOpen) {
            await open(filePath);
        }
        return;
    }

    // Default: text output
    console.log(formatBundleAnalysis(analysis));
}

function generateBundleHtml(analysis: BundleAnalysis): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bundle Analysis - Vue Doctor</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            padding: 2rem;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 {
            color: #38bdf8;
            margin-bottom: 2rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .card {
            background: #1e293b;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
        }
        .card h2 {
            color: #94a3b8;
            font-size: 0.875rem;
            text-transform: uppercase;
            margin-bottom: 1rem;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        .stat {
            background: #1e293b;
            border-radius: 8px;
            padding: 1rem;
            text-align: center;
        }
        .stat-value {
            font-size: 2rem;
            font-weight: bold;
            color: #38bdf8;
        }
        .stat-label {
            color: #64748b;
            font-size: 0.875rem;
            margin-top: 0.25rem;
        }
        .dep-list {
            display: grid;
            gap: 0.5rem;
        }
        .dep-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem;
            background: #334155;
            border-radius: 6px;
        }
        .dep-name {
            font-weight: 500;
        }
        .dep-size {
            color: #94a3b8;
        }
        .dep-size.warning { color: #fbbf24; }
        .dep-size.danger { color: #ef4444; }
        .recommendation {
            padding: 1rem;
            background: #334155;
            border-radius: 8px;
            margin-bottom: 0.5rem;
            border-left: 4px solid;
        }
        .recommendation.high { border-color: #ef4444; }
        .recommendation.medium { border-color: #fbbf24; }
        .recommendation.low { border-color: #22c55e; }
        .priority {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: bold;
        }
        .priority.high { background: #ef4444; }
        .priority.medium { background: #fbbf24; color: #000; }
        .priority.low { background: #22c55e; }
        .table {
            width: 100%;
            border-collapse: collapse;
        }
        .table th, .table td {
            text-align: left;
            padding: 0.75rem;
            border-bottom: 1px solid #334155;
        }
        .table th {
            color: #64748b;
            font-weight: 500;
        }
        .badge {
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
        }
        .badge.esm { background: #22c55e; color: #000; }
        .badge.cjs { background: #64748b; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📦 Bundle Analysis Report</h1>
        <p style="color: #64748b; margin-bottom: 2rem;">
            Generated by Vue Doctor • ${new Date(analysis.timestamp).toLocaleString()}
        </p>

        <div class="stats-grid">
            <div class="stat">
                <div class="stat-value">${analysis.stats.totalDependencies}</div>
                <div class="stat-label">Dependencies</div>
            </div>
            <div class="stat">
                <div class="stat-value">${(analysis.stats.totalSize / 1024 / 1024).toFixed(1)}MB</div>
                <div class="stat-label">Estimated Size</div>
            </div>
            <div class="stat">
                <div class="stat-value">${analysis.oversizedImports.length}</div>
                <div class="stat-label">Oversized Imports</div>
            </div>
            <div class="stat">
                <div class="stat-value">${analysis.recommendations.length}</div>
                <div class="stat-label">Recommendations</div>
            </div>
        </div>

        ${analysis.stats.largestDeps.length > 0 ? `
        <div class="card">
            <h2>Largest Dependencies</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>Package</th>
                        <th>Version</th>
                        <th>Est. Size</th>
                        <th>Format</th>
                    </tr>
                </thead>
                <tbody>
                    ${analysis.stats.largestDeps.map(dep => {
                        const sizeKB = dep.size / 1024;
                        const sizeClass = sizeKB > 500 ? 'danger' : sizeKB > 100 ? 'warning' : '';
                        return `
                        <tr>
                            <td class="dep-name">${dep.name}</td>
                            <td>${dep.version}</td>
                            <td class="dep-size ${sizeClass}">${sizeKB > 1024 ? (sizeKB/1024).toFixed(1)+'MB' : sizeKB.toFixed(1)+'KB'}</td>
                            <td><span class="badge ${dep.esmAvailable ? 'esm' : 'cjs'}">${dep.esmAvailable ? 'ESM' : 'CJS'}</span></td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}

        ${analysis.oversizedImports.length > 0 ? `
        <div class="card">
            <h2>⚠️ Oversized Imports</h2>
            <div class="dep-list">
                ${analysis.oversizedImports.map(imp => `
                <div class="dep-item">
                    <div>
                        <div class="dep-name">${imp.import}</div>
                        <div style="color: #64748b; font-size: 0.875rem;">${imp.file}</div>
                    </div>
                    <div class="dep-size danger">${(imp.size / 1024).toFixed(1)}KB</div>
                </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        ${analysis.recommendations.length > 0 ? `
        <div class="card">
            <h2>Recommendations</h2>
            ${analysis.recommendations.map(rec => `
            <div class="recommendation ${rec.priority}">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <strong>${rec.title}</strong>
                    <span class="priority ${rec.priority}">${rec.priority.toUpperCase()}</span>
                </div>
                <p style="color: #94a3b8; margin-bottom: 0.5rem;">${rec.description}</p>
                <p style="color: #64748b; font-size: 0.875rem;">Impact: ${rec.impact}</p>
            </div>
            `).join('')}
        </div>
        ` : ''}
    </div>
</body>
</html>`;
}
