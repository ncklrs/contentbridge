/**
 * Init command
 *
 * Initialize ContentBridge configuration in a project
 */

import chalk from 'chalk'
import ora from 'ora'
import { writeFileSync, existsSync } from 'fs'
import { join } from 'path'

interface InitOptions {
  adapter?: string
  dir?: string
}

const ADAPTER_TEMPLATES: Record<string, string> = {
  sanity: `import { defineConfig } from '@contentbridge/core'
import { SanityAdapter } from '@contentbridge/sanity'

export default defineConfig({
  adapter: new SanityAdapter({
    projectId: process.env.SANITY_PROJECT_ID!,
    dataset: process.env.SANITY_DATASET || 'production',
    apiVersion: '2024-01-01',
    useCdn: false,
  }),
  outputPath: 'src/types/contentbridge.generated.ts',
})`,

  payload: `import { defineConfig } from '@contentbridge/core'
import { PayloadAdapter } from '@contentbridge/payload'

export default defineConfig({
  adapter: new PayloadAdapter({
    serverURL: process.env.PAYLOAD_SERVER_URL || 'http://localhost:3000',
    apiKey: process.env.PAYLOAD_API_KEY,
  }),
  outputPath: 'src/types/contentbridge.generated.ts',
})`,

  contentful: `import { defineConfig } from '@contentbridge/core'
import { ContentfulAdapter } from '@contentbridge/contentful'

export default defineConfig({
  adapter: new ContentfulAdapter({
    space: process.env.CONTENTFUL_SPACE_ID!,
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN!,
    environment: process.env.CONTENTFUL_ENVIRONMENT || 'master',
  }),
  outputPath: 'src/types/contentbridge.generated.ts',
})`,

  strapi: `import { defineConfig } from '@contentbridge/core'
import { StrapiAdapter } from '@contentbridge/strapi'

export default defineConfig({
  adapter: new StrapiAdapter({
    apiURL: process.env.STRAPI_API_URL || 'http://localhost:1337',
    apiToken: process.env.STRAPI_API_TOKEN,
  }),
  outputPath: 'src/types/contentbridge.generated.ts',
})`,
}

const ENV_TEMPLATES: Record<string, string[]> = {
  sanity: [
    '# Sanity Configuration',
    'SANITY_PROJECT_ID=your-project-id',
    'SANITY_DATASET=production',
  ],
  payload: [
    '# Payload CMS Configuration',
    'PAYLOAD_SERVER_URL=http://localhost:3000',
    'PAYLOAD_API_KEY=your-api-key',
  ],
  contentful: [
    '# Contentful Configuration',
    'CONTENTFUL_SPACE_ID=your-space-id',
    'CONTENTFUL_ACCESS_TOKEN=your-access-token',
    'CONTENTFUL_ENVIRONMENT=master',
  ],
  strapi: [
    '# Strapi Configuration',
    'STRAPI_API_URL=http://localhost:1337',
    'STRAPI_API_TOKEN=your-api-token',
  ],
}

export async function initCommand(options: InitOptions): Promise<void> {
  const spinner = ora('Initializing ContentBridge...').start()

  try {
    const dir = options.dir || process.cwd()
    const adapter = options.adapter

    if (!adapter) {
      spinner.fail('No adapter specified')
      console.log('')
      console.log(chalk.yellow('Please specify an adapter:'))
      console.log('')
      console.log(`  ${chalk.cyan('contentbridge init --adapter sanity')}`)
      console.log(`  ${chalk.cyan('contentbridge init --adapter payload')}`)
      console.log(`  ${chalk.cyan('contentbridge init --adapter contentful')}`)
      console.log(`  ${chalk.cyan('contentbridge init --adapter strapi')}`)
      console.log('')
      process.exit(1)
    }

    if (!ADAPTER_TEMPLATES[adapter]) {
      spinner.fail(`Unknown adapter: ${adapter}`)
      console.log('')
      console.log(chalk.yellow('Supported adapters:'))
      console.log('')
      Object.keys(ADAPTER_TEMPLATES).forEach(name => {
        console.log(`  ${chalk.cyan(name)}`)
      })
      console.log('')
      process.exit(1)
    }

    // Check if config already exists
    const configPath = join(dir, 'contentbridge.config.ts')
    if (existsSync(configPath)) {
      spinner.warn('Configuration already exists')
      console.log('')
      console.log(chalk.yellow(`Config file already exists: ${configPath}`))
      console.log('')
      console.log('To reinitialize, remove the existing config file first.')
      return
    }

    spinner.text = 'Creating configuration file...'

    // Write config file
    writeFileSync(configPath, ADAPTER_TEMPLATES[adapter], 'utf-8')

    // Write .env.example if it doesn't exist
    const envExamplePath = join(dir, '.env.example')
    if (!existsSync(envExamplePath)) {
      writeFileSync(envExamplePath, ENV_TEMPLATES[adapter].join('\n') + '\n', 'utf-8')
    }

    spinner.succeed('ContentBridge initialized!')

    console.log('')
    console.log(`  ${chalk.green('✓')} Created ${chalk.cyan('contentbridge.config.ts')}`)
    console.log(`  ${chalk.green('✓')} Created ${chalk.cyan('.env.example')}`)
    console.log('')
    console.log(chalk.bold('Next steps:'))
    console.log('')
    console.log(`  1. Copy ${chalk.cyan('.env.example')} to ${chalk.cyan('.env')} and fill in your credentials`)
    console.log(`  2. Run ${chalk.cyan(`contentbridge typegen --adapter ${adapter}`)} to generate types`)
    console.log(`  3. Import types in your code: ${chalk.gray(`import type { Post } from './types/contentbridge.generated'`)}`)
    console.log('')
    console.log(`${chalk.gray('For more information, visit:')} ${chalk.cyan('https://contentbridge.dev/docs')}`)
    console.log('')

  } catch (error) {
    spinner.fail('Initialization failed')
    console.log('')

    if (error instanceof Error) {
      console.error(chalk.red('Error:'), error.message)
    }

    process.exit(1)
  }
}
