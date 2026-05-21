import crypto from 'node:crypto';

export function createHash(content: string) {
    return crypto.createHash('md5').update(content).digest('hex');
}
