#!/bin/bash

# Test relay functionality with multi-turn conversation
set -e

echo "🚀 Testing Gemini CLI Relay with multi-turn conversation..."

# Create test directory
TEST_DIR="/tmp/gemini-relay-multiturn"
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"

# Define pipe paths
STDIN_PIPE="$TEST_DIR/stdin.pipe"
STDOUT_PIPE="$TEST_DIR/stdout.pipe"
STDERR_PIPE="$TEST_DIR/stderr.pipe"

echo "📁 Test directory: $TEST_DIR"

# Function to cleanup
cleanup() {
    echo "🧹 Cleaning up..."
    if [ ! -z "$CLI_PID" ]; then
        kill "$CLI_PID" 2>/dev/null || true
    fi
    if [ ! -z "$STDOUT_READER_PID" ]; then
        kill "$STDOUT_READER_PID" 2>/dev/null || true
    fi
    if [ ! -z "$STDERR_READER_PID" ]; then
        kill "$STDERR_READER_PID" 2>/dev/null || true
    fi
    rm -rf "$TEST_DIR"
}
trap cleanup EXIT

echo -e "\n🔧 Starting CLI in relay mode..."

# Start CLI in background with relay mode
npm run start -- \
    --relay \
    --relay-stdin-pipe="$STDIN_PIPE" \
    --relay-stdout-pipe="$STDOUT_PIPE" \
    --relay-stderr-pipe="$STDERR_PIPE" &

CLI_PID=$!

# Wait for pipes to be created
echo "⏳ Waiting for pipes to be created..."
for i in {1..15}; do
    if [ -p "$STDIN_PIPE" ] && [ -p "$STDOUT_PIPE" ] && [ -p "$STDERR_PIPE" ]; then
        echo "✅ All pipes created successfully"
        break
    fi
    sleep 1
    if [ $i -eq 15 ]; then
        echo "❌ Timeout waiting for pipes"
        exit 1
    fi
done

# Start reading from output pipes in background
echo -e "\n📤 Starting output readers..."

{
    echo "📤 Reading stdout..."
    cat "$STDOUT_PIPE" | while IFS= read -r line; do
        echo "STDOUT: $line"
    done
} &
STDOUT_READER_PID=$!

{
    echo "📤 Reading stderr..."
    cat "$STDERR_PIPE" | while IFS= read -r line; do
        echo "STDERR: $line"
    done
} &
STDERR_READER_PID=$!

# Give readers time to start
sleep 2

echo -e "\n💬 Starting multi-turn conversation..."

# Send first message
echo "What is the capital of France?" > "$STDIN_PIPE" &
echo "🗣️ Sent: What is the capital of France?"
sleep 3

# Send second message
echo "And what about Germany?" > "$STDIN_PIPE" &
echo "🗣️ Sent: And what about Germany?"
sleep 3

# Send third message
echo "Thank you!" > "$STDIN_PIPE" &
echo "🗣️ Sent: Thank you!"
sleep 2

# Send exit command
echo "exit" > "$STDIN_PIPE" &
echo "🗣️ Sent: exit"

# Wait for CLI to finish
echo -e "\n⏳ Waiting for CLI to complete..."
wait "$CLI_PID" 2>/dev/null || echo "CLI process ended"
CLI_PID=""

echo -e "\n🎉 Multi-turn relay test completed!"
echo "✅ Attempted multi-turn conversation through pipes"
echo "📊 Check the output above for conversation results"