import { stylishReporter } from './stylish'
import { jsonReporter } from './json'
import { githubReporter } from './github'

export const reporters = {
  stylish: stylishReporter,
  json: jsonReporter,
  github: githubReporter
}