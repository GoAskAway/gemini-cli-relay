#!/bin/bash

# Test relay functionality with pipe-based interaction
set -e

echo "🚀 Testing Gemini CLI Relay with pipe interaction..."

# Create test directory
TEST_DIR="/tmp/gemini-relay-interactive"
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

echo -e "\n🔧 Starting CLI in relay mode without --prompt..."

# Start CLI in background with relay mode (no --prompt parameter)
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

echo -e "\n📋 Pipe status:"
ls -la "$TEST_DIR"

# Start reading from output pipes in background
echo -e "\n📤 Starting output readers..."

{
    echo "Reading stdout..."
    cat "$STDOUT_PIPE" | tee "$TEST_DIR/stdout_log.txt"
} &
STDOUT_READER_PID=$!

{
    echo "Reading stderr..." 
    cat "$STDERR_PIPE" | tee "$TEST_DIR/stderr_log.txt"
} &
STDERR_READER_PID=$!

# Give readers time to start
sleep 2

echo -e "\n✍️ Sending input through stdin pipe..."

# Send input through stdin pipe
{
    echo "What is the capital of France?"
    sleep 1
    # Try to send EOF or newlines to trigger processing
    echo ""
    echo ""
} > "$STDIN_PIPE" &

# Wait for some processing time
echo "⏳ Waiting for CLI to process input..."
sleep 5

echo -e "\n📊 Checking outputs..."

# Check stderr output (should have relay mode message)
if [ -f "$TEST_DIR/stderr_log.txt" ] && [ -s "$TEST_DIR/stderr_log.txt" ]; then
    echo -e "\n✅ stderr output captured:"
    cat "$TEST_DIR/stderr_log.txt"
else
    echo -e "\n⚠️ No stderr output captured"
fi

# Check stdout output (should have CLI response)
if [ -f "$TEST_DIR/stdout_log.txt" ] && [ -s "$TEST_DIR/stdout_log.txt" ]; then
    echo -e "\n✅ stdout output captured:"
    cat "$TEST_DIR/stdout_log.txt"
else
    echo -e "\n⚠️ No stdout output captured"
fi

echo -e "\n🔍 Testing bidirectional communication..."

# Try sending another message
{
    echo "Hello, can you hear me?"
    echo ""
} > "$STDIN_PIPE" &

sleep 3

echo -e "\n📄 Final output check..."
echo "Stdout content:"
cat "$TEST_DIR/stdout_log.txt" 2>/dev/null || echo "No stdout content"
echo -e "\nStderr content:"  
cat "$TEST_DIR/stderr_log.txt" 2>/dev/null || echo "No stderr content"

echo -e "\n🎉 Interactive pipe test completed!"
echo "✅ Pipes created and communication attempted"
echo "📊 Check log files for detailed output"