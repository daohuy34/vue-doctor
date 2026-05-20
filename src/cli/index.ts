import { cac } from 'cac'
import { checkCommand } from './commands/check'

const cli = cac('vue-doctor')

cli
  .command('check', 'Run project analysis')
  .action(async () => {
    await checkCommand()
  })

cli.help()
cli.parse()