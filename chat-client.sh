#!/bin/bash

# Interactive Chat Client using Gemini CLI Relay Mode
# This script implements a command-line chat interface using named pipes

set -e

# Colors for better UX
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Configuration
PIPE_DIR="/tmp/gemini-chat-$$"
STDIN_PIPE="$PIPE_DIR/stdin.pipe"
STDOUT_PIPE="$PIPE_DIR/stdout.pipe"
STDERR_PIPE="$PIPE_DIR/stderr.pipe"

echo -e "${CYAN}🤖 Gemini CLI Chat Client${NC}"
echo -e "${GRAY}Using pipe-based communication${NC}"
echo ""

# Setup cleanup
cleanup() {
    echo -e "\n${YELLOW}💫 Shutting down chat client...${NC}"
    
    # Send exit command to CLI
    echo "exit" > "$STDIN_PIPE" 2>/dev/null || true
    
    # Kill background processes
    if [ ! -z "$CLI_PID" ]; then
        kill "$CLI_PID" 2>/dev/null || true
    fi
    if [ ! -z "$STDOUT_READER_PID" ]; then
        kill "$STDOUT_READER_PID" 2>/dev/null || true
    fi
    if [ ! -z "$STDERR_READER_PID" ]; then
        kill "$STDERR_READER_PID" 2>/dev/null || true
    fi
    
    # Clean up pipes
    rm -rf "$PIPE_DIR" 2>/dev/null || true
    
    echo -e "${GREEN}✨ Goodbye!${NC}"
}
trap cleanup EXIT INT TERM

# Create pipe directory
mkdir -p "$PIPE_DIR"

echo -e "${BLUE}🔧 Starting Gemini CLI in relay mode...${NC}"

# Start CLI in background
npm run start -- \
    --relay \
    --relay-stdin-pipe="$STDIN_PIPE" \
    --relay-stdout-pipe="$STDOUT_PIPE" \
    --relay-stderr-pipe="$STDERR_PIPE" &

CLI_PID=$!

# Wait for pipes to be created
echo -e "${GRAY}⏳ Waiting for communication pipes...${NC}"
for i in {1..30}; do
    if [ -p "$STDIN_PIPE" ] && [ -p "$STDOUT_PIPE" ] && [ -p "$STDERR_PIPE" ]; then
        echo -e "${GREEN}✅ Communication established!${NC}"
        break
    fi
    sleep 0.5
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Failed to establish communication${NC}"
        exit 1
    fi
done

# Start output readers in background
{
    while IFS= read -r line; do
        echo -e "${GREEN}🤖 ${line}${NC}"
    done < "$STDOUT_PIPE"
} &
STDOUT_READER_PID=$!

{
    while IFS= read -r line; do
        # Filter out some noise, show important messages
        if [[ "$line" == *"Waiting for input"* ]] || [[ "$line" == *"Processing"* ]] || [[ "$line" == *"DEBUG"* ]]; then
            echo -e "${GRAY}   ${line}${NC}" >&2
        elif [[ "$line" == *"Error"* ]] || [[ "$line" == *"error"* ]]; then
            echo -e "${RED}⚠️  ${line}${NC}" >&2
        elif [[ "$line" == *"Received:"* ]]; then
            echo -e "${CYAN}📨 Message received and processing...${NC}" >&2
        fi
    done < "$STDERR_PIPE"
} &
STDERR_READER_PID=$!

# Give readers time to start
sleep 2

echo ""
echo -e "${CYAN}💬 Chat is ready! Type your messages below.${NC}"
echo -e "${GRAY}💡 Commands: 'exit' or 'quit' to end, Ctrl+C for emergency exit${NC}"
echo -e "${GRAY}===========================================${NC}"

# Main chat loop
while true; do
    echo -n -e "${BLUE}You: ${NC}"
    read -r user_input
    
    # Check for exit commands
    if [[ "$user_input" == "exit" ]] || [[ "$user_input" == "quit" ]] || [[ "$user_input" == "" ]]; then
        echo -e "${YELLOW}👋 Ending conversation...${NC}"
        break
    fi
    
    # Show that we're sending the message
    echo -e "${GRAY}📤 Sending message...${NC}"
    
    # Send message to CLI
    echo "$user_input" > "$STDIN_PIPE"
    
    # Wait a moment for processing
    sleep 0.5
    
    echo -e "${GRAY}⏳ Waiting for response...${NC}"
    echo ""
done

# Cleanup will be called by trap