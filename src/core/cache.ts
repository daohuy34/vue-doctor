import fs from 'node:fs';
import { createHash } from 'crypto';

const CACHE_FILE = '.vue-doctor-cache.json';
const CACHE_HISTORY_FILE = '.vue-doctor-metrics-history.json';

export interface CacheEntry {
    hash: string;
    issues: any[];
    timestamp: number;
}

export interface CacheData {
    [filePath: string]: CacheEntry;
}

export interface MetricsSnapshot {
    timestamp: number;
    score: number;
    errors: number;
    warnings: number;
    info: number;
}

/**
 * Load cache from file
 */
export function loadCache(): CacheData {
    try {
        return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    } catch {
        return {};
    }
}

/**
 * Save cache to file
 */
export function saveCache(cache: CacheData) {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

/**
 * Invalidate cache for specific files only (incremental invalidation)
 */
export function invalidateCacheFiles(files: string[]) {
    const cache = loadCache();

    for (const file of files) {
        delete cache[file];
    }

    saveCache(cache);
}

/**
 * Get cache stats for a file
 */
export function getCacheStats(file: string): CacheEntry | null {
    const cache = loadCache();
    return cache[file] || null;
}

/**
 * Check if cache is valid for a file
 */
export function isCacheValid(file: string, sourceHash: string): boolean {
    const cache = loadCache();
    const entry = cache[file];

    if (!entry) {
        return false;
    }

    return entry.hash === sourceHash;
}

/**
 * Create hash from source content
 */
export function createSourceHash(source: string): string {
    return createHash('sha256').update(source).digest('hex').slice(0, 16);
}

/**
 * Load metrics history
 */
export function loadMetricsHistory(): MetricsSnapshot[] {
    try {
        return JSON.parse(fs.readFileSync(CACHE_HISTORY_FILE, 'utf-8'));
    } catch {
        return [];
    }
}

/**
 * Save metrics snapshot to history
 */
export function saveMetricsSnapshot(snapshot: MetricsSnapshot) {
    const history = loadMetricsHistory();

    // Keep last 30 snapshots
    history.push(snapshot);
    if (history.length > 30) {
        history.shift();
    }

    fs.writeFileSync(CACHE_HISTORY_FILE, JSON.stringify(history, null, 2));
}

/**
 * Get cached metrics score (for --cache-only mode)
 */
export function getCachedScore(): MetricsSnapshot | null {
    const history = loadMetricsHistory();

    if (history.length === 0) {
        return null;
    }

    return history[history.length - 1];
}

/**
 * Clear all cache
 */
export function clearCache() {
    try {
        fs.unlinkSync(CACHE_FILE);
    } catch {
        // Ignore if file doesn't exist
    }
}

/**
 * Clear metrics history
 */
export function clearMetricsHistory() {
    try {
        fs.unlinkSync(CACHE_HISTORY_FILE);
    } catch {
        // Ignore if file doesn't exist
    }
}
