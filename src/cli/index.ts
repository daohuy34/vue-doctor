import { cac } from 'cac'

import { checkCommand } from './commands/check'

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

cli.help()

cli.parse()