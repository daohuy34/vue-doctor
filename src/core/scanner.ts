import { collectFiles } from '../utils/file-collector'

export async function scanProject(files?: string[]) {
  if (files?.length) {
    return files
  }
  return collectFiles()
}