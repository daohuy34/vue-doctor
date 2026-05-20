import type { Rule } from '../../types/rule'

export const noLargeComponentRule: Rule = {
  name: 'no-large-component',

  meta: {
    severity: 'warning',
    category: 'vue'
  },

  async check(context) {
    const lines = context.source.split('\n').length

    if (lines < 500) {
      return []
    }

    return [
      {
        rule: 'no-large-component',
        severity: 'warning',

        file: context.filePath,

        message: `Component exceeds recommended size (${lines} LOC)`,

        suggestion:
          'Consider splitting UI, composables, or business logic into smaller modules.'
      }
    ]
  }
}