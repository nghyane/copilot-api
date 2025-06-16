#!/bin/sh

# Entrypoint script for better signal handling
# This ensures proper SIGTERM handling and faster container shutdown

set -e

# Handle signals properly
trap 'echo "Received SIGTERM, shutting down gracefully..."; exit 0' TERM
trap 'echo "Received SIGINT, shutting down gracefully..."; exit 0' INT

# Start the application with exec to replace the shell process
# This ensures signals are passed directly to the bun process
exec bun dist/main.js start -g "$GH_TOKEN" "$@"
