/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { Writable, Readable } from 'node:stream';
import { Config } from '@google/gemini-cli-core';

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
 * Reads a single line from stdin pipe (for interactive sessions)
 */
export async function readFromStdinPipe(stdinStream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    let resolved = false;
    
    const onData = (chunk: Buffer) => {
      const text = chunk.toString();
      data += text;
      
      // Check for newline - when we get a complete line, resolve
      if (text.includes('\n')) {
        cleanup();
        if (!resolved) {
          resolved = true;
          resolve(data.split('\n')[0].trim());
        }
      }
    };
    
    const onError = (error: Error) => {
      cleanup();
      if (!resolved) {
        resolved = true;
        reject(error);
      }
    };
    
    const cleanup = () => {
      stdinStream.removeListener('data', onData);
      stdinStream.removeListener('error', onError);
      clearTimeout(timeout);
    };
    
    // Set up listeners
    stdinStream.on('data', onData);
    stdinStream.on('error', onError);
    
    // Set a reasonable timeout
    const timeout = setTimeout(() => {
      cleanup();
      if (!resolved) {
        resolved = true;
        reject(new Error('Timeout reading from stdin pipe'));
      }
    }, 60000); // 60 seconds for interactive use
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

/**
 * Runs the relay interaction loop for multi-turn conversations
 */
export async function runRelayLoop(
  config: Config,
  relayConfig: RelayConfig,
  stdinStream: Readable,
  stdoutStream: Writable,
  stderrStream: Writable
): Promise<void> {
  const { runNonInteractive } = await import('../nonInteractiveCli.js');
  let conversationHistory: string[] = [];
  
  stdoutStream.write('Relay mode started. Send messages through stdin pipe.\n');
  
  while (true) {
    try {
      // Wait for input from stdin pipe
      stderrStream.write('Waiting for input...\n');
      
      const input = await readFromStdinPipe(stdinStream);
      
      if (!input || input.trim().toLowerCase() === 'exit' || input.trim().toLowerCase() === 'quit') {
        stdoutStream.write('Relay session ended.\n');
        break;
      }
      
      stderrStream.write(`Received: ${input.substring(0, 100)}${input.length > 100 ? '...' : ''}\n`);
      
      // Add to conversation history
      conversationHistory.push(`User: ${input}`);
      
      // Create a temporary output capture
      let responseOutput = '';
      const originalWrite = process.stdout.write;
      
      // Capture stdout during processing
      process.stdout.write = function(chunk: any, encoding?: any, cb?: any): boolean {
        responseOutput += chunk.toString();
        return stdoutStream.write(chunk, encoding, cb);
      };
      
      try {
        // Process the input using the non-interactive CLI
        const prompt_id = Math.random().toString(16).slice(2);
        
        // Run the query
        await runNonInteractive(config, input, prompt_id);
        
        // Add response to history
        if (responseOutput.trim()) {
          conversationHistory.push(`Assistant: ${responseOutput.trim()}`);
        }
        
      } finally {
        // Restore original stdout
        process.stdout.write = originalWrite;
      }
      
      stdoutStream.write('\n--- End of response ---\n');
      
    } catch (error) {
      stderrStream.write(`Error processing input: ${error}\n`);
      stdoutStream.write('Sorry, there was an error processing your request.\n');
    }
  }
}