/**
 * SARIF Reporter
 *
 * Generates SARIF 2.1.0 output format for GitHub code scanning integration.
 * @see https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/sarif-support-for-code-scanning
 */

import type { Issue } from '../types/issue';
import type { ScanResult } from '../types/issue';

export interface SarifReporterOptions {
    /** Repository URL for linking */
    repositoryUrl?: string;
    /** GitHub Actions run ID */
    runId?: string;
    /** Commit SHA */
    commitSha?: string;
}

interface SarifLocation {
    artifactLocation: {
        uri: string;
        uriBaseId?: string;
    };
    region: {
        startLine: number;
        startColumn: number;
        endLine: number;
        endColumn: number;
    };
}

interface SarifResult {
    ruleId: string;
    level: 'warning' | 'error' | 'note';
    message: {
        text: string;
    };
    locations: SarifLocation[];
    partialFingerprints?: Record<string, string>;
}

interface SarifRun {
    tool: {
        driver: {
            name: string;
            version: string;
            informationUri: string;
            rules: SarifRule[];
        };
    };
    results: SarifResult[];
    properties?: Record<string, unknown>;
}

/**
 * Generate SARIF 2.1.0 output
 */
export function generateSarifReport(
    result: ScanResult,
    options: SarifReporterOptions = {}
): string {
    const sarifRun = buildSarifRun(result, options);

    const sarif: SarifLog = {
        version: '2.1.0',
        $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
        runs: [sarifRun],
    };

    return JSON.stringify(sarif, null, 2);
}

interface SarifLog {
    version: string;
    $schema?: string;
    runs: SarifRun[];
}

interface SarifRule {
    id: string;
    name: string;
    shortDescription: {
        text: string;
    };
    fullDescription?: {
        text: string;
    };
    help?: {
        text: string;
        markdown?: string;
    };
    properties?: {
        tags?: string[];
        'security-severity'?: string;
    };
}

function buildSarifRun(result: ScanResult, options: SarifReporterOptions): SarifRun {
    // Build rule definitions
    const ruleMap = new Map<string, SarifRule>();
    const results: SarifResult[] = [];

    for (const issue of result.issues) {
        // Add rule if not seen
        if (!ruleMap.has(issue.rule)) {
            ruleMap.set(issue.rule, {
                id: issue.rule,
                name: formatRuleName(issue.rule),
                shortDescription: {
                    text: getRuleDescription(issue.rule),
                },
                help: {
                    text: `Vue Doctor Rule: ${issue.rule}`,
                    markdown: `## ${issue.rule}\n\n${getRuleDescription(issue.rule)}`,
                },
                properties: {
                    tags: getRuleTags(issue.rule, issue.severity),
                    'security-severity': severityToSeverity(issue.severity),
                },
            });
        }

        // Build result
        const sarifResult: SarifResult = {
            ruleId: issue.rule,
            level: severityToLevel(issue.severity),
            message: {
                text: issue.message,
            },
            locations: [
                {
                    artifactLocation: {
                        uri: normalizeFilePath(issue.file),
                        uriBaseId: 'ROOTPATH',
                    },
                    region: {
                        startLine: issue.line,
                        startColumn: issue.column || 1,
                        endLine: issue.line,
                        endColumn: (issue.column || 1) + 1,
                    },
                },
            ],
            partialFingerprints: {
                primaryLocationLineHash: `${issue.file}:${issue.line}`,
                primaryLocationStartColumnFingerprint: `${issue.file}:${issue.line}:${issue.column || 1}`,
            },
        };

        results.push(sarifResult);
    }

    // Build run object
    return {
        tool: {
            driver: {
                name: 'Vue Doctor',
                version: '2.1.0',
                informationUri: 'https://github.com/daohuy34/vue-doctor',
                rules: Array.from(ruleMap.values()),
            },
        },
        results,
        properties: {
            metrics: {
                filesScanned: result.filesScanned,
                errorCount: result.errorCount,
                warningCount: result.warningCount,
            },
            repositoryUrl: options.repositoryUrl,
            runId: options.runId,
            commitSha: options.commitSha,
        },
    };
}

function formatRuleName(rule: string): string {
    return rule
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function getRuleDescription(rule: string): string {
    const descriptions: Record<string, string> = {
        'no-circular': 'Detects circular dependencies between components',
        'component-coupling': 'Component has too many dependencies',
        'ai-monster-component': 'Component is excessively complex',
        'cross-store-dependency': 'Store depends on another store',
        'excessive-dom-depth': 'Component DOM depth exceeds recommended limit',
        'store-size': 'Pinia store has too many state properties',
        'god-component': 'Component has too many responsibilities',
    };
    return descriptions[rule] || `Vue Doctor rule: ${rule}`;
}

function getRuleTags(rule: string, severity: string): string[] {
    const tags = ['vue', 'vuejs'];
    if (severity === 'error') tags.push('security');
    if (rule.includes('store')) tags.push('state-management');
    if (rule.includes('circular')) tags.push('dependency');
    return tags;
}

function severityToLevel(severity: string): 'warning' | 'error' | 'note' {
    switch (severity) {
        case 'error':
            return 'error';
        case 'warning':
            return 'warning';
        default:
            return 'note';
    }
}

function severityToSeverity(severity: string): string {
    switch (severity) {
        case 'error':
            return '8.0';
        case 'warning':
            return '5.0';
        default:
            return '2.0';
    }
}

function normalizeFilePath(file: string): string {
    // Convert absolute paths to relative for portability
    return file.replace(/^\/.*?\/src\//, 'src/');
}
