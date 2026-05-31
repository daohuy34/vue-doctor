/**
 * Component Reference Resolver
 *
 * Resolves component names across multiple sources:
 * - Direct imports (from script)
 * - Auto-imports (Nuxt, Vue plugins)
 * - Global components (registered globally)
 * - Template auto-components (PascalCase files in components/ dir)
 */

import type { SFCDescriptor } from '@vue/compiler-sfc';
import { parseImports, isLikelyComponent } from './import-parser';
import { trackComponentUsage, normalizeComponentName, kebabToPascalCase } from './component-usage-tracker';

export interface ResolvedComponent {
    /** The component name as used in template */
    name: string;
    /** File path where the component is defined */
    filePath: string | null;
    /** Source of the component reference */
    source: 'import' | 'auto-import' | 'global' | 'template';
    /** Import specifier if from import */
    importSpecifier?: string;
}

export interface ComponentRegistry {
    /** Map of normalized component name -> file path */
    byName: Map<string, string>;
    /** Map of file path -> component names defined in that file */
    byFile: Map<string, Set<string>>;
}

/**
 * Extracts component names from a Vue file's script section.
 */
export function extractImportedComponents(source: string): Map<string, string> {
    const result = parseImports(source);
    const components = new Map<string, string>();

    for (const imp of result.imports) {
        // Skip type-only and side-effect imports
        if (imp.kind === 'type' || imp.kind === 'side-effect') {
            continue;
        }

        for (const spec of imp.specifiers) {
            // Check if this looks like a component
            if (isLikelyComponent(spec.localName, spec.localName)) {
                // Use the import source as file path hint
                components.set(spec.localName, imp.source);
            }
        }
    }

    return components;
}

/**
 * Extracts component names defined in a file (for .vue files).
 * Components can be defined via:
 * - export default { name: 'ComponentName' }
 * - <script setup lang="ts" name="ComponentName">
 */
export function extractComponentNameFromFile(
    source: string,
    filePath: string,
): string | null {
    // Check for named export
    const namedExportMatch = source.match(/name\s*:\s*['"]([A-Za-z][A-Za-z0-9_-]*)['"]/);
    if (namedExportMatch) {
        return namedExportMatch[1];
    }

    // Check for <script setup> with name attribute
    const scriptSetupMatch = source.match(/<script\s+[^>]*name\s*=\s*['"]([A-Za-z][A-Za-z0-9_-]*)['"][^>]*>/);
    if (scriptSetupMatch) {
        return scriptSetupMatch[1];
    }

    // Derive from file name for .vue files
    if (filePath.endsWith('.vue')) {
        const fileName = filePath.split('/').pop()?.replace(/\.vue$/, '') ?? '';
        // Convert to PascalCase
        return fileName
            .split(/[-_]/)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join('');
    }

    return null;
}

/**
 * Builds a component registry from a set of Vue files.
 */
export function buildComponentRegistry(files: string[], sources: Map<string, string>): ComponentRegistry {
    const byName = new Map<string, string>();
    const byFile = new Map<string, Set<string>>();

    for (const filePath of files) {
        const source = sources.get(filePath) ?? '';
        const componentNames = new Set<string>();

        // Extract from file name
        const fileName = extractComponentNameFromFile(source, filePath);
        if (fileName) {
            byName.set(normalizeComponentName(fileName), filePath);
            componentNames.add(fileName);
        }

        // Extract from imports
        const importedComponents = extractImportedComponents(source);
        for (const [name, _sourcePath] of importedComponents) {
            const normalized = normalizeComponentName(name);
            // Only register if not already registered by a more specific source
            if (!byName.has(normalized)) {
                byName.set(normalized, filePath);
            }
            componentNames.add(name);
        }

        byFile.set(filePath, componentNames);
    }

    return { byName, byFile };
}

/**
 * Resolves a component tag from a template to its definition file.
 */
export function resolveComponentTag(
    tagName: string,
    registry: ComponentRegistry,
): ResolvedComponent | null {
    const normalized = normalizeComponentName(tagName);

    // Direct match
    const filePath = registry.byName.get(normalized);
    if (filePath) {
        return {
            name: tagName,
            filePath,
            source: 'import',
        };
    }

    // Try PascalCase variant
    const pascalVariant = kebabToPascalCase(normalized);
    const pascalPath = registry.byName.get(pascalVariant);
    if (pascalPath) {
        return {
            name: tagName,
            filePath: pascalPath,
            source: 'import',
        };
    }

    // Try kebab-case variant
    const kebabVariant = normalized.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    if (kebabVariant !== normalized) {
        const kebabPath = registry.byName.get(kebabVariant);
        if (kebabPath) {
            return {
                name: tagName,
                filePath: kebabPath,
                source: 'import',
            };
        }
    }

    // Component not found in registry - might be global or auto-import
    return {
        name: tagName,
        filePath: null,
        source: 'global',
    };
}

/**
 * Builds a complete component dependency map.
 * Maps which files use which components.
 */
export function buildComponentDependencyMap(
    files: string[],
    sources: Map<string, string>,
    descriptors: Map<string, SFCDescriptor>,
): Map<string, ResolvedComponent[]> {
    const registry = buildComponentRegistry(files, sources);
    const dependencyMap = new Map<string, ResolvedComponent[]>();

    for (const [filePath, descriptor] of descriptors) {
        const { usages } = trackComponentUsage(descriptor);
        const dependencies: ResolvedComponent[] = [];

        for (const [tagName, _usageList] of usages) {
            const resolved = resolveComponentTag(tagName, registry);
            if (resolved) {
                dependencies.push(resolved);
            }
        }

        dependencyMap.set(filePath, dependencies);
    }

    return dependencyMap;
}

/**
 * Finds potential circular dependencies in component usage.
 */
export function findCircularDependencies(
    dependencyMap: Map<string, ResolvedComponent[]>,
): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    function dfs(node: string): void {
        visited.add(node);
        recursionStack.add(node);
        path.push(node);

        const deps = dependencyMap.get(node) ?? [];
        for (const dep of deps) {
            if (dep.filePath) {
                if (!visited.has(dep.filePath)) {
                    dfs(dep.filePath);
                } else if (recursionStack.has(dep.filePath)) {
                    // Found cycle
                    const cycleStart = path.indexOf(dep.filePath);
                    if (cycleStart !== -1) {
                        cycles.push([...path.slice(cycleStart), dep.filePath]);
                    }
                }
            }
        }

        path.pop();
        recursionStack.delete(node);
    }

    for (const node of dependencyMap.keys()) {
        if (!visited.has(node)) {
            dfs(node);
        }
    }

    return cycles;
}
