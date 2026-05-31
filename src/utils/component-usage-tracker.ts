/**
 * Component Usage Tracker
 *
 * Tracks which components are used where by parsing Vue templates.
 * This enables:
 * - Finding unused components
 * - Building component dependency graphs
 * - Detecting circular dependencies
 */

import type { SFCDescriptor } from '@vue/compiler-sfc';

export interface ComponentUsage {
    /** Component tag name as used in template (lowercase) */
    tagName: string;
    /** Original tag name as written in template */
    originalTagName: string;
    /** Line number where component is used */
    line: number;
    /** Column number where component is used */
    column: number;
    /** Whether component has v-for binding */
    hasVFor: boolean;
    /** Whether component has v-if binding */
    hasVIf: boolean;
    /** Whether component has v-model binding */
    hasVModel: boolean;
}

export interface ComponentUsageMap {
    /** Map of component name (lowercase) -> usage locations */
    usages: Map<string, ComponentUsage[]>;
    /** Set of all used component tags (lowercase) */
    allTags: Set<string>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const NODE_TYPES = {
    ROOT: 0,
    ELEMENT: 1,
    TEXT: 2,
    INTERPOLATION: 5,
    IF: 9,
    FOR: 11,
} as const;

const PROP_TYPES = {
    ATTRIBUTE: 6,
    DIRECTIVE: 7,
} as const;

// Native HTML elements that should not be treated as components
const NATIVE_ELEMENTS = new Set([
    'html', 'head', 'body', 'base', 'link', 'meta', 'style', 'title',
    'address', 'article', 'aside', 'footer', 'header', 'h1', 'h2', 'h3',
    'h4', 'h5', 'h6', 'hgroup', 'main', 'nav', 'section', 'blockquote',
    'dd', 'div', 'dl', 'dt', 'figcaption', 'figure', 'hr', 'li', 'menu',
    'ol', 'p', 'pre', 'ul', 'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite',
    'code', 'data', 'dfn', 'em', 'i', 'kbd', 'mark', 'q', 'rp', 'rt',
    'ruby', 's', 'samp', 'small', 'span', 'strong', 'sub', 'sup', 'time',
    'u', 'var', 'wbr', 'area', 'audio', 'img', 'map', 'track', 'video',
    'embed', 'iframe', 'object', 'param', 'picture', 'portal', 'source',
    'svg', 'math', 'canvas', 'script', 'noscript', 'template', 'slot',
]);

// Vue built-in components
const VUE_BUILTINS = new Set([
    'router-link', 'nuxt-link', 'client-only', 'teleport', 'transition',
    'transition-group', 'keep-alive', 'slot', 'template',
]);

// ─────────────────────────────────────────────────────────────────────────────
// Component Name Resolution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalizes a component name to lowercase for consistent comparison.
 * Vue components are case-insensitive in templates.
 */
export function normalizeComponentName(name: string): string {
    return name.toLowerCase();
}

/**
 * Converts a kebab-case component name to PascalCase.
 * Used for matching kebab-case template tags with PascalCase imports.
 *
 * Example: 'base-card' -> 'BaseCard', 'used-component' -> 'UsedComponent'
 */
export function kebabToPascalCase(name: string): string {
    return name
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
}

/**
 * Normalizes a tag name to a canonical form for matching with imports.
 * Handles both kebab-case and PascalCase.
 */
export function normalizeTagForMatching(tagName: string): string {
    const lower = tagName.toLowerCase();
    // If it's kebab-case, convert to PascalCase for matching
    if (tagName.includes('-')) {
        return kebabToPascalCase(lower);
    }
    return lower;
}

/**
 * Checks if a tag name looks like a component (PascalCase or contains hyphen).
 */
export function isLikelyComponent(tagName: string): boolean {
    const lowerTag = tagName.toLowerCase();

    // Skip native HTML elements
    if (NATIVE_ELEMENTS.has(lowerTag)) {
        return false;
    }

    // Skip Vue built-in components
    if (VUE_BUILTINS.has(lowerTag)) {
        return false;
    }

    // Vue components can be used with lowercase in templates
    // but are typically either:
    // 1. PascalCase (has capital letters)
    // 2. kebab-case (contains hyphen)
    return /[A-Z]/.test(tagName) || tagName.includes('-');
}

// ─────────────────────────────────────────────────────────────────────────────
// Template Traversal
// ─────────────────────────────────────────────────────────────────────────────

function hasDirective(elementNode: any, directiveName: string): boolean {
    return elementNode.props?.some((p: any) => {
        if (p.type !== PROP_TYPES.DIRECTIVE) return false;
        return p.name === directiveName;
    }) ?? false;
}

function walkTemplateAndCollectUsages(
    node: any,
    usages: Map<string, ComponentUsage[]>,
    allTags: Set<string>,
): void {
    if (!node) return;

    // Element node - check if it's a component
    if (node.type === NODE_TYPES.ELEMENT) {
        const tagName = node.tag ?? '';

        if (isLikelyComponent(tagName)) {
            const normalizedName = normalizeComponentName(tagName);
            allTags.add(normalizedName);

            const usage: ComponentUsage = {
                tagName: normalizedName,
                originalTagName: tagName,
                line: node.loc?.start?.line ?? 0,
                column: node.loc?.start?.column ?? 0,
                hasVFor: hasDirective(node, 'for'),
                hasVIf: hasDirective(node, 'if') || hasDirective(node, 'else-if') || hasDirective(node, 'else'),
                hasVModel: hasDirective(node, 'model'),
            };

            if (!usages.has(normalizedName)) {
                usages.set(normalizedName, []);
            }
            usages.get(normalizedName)!.push(usage);
        }

        // Recurse into children
        node.children?.forEach((child: any) =>
            walkTemplateAndCollectUsages(child, usages, allTags)
        );
    }

    // Root or other container nodes
    if (node.type === NODE_TYPES.ROOT || node.type === NODE_TYPES.IF || node.type === NODE_TYPES.FOR) {
        node.children?.forEach((child: any) =>
            walkTemplateAndCollectUsages(child, usages, allTags)
        );

        // Handle branches (v-if, v-else-if, v-else)
        node.branches?.forEach((branch: any) => {
            branch.children?.forEach((child: any) =>
                walkTemplateAndCollectUsages(child, usages, allTags)
            );
        });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts all component usages from a Vue SFC descriptor.
 *
 * @param descriptor - The parsed SFC descriptor
 * @returns Map of component names to their usage locations
 */
export function trackComponentUsage(descriptor: SFCDescriptor): ComponentUsageMap {
    const usages = new Map<string, ComponentUsage[]>();
    const allTags = new Set<string>();

    if (descriptor.template?.ast) {
        walkTemplateAndCollectUsages(descriptor.template.ast, usages, allTags);
    }

    return { usages, allTags };
}

/**
 * Gets all unique component tags used in a set of descriptors.
 */
export function getAllUsedComponents(descriptors: Map<string, SFCDescriptor>): Set<string> {
    const allTags = new Set<string>();

    for (const descriptor of descriptors.values()) {
        const { allTags: tags } = trackComponentUsage(descriptor);
        tags.forEach(tag => allTags.add(tag));
    }

    return allTags;
}

/**
 * Finds components that are imported but never used in templates.
 */
export function findUnusedComponents(
    importedComponents: Map<string, string>, // name -> filePath
    descriptors: Map<string, SFCDescriptor>,
): Map<string, string> {
    const usedComponents = getAllUsedComponents(descriptors);
    const unused = new Map<string, string>();

    for (const [name, filePath] of importedComponents) {
        // Normalize import name
        const normalizedImport = normalizeComponentName(name);

        // Check direct match (e.g., 'usedcomponent' == 'usedcomponent')
        if (usedComponents.has(normalizedImport)) {
            continue;
        }

        // Check kebab-case variant (e.g., 'usedcomponent' == 'used-component')
        const kebabVariant = normalizedImport.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
        if (usedComponents.has(kebabVariant)) {
            continue;
        }

        // Check PascalCase variant of kebab-case (e.g., 'used-component' -> 'UsedComponent')
        const pascalVariant = kebabToPascalCase(kebabVariant);
        if (usedComponents.has(pascalVariant)) {
            continue;
        }

        // Also check if the used components contain this name as substring
        // This handles cases like 'basecard' matching 'base-card'
        const nameParts = normalizedImport.match(/[a-z]+/g) || [];
        let found = false;
        for (const usedTag of usedComponents) {
            const usedParts = usedTag.match(/[a-z]+/g) || [];
            if (nameParts.join('') === usedParts.join('')) {
                found = true;
                break;
            }
        }
        if (found) continue;

        unused.set(name, filePath);
    }

    return unused;
}
