#!/bin/sh
set -e

# Ensure data directory exists and is writable
mkdir -p "$DATA_DIR"

# If running as root, fix permissions and switch to node user
if [ "$(id -u)" = "0" ]; then
  chown -R node:node "$DATA_DIR"
  exec su-exec node node server.js
else
  exec node server.js
fi
