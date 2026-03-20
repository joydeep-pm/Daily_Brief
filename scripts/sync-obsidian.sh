#!/bin/bash
# Sync Gmail briefings to Obsidian vault
# Runs after the GitHub Actions briefing is delivered

export PATH="/Users/joy/.nvm/versions/node/v22.22.0/bin:$PATH"

cd "/Users/joy/Daily Brief"

# Load environment variables
set -a
source .env
set +a

mkdir -p logs

echo "=== Obsidian Sync: $(date) ===" >> logs/obsidian-sync.log
npm run sync >> logs/obsidian-sync.log 2>&1
echo "=== Completed: $(date) ===" >> logs/obsidian-sync.log
