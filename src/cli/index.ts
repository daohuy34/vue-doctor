#!/usr/bin/env node
import { cac } from 'cac'

import { checkCommand } from './commands/check'

import { baselineCommand } from './commands/baseline'

const cli = cac('vue-doctor')

cli
  .command('check', 'Run project analysis')
  

  .option(
    '--changed',
    'Analyze changed files only'
  )

  .option(
    '--reporter <type>',
    'Reporter type',
    {
      default: 'stylish'
    }
  )

  .action(async (options) => {
    await checkCommand(options)
  })

cli
  .command(
    'baseline',
    'Generate baseline file'
  )
  .action(async () => {
    await baselineCommand()
  })

cli.help()

cli.parse()