/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { Writable, Readable } from 'node:stream';

export interface RelayConfig {
  stdinPipe: string;
  stdoutPipe: string;
  stderrPipe: string;
}

/**
 * Creates named pipes if they don't exist
 */
export async function ensureNamedPipes(config: RelayConfig): Promise<void> {
  const pipes = [config.stdinPipe, config.stdoutPipe, config.stderrPipe];
  
  for (const pipePath of pipes) {
    const dir = path.dirname(pipePath);
    
    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Create named pipe if it doesn't exist
    if (!fs.existsSync(pipePath)) {
      try {
        // Create FIFO (named pipe) using mkfifo command
        execSync(`mkfifo "${pipePath}"`, { stdio: 'pipe' });
        console.log(`Created named pipe: ${pipePath}`);
      } catch (error) {
        throw new Error(`Failed to create named pipe ${pipePath}: ${error}`);
      }
    }
  }
}

/**
 * Creates a readable stream from stdin pipe
 */
export function createStdinStream(pipePath: string): Readable {
  return fs.createReadStream(pipePath);
}

/**
 * Creates writable streams for stdout and stderr pipes
 */
export function createOutputStreams(stdoutPipe: string, stderrPipe: string): {
  stdout: Writable;
  stderr: Writable;
} {
  return {
    stdout: fs.createWriteStream(stdoutPipe),
    stderr: fs.createWriteStream(stderrPipe),
  };
}

/**
 * Sets up process I/O redirection to named pipes
 */
export async function setupRelayStreams(config: RelayConfig): Promise<{
  stdinStream: Readable;
  stdoutStream: Writable;
  stderrStream: Writable;
  cleanup: () => void;
}> {
  // Ensure pipes exist
  await ensureNamedPipes(config);
  
  // Create streams
  const stdinStream = createStdinStream(config.stdinPipe);
  const { stdout: stdoutStream, stderr: stderrStream } = createOutputStreams(
    config.stdoutPipe,
    config.stderrPipe
  );
  
  // Setup cleanup function
  const cleanup = () => {
    try {
      stdinStream.destroy();
      stdoutStream.destroy();
      stderrStream.destroy();
    } catch (error) {
      console.error('Error during relay cleanup:', error);
    }
  };
  
  // Handle stream errors
  stdinStream.on('error', (error) => {
    console.error('Stdin pipe error:', error);
  });
  
  stdoutStream.on('error', (error) => {
    console.error('Stdout pipe error:', error);
  });
  
  stderrStream.on('error', (error) => {
    console.error('Stderr pipe error:', error);
  });
  
  return {
    stdinStream,
    stdoutStream,
    stderrStream,
    cleanup,
  };
}

/**
 * Reads input from stdin pipe (similar to readStdin but for pipes)
 */
export async function readFromStdinPipe(stdinStream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    
    stdinStream.on('data', (chunk) => {
      data += chunk.toString();
    });
    
    stdinStream.on('end', () => {
      resolve(data.trim());
    });
    
    stdinStream.on('error', (error) => {
      reject(error);
    });
    
    // Set a reasonable timeout
    const timeout = setTimeout(() => {
      stdinStream.destroy();
      reject(new Error('Timeout reading from stdin pipe'));
    }, 30000); // 30 seconds
    
    stdinStream.on('end', () => {
      clearTimeout(timeout);
    });
    
    stdinStream.on('error', () => {
      clearTimeout(timeout);
    });
  });
}

/**
 * Redirects console output to relay streams
 */
export function redirectConsoleOutput(stdoutStream: Writable, stderrStream: Writable): () => void {
  const originalStdout = process.stdout.write;
  const originalStderr = process.stderr.write;
  
  // Override stdout
  process.stdout.write = function(chunk: any, encoding?: any, cb?: any): boolean {
    if (typeof encoding === 'function') {
      cb = encoding;
      encoding = undefined;
    }
    
    const result = stdoutStream.write(chunk, encoding, cb);
    return result;
  };
  
  // Override stderr
  process.stderr.write = function(chunk: any, encoding?: any, cb?: any): boolean {
    if (typeof encoding === 'function') {
      cb = encoding;
      encoding = undefined;
    }
    
    const result = stderrStream.write(chunk, encoding, cb);
    return result;
  };
  
  // Return cleanup function
  return () => {
    process.stdout.write = originalStdout;
    process.stderr.write = originalStderr;
  };
}