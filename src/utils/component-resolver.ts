import type { SFCDescriptor } from '@vue/compiler-sfc';

export interface ComponentNameInfo {
    name: string;
    source: 'filename' | 'inline' | ' PascalCase' | 'kebab-case' | 'index';
}

const PASCAL_CASE_REGEX = /^[A-Z][A-Za-z0-9]+$/;
const KEBAB_CASE_REGEX = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

function kebabToPascalCase(str: string): string {
    return str
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
}

function kebabToCamelCase(str: string): string {
    const parts = str.split('-');
    if (parts.length === 1) {
        return parts[0];
    }
    return parts[0] + parts.slice(1).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
}

export function normalizeFilename(filePath: string): string {
    const normalized = filePath.replace(/\\/g, '/');
    const parts = normalized.split('/');
    let filename = parts[parts.length - 1];

    filename = filename.replace(/\.(vue|ts|js|tsx|jsx)$/, '');

    if (filename === 'index' || filename === 'Index') {
        filename = parts[parts.length - 2] || 'index';
    }

    if (PASCAL_CASE_REGEX.test(filename)) {
        return filename;
    }

    if (KEBAB_CASE_REGEX.test(filename)) {
        return kebabToPascalCase(filename);
    }

    return filename;
}

export function extractInlineComponentName(descriptor: SFCDescriptor): string | null {
    if (descriptor.scriptSetup) {
        const match = descriptor.scriptSetup.content.match(/<script\s+setup(?:\s+lang=["']ts["'])?\s*>[\s\S]*?defineProps/);
        if (match) {
            const definePropsMatch = descriptor.scriptSetup.content.match(/defineProps\s*\(\s*<\s*\{[^}]*name\s*:\s*["']([^"']+)["']/);
            if (definePropsMatch) {
                return definePropsMatch[1];
            }
        }

        const nameMatch = descriptor.scriptSetup.content.match(/defineComponent\s*\(\s*\{\s*name\s*:\s*["']([^"']+)["']/);
        if (nameMatch) {
            return nameMatch[1];
        }

        const exportMatch = descriptor.scriptSetup.content.match(/export\s+default\s+defineComponent\s*\(\s*\{\s*name\s*:\s*["']([^"']+)["']/);
        if (exportMatch) {
            return exportMatch[1];
        }
    }

    if (descriptor.script) {
        const nameMatch = descriptor.script.content.match(/export\s+default\s+Vue\.extend\s*\(\s*\{\s*name\s*:\s*["']([^"']+)["']/);
        if (nameMatch) {
            return nameMatch[1];
        }

        const componentMatch = descriptor.script.content.match(/export\s+default\s+\{\s*name\s*:\s*["']([^"']+)["']/);
        if (componentMatch) {
            return componentMatch[1];
        }
    }

    return null;
}

export function resolveComponentName(
    filePath: string,
    descriptor?: SFCDescriptor | null
): ComponentNameInfo {
    const inlineName = descriptor ? extractInlineComponentName(descriptor) : null;

    if (inlineName) {
        return {
            name: inlineName,
            source: 'inline',
        };
    }

    const normalized = filePath.replace(/\\/g, '/');
    const parts = normalized.split('/');
    let filename = parts[parts.length - 1];

    filename = filename.replace(/\.(vue|ts|js|tsx|jsx)$/, '');

    if (filename === 'index' || filename === 'Index') {
        const dirName = parts[parts.length - 2] || 'index';
        return {
            name: kebabToPascalCase(dirName),
            source: 'index',
        };
    }

    if (PASCAL_CASE_REGEX.test(filename)) {
        return {
            name: filename,
            source: 'PascalCase',
        };
    }

    if (KEBAB_CASE_REGEX.test(filename)) {
        return {
            name: kebabToPascalCase(filename),
            source: 'kebab-case',
        };
    }

    return {
        name: filename,
        source: 'filename',
    };
}

export function isValidComponentName(name: string): boolean {
    if (!name || name.length === 0) {
        return false;
    }

    if (!/^[a-zA-Z_$]/.test(name)) {
        return false;
    }

    if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
        return false;
    }

    return true;
}

export function normalizeToPascalCase(name: string): string {
    const cleaned = name.replace(/[^a-zA-Z0-9]/g, ' ');
    const words = cleaned.split(/\s+/).filter(w => w.length > 0);
    return words.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('');
}

export function normalizeToKebabCase(name: string): string {
    return name
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .replace(/[^a-zA-Z0-9-]/g, '')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();
}
