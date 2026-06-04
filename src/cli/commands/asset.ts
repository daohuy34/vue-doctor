/**
 * Asset Command
 *
 * Analyze and report on static assets (images, SVGs, fonts) size.
 */

import { analyzeAssets, formatAssetAnalysis } from '../../core/asset-analyzer';
import { loadConfig } from '../../core/config';

export interface AssetOptions {
    json?: boolean;
    directories?: string[];
    threshold?: number;
}

export async function assetCommand(options: AssetOptions = {}): Promise<void> {
    const projectRoot = process.cwd();

    // Load config for threshold
    const config = await loadConfig();
    const maxSizeKb = options.threshold ||
        (config.ruleOptions?.['no-large-asset'] as { maxSizeKb?: number })?.maxSizeKb ||
        50;

    console.log('Analyzing assets...\n');

    const analysis = analyzeAssets(projectRoot, {
        maxSizeKb,
        directories: options.directories,
    });

    if (options.json) {
        console.log(JSON.stringify(analysis, null, 2));
        return;
    }

    console.log(formatAssetAnalysis(analysis, maxSizeKb));

    if (analysis.largeAssets.length > 0) {
        console.log('Tip: Configure threshold in vue-doctor.config.js:');
        console.log(`
{
  "ruleOptions": {
    "no-large-asset": {
      "maxSizeKb": 100
    }
  }
}`);
    }
}
