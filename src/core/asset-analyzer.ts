/**
 * Asset Analyzer
 *
 * Analyzes static assets like images, SVGs, fonts for size optimization.
 */

import fs from 'node:fs';
import path from 'node:path';

export interface AssetInfo {
    filePath: string;
    name: string;
    extension: string;
    sizeKb: number;
    sizeBytes: number;
    type: 'image' | 'font' | 'video' | 'other';
}

export interface AssetAnalysis {
    assets: AssetInfo[];
    totalSizeKb: number;
    largeAssets: AssetInfo[];
    summary: {
        imageCount: number;
        fontCount: number;
        videoCount: number;
        otherCount: number;
        oversizedCount: number;
    };
}

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.avif', '.apng'];
const FONT_EXTENSIONS = ['.woff', '.woff2', '.ttf', '.otf', '.eot'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogv', '.avi'];

function classifyAsset(extension: string): AssetInfo['type'] {
    const ext = extension.toLowerCase();
    if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
    if (FONT_EXTENSIONS.includes(ext)) return 'font';
    if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
    return 'other';
}

function shouldAnalyze(extension: string): boolean {
    const ext = extension.toLowerCase();
    return (
        IMAGE_EXTENSIONS.includes(ext) ||
        FONT_EXTENSIONS.includes(ext) ||
        VIDEO_EXTENSIONS.includes(ext) ||
        ext === '.svg'
    );
}

/**
 * Analyze assets in a project directory
 */
export function analyzeAssets(
    projectRoot: string,
    options: {
        maxSizeKb?: number;
        directories?: string[];
    } = {},
): AssetAnalysis {
    const maxSizeKb = options.maxSizeKb || 50;
    const searchDirs = options.directories || ['public', 'assets', 'static'];

    const assets: AssetInfo[] = [];

    // Search in common asset directories
    for (const dir of searchDirs) {
        const dirPath = path.join(projectRoot, dir);
        if (fs.existsSync(dirPath)) {
            scanDirectory(dirPath, assets);
        }
    }

    // Also search for assets referenced in Vue files
    scanForInlineAssets(projectRoot, assets);

    // Filter out assets below threshold
    const largeAssets = assets.filter((a) => a.sizeKb > maxSizeKb);

    // Calculate summary
    const summary = {
        imageCount: assets.filter((a) => a.type === 'image').length,
        fontCount: assets.filter((a) => a.type === 'font').length,
        videoCount: assets.filter((a) => a.type === 'video').length,
        otherCount: assets.filter((a) => a.type === 'other').length,
        oversizedCount: largeAssets.length,
    };

    const totalSizeKb = assets.reduce((sum, a) => sum + a.sizeKb, 0);

    return {
        assets,
        totalSizeKb,
        largeAssets,
        summary,
    };
}

function scanDirectory(dirPath: string, assets: AssetInfo[]): void {
    try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);

            if (entry.isDirectory()) {
                // Skip node_modules and hidden directories
                if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
                    scanDirectory(fullPath, assets);
                }
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();

                if (shouldAnalyze(ext) || ext === '.svg') {
                    try {
                        const stats = fs.statSync(fullPath);
                        const sizeBytes = stats.size;
                        const sizeKb = Math.round(sizeBytes / 1024 * 100) / 100;

                        assets.push({
                            filePath: fullPath,
                            name: entry.name,
                            extension: ext,
                            sizeKb,
                            sizeBytes,
                            type: ext === '.svg' ? 'image' : classifyAsset(ext),
                        });
                    } catch {
                        // Skip files that can't be read
                    }
                }
            }
        }
    } catch {
        // Skip directories that can't be read
    }
}

function scanForInlineAssets(projectRoot: string, assets: AssetInfo[]): void {
    // This can be extended to detect inline assets in Vue files
    // For now, we focus on standalone asset files
}

/**
 * Format asset analysis for CLI output
 */
export function formatAssetAnalysis(analysis: AssetAnalysis, maxSizeKb: number = 50): string {
    const lines: string[] = [];

    lines.push('Asset Analysis');
    lines.push('═'.repeat(60));

    lines.push('');
    lines.push('Summary:');
    lines.push(`  Images:  ${analysis.summary.imageCount}`);
    lines.push(`  Fonts:    ${analysis.summary.fontCount}`);
    lines.push(`  Videos:   ${analysis.summary.videoCount}`);
    lines.push(`  Other:    ${analysis.summary.otherCount}`);
    lines.push(`  ──────────────────`);
    lines.push(`  Total:    ${analysis.assets.length}`);
    lines.push(`  Total Size: ${analysis.totalSizeKb} KB`);

    if (analysis.largeAssets.length > 0) {
        lines.push('');
        lines.push(`⚠ Large Assets (>${maxSizeKb}KB): ${analysis.largeAssets.length}`);

        // Sort by size descending
        const sorted = [...analysis.largeAssets].sort((a, b) => b.sizeKb - a.sizeKb);

        for (const asset of sorted.slice(0, 20)) {
            const relativePath = asset.filePath.split('/').slice(-3).join('/');
            lines.push(`  ${asset.sizeKb.toFixed(1)} KB  ${relativePath}`);
        }

        if (sorted.length > 20) {
            lines.push(`  ... and ${sorted.length - 20} more`);
        }
    } else {
        lines.push('');
        lines.push('✅ No oversized assets found!');
    }

    lines.push('');

    return lines.join('\n');
}

/**
 * Get asset issues for rules engine
 */
export function getAssetIssues(
    projectRoot: string,
    options: {
        maxSizeKb?: number;
    } = {},
): {
    file: string;
    line: number;
    message: string;
    suggestion: string;
    sizeKb: number;
}[] {
    const maxSizeKb = options.maxSizeKb || 50;
    const analysis = analyzeAssets(projectRoot, { maxSizeKb });

    return analysis.largeAssets.map((asset) => {
        const relativePath = asset.filePath.replace(projectRoot + '/', '');

        return {
            file: asset.filePath,
            line: 1,
            message: `Asset "${asset.name}" is ${asset.sizeKb.toFixed(1)} KB (exceeds ${maxSizeKb} KB threshold)`,
            suggestion: `Consider optimizing this ${asset.type} or using lazy loading. Tools: imagemin, svgo, or CDN.`,
            sizeKb: asset.sizeKb,
        };
    });
}
