/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CommandModule } from 'yargs';
import { WebSocketServer } from 'ws';
import { ServerIOChannel } from '../io/IOChannelProvider.js';
import { startInteractiveUI } from '../gemini.js';
import { loadCliConfig, CliArgs } from '../config/config.js';
import { loadSettings } from '../config/settings.js';
import { loadExtensions } from '../config/extension.js';
import { sessionId } from '@google/gemini-cli-core';
import { getStartupWarnings } from '../utils/startupWarnings.js';
import { getUserStartupWarnings } from '../utils/userStartupWarnings.js';

interface ServerArgs {
  port: number;
  host: string;
}

export const serverCommand: CommandModule<object, ServerArgs> = {
  command: 'server',
  describe: 'Run Gemini CLI in server mode with a WebSocket interface',
  builder: (yargs) =>
    yargs
      .option('port', {
        type: 'number',
        description: 'Port for the WebSocket server',
        default: 8080,
      })
      .option('host', {
        type: 'string',
        description: 'Host for the WebSocket server',
        default: '127.0.0.1',
      }),
  handler: async (argv) => {
    const { port, host } = argv;
    console.log(`
🚀 Starting Gemini CLI Server...`);

    const wss = new WebSocketServer({ port, host });

    wss.on('listening', () => {
      console.log(`✅ Server ready and listening at ws://${host}:${port}`);
      console.log('   Waiting for a client to connect...\n');
    });

    wss.on('connection', async (ws) => {
      console.log('📡 Client connected. Initializing interactive session...');

      const ioChannel = new ServerIOChannel(ws);

      // Store original streams for restoration
      const originalStdin = process.stdin;
      const originalStdout = process.stdout;
      const originalStderr = process.stderr;

      // Temporarily redirect I/O using Object.defineProperty
      Object.defineProperty(process, 'stdin', {
        value: ioChannel.stdin,
        writable: false,
        configurable: true,
      });
      Object.defineProperty(process, 'stdout', {
        value: ioChannel.stdout,
        writable: false,
        configurable: true,
      });
      Object.defineProperty(process, 'stderr', {
        value: ioChannel.stderr,
        writable: false,
        configurable: true,
      });

      // When the terminal is resized, we need to inform the TTY
      // so that ink can re-render.
      ioChannel.on('resize', (data) => {
        process.stdout.emit('resize', data);
      });

      try {
        // Load all necessary configuration, mirroring the main() function
        const workspaceRoot = process.cwd();
        const settings = loadSettings(workspaceRoot);
        const extensions = loadExtensions(workspaceRoot);
        const config = await loadCliConfig(
          settings.merged,
          extensions,
          sessionId,
          argv as unknown as CliArgs, // Cast to the expected type
        );
        await config.initialize();

        const startupWarnings = [
          ...(await getStartupWarnings()),
          ...(await getUserStartupWarnings(workspaceRoot)),
        ];

        // Now, run the main interactive UI, which will now use our WebSocket I/O
        await startInteractiveUI(
          config,
          settings,
          startupWarnings,
          workspaceRoot,
        );
        console.log('Interactive session started for client.');
      } catch (e) {
        console.error('Failed to start interactive session:', e);
        ws.close(1011, 'Session initialization failed.');
      } finally {
        // Restore original I/O streams
        Object.defineProperty(process, 'stdin', {
          value: originalStdin,
          writable: false,
          configurable: true,
        });
        Object.defineProperty(process, 'stdout', {
          value: originalStdout,
          writable: false,
          configurable: true,
        });
        Object.defineProperty(process, 'stderr', {
          value: originalStderr,
          writable: false,
          configurable: true,
        });
      }

      ws.on('close', () => {
        console.log('📡 Client disconnected. Server is still running.');
        // We could exit here, or wait for another connection.
        // For now, we'll let the process exit if this was the only client.
        if (wss.clients.size === 0) {
          console.log(
            'All clients disconnected. Shutting down server in 5 seconds...',
          );
          setTimeout(() => {
            process.exit(0);
          }, 5000);
        }
      });
    });

    wss.on('error', (err) => {
      console.error('WebSocket Server Error:', err);
    });
  },
};
