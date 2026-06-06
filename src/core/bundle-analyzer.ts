/**
 * Bundle Analyzer
 *
 * Analyzes bundle size, tree-shaking, and lazy-loading patterns.
 */

import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';

export interface BundleAnalysis {
    timestamp: string;
    project: string;
    stats: BundleStats;
    dependencies: DependencyInfo[];
    lazyComponents: LazyComponent[];
    oversizedImports: OversizedImport[];
    recommendations: Recommendation[];
}

export interface BundleStats {
    totalDependencies: number;
    totalSize: number; // bytes
    largestDeps: DependencyInfo[];
    treeShakingCandidates: TreeShakingCandidate[];
}

export interface DependencyInfo {
    name: string;
    version: string;
    size: number;
    percentOfTotal: number;
    esmAvailable: boolean;
    sideEffects: boolean;
}

export interface LazyComponent {
    file: string;
    component: string;
    importType: 'dynamic' | 'async-component';
    suggestion: string;
}

export interface OversizedImport {
    file: string;
    import: string;
    size: number;
    warning: string;
}

export interface TreeShakingCandidate {
    package: string;
    current: string;
    alternative: string;
    savedSize: number;
}

export interface Recommendation {
    priority: 'high' | 'medium' | 'low';
    category: 'lazy-loading' | 'tree-shaking' | 'bundle-size' | 'optimization';
    title: string;
    description: string;
    impact: string;
    files?: string[];
}

const LARGE_PACKAGE_THRESHOLD = 100 * 1024; // 100KB
const VERY_LARGE_PACKAGE = 500 * 1024; // 500KB

// Known large packages with tree-shakable alternatives
const KNOWN_LARGE_PACKAGES: Record<string, { alternative: string; reason: string }> = {
    'lodash': { alternative: 'lodash-es', reason: 'Tree-shakeable ES modules version' },
    '@lodash/core': { alternative: 'lodash-es', reason: 'Tree-shakeable ES modules version' },
    'moment': { alternative: 'dayjs', reason: '90% smaller, tree-shakeable' },
    'date-fns': { alternative: 'date-fns (import specific functions)', reason: 'Already tree-shakeable, check imports' },
    'axios': { alternative: 'ky or ofetch', reason: 'Smaller footprint' },
    'ramda': { alternative: 'es-toolkit', reason: 'Modern, tree-shakeable, faster' },
};

// Common patterns for oversized imports
const SIZES: Record<string, number> = {
    'vue': 300000,
    'vue-router': 150000,
    'pinia': 80000,
    '@vueuse/core': 200000,
    'axios': 150000,
    'lodash': 2500000,
    'moment': 700000,
    'date-fns': 150000,
    'chart.js': 200000,
    'd3': 2500000,
    'three': 1500000,
    'ant-design-vue': 2000000,
    'element-plus': 1500000,
    'vuetify': 2000000,
};

/**
 * Analyze bundle patterns in the project
 */
export async function analyzeBundle(cwd: string = process.cwd()): Promise<BundleAnalysis> {
    const files = await fg(['**/*.{vue,ts,tsx,js,jsx}'], {
        cwd,
        ignore: ['**/node_modules/**', '**/dist/**', '**/.nuxt/**', '**/coverage/**'],
    });

    const lazyComponents = await findLazyComponents(files, cwd);
    const oversizedImports = await findOversizedImports(files, cwd);
    const treeShakingCandidates = findTreeShakingCandidates(files);
    const dependencies = await analyzeDependencies(cwd);
    const recommendations = generateRecommendations(lazyComponents, oversizedImports, treeShakingCandidates);

    const totalSize = dependencies.reduce((sum, d) => sum + d.size, 0);

    return {
        timestamp: new Date().toISOString(),
        project: path.basename(cwd),
        stats: {
            totalDependencies: dependencies.length,
            totalSize,
            largestDeps: dependencies.slice(0, 10),
            treeShakingCandidates,
        },
        dependencies,
        lazyComponents,
        oversizedImports,
        recommendations,
    };
}

/**
 * Find lazy-loaded components
 */
async function findLazyComponents(files: string[], cwd: string): Promise<LazyComponent[]> {
    const results: LazyComponent[] = [];
    const dynamicImportRegex = /(?:const|let|var)\s+(\w+)\s*=\s*lazy\s*\(|defineAsyncComponent\s*\(|await\s+import\s*\(|import\s*\(\s*['"`]/g;
    const staticComponentRegex = /import\s+(?:type\s+)?\{\s*([^}]+)\}\s+from\s+['"'](\w+[-\w]*)['"]/g;

    // Track component names that should be lazy
    const componentsByFile = new Map<string, Set<string>>();

    for (const file of files) {
        if (!file.endsWith('.vue') && !file.endsWith('.ts')) continue;

        try {
            const content = await fs.promises.readFile(path.join(cwd, file), 'utf-8');

            // Find component names (PascalCase in file)
            const componentMatches = content.match(/<([A-Z][a-zA-Z0-9]*)[.\s>]/g) || [];
            const componentNames = new Set(
                componentMatches.map(m => m.slice(1).trim()).filter(n => n.length > 0)
            );

            if (componentNames.size > 0) {
                componentsByFile.set(file, componentNames);
            }

            // Find already lazy-loaded components
            let match;
            while ((match = dynamicImportRegex.exec(content)) !== null) {
                results.push({
                    file,
                    component: match[1] || 'unnamed',
                    importType: 'dynamic',
                    suggestion: 'Good! Already using dynamic import.',
                });
            }
        } catch {
            // Skip unreadable files
        }
    }

    return results;
}

/**
 * Find oversized imports
 */
async function findOversizedImports(files: string[], cwd: string): Promise<OversizedImport[]> {
    const results: OversizedImport[] = [];
    const importRegex = /import\s+(?:type\s+)?(?:\{[^}]+\}|\w+)\s+from\s+['"']@?[\w@/-]+['"]/g;

    for (const file of files) {
        if (!file.endsWith('.vue') && !file.endsWith('.ts') && !file.endsWith('.tsx')) continue;

        try {
            const content = await fs.promises.readFile(path.join(cwd, file), 'utf-8');
            let match;

            while ((match = importRegex.exec(content)) !== null) {
                const importStatement = match[0];
                const packageMatch = importStatement.match(/from\s+['"]@?([\w@/-]+)['"]/);

                if (packageMatch) {
                    const packageName = packageMatch[1];
                    const estimatedSize = SIZES[packageName] || 50000;

                    if (estimatedSize > LARGE_PACKAGE_THRESHOLD) {
                        results.push({
                            file,
                            import: packageName,
                            size: estimatedSize,
                            warning: `${packageName} (${(estimatedSize / 1024).toFixed(1)}KB) may increase bundle size significantly.`,
                        });
                    }
                }
            }
        } catch {
            // Skip unreadable files
        }
    }

    return results;
}

/**
 * Find tree-shaking candidates
 */
function findTreeShakingCandidates(files: string[]): TreeShakingCandidate[] {
    const candidates: TreeShakingCandidate[] = [];

    for (const [pkg, info] of Object.entries(KNOWN_LARGE_PACKAGES)) {
        candidates.push({
            package: pkg,
            current: `import ${pkg}`,
            alternative: `import ${pkg.split('/')[0]} from '${info.alternative}'`,
            savedSize: SIZES[pkg] || 100000,
        });
    }

    return candidates;
}

/**
 * Analyze package.json dependencies
 */
async function analyzeDependencies(cwd: string): Promise<DependencyInfo[]> {
    const packageJsonPath = path.join(cwd, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
        return [];
    }

    try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const allDeps = {
            ...pkg.dependencies,
            ...pkg.devDependencies,
        };

        const results: DependencyInfo[] = [];

        for (const [name, version] of Object.entries(allDeps)) {
            const size = SIZES[name] || estimatePackageSize(name);
            const isESM = name.includes('vue') || name.includes('nuxt') || name.startsWith('@vue/');

            results.push({
                name,
                version: String(version),
                size,
                percentOfTotal: 0,
                esmAvailable: isESM,
                sideEffects: false,
            });
        }

        // Sort by size
        return results.sort((a, b) => b.size - a.size);
    } catch {
        return [];
    }
}

/**
 * Estimate package size based on name patterns
 */
function estimatePackageSize(name: string): number {
    if (name.startsWith('@types/')) return 10000;
    if (name.includes('eslint') || name.includes('babel')) return 50000;
    if (name.includes('jest') || name.includes('vitest')) return 100000;
    if (name.includes('ui') || name.includes('components')) return 200000;
    return 50000; // Default estimate
}

/**
 * Generate recommendations based on analysis
 */
function generateRecommendations(
    lazyComponents: LazyComponent[],
    oversizedImports: OversizedImport[],
    treeShakingCandidates: TreeShakingCandidate[]
): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Lazy loading recommendations
    const filesWithManyComponents = new Map<string, number>();
    for (const lazy of lazyComponents) {
        const count = filesWithManyComponents.get(lazy.file) || 0;
        filesWithManyComponents.set(lazy.file, count + 1);
    }

    // Oversized imports recommendations
    if (oversizedImports.length > 0) {
        recommendations.push({
            priority: 'high',
            category: 'bundle-size',
            title: 'Oversized dependencies detected',
            description: `${oversizedImports.length} potentially oversized packages imported in your codebase.`,
            impact: `Estimated ${(oversizedImports.reduce((s, i) => s + i.size, 0) / 1024 / 1024).toFixed(1)}MB could be reduced.`,
            files: [...new Set(oversizedImports.map(i => i.file))].slice(0, 5),
        });
    }

    // Tree-shaking recommendations
    if (treeShakingCandidates.length > 0) {
        recommendations.push({
            priority: 'medium',
            category: 'tree-shaking',
            title: 'Consider tree-shakeable alternatives',
            description: 'Some packages have smaller, tree-shakeable alternatives available.',
            impact: 'Could reduce bundle size significantly.',
        });
    }

    // General recommendations
    recommendations.push({
        priority: 'low',
        category: 'optimization',
        title: 'Enable gzip/brotli compression',
        description: 'Configure your bundler to use compression for production builds.',
        impact: 'Reduce network transfer size by 60-80%.',
    });

    return recommendations;
}

/**
 * Format bundle analysis for CLI output
 */
export function formatBundleAnalysis(analysis: BundleAnalysis): string {
    const lines: string[] = [];

    lines.push('╔══════════════════════════════════════════════════════════════╗');
    lines.push('║                    Bundle Analysis Report                    ║');
    lines.push('╚══════════════════════════════════════════════════════════════╝');
    lines.push('');
    lines.push(`  Project: ${analysis.project}`);
    lines.push(`  Analyzed: ${new Date(analysis.timestamp).toLocaleString()}`);
    lines.push('');

    // Stats summary
    lines.push('┌─────────────────────────────────────────────────────────────┐');
    lines.push('│  Bundle Statistics                                          │');
    lines.push('└─────────────────────────────────────────────────────────────┘');
    lines.push(`  Total dependencies: ${analysis.stats.totalDependencies}`);
    lines.push(`  Largest dependencies:`);

    for (const dep of analysis.stats.largestDeps.slice(0, 5)) {
        const sizeStr = dep.size > 1024 * 1024
            ? `${(dep.size / 1024 / 1024).toFixed(1)}MB`
            : `${(dep.size / 1024).toFixed(1)}KB`;
        lines.push(`    • ${dep.name.padEnd(30)} ${sizeStr}`);
    }

    lines.push('');

    // Oversized imports
    if (analysis.oversizedImports.length > 0) {
        lines.push('┌─────────────────────────────────────────────────────────────┐');
        lines.push('│  ⚠️  Oversized Imports                                       │');
        lines.push('└─────────────────────────────────────────────────────────────┘');

        for (const imp of analysis.oversizedImports.slice(0, 10)) {
            const sizeStr = (imp.size / 1024).toFixed(1) + 'KB';
            lines.push(`  🔴 ${imp.import.padEnd(25)} ${sizeStr.padStart(8)} in ${imp.file.split('/').pop()}`);
        }
        lines.push('');
    }

    // Recommendations
    if (analysis.recommendations.length > 0) {
        lines.push('┌─────────────────────────────────────────────────────────────┐');
        lines.push('│  Recommendations                                             │');
        lines.push('└─────────────────────────────────────────────────────────────┘');

        for (const rec of analysis.recommendations) {
            const icon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
            lines.push(`  ${icon} [${rec.priority.toUpperCase()}] ${rec.title}`);
            lines.push(`     ${rec.description}`);
            if (rec.impact) {
                lines.push(`     Impact: ${rec.impact}`);
            }
            lines.push('');
        }
    }

    lines.push('Run `vue-doctor bundle --json` for detailed JSON output.');
    lines.push('');

    return lines.join('\n');
}
