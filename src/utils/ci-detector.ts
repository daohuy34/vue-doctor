/**
 * CI Environment Detection
 *
 * Detects GitHub Actions environment and CI-specific contexts.
 */

export interface CIEnvironment {
    isCI: boolean;
    isGitHubActions: boolean;
    repository?: string;
    commitSha?: string;
    runId?: string;
    runNumber?: number;
    ref?: string;
    workflow?: string;
    actor?: string;
}

let cachedEnv: CIEnvironment | null = null;

/**
 * Detect CI environment
 */
export function detectCIEnvironment(): CIEnvironment {
    if (cachedEnv) return cachedEnv;

    const isGitHubActions = !!process.env.GITHUB_ACTIONS;
    const isCI = isGitHubActions || !!process.env.CI;

    cachedEnv = {
        isCI,
        isGitHubActions,
        repository: process.env.GITHUB_REPOSITORY,
        commitSha: process.env.GITHUB_SHA,
        runId: process.env.GITHUB_RUN_ID,
        runNumber: process.env.GITHUB_RUN_NUMBER ? parseInt(process.env.GITHUB_RUN_NUMBER) : undefined,
        ref: process.env.GITHUB_REF,
        workflow: process.env.GITHUB_WORKFLOW,
        actor: process.env.GITHUB_ACTOR,
    };

    return cachedEnv;
}

/**
 * Get SARIF metadata for current environment
 */
export function getSarifMetadata() {
    const env = detectCIEnvironment();

    return {
        repositoryUrl: env.repository ? `https://github.com/${env.repository}` : undefined,
        runId: env.runId,
        commitSha: env.commitSha,
    };
}

/**
 * Check if should use specific reporter based on environment
 */
export function shouldUseSarif(): boolean {
    const env = detectCIEnvironment();
    return env.isGitHubActions;
}

/**
 * Clear cached environment (useful for testing)
 */
export function clearCIEnvironmentCache(): void {
    cachedEnv = null;
}
