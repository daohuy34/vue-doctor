export type Severity = 'info' | 'warning' | 'error' | 'critical'

export interface Issue {
    rule: string
    severity: Severity
    category?: string

    message: string
    suggestion?: string

    file: string
    line?: number
    column?: number

    fingerprint?: string
}