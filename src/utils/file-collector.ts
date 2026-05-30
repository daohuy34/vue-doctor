import fg from 'fast-glob'

import { readTsConfig, type TsConfigInfo } from './tsconfig-resolver'

export interface FileCollectorOptions {
  cwd?: string
  include?: string[]
  exclude?: string[]
}

let cachedTsConfig: TsConfigInfo | null | false = null

export async function collectFiles(options: FileCollectorOptions = {}) {
  const {
    cwd = process.cwd(),
    include = ['**/*.vue', '**/*.ts', '**/*.tsx'],
    exclude = [
      '**/node_modules/**',
      '**/dist/**',
      '**/.nuxt/**',
      '**/coverage/**'
    ]
  } = options

  return fg(include, {
    cwd,
    ignore: exclude
  })
}

export async function collectFilesWithAliasSupport(options: FileCollectorOptions = {}) {
  const files = await collectFiles(options)

  if (cachedTsConfig === false) {
    return files
  }

  try {
    const tsconfig = await readTsConfig(options.cwd || process.cwd())
    cachedTsConfig = tsconfig
    return files
  } catch {
    cachedTsConfig = false
    return files
  }
}

export async function getTsConfigInfo(cwd: string = process.cwd()): Promise<TsConfigInfo | null> {
  if (cachedTsConfig !== null) {
    return cachedTsConfig === false ? null : cachedTsConfig
  }

  try {
    cachedTsConfig = await readTsConfig(cwd)
    return cachedTsConfig
  } catch {
    cachedTsConfig = false
    return null
  }
}

export function clearTsConfigCache() {
  cachedTsConfig = null
}