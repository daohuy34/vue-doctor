import * as babelTraverse from '@babel/traverse';

function resolveTraverse(value: unknown): any {
    if (typeof value === 'function') {
        return value;
    }

    if (!value || typeof value !== 'object') {
        return value;
    }

    const candidate = (value as Record<string, unknown>).default;

    if (typeof candidate === 'function') {
        return candidate;
    }

    if (candidate && typeof candidate === 'object') {
        const nested = resolveTraverse(candidate);

        if (typeof nested === 'function') {
            return nested;
        }
    }

    return value;
}

const traverse = resolveTraverse(babelTraverse);

export { traverse };
