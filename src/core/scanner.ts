import { collectFiles } from '../utils/file-collector'

export async function scanProject() {
  return collectFiles()
}