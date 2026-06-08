/**
 * Parse vue-doctor-disable comments from source code
 *
 * Supported formats:
 * - // vue-doctor-disable-next-line no-console, no-debugger
 * - // vue-doctor-disable-line no-console
 * - /* vue-doctor-disable no-console * /
 * - /* vue-doctor-enable no-console * /
 */

export interface DisableRange {
    startLine: number;
    endLine: number;
    rules: string[] | null; // null = disable all rules
}

function parseRuleNames(rulesStr: string): string[] | null {
    const trimmed = rulesStr.trim();
    if (!trimmed || trimmed === '*') {
        return null; // Disable all rules
    }
    return trimmed.split(',').map((r) => r.trim()).filter(Boolean);
}

export function parseDisableComments(source: string): DisableRange[] {
    const ranges: DisableRange[] = [];
    const lines = source.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;

        // Match: // vue-doctor-disable-next-line [rules]
        // Also support: // eslint-disable-next-line (for compatibility)
        const nextLineMatch = line.match(
            /^\s*\/\/\s*(?:vue-doctor|eslint)[-\s]*disable-next-line\s+(.+)$/i
        );

        if (nextLineMatch) {
            const rules = parseRuleNames(nextLineMatch[1]);
            // Disable the NEXT line (not the current line with the comment)
            if (i + 1 < lines.length) {
                ranges.push({
                    startLine: lineNumber + 1,
                    endLine: lineNumber + 1,
                    rules,
                });
            }
            continue;
        }

        // Match: // vue-doctor-disable-next-line (without specific rules = disable all)
        const nextLineAllMatch = line.match(
            /^\s*\/\/\s*(?:vue-doctor|eslint)[-\s]*disable-next-line\s*$/i
        );

        if (nextLineAllMatch) {
            // Disable the NEXT line for all rules
            if (i + 1 < lines.length) {
                ranges.push({
                    startLine: lineNumber + 1,
                    endLine: lineNumber + 1,
                    rules: null, // All rules
                });
            }
            continue;
        }

        // Match: // vue-doctor-disable-line [rules]
        // Also support: // eslint-disable-line (for compatibility)
        const currentLineMatch = line.match(
            /^\s*\/\/\s*(?:vue-doctor|eslint)[-\s]*disable-line(?:\s+(.+))?$/i
        );

        if (currentLineMatch) {
            const rules = currentLineMatch[1] ? parseRuleNames(currentLineMatch[1]) : null;
            ranges.push({
                startLine: lineNumber,
                endLine: lineNumber,
                rules,
            });
            continue;
        }

        // Match: /* vue-doctor-disable [rules] */
        // Also support: /* eslint-disable [rules] */
        const disableBlockMatch = line.match(
            /\/\*\s*(?:vue-doctor|eslint)[-\s]*disable\s+(.+?)\s*\*\//
        );

        if (disableBlockMatch) {
            const rules = parseRuleNames(disableBlockMatch[1]);
            ranges.push({
                startLine: lineNumber,
                endLine: lineNumber, // Will be extended when we find enable
                rules,
            });
            continue;
        }

        // Match: /* vue-doctor-disable */ (all rules)
        const disableBlockAllMatch = line.match(
            /\/\*\s*(?:vue-doctor|eslint)[-\s]*disable\s*\*\//
        );

        if (disableBlockAllMatch) {
            ranges.push({
                startLine: lineNumber,
                endLine: lineNumber,
                rules: null, // All rules
            });
            continue;
        }

        // Match: /* vue-doctor-enable [rules] */
        // Also support: /* eslint-enable [rules] */
        const enableMatch = line.match(
            /\/\*\s*(?:vue-doctor|eslint)[-\s]*enable(?:\s+(.+?))?\s*\*\//
        );

        if (enableMatch) {
            // Find the most recent unclosed disable and close it
            for (let j = ranges.length - 1; j >= 0; j--) {
                if (ranges[j].endLine === ranges[j].startLine) {
                    // This is an unclosed block
                    ranges[j].endLine = lineNumber - 1;
                    break;
                }
            }
            continue;
        }
    }

    return ranges;
}

/**
 * Check if a specific line and rule is disabled
 */
export function isLineDisabled(
    lineNumber: number,
    ruleName: string,
    disableRanges: DisableRange[]
): boolean {
    for (const range of disableRanges) {
        if (lineNumber >= range.startLine && lineNumber <= range.endLine) {
            // All rules disabled OR this specific rule disabled
            if (range.rules === null || range.rules.includes(ruleName)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Filter out issues that are disabled by comments
 */
export function filterDisabledIssues<T extends { line: number; rule: string }>(
    issues: T[],
    source: string
): T[] {
    const disableRanges = parseDisableComments(source);

    return issues.filter((issue) => {
        // If no line info, don't filter
        if (typeof issue.line !== 'number') {
            return true;
        }
        return !isLineDisabled(issue.line, issue.rule, disableRanges);
    });
}
