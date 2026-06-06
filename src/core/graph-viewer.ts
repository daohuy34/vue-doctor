/**
 * Graph Viewer - Interactive Web-based Visualization
 *
 * Serves an interactive D3.js force-directed graph in the browser.
 */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {
    buildProjectGraph,
    type ProjectGraph,
    type GraphNode,
    type GraphEdge,
} from '../core/graph';
import fg from 'fast-glob';

const DEFAULT_PORT = 3456;

export interface GraphViewerOptions {
    port?: number;
    open?: boolean;
    type?: 'page' | 'component' | 'store' | 'composable' | 'all';
}

/**
 * Start the interactive graph viewer
 */
export async function startGraphViewer(options: GraphViewerOptions = {}) {
    const port = options.port || DEFAULT_PORT;

    const files = await fg(['**/*.{vue,ts,tsx,js,jsx,mjs}'], {
        ignore: [
            '**/node_modules/**',
            '**/dist/**',
            '**/.nuxt/**',
            '**/coverage/**',
            '**/*.test.ts',
            '**/*.spec.ts',
        ],
    });

    const sources = new Map<string, string>();
    for (const file of files) {
        try {
            sources.set(file, await fs.promises.readFile(file, 'utf-8'));
        } catch {
            // Skip unreadable files
        }
    }

    const graph = buildProjectGraph(files, sources);
    const graphData = transformGraphForD3(graph, options.type);

    const server = http.createServer((req, res) => {
        if (req.url === '/' || req.url === '/index.html') {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(generateViewerHtml(graphData));
        } else if (req.url === '/graph.json') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(graphData));
        } else if (req.url === '/data') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(graphData));
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    });

    server.listen(port, () => {
        console.log(`\n  🕸️  Graph Viewer running at http://localhost:${port}\n`);
        console.log(`  Nodes: ${graphData.nodes.length} | Edges: ${graphData.edges.length}\n`);
    });

    return server;
}

interface D3Node {
    id: string;
    label: string;
    type: string;
    filePath: string;
    fanIn: number;
    fanOut: number;
    loc: number;
    hotspotScore: number;
    isHotspot: boolean;
    isCycle: boolean;
    isOrphan: boolean;
}

interface D3Edge {
    source: string;
    target: string;
    type: 'static' | 'dynamic';
}

interface D3GraphData {
    nodes: D3Node[];
    edges: D3Edge[];
    meta: {
        totalNodes: number;
        totalEdges: number;
        hotspots: number;
        cycles: number;
        orphans: number;
        byType: Record<string, number>;
    };
}

/**
 * Transform project graph to D3-friendly format
 */
function transformGraphForD3(
    graph: ProjectGraph,
    filterType?: 'page' | 'component' | 'store' | 'composable' | 'all'
): D3GraphData {
    const nodes: D3Node[] = [];
    const edges: D3Edge[] = [];
    const nodeIds = new Set<string>();

    // Calculate hotspot scores
    const hotspotScores = new Map<string, number>();
    for (const [id, node] of graph.nodes) {
        const score = (node.fanIn * 0.3) + (node.fanOut * 0.2) + (node.loc / 10 * 0.2);
        hotspotScores.set(id, score);
    }

    // Find hotspots (top 10 by score)
    const sortedNodes = [...hotspotScores.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    const hotspotIds = new Set(sortedNodes.map(([id]) => id));

    // Find nodes in cycles
    const cycleNodes = findNodesInCycles(graph);

    // Find orphans
    const orphanIds = new Set<string>();
    for (const [id, node] of graph.nodes) {
        if (node.fanIn === 0 && node.fanOut === 0 && node.type !== 'page') {
            orphanIds.add(id);
        }
    }

    // Process nodes
    for (const [id, node] of graph.nodes) {
        if (filterType && filterType !== 'all' && node.type !== filterType) {
            continue;
        }

        nodeIds.add(id);
        nodes.push({
            id,
            label: path.basename(id, path.extname(id)),
            type: node.type,
            filePath: id,
            fanIn: node.fanIn,
            fanOut: node.fanOut,
            loc: node.loc,
            hotspotScore: hotspotScores.get(id) || 0,
            isHotspot: hotspotIds.has(id),
            isCycle: cycleNodes.has(id),
            isOrphan: orphanIds.has(id),
        });
    }

    // Process edges
    for (const edge of graph.edges) {
        if (nodeIds.has(edge.from) && nodeIds.has(edge.to)) {
            edges.push({
                source: edge.from,
                target: edge.to,
                type: edge.dynamic ? 'dynamic' : 'static',
            });
        }
    }

    // Calculate metadata
    const byType: Record<string, number> = {};
    for (const node of nodes) {
        byType[node.type] = (byType[node.type] || 0) + 1;
    }

    return {
        nodes,
        edges,
        meta: {
            totalNodes: nodes.length,
            totalEdges: edges.length,
            hotspots: nodes.filter(n => n.isHotspot).length,
            cycles: nodes.filter(n => n.isCycle).length,
            orphans: nodes.filter(n => n.isOrphan).length,
            byType,
        },
    };
}

/**
 * Find nodes that are part of circular dependencies
 */
function findNodesInCycles(graph: ProjectGraph): Set<string> {
    const cycleNodes = new Set<string>();
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    function dfs(nodeId: string, path: string[]): boolean {
        if (recursionStack.has(nodeId)) {
            // Found a cycle - mark all nodes in the cycle
            const cycleStart = path.indexOf(nodeId);
            for (let i = cycleStart; i < path.length; i++) {
                cycleNodes.add(path[i]);
            }
            cycleNodes.add(nodeId);
            return true;
        }

        if (visited.has(nodeId)) {
            return false;
        }

        visited.add(nodeId);
        recursionStack.add(nodeId);

        const edges = graph.edges.filter(e => e.from === nodeId);
        for (const edge of edges) {
            dfs(edge.to, [...path, nodeId]);
        }

        recursionStack.delete(nodeId);
        return false;
    }

    for (const [nodeId] of graph.nodes) {
        if (!visited.has(nodeId)) {
            dfs(nodeId, []);
        }
    }

    return cycleNodes;
}

/**
 * Generate the HTML page with D3.js visualization
 */
function generateViewerHtml(data: D3GraphData): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vue Doctor - Graph Viewer</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            overflow: hidden;
        }
        #graph-container {
            width: 100vw;
            height: 100vh;
            position: relative;
        }
        svg { display: block; }
        .node {
            cursor: pointer;
            transition: filter 0.2s;
        }
        .node:hover { filter: brightness(1.3); }
        .node-label {
            font-size: 10px;
            fill: #e2e8f0;
            pointer-events: none;
            text-anchor: middle;
        }
        .link {
            stroke: #475569;
            stroke-opacity: 0.4;
        }
        .link.dynamic {
            stroke: #8b5cf6;
            stroke-dasharray: 4,2;
        }
        .link.highlighted {
            stroke: #38bdf8;
            stroke-opacity: 1;
            stroke-width: 2;
        }
        .node.highlighted circle {
            stroke: #38bdf8;
            stroke-width: 3;
        }
        #sidebar {
            position: absolute;
            top: 0;
            left: 0;
            width: 320px;
            height: 100vh;
            background: #1e293b;
            border-right: 1px solid #334155;
            display: flex;
            flex-direction: column;
            z-index: 100;
        }
        #sidebar.collapsed {
            width: 50px;
        }
        #sidebar.collapsed .sidebar-content { display: none; }
        .sidebar-header {
            padding: 1rem;
            background: #0f172a;
            border-bottom: 1px solid #334155;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .sidebar-header h1 {
            font-size: 1.25rem;
            color: #38bdf8;
        }
        .toggle-btn {
            background: none;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            font-size: 1.5rem;
            padding: 0.25rem;
        }
        .sidebar-content {
            flex: 1;
            overflow-y: auto;
            padding: 1rem;
        }
        .stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }
        .stat-card {
            background: #334155;
            padding: 0.75rem;
            border-radius: 8px;
            text-align: center;
        }
        .stat-value {
            font-size: 1.5rem;
            font-weight: bold;
            color: #38bdf8;
        }
        .stat-label {
            font-size: 0.75rem;
            color: #94a3b8;
            text-transform: uppercase;
        }
        .filter-group {
            margin-bottom: 1rem;
        }
        .filter-group label {
            display: block;
            font-size: 0.75rem;
            color: #94a3b8;
            text-transform: uppercase;
            margin-bottom: 0.5rem;
        }
        .filter-btn {
            background: #334155;
            border: 1px solid #475569;
            color: #e2e8f0;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.875rem;
            margin-right: 0.5rem;
            margin-bottom: 0.5rem;
        }
        .filter-btn:hover { background: #475569; }
        .filter-btn.active {
            background: #38bdf8;
            color: #0f172a;
            border-color: #38bdf8;
        }
        .node-details {
            background: #334155;
            border-radius: 8px;
            padding: 1rem;
            margin-top: 1rem;
            display: none;
        }
        .node-details.visible { display: block; }
        .node-details h3 {
            color: #38bdf8;
            margin-bottom: 0.5rem;
            word-break: break-all;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 0.25rem 0;
            border-bottom: 1px solid #475569;
        }
        .detail-label { color: #94a3b8; }
        .detail-value { font-weight: 500; }
        .badge {
            display: inline-block;
            padding: 0.125rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            margin-left: 0.5rem;
        }
        .badge.hotspot { background: #ef4444; color: white; }
        .badge.cycle { background: #f59e0b; color: #0f172a; }
        .badge.orphan { background: #64748b; color: white; }
        .legend {
            display: flex;
            gap: 1rem;
            margin-top: 1rem;
            flex-wrap: wrap;
        }
        .legend-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.75rem;
        }
        .legend-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
        }
        #controls {
            position: absolute;
            bottom: 1rem;
            right: 1rem;
            display: flex;
            gap: 0.5rem;
            z-index: 100;
        }
        .control-btn {
            background: #1e293b;
            border: 1px solid #334155;
            color: #e2e8f0;
            padding: 0.75rem;
            border-radius: 8px;
            cursor: pointer;
        }
        .control-btn:hover { background: #334155; }
        #tooltip {
            position: absolute;
            background: #1e293b;
            border: 1px solid #334155;
            padding: 0.5rem;
            border-radius: 6px;
            font-size: 0.875rem;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
            z-index: 200;
        }
        #tooltip.visible { opacity: 1; }
    </style>
</head>
<body>
    <div id="graph-container">
        <div id="sidebar">
            <div class="sidebar-header">
                <h1>🕸️ Graph</h1>
                <button class="toggle-btn" onclick="toggleSidebar()">◀</button>
            </div>
            <div class="sidebar-content">
                <div class="stats">
                    <div class="stat-card">
                        <div class="stat-value">${data.meta.totalNodes}</div>
                        <div class="stat-label">Nodes</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${data.meta.totalEdges}</div>
                        <div class="stat-label">Edges</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${data.meta.hotspots}</div>
                        <div class="stat-label">Hotspots</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${data.meta.cycles}</div>
                        <div class="stat-label">In Cycles</div>
                    </div>
                </div>

                <div class="filter-group">
                    <label>Filter by Type</label>
                    <button class="filter-btn active" data-type="all">All</button>
                    <button class="filter-btn" data-type="page">Pages</button>
                    <button class="filter-btn" data-type="component">Components</button>
                    <button class="filter-btn" data-type="composable">Composables</button>
                    <button class="filter-btn" data-type="store">Stores</button>
                </div>

                <div class="filter-group">
                    <label>Highlight</label>
                    <button class="filter-btn" id="btn-hotspots">Hotspots</button>
                    <button class="filter-btn" id="btn-cycles">Cycles</button>
                    <button class="filter-btn" id="btn-orphans">Orphans</button>
                </div>

                <div class="node-details" id="node-details">
                    <h3 id="detail-name">-</h3>
                    <div class="detail-row">
                        <span class="detail-label">Type</span>
                        <span class="detail-value" id="detail-type">-</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Fan-In</span>
                        <span class="detail-value" id="detail-fanin">-</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Fan-Out</span>
                        <span class="detail-value" id="detail-fanout">-</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Lines</span>
                        <span class="detail-value" id="detail-loc">-</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Hotspot Score</span>
                        <span class="detail-value" id="detail-score">-</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Path</span>
                        <span class="detail-value" id="detail-path" style="word-break: break-all; font-size: 0.75rem;">-</span>
                    </div>
                </div>

                <div class="legend">
                    <div class="legend-item">
                        <div class="legend-dot" style="background: #6366f1;"></div>
                        <span>Component</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-dot" style="background: #22c55e;"></div>
                        <span>Page</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-dot" style="background: #f59e0b;"></div>
                        <span>Composable</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-dot" style="background: #ec4899;"></div>
                        <span>Store</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-dot" style="background: #ef4444;"></div>
                        <span>Hotspot</span>
                    </div>
                </div>
            </div>
        </div>

        <div id="tooltip"></div>

        <div id="controls">
            <button class="control-btn" onclick="zoomIn()" title="Zoom In">+</button>
            <button class="control-btn" onclick="zoomOut()" title="Zoom Out">−</button>
            <button class="control-btn" onclick="resetZoom()" title="Reset">⌂</button>
            <button class="control-btn" onclick="togglePhysics()" title="Toggle Physics">⚡</button>
        </div>
    </div>

    <script>
        const graphData = ${JSON.stringify(data)};
        let simulation, svg, g, zoom;
        let currentFilter = 'all';
        let physicsEnabled = true;
        let highlightedNodes = new Set();

        const typeColors = {
            component: '#6366f1',
            page: '#22c55e',
            composable: '#f59e0b',
            store: '#ec4899',
            util: '#64748b',
            other: '#94a3b8'
        };

        function initGraph() {
            const container = document.getElementById('graph-container');
            const width = container.clientWidth;
            const height = container.clientHeight;

            svg = d3.select('#graph-container')
                .append('svg')
                .attr('width', width)
                .attr('height', height);

            zoom = d3.zoom()
                .scaleExtent([0.1, 4])
                .on('zoom', (event) => {
                    g.attr('transform', event.transform);
                });

            svg.call(zoom);

            g = svg.append('g');

            const links = graphData.edges.map(d => Object.create(d));
            const nodes = graphData.nodes.map(d => Object.create(d));

            simulation = d3.forceSimulation(nodes)
                .force('link', d3.forceLink(links).id(d => d.id).distance(80))
                .force('charge', d3.forceManyBody().strength(-200))
                .force('center', d3.forceCenter(width / 2, height / 2))
                .force('collision', d3.forceCollide().radius(30));

            const link = g.append('g')
                .selectAll('line')
                .data(links)
                .join('line')
                .attr('class', d => 'link ' + (d.type === 'dynamic' ? 'dynamic' : ''));

            const node = g.append('g')
                .selectAll('g')
                .data(nodes)
                .join('g')
                .attr('class', 'node')
                .call(d3.drag()
                    .on('start', dragstarted)
                    .on('drag', dragged)
                    .on('end', dragended));

            node.append('circle')
                .attr('r', d => d.isHotspot ? 12 : 8)
                .attr('fill', d => d.isHotspot ? '#ef4444' : typeColors[d.type] || typeColors.other)
                .attr('stroke', d => d.isCycle ? '#f59e0b' : 'transparent')
                .attr('stroke-width', d => d.isCycle ? 3 : 0);

            node.append('text')
                .attr('class', 'node-label')
                .attr('dy', d => d.isHotspot ? 20 : 15)
                .text(d => d.label.length > 15 ? d.label.slice(0, 12) + '...' : d.label);

            node.on('click', (event, d) => {
                event.stopPropagation();
                showNodeDetails(d);
            });

            node.on('mouseover', (event, d) => {
                showTooltip(event, d);
                highlightConnections(d);
            });

            node.on('mouseout', () => {
                hideTooltip();
                clearHighlight();
            });

            simulation.on('tick', () => {
                link
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y);

                node.attr('transform', d => \`translate(\${d.x},\${d.y})\`);
            });

            setupFilters();
        }

        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            if (!physicsEnabled) {
                d.fx = null;
                d.fy = null;
            }
        }

        function showNodeDetails(d) {
            const details = document.getElementById('node-details');
            details.classList.add('visible');

            document.getElementById('detail-name').innerHTML =
                d.label + (d.isHotspot ? '<span class="badge hotspot">HOTSPOT</span>' : '') +
                (d.isCycle ? '<span class="badge cycle">CYCLE</span>' : '') +
                (d.isOrphan ? '<span class="badge orphan">ORPHAN</span>' : '');

            document.getElementById('detail-type').textContent = d.type;
            document.getElementById('detail-fanin').textContent = d.fanIn;
            document.getElementById('detail-fanout').textContent = d.fanOut;
            document.getElementById('detail-loc').textContent = d.loc + ' lines';
            document.getElementById('detail-score').textContent = d.hotspotScore.toFixed(1);
            document.getElementById('detail-path').textContent = d.filePath;
        }

        function showTooltip(event, d) {
            const tooltip = document.getElementById('tooltip');
            tooltip.innerHTML = \`<strong>\${d.label}</strong><br/>
                \${d.type} • Fan-In: \${d.fanIn} • Fan-Out: \${d.fanOut}\`;
            tooltip.style.left = (event.pageX + 10) + 'px';
            tooltip.style.top = (event.pageY - 10) + 'px';
            tooltip.classList.add('visible');
        }

        function hideTooltip() {
            document.getElementById('tooltip').classList.remove('visible');
        }

        function highlightConnections(d) {
            const connected = new Set([d.id]);
            graphData.edges.forEach(e => {
                if (e.source === d.id || e.source.id === d.id) connected.add(e.target);
                if (e.target === d.id || e.target.id === d.id) connected.add(e.source);
            });

            d3.selectAll('.node').style('opacity', n => connected.has(n.id) ? 1 : 0.2);
            d3.selectAll('.link').style('opacity', l =>
                (l.source.id || l.source) === d.id || (l.target.id || l.target) === d.id ? 1 : 0.1
            );
        }

        function clearHighlight() {
            d3.selectAll('.node').style('opacity', 1);
            d3.selectAll('.link').style('opacity', 1);
        }

        function setupFilters() {
            document.querySelectorAll('.filter-btn[data-type]').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.filter-btn[data-type]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentFilter = btn.dataset.type;
                    filterNodes();
                });
            });

            document.getElementById('btn-hotspots').addEventListener('click', function() {
                this.classList.toggle('active');
                filterByHighlight('hotspot');
            });

            document.getElementById('btn-cycles').addEventListener('click', function() {
                this.classList.toggle('active');
                filterByHighlight('cycle');
            });

            document.getElementById('btn-orphans').addEventListener('click', function() {
                this.classList.toggle('active');
                filterByHighlight('orphan');
            });
        }

        function filterNodes() {
            d3.selectAll('.node').style('display', d =>
                currentFilter === 'all' || d.type === currentFilter ? 'block' : 'none'
            );
            d3.selectAll('.link').style('display', d =>
                currentFilter === 'all' ||
                d.source.type === currentFilter ||
                d.target.type === currentFilter ? 'block' : 'none'
            );
        }

        function filterByHighlight(type) {
            if (type === 'hotspot') {
                d3.selectAll('.node').style('opacity', d =>
                    !document.getElementById('btn-hotspots').classList.contains('active') || d.isHotspot ? 1 : 0.2
                );
            } else if (type === 'cycle') {
                d3.selectAll('.node').style('opacity', d =>
                    !document.getElementById('btn-cycles').classList.contains('active') || d.isCycle ? 1 : 0.2
                );
            } else if (type === 'orphan') {
                d3.selectAll('.node').style('opacity', d =>
                    !document.getElementById('btn-orphans').classList.contains('active') || d.isOrphan ? 1 : 0.2
                );
            }
        }

        function toggleSidebar() {
            document.getElementById('sidebar').classList.toggle('collapsed');
            const btn = document.querySelector('.toggle-btn');
            btn.textContent = document.getElementById('sidebar').classList.contains('collapsed') ? '▶' : '◀';
        }

        function zoomIn() { svg.transition().call(zoom.scaleBy, 1.3); }
        function zoomOut() { svg.transition().call(zoom.scaleBy, 0.7); }
        function resetZoom() { svg.transition().call(zoom.transform, d3.zoomIdentity); }

        function togglePhysics() {
            physicsEnabled = !physicsEnabled;
            if (physicsEnabled) {
                simulation.alpha(0.3).restart();
            } else {
                simulation.stop();
                d3.selectAll('.node').each(function(d) {
                    d.fx = d.x;
                    d.fy = d.y;
                });
            }
        }

        window.addEventListener('resize', () => {
            const container = document.getElementById('graph-container');
            svg.attr('width', container.clientWidth).attr('height', container.clientHeight);
            simulation.force('center', d3.forceCenter(container.clientWidth / 2, container.clientHeight / 2));
            simulation.alpha(0.3).restart();
        });

        initGraph();
    </script>
</body>
</html>`;
}
