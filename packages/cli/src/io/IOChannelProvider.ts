/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { EventEmitter } from 'events';
import type { WebSocket } from 'ws';
import { Readable, Writable } from 'stream';

export interface IOChannel {
  stdin: Readable;
  stdout: Writable;
  stderr: Writable;
}

export class ServerIOChannel extends EventEmitter implements IOChannel {
  stdin: Readable;
  stdout: Writable;
  stderr: Writable;

  constructor(private ws: WebSocket) {
    super();
    this.stdin = this.createInputStream();
    this.stdout = this.createOutputStream('stdout');
    this.stderr = this.createOutputStream('stderr');

    ws.on('close', () => this.emit('close'));
  }

  private createInputStream(): Readable {
    const stream = new Readable({
      read() {
        // Reading is controlled by the data pushed from the WebSocket.
      },
    });

    this.ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'stdin' && typeof msg.data === 'string') {
          stream.push(msg.data);
        } else if (msg.type === 'resize') {
          // Pass terminal resize events through.
          this.stdout.emit('resize', msg.data);
        }
      } catch (_e) {
        // Ignore malformed messages.
      }
    });

    return stream;
  }

  private createOutputStream(type: 'stdout' | 'stderr'): Writable {
    const stream = new Writable({
      write: (chunk, encoding, callback) => {
        if (this.ws.readyState === this.ws.OPEN) {
          this.ws.send(
            JSON.stringify({
              type,
              data: chunk.toString(),
            }),
            (err) => {
              if (err) {
                console.error(`WebSocket send error: ${err.message}`);
              }
              callback();
            },
          );
        } else {
          callback();
        }
      },
    });
    return stream;
  }
}
