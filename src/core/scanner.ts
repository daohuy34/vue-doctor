import { collectFiles } from '../utils/file-collector'

import { loadIgnorePatterns } from './ignore'

export async function scanProject(
  files?: string[]
) {
  const ignorePatterns =
    loadIgnorePatterns()

  const targets =
    files?.length
      ? files
      : await collectFiles()

  return targets.filter((file) => {
    return !ignorePatterns.some(
      (pattern) =>
        file.includes(pattern)
    )
  })
}