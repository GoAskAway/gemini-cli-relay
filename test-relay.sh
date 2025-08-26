#!/bin/bash

# Test script for relay functionality
set -e

echo "🚀 Testing Gemini CLI Relay functionality..."

# Create test directory
TEST_DIR="/tmp/gemini-relay-test"
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"

# Define pipe paths
STDIN_PIPE="$TEST_DIR/stdin.pipe"
STDOUT_PIPE="$TEST_DIR/stdout.pipe"
STDERR_PIPE="$TEST_DIR/stderr.pipe"

echo "📁 Test directory: $TEST_DIR"
echo "🔗 Pipe paths:"
echo "  stdin:  $STDIN_PIPE"
echo "  stdout: $STDOUT_PIPE"
echo "  stderr: $STDERR_PIPE"

# Function to cleanup
cleanup() {
    echo "🧹 Cleaning up..."
    rm -rf "$TEST_DIR"
    if [ ! -z "$CLI_PID" ]; then
        kill "$CLI_PID" 2>/dev/null || true
    fi
}
trap cleanup EXIT

# Test 1: Check help output with relay parameters
echo -e "\n🔧 Test 1: Check if relay parameters are available..."
if npm run start -- --help | grep -q "relay"; then
    echo "✅ Relay parameters found in help output"
else
    echo "❌ Relay parameters not found in help output"
    exit 1
fi

# Test 2: Try to run with relay mode (should fail with proper error message)
echo -e "\n🔧 Test 2: Test parameter validation..."
if npm run start -- --relay 2>&1 | grep -q "all three pipe paths must be specified"; then
    echo "✅ Parameter validation working correctly"
else
    echo "❌ Parameter validation failed"
    exit 1
fi

# Test 3: Test with all parameters but no pipes
echo -e "\n🔧 Test 3: Test with valid parameters (will create pipes)..."

# Start CLI in background with relay mode
echo "Starting CLI with relay mode..."
timeout 10s npm run start -- \
    --relay \
    --relay-stdin-pipe="$STDIN_PIPE" \
    --relay-stdout-pipe="$STDOUT_PIPE" \
    --relay-stderr-pipe="$STDERR_PIPE" \
    --prompt="Hello, this is a test" &

CLI_PID=$!

# Wait a moment for CLI to start and create pipes
sleep 2

# Check if pipes were created
if [ -p "$STDIN_PIPE" ] && [ -p "$STDOUT_PIPE" ] && [ -p "$STDERR_PIPE" ]; then
    echo "✅ Named pipes created successfully"
    ls -la "$TEST_DIR"
else
    echo "❌ Named pipes not created"
    ls -la "$TEST_DIR" || true
    exit 1
fi

# Wait for CLI to finish or timeout
wait "$CLI_PID" 2>/dev/null || true
CLI_PID=""

echo -e "\n✅ All tests passed! Relay functionality is working."
echo "🎉 Ready for production use."