/**
 * ContentBridge CLI
 *
 * Provides type generation and initialization for ContentBridge projects
 */

import { Command } from 'commander'
import chalk from 'chalk'
import { typegenCommand } from './commands/typegen.js'
import { initCommand } from './commands/init.js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Get package.json for version
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const packageJsonPath = join(__dirname, '../package.json')
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))

const program = new Command()

program
  .name('contentbridge')
  .description('ContentBridge CLI - CMS abstraction layer tools')
  .version(packageJson.version, '-v, --version', 'Display version number')

// Type generation command
program
  .command('typegen')
  .description('Generate TypeScript types from CMS schemas')
  .option('-a, --adapter <adapter>', 'CMS adapter to use (sanity, payload, contentful, strapi)')
  .option('-o, --output <path>', 'Output file path', 'src/types/contentbridge.generated.ts')
  .option('-c, --config <path>', 'Path to config file')
  .option('-z, --zod', 'Also generate Zod schemas', false)
  .option('-w, --watch', 'Watch for schema changes', false)
  .action(typegenCommand)

// Init command
program
  .command('init')
  .description('Initialize ContentBridge in your project')
  .option('-a, --adapter <adapter>', 'CMS adapter to use (sanity, payload, contentful, strapi)')
  .option('-d, --dir <directory>', 'Project directory', process.cwd())
  .action(initCommand)

// Help customization
program.on('--help', () => {
  console.log('')
  console.log('Examples:')
  console.log('')
  console.log('  $ contentbridge typegen --adapter sanity')
  console.log('  $ contentbridge typegen --adapter payload --output types/cms.ts --zod')
  console.log('  $ contentbridge init --adapter contentful')
  console.log('')
  console.log(`${chalk.gray('For more information, visit:')} ${chalk.cyan('https://contentbridge.dev/docs')}`)
})

// Error handling
program.exitOverride()

try {
  await program.parseAsync(process.argv)
} catch (error) {
  if (error instanceof Error) {
    console.error(chalk.red('Error:'), error.message)
    process.exit(1)
  }
  throw error
}
