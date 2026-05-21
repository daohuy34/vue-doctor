import fs from 'node:fs';

const CACHE_FILE = '.vue-doctor-cache.json';

export function loadCache() {
    try {
        return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    } catch {
        return {};
    }
}

export function saveCache(cache: Record<string, any>) {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}
