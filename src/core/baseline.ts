import fs from 'node:fs'

const BASELINE_FILE =
  '.vue-doctor-baseline.json'

export function loadBaseline() {
  try {
    const raw = fs.readFileSync(
      BASELINE_FILE,
      'utf-8'
    )

    const data = JSON.parse(raw)

    return new Set<string>(data)
  } catch {
    return new Set<string>()
  }
}

export function saveBaseline(
  fingerprints: string[]
) {
  fs.writeFileSync(
    BASELINE_FILE,
    JSON.stringify(
      fingerprints,
      null,
      2
    )
  )
}