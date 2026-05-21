import type { Issue } from '../types/issue'

export function jsonReporter(
  issues: Issue[]
) {
  console.log(
    JSON.stringify(issues, null, 2)
  )
}