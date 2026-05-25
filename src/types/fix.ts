export interface TextReplacement {
    start: number;
    end: number;
    text: string;
}

export interface Fix {
    description: string;
    replacements: TextReplacement[];
}
