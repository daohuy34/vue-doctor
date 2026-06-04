/**
 * Init Command
 *
 * Interactive CLI to initialize Vue Doctor in a project.
 * Auto-detects project type and generates configuration.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import inquirer from 'inquirer';

export interface InitOptions {
    force?: boolean;
    type?: 'vue3' | 'nuxt3' | 'auto';
    ci?: boolean;
}

export async function initCommand(options: InitOptions = {}): Promise<void> {
    const cwd = process.cwd();

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║           Vue Doctor - Initialize                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

    // Check if config already exists
    const configFiles = [
        'vue-doctor.config.ts',
        'vue-doctor.config.js',
        'vue-doctor.config.mjs',
        'vue.config.ts',
        'nuxt.config.ts',
    ];

    const existingConfig = configFiles.find(async (f) => {
        try {
            await fs.access(path.join(cwd, f));
            return true;
        } catch {
            return false;
        }
    });

    if (existingConfig && !options.force) {
        console.log('⚠️  Vue Doctor config already exists!');
        console.log('   Use --force to reinitialize.');
        return;
    }

    // Detect project type
    let projectType = options.type;
    if (!projectType || projectType === 'auto') {
        projectType = await detectProjectType(cwd);
    }

    console.log(`Detected project type: ${projectType}`);
    console.log('');

    // Generate config based on project type
    const config = generateConfig(projectType);

    // Write config file
    const configPath = path.join(cwd, 'vue-doctor.config.ts');
    await fs.writeFile(configPath, config, 'utf-8');
    console.log(`✅ Created: ${configPath}`);

    // Generate .vue-doctorignore
    const ignorePath = path.join(cwd, '.vue-doctorignore');
    const ignoreContent = `# Vue Doctor - Ignore patterns

node_modules/
dist/
build/
output/
coverage/
.nuxt/
.cache/
*.min.js
*.min.css
`;
    await fs.writeFile(ignorePath, ignoreContent, 'utf-8');
    console.log(`✅ Created: ${ignorePath}`);

    // Generate GitHub Actions workflow if requested
    if (options.ci) {
        const workflowDir = path.join(cwd, '.github/workflows');
        await fs.mkdir(workflowDir, { recursive: true });

        const workflow = generateGitHubWorkflow(projectType);
        await fs.writeFile(path.join(workflowDir, 'vue-doctor.yml'), workflow, 'utf-8');
        console.log(`✅ Created: .github/workflows/vue-doctor.yml`);
    }

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    Next Steps                           ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('1. Run analysis:');
    console.log('   npx vue-doctor check');
    console.log('');
    console.log('2. Generate baseline (for existing projects):');
    console.log('   npx vue-doctor baseline');
    console.log('');
    console.log('3. View architecture:');
    console.log('   npx vue-doctor report --html');
    console.log('');
    console.log('4. For CI/CD, add workflow from docs:');
    console.log('   See .github/workflows/vue-doctor.md');
    console.log('');
}

async function detectProjectType(cwd: string): Promise<'vue3' | 'nuxt3'> {
    // Check for Nuxt
    try {
        const nuxtConfig = path.join(cwd, 'nuxt.config.ts');
        await fs.access(nuxtConfig);
        return 'nuxt3';
    } catch {
        // Not Nuxt
    }

    // Check for Vue
    try {
        const packageJson = path.join(cwd, 'package.json');
        const content = await fs.readFile(packageJson, 'utf-8');
        const pkg = JSON.parse(content);

        if (pkg.dependencies?.nuxt || pkg.devDependencies?.nuxt) {
            return 'nuxt3';
        }
    } catch {
        // Ignore
    }

    return 'vue3';
}

function generateConfig(projectType: string): string {
    const baseConfig = `import { defineConfig } from 'vue-doctor';

export default defineConfig({
    // Project type
    projectType: '${projectType}',

    // Directories to scan
    include: [
        'src/**/*.vue',
        'src/**/*.ts',
        'app/**/*.vue',
        'app/**/*.ts',
    ],

    // Directories to exclude
    exclude: [
        'node_modules/**',
        'dist/**',
        'build/**',
        '**/*.spec.ts',
        '**/*.test.ts',
    ],

    // Rule profiles
    profile: 'recommended',

    // Architecture boundaries (feature-based)
    boundaries: [
        // Example: Define your feature boundaries
        // { name: 'shared', pattern: 'src/shared/**' },
        // { name: 'features', pattern: 'src/features/**', children: true },
    ],

    // Hotspot thresholds
    hotspotThreshold: 60,

    // Cache configuration
    cache: {
        enabled: true,
        ttl: 3600,
    },

    // Report settings
    report: {
        formats: ['text', 'json'],
        output: 'vue-doctor-report.html',
    },
});
`;

    return baseConfig;
}

function generateGitHubWorkflow(projectType: string): string {
    return `# Vue Doctor - GitHub Actions Workflow
# Auto-generated by vue-doctor init

name: Vue Doctor

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  vue-doctor:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # Run analysis
      - name: Run Vue Doctor
        run: npx vue-doctor check --reporter stylish

      # Generate SARIF for security tab
      - name: Generate SARIF Report
        run: npx vue-doctor check --reporter sarif --output results.sarif || true

      # Upload SARIF
      - name: Upload SARIF to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: results.sarif
          category: vue-doctor
`;
}
