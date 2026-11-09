#!/usr/bin/env bash
# Frame Extraction Shell Script (Wrapper for node scripts/extract-frames.js)
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
node "$DIR/extract-frames.js" "$@"
