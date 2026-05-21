import fs from 'node:fs'

const IGNORE_FILE =
  '.vue-doctorignore'

export function loadIgnorePatterns() {
  try {
    const raw = fs.readFileSync(
      IGNORE_FILE,
      'utf-8'
    )

    return raw
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}