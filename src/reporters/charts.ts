/**
 * SVG Visualization Components
 *
 * Pure SVG-based charts and visualizations for the HTML dashboard.
 * No external dependencies required.
 */

export interface ChartData {
    label: string;
    value: number;
    color?: string;
}

export interface TrendPoint {
    date: string;
    value: number;
}

/**
 * Generate SVG bar chart
 */
export function generateBarChart(
    data: ChartData[],
    options: {
        width?: number;
        height?: number;
        barColor?: string;
        showValues?: boolean;
    } = {}
): string {
    const { width = 400, height = 200, barColor = '#00d9ff', showValues = true } = options;

    if (data.length === 0) return '';

    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const barWidth = chartWidth / data.length - 10;
    const maxValue = Math.max(...data.map((d) => d.value));

    const bars = data
        .map((item, i) => {
            const barHeight = (item.value / maxValue) * chartHeight;
            const x = padding + i * (barWidth + 10);
            const y = padding + chartHeight - barHeight;

            return `
        <rect
            x="${x}"
            y="${y}"
            width="${barWidth}"
            height="${barHeight}"
            fill="${item.color || barColor}"
            rx="4"
            class="chart-bar"
        >
            <title>${item.label}: ${item.value}</title>
        </rect>
        ${showValues ? `<text x="${x + barWidth / 2}" y="${y - 5}" text-anchor="middle" class="chart-value">${item.value}</text>` : ''}
        <text x="${x + barWidth / 2}" y="${height - 10}" text-anchor="middle" class="chart-label">${item.label}</text>
      `;
        })
        .join('');

    return `<svg viewBox="0 0 ${width} ${height}" class="bar-chart">${bars}</svg>`;
}

/**
 * Generate SVG donut chart
 */
export function generateDonutChart(
    data: ChartData[],
    options: {
        size?: number;
        strokeWidth?: number;
    } = {}
): string {
    const { size = 200, strokeWidth = 20 } = options;

    if (data.length === 0) return '';

    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;

    let currentAngle = -90; // Start from top
    const segments = data.map((item) => {
        const percentage = item.value / data.reduce((sum, d) => sum + d.value, 0);
        const angle = percentage * 360;
        const segment = {
            ...item,
            percentage,
            startAngle: currentAngle,
            endAngle: currentAngle + angle,
        };
        currentAngle += angle;
        return segment;
    });

    const paths = segments
        .map((segment) => {
            const start = polarToCartesian(center, center, radius, segment.startAngle);
            const end = polarToCartesian(center, center, radius, segment.endAngle);
            const largeArcFlag = segment.percentage > 0.5 ? 1 : 0;

            const path = `
        <path
            d="M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}"
            fill="none"
            stroke="${segment.color || getDefaultColor(segments.indexOf(segment))}"
            stroke-width="${strokeWidth}"
            class="donut-segment"
        >
            <title>${segment.label}: ${segment.value} (${Math.round(segment.percentage * 100)}%)</title>
        </path>
      `;
            return path;
        })
        .join('');

    // Center text
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const centerText = `
    <text x="${center}" y="${center}" text-anchor="middle" class="donut-center" dominant-baseline="middle">
        ${total}
    </text>
  `;

    return `<svg viewBox="0 0 ${size} ${size}" class="donut-chart">${paths}${centerText}</svg>`;
}

/**
 * Generate SVG gauge chart for scores
 */
export function generateGaugeChart(
    value: number,
    options: {
        size?: number;
        strokeWidth?: number;
        minValue?: number;
        maxValue?: number;
    } = {}
): string {
    const { size = 200, strokeWidth = 15, minValue = 0, maxValue = 100 } = options;

    const radius = (size - strokeWidth) / 2;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;

    // Gauge is a half circle
    const halfCircumference = circumference / 2;
    const percentage = (value - minValue) / (maxValue - minValue);
    const dashLength = percentage * halfCircumference;

    const color = getScoreColor(value);

    // Background arc
    const bgArc = `
    <path
        d="${describeArc(center, center, radius, -180, 0)}"
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        stroke-width="${strokeWidth}"
        stroke-linecap="round"
    />
  `;

    // Value arc
    const valueArc = `
    <path
        d="${describeArc(center, center, radius, -180, -180 + 180 * percentage)}"
        fill="none"
        stroke="${color}"
        stroke-width="${strokeWidth}"
        stroke-linecap="round"
        class="gauge-value"
    />
  `;

    // Center value text
    const valueText = `
    <text x="${center}" y="${center + 10}" text-anchor="middle" class="gauge-value-text" fill="${color}">
        ${value}
    </text>
    <text x="${center}" y="${center + 35}" text-anchor="middle" class="gauge-label">
        / ${maxValue}
    </text>
  `;

    return `<svg viewBox="0 0 ${size} ${size / 2 + 20}" class="gauge-chart">${bgArc}${valueArc}${valueText}</svg>`;
}

/**
 * Generate SVG line chart for trends
 */
export function generateLineChart(
    data: TrendPoint[],
    options: {
        width?: number;
        height?: number;
        lineColor?: string;
        showDots?: boolean;
        showGrid?: boolean;
    } = {}
): string {
    const { width = 400, height = 200, lineColor = '#00d9ff', showDots = true, showGrid = true } = options;

    if (data.length === 0) return '';

    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const maxValue = Math.max(...data.map((d) => d.value));
    const minValue = Math.min(...data.map((d) => d.value));
    const range = maxValue - minValue || 1;

    // Calculate points
    const points = data.map((item, i) => {
        const x = padding + (i / (data.length - 1 || 1)) * chartWidth;
        const y = padding + chartHeight - ((item.value - minValue) / range) * chartHeight;
        return { x, y, value: item.value, label: item.date };
    });

    // Create path
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    // Create area fill
    const areaD = `${pathD} L ${points[points.length - 1].x} ${padding + chartHeight} L ${padding} ${padding + chartHeight} Z`;

    const gridLines = showGrid
        ? `
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${padding + chartHeight}" stroke="rgba(255,255,255,0.1)" />
      <line x1="${padding}" y1="${padding + chartHeight}" x2="${width - padding}" y2="${padding + chartHeight}" stroke="rgba(255,255,255,0.1)" />
      <line x1="${width - padding}" y1="${padding}" x2="${width - padding}" y2="${padding + chartHeight}" stroke="rgba(255,255,255,0.1)" />
    `
        : '';

    const dots = showDots
        ? points
              .map(
                  (p) => `
        <circle cx="${p.x}" cy="${p.y}" r="4" fill="${lineColor}" class="chart-dot">
            <title>${p.label}: ${p.value}</title>
        </circle>
      `
              )
              .join('')
        : '';

    return `
    <svg viewBox="0 0 ${width} ${height}" class="line-chart">
      ${gridLines}
      <path d="${areaD}" fill="${lineColor}" opacity="0.1" />
      <path d="${pathD}" fill="none" stroke="${lineColor}" stroke-width="2" class="chart-line" />
      ${dots}
    </svg>
  `;
}

/**
 * Generate dependency graph visualization
 */
export function generateDependencyGraph(
    nodes: Array<{ id: string; type: string }>,
    edges: Array<{ from: string; to: string }>,
    options: {
        width?: number;
        height?: number;
    } = {}
): string {
    const { width = 800, height = 600 } = options;

    if (nodes.length === 0) return '';

    // Simple force-directed layout simulation
    const positions = calculateGraphLayout(nodes, width, height);

    // Create node elements
    const nodeElements = nodes
        .map((node) => {
            const pos = positions.get(node.id);
            if (!pos) return '';

            const color = getNodeColor(node.type);
            const radius = 20;

            return `
        <g class="graph-node" data-id="${node.id}">
          <circle cx="${pos.x}" cy="${pos.y}" r="${radius}" fill="${color}" opacity="0.8" />
          <text x="${pos.x}" y="${pos.y + 4}" text-anchor="middle" class="node-label">
            ${node.id.substring(node.id.lastIndexOf('/') + 1).substring(0, 10)}
          </text>
        </g>
      `;
        })
        .join('');

    // Create edge elements
    const edgeElements = edges
        .map((edge) => {
            const fromPos = positions.get(edge.from);
            const toPos = positions.get(edge.to);
            if (!fromPos || !toPos) return '';

            return `
        <line
          x1="${fromPos.x}" y1="${fromPos.y}"
          x2="${toPos.x}" y2="${toPos.y}"
          stroke="rgba(255,255,255,0.2)"
          stroke-width="1"
          class="graph-edge"
        />
      `;
        })
        .join('');

    return `
    <svg viewBox="0 0 ${width} ${height}" class="dependency-graph">
      <g class="edges">${edgeElements}</g>
      <g class="nodes">${nodeElements}</g>
    </svg>
  `;
}

// Helper functions

function polarToCartesian(
    centerX: number,
    centerY: number,
    radius: number,
    angleInDegrees: number
): { x: number; y: number } {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians),
    };
}

function describeArc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number
): string {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

    return [
        'M',
        start.x,
        start.y,
        'A',
        radius,
        radius,
        0,
        largeArcFlag,
        0,
        end.x,
        end.y,
    ].join(' ');
}

function getScoreColor(score: number): string {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 60) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
}

function getDefaultColor(index: number): string {
    const colors = ['#00d9ff', '#00ff88', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    return colors[index % colors.length];
}

function getNodeColor(type: string): string {
    const colors: Record<string, string> = {
        component: '#00d9ff',
        page: '#00ff88',
        store: '#f59e0b',
        composable: '#8b5cf6',
        default: '#71717a',
    };
    return colors[type] || colors.default;
}

function calculateGraphLayout(
    nodes: Array<{ id: string; type: string }>,
    width: number,
    height: number
): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>();

    // Simple grid/radial layout
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;

    nodes.forEach((node, i) => {
        if (nodes.length === 1) {
            positions.set(node.id, { x: centerX, y: centerY });
        } else {
            const angle = (i / nodes.length) * 2 * Math.PI - Math.PI / 2;
            positions.set(node.id, {
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle),
            });
        }
    });

    return positions;
}
