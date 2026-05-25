import type { Fix, TextReplacement } from '../types/fix';

function lineBreakLength(source: string, index: number): number {
    if (source[index] === '\r' && source[index + 1] === '\n') {
        return 2;
    }

    if (source[index] === '\n') {
        return 1;
    }

    return 0;
}

export function getLineBounds(source: string, line: number) {
    let currentLine = 1;
    let lineStart = 0;
    let cursor = 0;

    while (cursor < source.length) {
        if (currentLine === line) {
            lineStart = cursor;
            break;
        }

        cursor += lineBreakLength(source, cursor) || 1;

        if (source[cursor - 1] === '\n' || source[cursor - 1] === '\r') {
            currentLine++;
        }
    }

    if (currentLine !== line) {
        return null;
    }

    let lineEnd = lineStart;

    while (lineEnd < source.length) {
        const delimiter = lineBreakLength(source, lineEnd);

        if (delimiter > 0) {
            return {
                start: lineStart,
                end: lineEnd,
                delimiter,
            };
        }

        lineEnd++;
    }

    return {
        start: lineStart,
        end: lineEnd,
        delimiter: 0,
    };
}

export function createLineRemovalFix(source: string, line: number): Fix | null {
    const bounds = getLineBounds(source, line);

    if (!bounds) {
        return null;
    }

    return {
        description: `Remove line ${line}`,
        replacements: [
            {
                start: bounds.start,
                end: bounds.end + bounds.delimiter,
                text: '',
            },
        ],
    };
}

export function applyFixes(source: string, fixes: TextReplacement[]): string {
    const sorted = [...fixes].sort((a, b) => b.start - a.start);

    let result = source;

    for (const replacement of sorted) {
        result =
            result.slice(0, replacement.start) +
            replacement.text +
            result.slice(replacement.end);
    }

    return result;
}

export function isSafeConsoleStatement(source: string, line: number): boolean {
    const bounds = getLineBounds(source, line);

    if (!bounds) {
        return false;
    }

    const lineText = source.slice(bounds.start, bounds.end + bounds.delimiter);
    const trimmed = lineText.trim();

    return /^console\.(log|warn|error|info|debug|trace)\s*\(/.test(trimmed);
}
