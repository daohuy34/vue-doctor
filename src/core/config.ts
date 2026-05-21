import { cosmiconfig } from 'cosmiconfig'

export async function loadConfig() {
  const explorer = cosmiconfig(
    'vue-doctor'
  )

  const result = await explorer.search()

  const userConfig =
    result?.config ?? {}

  return {
    rules:
      userConfig.rules ?? {},

    failOnWarning:
      userConfig.failOnWarning ?? true,
  }
}