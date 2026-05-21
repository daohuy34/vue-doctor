import crypto from 'node:crypto'

import type { Issue } from '../types/issue'

export function createFingerprint(
  issue: Issue
) {
  return crypto
    .createHash('md5')
    .update(
      [
        issue.rule,
        issue.file,
        issue.line,
        issue.message
      ].join(':')
    )
    .digest('hex')
}