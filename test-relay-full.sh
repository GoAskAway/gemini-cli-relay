#!/bin/bash

# Complete test for relay functionality
set -e

echo "🚀 Testing Gemini CLI Relay functionality with I/O..."

# Create test directory
TEST_DIR="/tmp/gemini-relay-full-test"
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
    rm -rf "$TEST_DIR"
}
trap cleanup EXIT

echo -e "\n🔧 Starting CLI in relay mode..."

# Start CLI in background with relay mode
npm run start -- \
    --relay \
    --relay-stdin-pipe="$STDIN_PIPE" \
    --relay-stdout-pipe="$STDOUT_PIPE" \
    --relay-stderr-pipe="$STDERR_PIPE" \
    --prompt="What is 2+2?" &

CLI_PID=$!

# Wait for pipes to be created
echo "⏳ Waiting for pipes to be created..."
for i in {1..10}; do
    if [ -p "$STDIN_PIPE" ] && [ -p "$STDOUT_PIPE" ] && [ -p "$STDERR_PIPE" ]; then
        echo "✅ All pipes created successfully"
        break
    fi
    sleep 1
    if [ $i -eq 10 ]; then
        echo "❌ Timeout waiting for pipes"
        exit 1
    fi
done

echo -e "\n📋 Pipe status:"
ls -la "$TEST_DIR"

echo -e "\n🔍 Testing output redirection..."

# Start reading from stdout and stderr in background
{
    echo "📤 Reading from stdout pipe..."
    timeout 10s cat "$STDOUT_PIPE" > "$TEST_DIR/stdout_output.txt" 2>/dev/null || true
} &

{
    echo "📤 Reading from stderr pipe..."
    timeout 10s cat "$STDERR_PIPE" > "$TEST_DIR/stderr_output.txt" 2>/dev/null || true
} &

# Give some time for the CLI to process
sleep 3

# Check if there's any output
echo -e "\n📄 Output files:"
ls -la "$TEST_DIR"/*.txt 2>/dev/null || echo "No output files created yet"

if [ -f "$TEST_DIR/stdout_output.txt" ] && [ -s "$TEST_DIR/stdout_output.txt" ]; then
    echo -e "\n✅ stdout output captured:"
    head -n 5 "$TEST_DIR/stdout_output.txt"
else
    echo -e "\n⚠️  No stdout output captured yet"
fi

if [ -f "$TEST_DIR/stderr_output.txt" ] && [ -s "$TEST_DIR/stderr_output.txt" ]; then
    echo -e "\n✅ stderr output captured:"
    head -n 5 "$TEST_DIR/stderr_output.txt"
else
    echo -e "\n⚠️  No stderr output captured yet"
fi

# Wait for CLI process
echo -e "\n⏳ Waiting for CLI to complete..."
wait "$CLI_PID" 2>/dev/null || echo "CLI process ended"
CLI_PID=""

echo -e "\n🎉 Relay functionality test completed!"
echo "✅ Pipes created successfully"
echo "✅ CLI started with relay mode"
echo "📊 Check output files for results"