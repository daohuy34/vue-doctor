import { describe, it, expect } from 'vitest';
import { parseDisableComments, isLineDisabled, filterDisabledIssues } from '../../src/utils/disable-comments';

describe('parseDisableComments', () => {
    it('should parse disable-next-line comment', () => {
        const source = `console.log('debug');
// vue-doctor-disable-next-line no-console
console.log('another debug');`;

        const ranges = parseDisableComments(source);

        // Line 2 has the comment, line 3 should be disabled (next-line = line after comment)
        expect(ranges).toHaveLength(1);
        expect(ranges[0]).toEqual({
            startLine: 3, // Line 3 is disabled
            endLine: 3,
            rules: ['no-console'],
        });
    });

    it('should parse eslint-disable-next-line for compatibility', () => {
        const source = `// eslint-disable-next-line no-console
console.log('debug');`;

        const ranges = parseDisableComments(source);

        expect(ranges).toHaveLength(1);
        expect(ranges[0].startLine).toBe(2); // Line 2 (the console.log) is disabled
        expect(ranges[0].rules).toContain('no-console');
    });

    it('should parse disable-line comment', () => {
        const source = `// vue-doctor-disable-line no-console
console.log('debug');`;

        const ranges = parseDisableComments(source);

        expect(ranges).toHaveLength(1);
        expect(ranges[0].startLine).toBe(1);
        expect(ranges[0].rules).toContain('no-console');
    });

    it('should parse disable without specific rule (all rules)', () => {
        const source = `// vue-doctor-disable-next-line
console.log('debug');`;

        const ranges = parseDisableComments(source);

        expect(ranges).toHaveLength(1);
        expect(ranges[0].rules).toBeNull(); // null = all rules
    });

    it('should parse multiple rules', () => {
        const source = `// vue-doctor-disable-next-line no-console, no-debugger
console.log('debug');
debugger;`;

        const ranges = parseDisableComments(source);

        expect(ranges).toHaveLength(1);
        expect(ranges[0].rules).toContain('no-console');
        expect(ranges[0].rules).toContain('no-debugger');
    });

    it('should handle multiple disable comments', () => {
        const source = `// vue-doctor-disable-next-line no-console
console.log('debug1');
// vue-doctor-disable-next-line no-console
console.log('debug2');
console.log('debug3');`;

        const ranges = parseDisableComments(source);

        expect(ranges).toHaveLength(2);
    });

    it('should be case-insensitive for vue-doctor prefix', () => {
        const source = `// VUE-DOCTOR-DISABLE-NEXT-LINE no-console
console.log('debug');`;

        const ranges = parseDisableComments(source);

        expect(ranges).toHaveLength(1);
    });
});

describe('isLineDisabled', () => {
    it('should return true for disabled line and rule', () => {
        const ranges = [{ startLine: 2, endLine: 2, rules: ['no-console'] }];

        expect(isLineDisabled(2, 'no-console', ranges)).toBe(true);
    });

    it('should return false for different rule', () => {
        const ranges = [{ startLine: 2, endLine: 2, rules: ['no-console'] }];

        expect(isLineDisabled(2, 'no-debugger', ranges)).toBe(false);
    });

    it('should return true when all rules disabled', () => {
        const ranges = [{ startLine: 2, endLine: 2, rules: null }];

        expect(isLineDisabled(2, 'any-rule', ranges)).toBe(true);
    });

    it('should return false for line outside range', () => {
        const ranges = [{ startLine: 2, endLine: 2, rules: ['no-console'] }];

        expect(isLineDisabled(1, 'no-console', ranges)).toBe(false);
        expect(isLineDisabled(3, 'no-console', ranges)).toBe(false);
    });
});

describe('filterDisabledIssues', () => {
    it('should filter out disabled issues', () => {
        const source = `// vue-doctor-disable-next-line no-console
console.log('debug');`;

        const issues = [
            { line: 1, rule: 'no-console', message: 'test' },
            { line: 2, rule: 'no-console', message: 'console detected' },
        ];

        const filtered = filterDisabledIssues(issues, source);

        expect(filtered).toHaveLength(1);
        expect(filtered[0].line).toBe(1);
    });

    it('should not filter issues with different rules', () => {
        const source = `// vue-doctor-disable-next-line no-console
console.log('debug');`;

        const issues = [
            { line: 2, rule: 'no-console', message: 'console detected' },
            { line: 2, rule: 'no-debugger', message: 'debugger detected' },
        ];

        const filtered = filterDisabledIssues(issues, source);

        expect(filtered).toHaveLength(1);
        expect(filtered[0].rule).toBe('no-debugger');
    });

    it('should handle issues without line numbers', () => {
        const source = `// vue-doctor-disable-next-line no-console`;

        const issues = [
            { line: 2, rule: 'no-console', message: 'console detected' },
            { rule: 'some-rule', message: 'no line' } as any,
        ];

        const filtered = filterDisabledIssues(issues, source);

        // Issue without line should not be filtered
        expect(filtered).toHaveLength(2);
    });

    it('should filter all rules when no specific rule', () => {
        const source = `// vue-doctor-disable-next-line
console.log('debug');`;

        const issues = [
            { line: 2, rule: 'no-console', message: 'console detected' },
            { line: 2, rule: 'no-debugger', message: 'debugger detected' },
        ];

        const filtered = filterDisabledIssues(issues, source);

        expect(filtered).toHaveLength(0);
    });
});
