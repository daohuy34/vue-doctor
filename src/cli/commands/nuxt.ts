/**
 * Nuxt Command
 *
 * Analyze Nuxt-specific patterns: async data, hydration, SSR safety.
 */

import fs from 'node:fs/promises';
import { parse } from '@vue/compiler-sfc';
import { collectFiles } from '../../utils/file-collector';

export interface AsyncDataCall {
    file: string;
    line: number;
    type: 'useFetch' | 'useAsyncData' | 'useLazyFetch' | 'fetch' | 'asyncData';
    endpoint?: string;
    key?: string;
}

export interface HydrationRisk {
    file: string;
    score: number;
    risks: {
        window: number;
        document: number;
        localStorage: number;
        sessionStorage: number;
        navigator: number;
        mathRandom: number;
        dateNow: number;
    };
    severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ApiUsage {
    endpoint: string;
    count: number;
    files: string[];
}

interface NuxtCommandOptions {
    async?: boolean;
    hydration?: boolean;
    apis?: boolean;
    format?: 'text' | 'json';
}

export async function nuxtCommand(options: NuxtCommandOptions = {}) {
    const projectPath = process.cwd();
    const files = await collectFiles({
        cwd: projectPath,
        include: ['**/*.vue', '**/*.ts'],
        exclude: ['node_modules/**', 'dist/**'],
    });

    if (files.length === 0) {
        console.log('No files found.');
        return;
    }

    // Analyze files
    const asyncDataCalls = await detectAsyncWaterfall(files);
    const hydrationRisks = await detectHydrationRisks(files);
    const apiUsages = await detectDuplicateApis(files);

    // Output based on options
    if (options.format === 'json') {
        console.log(JSON.stringify({ asyncDataCalls, hydrationRisks, apiUsages }, null, 2));
        return;
    }

    console.log(`
╔═══════════════════════════════════════════════════════════╗
║           Vue Doctor — Nuxt Intelligence                ║
╚═══════════════════════════════════════════════════════════╝
`);

    if (options.async || (!options.hydration && !options.apis)) {
        printAsyncAnalysis(asyncDataCalls);
    }

    if (options.hydration || (!options.async && !options.apis)) {
        printHydrationAnalysis(hydrationRisks);
    }

    if (options.apis || (!options.async && !options.hydration)) {
        printApiAnalysis(apiUsages);
    }
}

async function detectAsyncWaterfall(files: string[]): Promise<AsyncDataCall[]> {
    const calls: AsyncDataCall[] = [];

    for (const file of files) {
        if (!file.endsWith('.vue')) continue;

        try {
            const content = await fs.readFile(file, 'utf-8');
            const { descriptor } = parse(content);

            if (!descriptor.script?.content) continue;

            const script = descriptor.script.content;
            const lines = script.split('\n');

            // Detect sequential await patterns
            let inAwaitSequence = false;
            let sequenceCount = 0;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                // Match await useAsyncData/useFetch patterns
                const asyncMatch = line.match(/await\s+(useAsyncData|useFetch|useLazyFetch|asyncData|fetch)\s*\(/);

                if (asyncMatch) {
                    const type = asyncMatch[1] as AsyncDataCall['type'];

                    // Extract key/endpoint
                    const keyMatch = line.match(/['"]([^'"]+)['"]/);

                    calls.push({
                        file,
                        line: i + 1,
                        type,
                        key: keyMatch?.[1],
                    });

                    if (line.includes('await')) {
                        inAwaitSequence = true;
                        sequenceCount++;
                    }
                }
            }
        } catch {
            // Skip unreadable files
        }
    }

    return calls;
}

async function detectHydrationRisks(files: string[]): Promise<HydrationRisk[]> {
    const risks: HydrationRisk[] = [];

    const weights = {
        window: 15,
        document: 15,
        localStorage: 10,
        sessionStorage: 10,
        navigator: 10,
        mathRandom: 8,
        dateNow: 8,
    };

    for (const file of files) {
        if (!file.endsWith('.vue')) continue;

        try {
            const content = await fs.readFile(file, 'utf-8');
            const { descriptor } = parse(content);

            const script = descriptor.script?.content || '';
            const template = descriptor.template?.content || '';

            const risk: HydrationRisk = {
                file,
                score: 0,
                risks: {
                    window: 0,
                    document: 0,
                    localStorage: 0,
                    sessionStorage: 0,
                    navigator: 0,
                    mathRandom: 0,
                    dateNow: 0,
                },
                severity: 'low',
            };

            // Check script section
            if (/\bwindow\./.test(script) && !/process\.client|onMounted|import\.meta\.env\.CLIENT/.test(script)) {
                risk.risks.window = (script.match(/\bwindow\./g) || []).length;
            }
            if (/\bdocument\./.test(script) && !/process\.client|onMounted/.test(script)) {
                risk.risks.document = (script.match(/\bdocument\./g) || []).length;
            }
            if (/localStorage/.test(script)) {
                risk.risks.localStorage = (script.match(/localStorage/g) || []).length;
            }
            if (/sessionStorage/.test(script)) {
                risk.risks.sessionStorage = (script.match(/sessionStorage/g) || []).length;
            }
            if (/navigator\./.test(script)) {
                risk.risks.navigator = (script.match(/navigator\./g) || []).length;
            }

            // Check template section
            if (/\{\{[^}]*Math\.random\(\)[^}]*\}\}/.test(template)) {
                risk.risks.mathRandom = (template.match(/Math\.random\(\)/g) || []).length;
            }
            if (/\{\{[^}]*Date\.now\(\)[^}]*\}\}/.test(template)) {
                risk.risks.dateNow = (template.match(/Date\.now\(\)/g) || []).length;
            }

            // Calculate score
            risk.score =
                risk.risks.window * weights.window +
                risk.risks.document * weights.document +
                risk.risks.localStorage * weights.localStorage +
                risk.risks.sessionStorage * weights.sessionStorage +
                risk.risks.navigator * weights.navigator +
                risk.risks.mathRandom * weights.mathRandom +
                risk.risks.dateNow * weights.dateNow;

            // Determine severity
            if (risk.score >= 81) risk.severity = 'critical';
            else if (risk.score >= 61) risk.severity = 'high';
            else if (risk.score >= 31) risk.severity = 'medium';
            else risk.severity = 'low';

            // Only add if has risks
            if (risk.score > 0) {
                risks.push(risk);
            }
        } catch {
            // Skip unreadable files
        }
    }

    return risks.sort((a, b) => b.score - a.score);
}

async function detectDuplicateApis(files: string[]): Promise<ApiUsage[]> {
    const endpointMap = new Map<string, Set<string>>();

    for (const file of files) {
        if (!file.endsWith('.vue') && !file.endsWith('.ts')) continue;

        try {
            const content = await fs.readFile(file, 'utf-8');

            // Match useFetch/useAsyncData endpoints
            const useFetchMatches = content.matchAll(/useFetch\s*\(\s*['"]([^'"]+)['"]/g);
            const useAsyncMatches = content.matchAll(/useAsyncData\s*\(\s*['"]([^'"]+)['"]/g);
            const fetchMatches = content.matchAll(/\$fetch\s*\(\s*['"]([^'"]+)['"]/g);

            for (const match of useFetchMatches) {
                const endpoint = match[1];
                if (!endpointMap.has(endpoint)) {
                    endpointMap.set(endpoint, new Set());
                }
                endpointMap.get(endpoint)!.add(file);
            }

            for (const match of useAsyncMatches) {
                const endpoint = match[1];
                if (!endpointMap.has(endpoint)) {
                    endpointMap.set(endpoint, new Set());
                }
                endpointMap.get(endpoint)!.add(file);
            }

            for (const match of fetchMatches) {
                const endpoint = match[1];
                if (!endpointMap.has(endpoint)) {
                    endpointMap.set(endpoint, new Set());
                }
                endpointMap.get(endpoint)!.add(file);
            }
        } catch {
            // Skip unreadable files
        }
    }

    return Array.from(endpointMap.entries())
        .map(([endpoint, files]) => ({
            endpoint,
            count: files.size,
            files: Array.from(files),
        }))
        .sort((a, b) => b.count - a.count);
}

function printAsyncAnalysis(calls: AsyncDataCall[]) {
    console.log('📡 Async Data Analysis');
    console.log('═'.repeat(60));
    console.log('');

    // Group by file
    const byFile = new Map<string, AsyncDataCall[]>();
    for (const call of calls) {
        if (!byFile.has(call.file)) {
            byFile.set(call.file, []);
        }
        byFile.get(call.file)!.push(call);
    }

    // Find files with sequential awaits
    const sequentialFiles: string[] = [];
    for (const [file, fileCalls] of byFile) {
        if (fileCalls.length >= 2) {
            sequentialFiles.push(file);
        }
    }

    if (sequentialFiles.length === 0) {
        console.log('✅ No sequential async data patterns found.');
        console.log('');
        return;
    }

    console.log(`⚠️  Found ${sequentialFiles.length} file(s) with multiple async calls:`);
    console.log('');

    for (const file of sequentialFiles.slice(0, 5)) {
        const fileCalls = byFile.get(file)!;
        const fileName = file.split('/').pop();
        console.log(`  📄 ${fileName} (${fileCalls.length} calls)`);

        for (const call of fileCalls.slice(0, 3)) {
            console.log(`     Line ${call.line}: ${call.type}${call.key ? `("${call.key}")` : ''}`);
        }

        if (fileCalls.length > 3) {
            console.log(`     ... and ${fileCalls.length - 3} more`);
        }
        console.log('');
    }

    console.log('💡 Consider using Promise.all() for parallel fetching:');
    console.log('   const [user, products] = await Promise.all([');
    console.log('     useAsyncData("user", ...),');
    console.log('     useAsyncData("products", ...),');
    console.log('   ])');
    console.log('');
}

function printHydrationAnalysis(risks: HydrationRisk[]) {
    console.log('🧊 Hydration Risk Analysis');
    console.log('═'.repeat(60));
    console.log('');

    if (risks.length === 0) {
        console.log('✅ No hydration risks detected.');
        console.log('');
        return;
    }

    console.log(`Found ${risks.length} file(s) with hydration risks:`);
    console.log('');

    const severityEmoji: Record<string, string> = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢',
    };

    for (const risk of risks.slice(0, 10)) {
        const emoji = severityEmoji[risk.severity];
        const fileName = risk.file.split('/').pop();
        console.log(`${emoji} ${risk.severity.toUpperCase()} (${risk.score}) - ${fileName}`);

        const issues: string[] = [];
        if (risk.risks.window > 0) issues.push(`window: ${risk.risks.window}`);
        if (risk.risks.document > 0) issues.push(`document: ${risk.risks.document}`);
        if (risk.risks.localStorage > 0) issues.push(`localStorage: ${risk.risks.localStorage}`);
        if (risk.risks.sessionStorage > 0) issues.push(`sessionStorage: ${risk.risks.sessionStorage}`);
        if (risk.risks.navigator > 0) issues.push(`navigator: ${risk.risks.navigator}`);
        if (risk.risks.mathRandom > 0) issues.push(`Math.random: ${risk.risks.mathRandom}`);
        if (risk.risks.dateNow > 0) issues.push(`Date.now: ${risk.risks.dateNow}`);

        console.log(`   ${issues.join(', ')}`);
        console.log('');
    }

    console.log('💡 Use process.client or onMounted() for browser-only code.');
    console.log('');
}

function printApiAnalysis(apis: ApiUsage[]) {
    console.log('🔗 API Usage Analysis');
    console.log('═'.repeat(60));
    console.log('');

    if (apis.length === 0) {
        console.log('No API calls found.');
        console.log('');
        return;
    }

    // Filter to potentially duplicated APIs
    const duplicated = apis.filter((a) => a.count >= 3);

    if (duplicated.length === 0) {
        console.log('✅ No duplicate API usage detected.');
        console.log('');
        return;
    }

    console.log(`⚠️  Found ${duplicated.length} endpoint(s) used in 3+ files:`);
    console.log('');

    for (const api of duplicated.slice(0, 10)) {
        console.log(`  📡 ${api.endpoint}`);
        console.log(`     Used in ${api.count} files:`);
        for (const file of api.files.slice(0, 3)) {
            console.log(`       - ${file.split('/').pop()}`);
        }
        if (api.files.length > 3) {
            console.log(`       ... and ${api.files.length - 3} more`);
        }
        console.log('');
    }

    console.log('💡 Consider centralizing API calls in a service/composable.');
    console.log('');
}
