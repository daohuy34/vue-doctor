import * as vscode from 'vscode';
import { spawn } from 'child_process';
import path from 'path';

let statusBarItem: vscode.StatusBarItem;
let diagnosticCollection: vscode.DiagnosticCollection;

interface VueDoctorIssue {
    file: string;
    line: number;
    column?: number;
    severity: 'error' | 'warning' | 'info';
    rule: string;
    message: string;
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Vue Doctor extension activated!');

    // Create status bar
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.text = '$(check) Vue Doctor';
    statusBarItem.command = 'vue-doctor.showMetrics';
    statusBarItem.show();

    // Create diagnostic collection
    diagnosticCollection = vscode.languages.createDiagnosticCollection('vue-doctor');
    context.subscriptions.push(diagnosticCollection);

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('vue-doctor.runAnalysis', runAnalysis),
        vscode.commands.registerCommand('vue-doctor.showDashboard', showDashboard),
        vscode.commands.registerCommand('vue-doctor.showMetrics', showMetrics),
        vscode.commands.registerCommand('vue-doctor.fixIssues', fixIssues)
    );

    // Auto-run on save if enabled
    const config = vscode.workspace.getConfiguration('vueDoctor');
    if (config.get('runOnSave', true)) {
        context.subscriptions.push(
            vscode.workspace.onDidSaveTextDocument((document) => {
                if (isVueFile(document.fileName)) {
                    runAnalysis();
                }
            })
        );
    }

    // Initial analysis
    runAnalysis();

    updateStatus('Ready', vscode.TaskRunStatus.Information);
}

async function runAnalysis() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        return;
    }

    updateStatus('Analyzing...', vscode.TaskRunStatus.Information);

    try {
        const issues = await runVueDoctor(workspaceFolder.uri.fsPath);

        // Clear old diagnostics
        diagnosticCollection.clear();

        // Group issues by file
        const issuesByFile = new Map<string, vscode.Diagnostic[]>();

        for (const issue of issues) {
            const uri = vscode.Uri.file(issue.file);
            const range = new vscode.Range(
                Math.max(0, issue.line - 1),
                Math.max(0, (issue.column || 1) - 1),
                Math.max(0, issue.line - 1),
                1000
            );

            const severity = issue.severity === 'error'
                ? vscode.DiagnosticSeverity.Error
                : issue.severity === 'warning'
                    ? vscode.DiagnosticSeverity.Warning
                    : vscode.DiagnosticSeverity.Information;

            const diagnostic = new vscode.Diagnostic(
                range,
                `[${issue.rule}] ${issue.message}`,
                severity
            );
            diagnostic.source = 'Vue Doctor';

            if (!issuesByFile.has(issue.file)) {
                issuesByFile.set(issue.file, []);
            }
            issuesByFile.get(issue.file)!.push(diagnostic);
        }

        // Set diagnostics
        for (const [file, diagnostics] of issuesByFile) {
            diagnosticCollection.set(vscode.Uri.file(file), diagnostics);
        }

        // Update status
        const errors = issues.filter(i => i.severity === 'error').length;
        const warnings = issues.filter(i => i.severity === 'warning').length;

        if (errors > 0) {
            statusBarItem.color = '#ef4444';
            updateStatus(`${errors}E ${warnings}W`, vscode.TaskRunStatus.Error);
        } else if (warnings > 0) {
            statusBarItem.color = '#f59e0b';
            updateStatus(`${warnings}W`, vscode.TaskRunStatus.Information);
        } else {
            statusBarItem.color = '#10b981';
            updateStatus('No issues', vscode.TaskRunStatus.Ok);
        }

        vscode.window.showInformationMessage(
            `Vue Doctor: Found ${issues.length} issue(s)`
        );
    } catch (error) {
        console.error('Vue Doctor analysis failed:', error);
        updateStatus('Error', vscode.TaskRunStatus.Error);
    }
}

async function runVueDoctor(cwd: string): Promise<VueDoctorIssue[]> {
    return new Promise((resolve, reject) => {
        const args = ['check', '--reporter', 'json', '--no-cache'];

        const child = spawn('npx', args, {
            cwd,
            shell: true,
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('close', (code) => {
            if (code === 0 || code === 1) {
                try {
                    const result = JSON.parse(stdout);
                    resolve(result.issues || []);
                } catch {
                    resolve([]);
                }
            } else {
                reject(new Error(stderr || 'Vue Doctor failed'));
            }
        });

        child.on('error', reject);
    });
}

function showDashboard() {
    vscode.env.openExternal(vscode.Uri.parse('http://localhost:3000'));
}

async function showMetrics() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showInformationMessage('No workspace folder found');
        return;
    }

    const output = vscode.window.createOutputChannel('Vue Doctor Metrics');
    output.show();

    return new Promise<void>((resolve) => {
        const child = spawn('npx', ['vue-doctor', 'metrics', '--format', 'text'], {
            cwd: workspaceFolder.uri.fsPath,
            shell: true,
        });

        child.stdout.on('data', (data) => {
            output.append(data.toString());
        });

        child.on('close', () => {
            resolve();
        });
    });
}

async function fixIssues() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        return;
    }

    const choice = await vscode.window.showWarningMessage(
        'This will modify your source files. Continue?',
        'Yes',
        'No'
    );

    if (choice !== 'Yes') {
        return;
    }

    updateStatus('Fixing...', vscode.TaskRunStatus.Information);

    return new Promise<void>((resolve, reject) => {
        const child = spawn('npx', ['vue-doctor', 'fix'], {
            cwd: workspaceFolder.uri.fsPath,
            shell: true,
        });

        child.stdout.on('data', (data) => {
            console.log(data.toString());
        });

        child.on('close', (code) => {
            if (code === 0) {
                vscode.window.showInformationMessage('Vue Doctor: Fixes applied!');
                runAnalysis();
            } else {
                vscode.window.showErrorMessage('Vue Doctor: Fix failed');
            }
            resolve();
        });

        child.on('error', reject);
    });
}

function updateStatus(text: string, status: vscode.TaskRunStatus) {
    statusBarItem.text = `$(check) ${text}`;
    statusBarItem.tooltip = `Vue Doctor: ${text}`;
}

function isVueFile(filePath: string): boolean {
    return filePath.endsWith('.vue') || filePath.endsWith('.ts');
}

export function deactivate() {
    statusBarItem?.dispose();
    diagnosticCollection?.dispose();
}
