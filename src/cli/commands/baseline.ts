import { runEngine } from './../../core/engine'

import { saveBaseline } from './../../core/baseline'

export async function baselineCommand() {
  const issues = await runEngine()

  const fingerprints = issues
    .map((issue) => issue.fingerprint)
    .filter(Boolean) as string[]

  saveBaseline(fingerprints)

  console.log(
    '✔ Baseline generated'
  )
}