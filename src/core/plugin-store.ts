import { existsSync, readFile, writeFile, mkdirSync } from 'fs/promises';
import { homedir } from 'os';
import { join, dirname } from 'path';

const PLUGIN_STORE_DIR = join(homedir(), '.vue-doctor');
const PLUGIN_STORE_FILE = join(PLUGIN_STORE_DIR, 'plugins.json');

export interface StoredPlugin {
    name: string;
    source: string;
    version?: string;
    installedAt: string;
}

export async function ensurePluginStoreDir(): Promise<void> {
    try {
        await mkdirSync(PLUGIN_STORE_DIR, { recursive: true });
    } catch {
        // Directory may already exist
    }
}

export async function loadPluginStore(): Promise<StoredPlugin[]> {
    try {
        await ensurePluginStoreDir();
        const content = await readFile(PLUGIN_STORE_FILE, 'utf-8');
        return JSON.parse(content) as StoredPlugin[];
    } catch {
        return [];
    }
}

export async function savePluginStore(plugins: StoredPlugin[]): Promise<void> {
    await ensurePluginStoreDir();
    await writeFile(PLUGIN_STORE_FILE, JSON.stringify(plugins, null, 2), 'utf-8');
}

export async function addPluginToStore(plugin: StoredPlugin): Promise<void> {
    const plugins = await loadPluginStore();
    const existing = plugins.findIndex((p) => p.name === plugin.name || p.source === plugin.source);
    if (existing >= 0) {
        plugins[existing] = plugin;
    } else {
        plugins.push(plugin);
    }
    await savePluginStore(plugins);
}

export async function removePluginFromStore(source: string): Promise<boolean> {
    const plugins = await loadPluginStore();
    const filtered = plugins.filter((p) => p.source !== source);
    if (filtered.length === plugins.length) return false;
    await savePluginStore(filtered);
    return true;
}

export async function clearPluginStore(): Promise<void> {
    await savePluginStore([]);
}
