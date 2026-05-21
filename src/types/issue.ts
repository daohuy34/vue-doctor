export type Severity = 'info' | 'warning' | 'error'

export interface Issue {
  rule: string
  severity: Severity

  message: string
  suggestion?: string

  file: string
  line?: number
  column?: number

  fingerprint?: string
}