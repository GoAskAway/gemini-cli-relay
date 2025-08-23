#!/bin/bash
# Relay Package Initialization Script
# This script sets up git hooks and necessary configurations for the relay package

set -e  # Exit on any error

# Get the script directory (packages/relay)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
RELAY_DIR="$SCRIPT_DIR"

# Quick exit check: If hooks are already configured, do nothing.
# This makes the script efficient and keeps the output clean on subsequent runs.
HooksPathIsSet=false
if [ "$(git config --get core.hooksPath)" = "packages/relay/.husky/_" ]; then
  HooksPathIsSet=true
fi

if [ "$HooksPathIsSet" = true ] && [ -f "$RELAY_DIR/.husky/_/pre-commit" ]; then
  # Using a more subtle checkmark for subsequent runs
  echo "✅ Husky hooks for Relay are already configured."
  exit 0
fi

# --- Full Initialization Logic --- 

echo "🚀 Initializing Relay package for the first time..."

PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "📁 Relay directory: $RELAY_DIR"
echo "📁 Project root: $PROJECT_ROOT"

# 1. Configure git hooks path to use relay's husky setup
echo "🔧 Configuring git hooks path..."
cd "$PROJECT_ROOT"
git config core.hooksPath "packages/relay/.husky/_"
echo "✅ Git hooks path set to: packages/relay/.husky/_"

# 2. Ensure husky runtime directory exists
echo "📂 Creating husky runtime directory..."
mkdir -p "$RELAY_DIR/.husky/_"

# 4. Verify husky is available
if [ ! -f "$RELAY_DIR/node_modules/.bin/husky" ] && [ ! -f "$PROJECT_ROOT/node_modules/.bin/husky" ]; then
    echo "❌ Husky not found. Please install husky in relay package:"
    echo "   cd $RELAY_DIR && npm install husky -D"
    exit 1
fi

# 5. Set up git hooks if husky.sh doesn't exist
if [ ! -f "$RELAY_DIR/.husky/_/husky.sh" ]; then
    echo "📝 Creating husky.sh runtime..."
    cat > "$RELAY_DIR/.husky/_/husky.sh" << 'EOF'
#!/usr/bin/env sh
if [ -z "$husky_skip_init" ]; then
  debug () {
    if [ "$HUSKY_DEBUG" = "1" ]; then
      echo "husky (debug) - $1"
    fi
  }

  readonly hook_name="$(basename -- "$0")"
  debug "starting $hook_name..."

  if [ "$HUSKY" = "0" ]; then
    debug "HUSKY env variable is set to 0, skipping hook"
    exit 0
  fi

  if [ -f ~/.huskyrc ]; then
    debug "sourcing ~/.huskyrc"
    . ~/.huskyrc
  fi

  readonly husky_skip_init=1
  export husky_skip_init
  sh -e "$0" "$@"
  exitCode="$?"

  if [ $exitCode != 0 ]; then
    echo "husky - $hook_name hook exited with code $exitCode (error)"
  fi

  if [ $exitCode = 127 ]; then
    echo "husky - command not found in PATH=$PATH"
  fi

  exit $exitCode
fi
EOF
    chmod +x "$RELAY_DIR/.husky/_/husky.sh"
    echo "✅ husky.sh created and made executable"
fi

# 6. Create pre-commit hook if it doesn't exist
if [ ! -f "$RELAY_DIR/.husky/_/pre-commit" ]; then
    echo "📝 Creating pre-commit hook..."
    cat > "$RELAY_DIR/.husky/_/pre-commit" << 'EOF'
#!/usr/bin/env sh
. "$(dirname -- "$0")/husky.sh"

echo "🔍 Running project pre-commit checks..."

# Navigate to project root
cd "$(git rev-parse --show-toplevel)"

# Run the standard preflight check as per CONTRIBUTING.md
echo "🚀 Running npm run preflight (format, lint, build, typecheck, tests)..."
npm run preflight

echo "✅ All pre-commit checks passed!"
EOF
    chmod +x "$RELAY_DIR/.husky/_/pre-commit"
    echo "✅ pre-commit hook created and made executable"
fi

# 7. Display current configuration
echo ""
echo "🎉 Relay package initialization complete!"
echo ""
echo "📋 Current configuration:"
echo "   Git hooks path: $(git config --get core.hooksPath)"
echo "   Husky runtime: $RELAY_DIR/.husky/_/"
echo "   Pre-commit hook: $RELAY_DIR/.husky/_/pre-commit"
echo ""
echo "💡 To test the setup, try making a commit in the repository."