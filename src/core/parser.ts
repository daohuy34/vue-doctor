import fs from 'node:fs/promises'

import { parse } from '@vue/compiler-sfc'

export async function parseVueFile(filePath: string) {
  const source = await fs.readFile(filePath, 'utf-8')

  const parsed = parse(source)

  return {
    source,
    descriptor: parsed.descriptor
  }
}