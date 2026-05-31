/**
 * Feature Boundary Detection
 *
 * Detects feature modules and prevents feature leakage.
 * Features should only communicate through public APIs.
 */

export interface Feature {
    /** Feature name (directory name) */
    name: string;
    /** Full path to feature directory */
    path: string;
    /** Internal modules within the feature */
    modules: string[];
    /** Public API exports (from index.ts) */
    publicApi: string[];
}

/**
 * Configuration for feature boundaries
 */
export interface FeatureConfig {
    /** Directory patterns that indicate features */
    patterns?: string[];
    /** Directories to ignore as features */
    ignore?: string[];
    /** Files considered as public API */
    publicApiFiles?: string[];
}

/**
 * Default feature patterns
 */
export const DefaultFeaturePatterns = [
    'features/',
    'modules/',
    'domains/',
    'apps/',
];

/**
 * Default public API files
 */
export const DefaultPublicApiFiles = [
    'index.ts',
    'index.tsx',
    'public.ts',
    'public.tsx',
    'api.ts',
    'api.tsx',
];

/**
 * Detect if a file path is within a feature
 */
export function detectFeature(
    filePath: string,
    config?: FeatureConfig,
): Feature | null {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const patterns = config?.patterns ?? DefaultFeaturePatterns;
    const ignore = config?.ignore ?? ['node_modules/', 'dist/', 'build/'];

    // Check if path is ignored
    for (const pattern of ignore) {
        if (normalizedPath.includes(pattern)) {
            return null;
        }
    }

    // Find feature directory
    for (const pattern of patterns) {
        const featureIndex = normalizedPath.indexOf(pattern);
        if (featureIndex !== -1) {
            const featureStart = normalizedPath.indexOf('/', featureIndex) + 1;
            const featureEnd = normalizedPath.indexOf('/', featureStart);
            const featureName = normalizedPath.substring(
                featureStart,
                featureEnd !== -1 ? featureEnd : undefined
            );

            return {
                name: featureName,
                path: normalizedPath.substring(0, featureEnd !== -1 ? featureEnd : normalizedPath.length),
                modules: [],
                publicApi: [],
            };
        }
    }

    return null;
}

/**
 * Get the feature name from a file path
 */
export function getFeatureName(filePath: string): string | null {
    const feature = detectFeature(filePath);
    return feature?.name ?? null;
}

/**
 * Check if two files are in the same feature
 */
export function isSameFeature(file1: string, file2: string): boolean {
    const feature1 = detectFeature(file1);
    const feature2 = detectFeature(file2);

    if (!feature1 || !feature2) {
        return false;
    }

    return feature1.name === feature2.name;
}

/**
 * Check if a file is a public API file
 */
export function isPublicApi(filePath: string, config?: FeatureConfig): boolean {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const publicApiFiles = config?.publicApiFiles ?? DefaultPublicApiFiles;

    const fileName = normalizedPath.split('/').pop() ?? '';

    return publicApiFiles.includes(fileName);
}

/**
 * Get the public API path for a feature
 */
export function getPublicApiPath(featurePath: string): string {
    return `${featurePath}/index.ts`;
}

/**
 * Check if an import is a feature-internal import
 */
export function isFeatureInternalImport(
    sourceFile: string,
    importPath: string,
    config?: FeatureConfig,
): boolean {
    const sourceFeature = detectFeature(sourceFile, config);
    if (!sourceFeature) {
        return false;
    }

    // Handle relative imports
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
        return true; // Relative imports within feature are internal
    }

    // Handle alias imports
    if (importPath.startsWith('@/')) {
        const targetPath = importPath.replace('@/', '');
        const targetFeature = detectFeature(targetPath, config);
        return targetFeature?.name === sourceFeature.name;
    }

    // Handle tilde imports
    if (importPath.startsWith('~/')) {
        const targetPath = importPath.replace('~/', '');
        const targetFeature = detectFeature(targetPath, config);
        return targetFeature?.name === sourceFeature.name;
    }

    return false;
}

/**
 * Check if an import crosses feature boundaries
 */
export function isCrossFeatureImport(
    sourceFile: string,
    importPath: string,
    config?: FeatureConfig,
): boolean {
    const sourceFeature = detectFeature(sourceFile, config);
    if (!sourceFeature) {
        return false;
    }

    // Skip non-feature imports
    if (importPath.startsWith('@/')) {
        const targetPath = importPath.replace('@/', '');
        const targetFeature = detectFeature(targetPath, config);
        return targetFeature !== null && targetFeature.name !== sourceFeature.name;
    }

    if (importPath.startsWith('~/')) {
        const targetPath = importPath.replace('~/', '');
        const targetFeature = detectFeature(targetPath, config);
        return targetFeature !== null && targetFeature.name !== sourceFeature.name;
    }

    return false;
}

/**
 * Detect feature leakage - when a feature imports internal modules of another feature
 */
export interface FeatureLeakage {
    sourceFile: string;
    targetFile: string;
    sourceFeature: string;
    targetFeature: string;
    isPublicApi: boolean;
}

export function detectFeatureLeakage(
    sourceFile: string,
    importPath: string,
    config?: FeatureConfig,
): FeatureLeakage | null {
    const sourceFeature = detectFeature(sourceFile, config);
    if (!sourceFeature) {
        return null;
    }

    // Handle relative imports within same feature
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
        return null; // Relative imports are always internal
    }

    // Handle alias imports
    let targetPath = importPath;
    let isAlias = false;

    if (importPath.startsWith('@/')) {
        targetPath = importPath.replace('@/', '');
        isAlias = true;
    } else if (importPath.startsWith('~/')) {
        targetPath = importPath.replace('~/', '');
        isAlias = true;
    }

    if (!isAlias) {
        return null;
    }

    const targetFeature = detectFeature(targetPath, config);
    if (!targetFeature) {
        return null;
    }

    // Check if it's a cross-feature import
    if (targetFeature.name === sourceFeature.name) {
        return null; // Same feature, not leakage
    }

    // Check if target is public API
    const isPublic = isPublicApi(targetPath, config);

    return {
        sourceFile,
        targetFile: targetPath,
        sourceFeature: sourceFeature.name,
        targetFeature: targetFeature.name,
        isPublicApi: isPublic,
    };
}
