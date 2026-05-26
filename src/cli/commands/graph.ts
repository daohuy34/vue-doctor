import fs from 'node:fs/promises';
import fg from 'fast-glob';

import { buildProjectGraph } from '../../core/graph';

async function collectGraphFiles() {
    return fg(['**/*.{vue,ts,js,tsx,jsx,mjs,cjs}'], {
        ignore: [
            '**/node_modules/**',
            '**/dist/**',
            '**/.nuxt/**',
            '**/coverage/**',
        ],
    });
}

function printGraph(graph: ReturnType<typeof buildProjectGraph>) {
    console.log('Project Graph');
    console.log(`Pages: ${graph.counts.pages}`);
    console.log(`Components: ${graph.counts.components}`);
    console.log(`Stores: ${graph.counts.stores}`);
    console.log(`Composables: ${graph.counts.composables}`);
    console.log(`Other files: ${graph.counts.others}`);
    console.log(`Local imports: ${graph.edges.length}`);

    if (graph.edges.length === 0) {
        console.log('');
        console.log('No local imports detected.');
        return;
    }

    console.log('');

    for (const edge of graph.edges) {
        console.log(`  ${edge.from} -> ${edge.to}`);
    }
}

export async function graphCommand() {
    const files = await collectGraphFiles();

    const sources = new Map<string, string>();

    for (const file of files) {
        sources.set(file, await fs.readFile(file, 'utf-8'));
    }

    const graph = buildProjectGraph(files, sources);

    printGraph(graph);
}
