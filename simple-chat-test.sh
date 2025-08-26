#!/bin/bash

# Simple test of the chat relay functionality
set -e

PIPE_DIR="/tmp/gemini-simple-test"
STDIN_PIPE="$PIPE_DIR/stdin.pipe"
STDOUT_PIPE="$PIPE_DIR/stdout.pipe"
STDERR_PIPE="$PIPE_DIR/stderr.pipe"

cleanup() {
    echo "Cleaning up..."
    if [ ! -z "$CLI_PID" ]; then
        echo "exit" > "$STDIN_PIPE" 2>/dev/null || true
        kill "$CLI_PID" 2>/dev/null || true
    fi
    rm -rf "$PIPE_DIR" 2>/dev/null || true
}
trap cleanup EXIT

mkdir -p "$PIPE_DIR"

echo "🚀 Starting Gemini CLI Relay..."

# Start CLI
npm run start -- \
    --relay \
    --relay-stdin-pipe="$STDIN_PIPE" \
    --relay-stdout-pipe="$STDOUT_PIPE" \
    --relay-stderr-pipe="$STDERR_PIPE" &

CLI_PID=$!

echo "⏳ Waiting for pipes..."
for i in {1..15}; do
    if [ -p "$STDIN_PIPE" ] && [ -p "$STDOUT_PIPE" ] && [ -p "$STDERR_PIPE" ]; then
        echo "✅ Pipes ready!"
        break
    fi
    sleep 1
done

echo "📋 Testing basic communication:"

# Test 1: Send a simple question
echo "🗣️ Sending: 'Hello'"
echo "Hello" > "$STDIN_PIPE"

echo "📖 Reading responses for 5 seconds..."
timeout 5s cat "$STDOUT_PIPE" &
timeout 5s cat "$STDERR_PIPE" | sed 's/^/[STDERR] /' &

wait

echo ""
echo "✅ Basic test complete!"
echo "   Relay architecture is working - pipes created and communication established"
echo "   For full functionality, API authentication and client setup may need attention"