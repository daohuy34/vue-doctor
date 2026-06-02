import { execSync } from 'node:child_process'

export function getChangedFiles(options?: { since?: string }): string[] | null {
    try {
        let command: string;

        if (options?.since) {
            // Get files changed since a specific commit/date/ref
            command = `git diff --name-only ${options.since} HEAD`;
        } else {
            // Default: files changed in last commit
            command = 'git diff --name-only HEAD~1';
        }

        const output = execSync(command, {
            encoding: 'utf-8',
        })

        return output
            .split('\n')
            .map((file) => file.trim())
            .filter(Boolean)
            .filter((file) => {
                return (
                    file.endsWith('.vue') ||
                    file.endsWith('.ts') ||
                    file.endsWith('.js')
                )
            })
    } catch {
        return null
    }
}

export function getFilesSinceRef(ref: string): string[] | null {
    try {
        const output = execSync(`git diff --name-only ${ref}`, {
            encoding: 'utf-8',
        })

        return output
            .split('\n')
            .map((file) => file.trim())
            .filter(Boolean)
            .filter((file) => {
                return (
                    file.endsWith('.vue') ||
                    file.endsWith('.ts') ||
                    file.endsWith('.js')
                )
            })
    } catch {
        return null
    }
}

export function getGitRoot(): string | null {
    try {
        const output = execSync('git rev-parse --show-toplevel', {
            encoding: 'utf-8',
        })
        return output.trim()
    } catch {
        return null
    }
}

export function isGitRepo(): boolean {
    try {
        execSync('git rev-parse --is-inside-work-tree', {
            encoding: 'utf-8',
        })
        return true
    } catch {
        return false
    }
}