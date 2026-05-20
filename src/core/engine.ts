import fs from 'node:fs/promises'

import { rules } from '../rules'

import type { Issue } from '../types/issue'

export async function runEngine(files: string[]) {
  const issues: Issue[] = []

  for (const file of files) {
    const source = await fs.readFile(file, 'utf-8')

    for (const rule of rules) {
      const findings = await rule.check({
        filePath: file,
        source
      })

      issues.push(...findings)
    }
  }

  return issues
}