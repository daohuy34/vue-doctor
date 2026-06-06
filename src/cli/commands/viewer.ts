/**
 * Graph Viewer CLI Command
 *
 * Starts an interactive web-based graph visualization.
 */

import { startGraphViewer, type GraphViewerOptions } from '../../core/graph-viewer';
import open from 'open';

export interface ViewerCommandOptions {
    port?: number;
    open?: boolean;
    type?: 'page' | 'component' | 'store' | 'composable' | 'all';
}

export async function viewerCommand(options: ViewerCommandOptions = {}) {
    const { port = 3456, open: shouldOpen, type } = options;

    const viewerOptions: GraphViewerOptions = {
        port,
        type,
    };

    console.log('\n  🕸️  Starting Vue Doctor Graph Viewer...\n');

    const server = await startGraphViewer(viewerOptions);

    if (shouldOpen) {
        console.log(`  Opening browser at http://localhost:${port}\n`);
        await open(`http://localhost:${port}`);
    } else {
        console.log(`  📍 Open your browser at http://localhost:${port}\n`);
        console.log('  Press Ctrl+C to stop the server\n');
    }

    // Keep server running
    return new Promise(() => {});
}
