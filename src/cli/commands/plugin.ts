import { loadPlugins } from '../../core/plugins';
import type { ResolvedPlugin } from '../../types/plugin';

export async function pluginListCommand() {
    const plugins = await loadPlugins();
    console.log('Plugins:');
    plugins.forEach((plugin) => {
        console.log(`- ${plugin.meta.name}@${plugin.meta.version}`);
    });
}

export async function pluginInfoCommand(pluginName: string) {
    const plugins = await loadPlugins([pluginName]);
    const plugin = plugins[0];
    if (!plugin) {
        console.log('Plugin not found:', pluginName);
        return;
    }
    console.log(JSON.stringify(plugin, null, 2));
}
