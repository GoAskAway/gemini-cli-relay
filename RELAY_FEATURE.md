# Gemini CLI Relay Feature

## Overview

The Relay feature allows the Gemini CLI to redirect its standard input, output, and error streams through named pipes (FIFOs). This enables external processes to interact with the CLI programmatically without direct process spawning.

## Features

- ✅ **Named Pipe I/O**: Redirect stdin, stdout, and stderr through named pipes
- ✅ **Automatic Pipe Creation**: Creates named pipes if they don't exist
- ✅ **Parameter Validation**: Ensures all required pipe paths are provided
- ✅ **Clean Shutdown**: Proper cleanup of resources on exit

## Usage

### Command Line Arguments

```bash
npm run start -- \
  --relay \
  --relay-stdin-pipe="/path/to/stdin.pipe" \
  --relay-stdout-pipe="/path/to/stdout.pipe" \
  --relay-stderr-pipe="/path/to/stderr.pipe" \
  --prompt="Your question here"
```

### Arguments Description

- `--relay`: Enable relay mode (boolean)
- `--relay-stdin-pipe`: Path to named pipe for stdin input (required when --relay is enabled)
- `--relay-stdout-pipe`: Path to named pipe for stdout output (required when --relay is enabled) 
- `--relay-stderr-pipe`: Path to named pipe for stderr output (required when --relay is enabled)

## Implementation Details

### Core Components

1. **Configuration (`config/config.ts`)**
   - Added relay-related CLI arguments
   - Added parameter validation

2. **Relay Module (`utils/relay.ts`)**
   - Named pipe creation using `mkfifo` command
   - Stream setup and management
   - Console output redirection
   - Resource cleanup

3. **Main Integration (`gemini.tsx`)**
   - Relay mode detection
   - Stream redirection setup
   - Input handling for non-interactive mode

### Technical Features

- **Named Pipe Creation**: Uses system `mkfifo` command for cross-platform compatibility
- **Stream Redirection**: Overrides `process.stdout.write` and `process.stderr.write`
- **Input Handling**: Reads from stdin pipe instead of standard process.stdin in relay mode
- **Error Handling**: Comprehensive error handling and cleanup

## Example Usage Scenario

```bash
#!/bin/bash

# Setup pipes
STDIN_PIPE="/tmp/gemini-stdin.pipe"
STDOUT_PIPE="/tmp/gemini-stdout.pipe" 
STDERR_PIPE="/tmp/gemini-stderr.pipe"

# Start CLI in background
npm run start -- \
  --relay \
  --relay-stdin-pipe="$STDIN_PIPE" \
  --relay-stdout-pipe="$STDOUT_PIPE" \
  --relay-stderr-pipe="$STDERR_PIPE" \
  --prompt="What is the capital of France?" &

# Read output
cat "$STDOUT_PIPE" &
cat "$STDERR_PIPE" &

# Wait for completion
wait
```

## Testing

The implementation includes comprehensive tests:

- Parameter validation
- Named pipe creation
- I/O redirection
- Error handling

Run tests using:
```bash
./test-relay.sh
```

## Architecture Benefits

1. **Decoupled Communication**: External processes can communicate with CLI without direct process management
2. **Streaming**: Real-time bidirectional communication through pipes
3. **Isolation**: Separate error and output streams
4. **Reliability**: Proper resource cleanup and error handling

## Use Cases

- **Server Integration**: Embed CLI functionality in server applications
- **Batch Processing**: Process multiple queries through programmatic interface
- **System Integration**: Integrate with existing system workflows
- **Testing**: Automated testing of CLI functionality

## Status

✅ **Implemented and Tested**
- Basic relay functionality working
- Named pipes created correctly
- I/O redirection functioning
- Parameter validation active
- Resource cleanup implemented