/**
 * Converts a script-relative line number to a file-relative line number.
 * For Vue SFC files, the script block starts at a specific line in the file.
 *
 * @param scriptLine - Line number from the parsed script AST (1-indexed)
 * @param scriptStartLine - The line number where the script block starts in the file (1-indexed)
 * @returns The file-relative line number
 */
export function toFileLine(scriptLine: number | undefined, scriptStartLine: number): number {
    if (scriptLine === undefined) {
        return scriptStartLine;
    }
    return scriptLine + scriptStartLine - 1;
}
