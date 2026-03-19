#!/bin/bash
# Daily Brief - local cron runner
# Runs at 10 AM IST (4:30 AM UTC) daily

export PATH="/Users/joy/.nvm/versions/node/v22.22.0/bin:$PATH"

cd "/Users/joy/Daily Brief"

# Load environment variables
set -a
source .env
set +a

# Create logs directory if needed
mkdir -p logs

# Run the brief and log output
echo "=== Daily Brief Run: $(date) ===" >> logs/daily-brief.log
npm start >> logs/daily-brief.log 2>&1
echo "=== Completed: $(date) ===" >> logs/daily-brief.log
