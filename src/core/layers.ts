/**
 * Layer System for Architecture Boundary Analysis
 *
 * Defines architectural layers and their relationships.
 * Prevents architecture decay by enforcing layer dependencies.
 */

/**
 * Standard architectural layers (from highest to lowest level)
 */
export enum Layer {
    /** UI Components - Vue components, pages */
    UI = 'ui',
    /** Business logic - composables, stores */
    Business = 'business',
    /** Services - API calls, external integrations */
    Service = 'service',
    /** Utilities - helpers, formatters */
    Utils = 'utils',
    /** Types and interfaces */
    Types = 'types',
    /** Configuration */
    Config = 'config',
}

/**
 * Human-readable layer names
 */
export const LayerNames: Record<Layer, string> = {
    [Layer.UI]: 'UI Layer',
    [Layer.Business]: 'Business Logic Layer',
    [Layer.Service]: 'Service Layer',
    [Layer.Utils]: 'Utilities Layer',
    [Layer.Types]: 'Types Layer',
    [Layer.Config]: 'Configuration Layer',
};

/**
 * Default layer directories and patterns
 */
export const LayerPatterns: Record<Layer, string[]> = {
    [Layer.UI]: [
        'components/',
        'pages/',
        'layouts/',
        'views/',
    ],
    [Layer.Business]: [
        'composables/',
        'stores/',
        'hooks/',
        'models/',
    ],
    [Layer.Service]: [
        'services/',
        'api/',
        'clients/',
        'adapters/',
    ],
    [Layer.Utils]: [
        'utils/',
        'helpers/',
        'formatters/',
        'constants/',
    ],
    [Layer.Types]: [
        'types/',
        'interfaces/',
        'models/types/',
    ],
    [Layer.Config]: [
        'config/',
        'configs/',
    ],
};

/**
 * Default layer hierarchy (who can depend on whom)
 * Each layer can only depend on itself or lower layers.
 *
 * UI → Business → Service → Utils → Types → Config
 */
export const DefaultLayerHierarchy: Layer[] = [
    Layer.UI,
    Layer.Business,
    Layer.Service,
    Layer.Utils,
    Layer.Types,
    Layer.Config,
];

/**
 * Get the level of a layer in the hierarchy (lower = more foundational)
 */
export function getLayerLevel(layer: Layer): number {
    return DefaultLayerHierarchy.indexOf(layer);
}

/**
 * Check if a dependency from one layer to another is valid
 */
export function isValidLayerDependency(
    fromLayer: Layer,
    toLayer: Layer,
    customHierarchy?: Layer[],
): boolean {
    const hierarchy = customHierarchy ?? DefaultLayerHierarchy;
    const fromLevel = hierarchy.indexOf(fromLayer);
    const toLevel = hierarchy.indexOf(toLayer);

    // Same layer is always valid
    if (fromLayer === toLayer) {
        return true;
    }

    // Can only depend on same level or lower (foundational) layers
    return toLevel >= fromLevel;
}

/**
 * Detect the layer of a file based on its path
 */
export function detectLayer(filePath: string): Layer | null {
    const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();

    for (const [layer, patterns] of Object.entries(LayerPatterns)) {
        for (const pattern of patterns) {
            if (normalizedPath.includes(pattern.toLowerCase())) {
                return layer as Layer;
            }
        }
    }

    // Default based on file extension
    if (normalizedPath.endsWith('.vue')) {
        return Layer.UI;
    }

    if (normalizedPath.endsWith('.ts') || normalizedPath.endsWith('.tsx')) {
        // Check for store/composable patterns
        if (normalizedPath.includes('store') || normalizedPath.includes('composable')) {
            return Layer.Business;
        }
        if (normalizedPath.includes('service') || normalizedPath.includes('api')) {
            return Layer.Service;
        }
        if (normalizedPath.includes('utils') || normalizedPath.includes('helper')) {
            return Layer.Utils;
        }
        if (normalizedPath.includes('type') || normalizedPath.includes('interface')) {
            return Layer.Types;
        }
    }

    return null;
}

/**
 * Get all files in a specific layer from a list of file paths
 */
export function getFilesInLayer(filePaths: string[], layer: Layer): string[] {
    return filePaths.filter((path) => detectLayer(path) === layer);
}

/**
 * Get layer violation details
 */
export function getLayerViolationDetails(
    fromFile: string,
    toFile: string,
): {
    isViolation: boolean;
    fromLayer: Layer | null;
    toLayer: Layer | null;
    message?: string;
} {
    const fromLayer = detectLayer(fromFile);
    const toLayer = detectLayer(toFile);

    if (!fromLayer || !toLayer) {
        return {
            isViolation: false,
            fromLayer,
            toLayer,
        };
    }

    const isViolation = !isValidLayerDependency(fromLayer, toLayer);

    if (isViolation) {
        return {
            isViolation: true,
            fromLayer,
            toLayer,
            message: `${LayerNames[fromLayer]} should not depend on ${LayerNames[toLayer]}`,
        };
    }

    return {
        isViolation: false,
        fromLayer,
        toLayer,
    };
}

/**
 * Configuration for custom layer rules
 */
export interface LayerConfig {
    /** Custom layer definitions */
    layers?: Record<string, string[]>;
    /** Custom hierarchy (layer names in order) */
    hierarchy?: string[];
    /** Forbidden dependencies (from -> to) */
    forbidden?: Array<{ from: string; to: string }>;
}

/**
 * Build custom hierarchy from config
 */
export function buildLayerHierarchy(config: LayerConfig): Layer[] | null {
    if (!config.hierarchy) {
        return null;
    }

    const hierarchy: Layer[] = [];
    for (const name of config.hierarchy) {
        const layer = name.toLowerCase() as Layer;
        if (Object.values(Layer).includes(layer)) {
            hierarchy.push(layer);
        }
    }

    return hierarchy.length > 0 ? hierarchy : null;
}

/**
 * Check if a specific dependency is forbidden
 */
export function isForbiddenDependency(
    fromFile: string,
    toFile: string,
    forbidden: Array<{ from: string; to: string }>,
): boolean {
    const fromLayer = detectLayer(fromFile);
    const toLayer = detectLayer(toFile);

    if (!fromLayer || !toLayer) {
        return false;
    }

    return forbidden.some(
        (rule) =>
            rule.from.toLowerCase() === fromLayer && rule.to.toLowerCase() === toLayer
    );
}
