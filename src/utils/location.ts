export interface MatchLocation {
    line: number;
    column: number;
}

export function findFirstMatchLocation(
    source: string,
    pattern: RegExp,
): MatchLocation | undefined {
    const match = source.match(pattern);

    if (!match || match.index === undefined) {
        return undefined;
    }

    let line = 1;
    let column = 1;

    for (let index = 0; index < match.index; index += 1) {
        if (source[index] === '\n') {
            line += 1;
            column = 1;
            continue;
        }

        column += 1;
    }

    return { line, column };
}
