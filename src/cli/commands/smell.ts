/**
 * Smell Command
 *
 * Detect architecture smells: God Components, God Composables,
 * Smart Component Abuse, Service Layer Violations, and more.
 */

import { parse } from '@vue/compiler-sfc';
import fs from 'node:fs/promises';

import { collectFiles } from '../../utils/file-collector';
import { buildProjectContext } from '../../core/project';
import { buildProjectGraph } from '../../core/graph';
import { loadScoreHistory } from '../../core/score-engine';

export interface SmellReport {
    godComponents: GodComponent[];
    godComposables: GodComposable[];
    smartComponentAbuse: SmartAbuse[];
    serviceViolations: ServiceViolation[];
    architectureDrift?: ArchitectureDrift;
    total: number;
}

export interface GodComponent {
    file: string;
    loc: number;
    imports: number;
    props: number;
    methods: number;
    watchers: number;
    computed: number;
    violations: string[];
    severity: 'warning' | 'error';
}

export interface GodComposable {
    file: string;
    loc: number;
    returnCount: number;
    nestedCalls: number;
    violations: string[];
}

export interface SmartAbuse {
    file: string;
    type: 'api-call' | 'store-mutation' | 'business-logic' | 'direct-dom';
    line: number;
    code: string;
    suggestion: string;
}

export interface ServiceViolation {
    file: string;
    line: number;
    apiCall: string;
    suggestion: string;
}

export interface ArchitectureDrift {
    detected: boolean;
    weeks: number;
    decline: number;
    scores: { week: string; score: number }[];
}

interface SmellOptions {
    json?: boolean;
    only?: string;
}

export async function smellCommand(options: SmellOptions = {}): Promise<void> {
    const cwd = process.cwd();
    console.log('Detecting architecture smells...\n');

    // Collect files
    const files = await collectFiles({
        cwd,
        include: ['**/*.vue', '**/*.ts'],
        exclude: ['node_modules/**', 'dist/**', 'build/**'],
    });

    if (files.length === 0) {
        console.log('No files found.');
        return;
    }

    console.log(`Analyzing ${files.length} files...\n`);

    // Run all detectors based on options
    let godComponents: GodComponent[] = [];
    let godComposables: GodComposable[] = [];
    let smartAbuse: SmartAbuse[] = [];
    let serviceViolations: ServiceViolation[] = [];
    let architectureDrift: ArchitectureDrift | undefined;

    if (!options.only || options.only === 'god-component') {
        godComponents = await detectGodComponents(files);
    }

    if (!options.only || options.only === 'god-composable') {
        godComposables = await detectGodComposables(files);
    }

    if (!options.only || options.only === 'smart-component') {
        smartAbuse = await detectSmartComponentAbuse(files);
    }

    if (!options.only || options.only === 'service-layer') {
        serviceViolations = await detectServiceViolations(files);
    }

    if (!options.only || options.only === 'drift') {
        architectureDrift = await detectArchitectureDrift(cwd);
    }

    // Build report
    const report: SmellReport = {
        godComponents,
        godComposables,
        smartComponentAbuse: smartAbuse,
        serviceViolations,
        architectureDrift: architectureDrift?.detected ? architectureDrift : undefined,
        total: godComponents.length + godComposables.length + smartAbuse.length + serviceViolations.length,
    };

    // Output
    if (options.json) {
        console.log(JSON.stringify(report, null, 2));
        return;
    }

    printSmellReport(report);
}

async function detectGodComponents(files: string[]): Promise<GodComponent[]> {
    const components: GodComponent[] = [];

    // Thresholds from spec
    const THRESHOLDS = {
        loc: 800,
        imports: 20,
        props: 15,
        methods: 20,
        watchers: 10,
        computed: 15,
    };

    for (const file of files) {
        if (!file.endsWith('.vue')) continue;

        try {
            const content = await fs.readFile(file, 'utf-8');
            const { descriptor } = parse(content);

            const script = descriptor.script?.content || '';
            const lines = script.split('\n').length;

            // Count imports
            const importCount = (script.match(/^import\s+/gm) || []).length;

            // Count defineProps
            const propsMatch = script.match(/defineProps\s*[<(]/g);
            const propsCount = propsMatch ? 1 : 0;

            // Count methods
            const methodsMatch = script.match(/^\s*(async\s+)?\w+\s*\([^)]*\)\s*[{:]/gm);
            const methodsCount = methodsMatch ? methodsMatch.length : 0;

            // Count watchers
            const watchCount = (script.match(/\bwatch\s*\(/g) || []).length;

            // Count computed
            const computedCount = (script.match(/\bcomputed\s*\(/g) || []).length;

            // Check violations
            const violations: string[] = [];
            if (lines > THRESHOLDS.loc) violations.push(`LOC: ${lines} (> ${THRESHOLDS.loc})`);
            if (importCount > THRESHOLDS.imports) violations.push(`Imports: ${importCount} (> ${THRESHOLDS.imports})`);
            if (propsCount > THRESHOLDS.props) violations.push(`Props: ${propsCount} (> ${THRESHOLDS.props})`);
            if (methodsCount > THRESHOLDS.methods) violations.push(`Methods: ${methodsCount} (> ${THRESHOLDS.methods})`);
            if (watchCount > THRESHOLDS.watchers) violations.push(`Watchers: ${watchCount} (> ${THRESHOLDS.watchers})`);
            if (computedCount > THRESHOLDS.computed) violations.push(`Computed: ${computedCount} (> ${THRESHOLDS.computed})`);

            if (violations.length > 0) {
                // Error if multiple violations
                const severity = violations.length >= 2 ? 'error' : 'warning';
                components.push({
                    file,
                    loc: lines,
                    imports: importCount,
                    props: propsCount,
                    methods: methodsCount,
                    watchers: watchCount,
                    computed: computedCount,
                    violations,
                    severity,
                });
            }
        } catch {
            // Skip unreadable files
        }
    }

    return components;
}

async function detectGodComposables(files: string[]): Promise<GodComposable[]> {
    const composables: GodComposable[] = [];

    // Thresholds
    const THRESHOLDS = {
        loc: 500,
        returnCount: 20,
        nestedCalls: 10,
    };

    for (const file of files) {
        // Look for composables
        if (!file.includes('/composables/') && !file.includes('/composable/')) continue;
        if (!file.endsWith('.ts')) continue;

        try {
            const content = await fs.readFile(file, 'utf-8');
            const lines = content.split('\n').length;

            // Count return statements
            const returnMatches = content.match(/return\s+/g);
            const returnCount = returnMatches ? returnMatches.length : 0;

            // Count nested composable calls (useX patterns)
            const composableCalls = content.match(/use\w+\(/g) || [];
            const nestedCalls = composableCalls.length;

            // Check violations
            const violations: string[] = [];
            if (lines > THRESHOLDS.loc) violations.push(`LOC: ${lines} (> ${THRESHOLDS.loc})`);
            if (returnCount > THRESHOLDS.returnCount) violations.push(`Returns: ${returnCount} (> ${THRESHOLDS.returnCount})`);
            if (nestedCalls > THRESHOLDS.nestedCalls) violations.push(`Nested calls: ${nestedCalls} (> ${THRESHOLDS.nestedCalls})`);

            if (violations.length > 0) {
                composables.push({
                    file,
                    loc: lines,
                    returnCount,
                    nestedCalls,
                    violations,
                });
            }
        } catch {
            // Skip unreadable files
        }
    }

    return composables;
}

async function detectSmartComponentAbuse(files: string[]): Promise<SmartAbuse[]> {
    const abuses: SmartAbuse[] = [];

    for (const file of files) {
        if (!file.endsWith('.vue')) continue;

        try {
            const content = await fs.readFile(file, 'utf-8');
            const { descriptor } = parse(content);

            const script = descriptor.script?.content || '';
            const template = descriptor.template?.content || '';

            const lines = script.split('\n');

            // Detect direct API calls (useFetch, $fetch, axios) not in composable
            const apiCallPatterns = [
                { pattern: /useFetch\s*\(/g, type: 'api-call' as const, suggestion: 'Extract API calls to a composable/service' },
                { pattern: /\$fetch\s*\(/g, type: 'api-call' as const, suggestion: 'Use a service layer for API calls' },
                { pattern: /axios\.\w+\(/g, type: 'api-call' as const, suggestion: 'Use a service layer for API calls' },
            ];

            for (const { pattern, type, suggestion } of apiCallPatterns) {
                let match;
                while ((match = pattern.exec(script)) !== null) {
                    const lineNumber = script.substring(0, match.index).split('\n').length;
                    abuses.push({
                        file,
                        type,
                        line: lineNumber,
                        code: lines[lineNumber - 1]?.trim() || match[0],
                        suggestion,
                    });
                }
            }

            // Detect direct store mutations in template
            if (/v-on:click|@click/.test(template)) {
                const storeMutationPattern = /store\.\w+\s*=/g;
                let match;
                while ((match = storeMutationPattern.exec(template)) !== null) {
                    const lineNumber = template.substring(0, match.index).split('\n').length;
                    abuses.push({
                        file,
                        type: 'store-mutation',
                        line: lineNumber,
                        code: match[0],
                        suggestion: 'Use a method or composable to handle store mutations',
                    });
                }
            }

            // Detect complex business logic in computed (simple heuristic)
            const computedMatches = script.matchAll(/const\s+\w+\s*=\s*computed\s*\(\s*\(\)\s*=>\s*\{([^}]{100,})/g);
            for (const match of computedMatches) {
                if (match[1].includes('fetch') || match[1].includes('await') || match[1].includes('then(')) {
                    const lineNumber = script.substring(0, match.index).split('\n').length;
                    abuses.push({
                        file,
                        type: 'business-logic',
                        line: lineNumber,
                        code: 'Complex computed with async/fetch logic',
                        suggestion: 'Move business logic to composable, keep computed for derived state',
                    });
                }
            }
        } catch {
            // Skip unreadable files
        }
    }

    return abuses;
}

async function detectServiceViolations(files: string[]): Promise<ServiceViolation[]> {
    const violations: ServiceViolation[] = [];

    // Check if project has services folder
    const hasServices = files.some((f) => f.includes('/services/') || f.includes('/service/'));

    if (!hasServices) {
        return violations; // Only active if services folder exists
    }

    for (const file of files) {
        if (!file.endsWith('.vue')) continue;

        try {
            const content = await fs.readFile(file, 'utf-8');
            const lines = content.split('\n');

            // Detect direct API calls in pages/components
            const apiPatterns = [
                /\$fetch\s*\(\s*['"][^'"]+['"]/g,
                /useFetch\s*\(\s*['"][^'"]+['"]/g,
                /axios\.\w+\s*\(/g,
            ];

            for (const pattern of apiPatterns) {
                let match;
                while ((match = pattern.exec(content)) !== null) {
                    const lineNumber = content.substring(0, match.index).split('\n').length;
                    violations.push({
                        file,
                        line: lineNumber,
                        apiCall: match[0],
                        suggestion: `Consider using a service from services/ folder instead of direct API call`,
                    });
                }
            }
        } catch {
            // Skip unreadable files
        }
    }

    return violations;
}

async function detectArchitectureDrift(cwd: string): Promise<ArchitectureDrift> {
    const history = await loadScoreHistory(cwd);
    const entries = history.entries.slice(-4); // Last 4 weeks

    if (entries.length < 3) {
        return { detected: false, weeks: 0, decline: 0, scores: [] };
    }

    const scores = entries.map((e, i) => ({
        week: `Week ${i + 1}`,
        score: e.overall,
    }));

    // Check for declining trend
    let consecutiveDeclines = 0;
    let totalDecline = 0;

    for (let i = 1; i < scores.length; i++) {
        const diff = scores[i].score - scores[i - 1].score;
        if (diff < -3) { // Declined by more than 3 points
            consecutiveDeclines++;
            totalDecline += Math.abs(diff);
        } else {
            break;
        }
    }

    return {
        detected: consecutiveDeclines >= 2 && totalDecline >= 6,
        weeks: consecutiveDeclines,
        decline: totalDecline,
        scores,
    };
}

function printSmellReport(report: SmellReport): void {
    const { godComponents, godComposables, smartComponentAbuse, serviceViolations, architectureDrift, total } = report;

    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║               Architecture Smell Report                        ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');
    console.log('');

    if (total === 0 && !architectureDrift?.detected) {
        console.log('✅ No architecture smells detected!');
        console.log('');
        return;
    }

    console.log(`Found ${total} smell(s)\n`);

    // God Components
    if (godComponents.length > 0) {
        console.log('🔴 God Components (Excessively Complex)');
        console.log('─'.repeat(70));

        for (const comp of godComponents) {
            const fileName = comp.file.split('/').pop();
            const emoji = comp.severity === 'error' ? '🔴' : '🟠';
            console.log(`\n${emoji} ${fileName} ${comp.severity.toUpperCase()}`);

            for (const v of comp.violations) {
                console.log(`   • ${v}`);
            }

            console.log('\n   Suggestion: Split into smaller components or extract logic to composables');
        }
        console.log('');
    }

    // God Composables
    if (godComposables.length > 0) {
        console.log('🟠 God Composables (Too Many Responsibilities)');
        console.log('─'.repeat(70));

        for (const comp of godComposables) {
            const fileName = comp.file.split('/').pop();
            console.log(`\n⚠️  ${fileName}`);

            for (const v of comp.violations) {
                console.log(`   • ${v}`);
            }

            console.log('\n   Suggestion: Split into smaller composables (e.g., useXForm, useXData, useXState)');
        }
        console.log('');
    }

    // Smart Component Abuse
    if (smartComponentAbuse.length > 0) {
        console.log('🟡 Smart Component Abuse (Business Logic in Components)');
        console.log('─'.repeat(70));

        // Group by file
        const byFile = new Map<string, SmartAbuse[]>();
        for (const abuse of smartComponentAbuse) {
            if (!byFile.has(abuse.file)) {
                byFile.set(abuse.file, []);
            }
            byFile.get(abuse.file)!.push(abuse);
        }

        for (const [file, abuses] of byFile) {
            const fileName = file.split('/').pop();
            console.log(`\n⚠️  ${fileName}`);

            for (const abuse of abuses.slice(0, 3)) {
                console.log(`   Line ${abuse.line}: ${abuse.type}`);
                console.log(`     → ${abuse.suggestion}`);
            }

            if (abuses.length > 3) {
                console.log(`   ... and ${abuses.length - 3} more`);
            }
        }
        console.log('');
    }

    // Service Layer Violations
    if (serviceViolations.length > 0) {
        console.log('🟡 Service Layer Violations (Direct API Calls)');
        console.log('─'.repeat(70));

        const byFile = new Map<string, ServiceViolation[]>();
        for (const v of serviceViolations) {
            if (!byFile.has(v.file)) {
                byFile.set(v.file, []);
            }
            byFile.get(v.file)!.push(v);
        }

        for (const [file, violations] of byFile) {
            const fileName = file.split('/').pop();
            console.log(`\n⚠️  ${fileName} - ${violations.length} direct API call(s)`);

            for (const v of violations.slice(0, 3)) {
                console.log(`   Line ${v.line}: ${v.apiCall}`);
            }

            if (violations.length > 3) {
                console.log(`   ... and ${violations.length - 3} more`);
            }
        }
        console.log('');
    }

    // Architecture Drift
    if (architectureDrift?.detected) {
        console.log('🔴 Architecture Drift Detected');
        console.log('─'.repeat(70));
        console.log(`\nScore declining for ${architectureDrift.weeks} consecutive scans!`);
        console.log('Total decline: ' + architectureDrift.decline + ' points\n');

        console.log('Score history:');
        for (const s of architectureDrift.scores) {
            console.log(`   ${s.week}: ${s.score}`);
        }
        console.log('\n💡 Consider a refactoring sprint to address accumulated issues.');
        console.log('');
    }

    // Summary
    console.log('─'.repeat(70));
    console.log(`Total smells: ${total}`);
    if (godComponents.length > 0) console.log(`  - God Components: ${godComponents.length}`);
    if (godComposables.length > 0) console.log(`  - God Composables: ${godComposables.length}`);
    if (smartComponentAbuse.length > 0) console.log(`  - Smart Component Abuse: ${smartComponentAbuse.length}`);
    if (serviceViolations.length > 0) console.log(`  - Service Layer Violations: ${serviceViolations.length}`);
    console.log('');
}
