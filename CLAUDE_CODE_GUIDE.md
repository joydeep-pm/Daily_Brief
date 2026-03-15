# Claude Code Features Guide for Daily Brief

This guide demonstrates how to use advanced Claude Code features (Skills, Hooks, and Loop CLI) to enhance your Daily Brief workflow.

## Overview of Claude Code Features

**Claude Code** is Anthropic's official CLI tool that enables:
- **Skills**: Custom commands for automating common tasks
- **Hooks**: Event-driven automation (pre-commit, pre-push, etc.)
- **Loop CLI**: Interactive development and debugging environment

## 1. Skills for Daily Brief

Skills are custom commands that automate repetitive tasks. Here are recommended skills for Daily Brief:

### Skill #1: Manual Briefing Generation

**Use case**: Trigger briefing generation on-demand (outside scheduled time)

**Installation**:
```bash
claude-code skill install daily-brief-generate
```

**Usage**:
```bash
claude-code /generate-briefing
```

**Implementation** (`~/.claude/skills/daily-brief-generate.md`):
```markdown
---
name: generate-briefing
description: Manually trigger Daily Brief generation
---

# Generate Daily Brief

Please run the Daily Brief content aggregation:

1. Execute `npm run dev` in the Daily Brief project directory
2. Display the generated briefing
3. Ask if I want to force delivery to Notion/Gmail (set FORCE_DELIVERY=true)
```

### Skill #2: Add New Source

**Use case**: Quickly add a new content source without manually editing JSON

**Usage**:
```bash
claude-code /add-source
```

**Implementation** (`~/.claude/skills/add-source.md`):
```markdown
---
name: add-source
description: Add a new content source to Daily Brief
---

# Add Content Source

Please help me add a new source to `src/config/sources.json`:

1. Ask me for:
   - Source name
   - Category (Tech News, Product Strategy, etc.)
   - Type (rss, youtube, gmail_extraction, x_scraper)
   - Type-specific config (url, channelId, query, or username)
   - Whether to enable immediately

2. Validate the source config format
3. Add to sources.json
4. Confirm addition and show the new entry

Example questions:
- "What's the source name?" → "The Verge"
- "What category?" → "Tech News"
- "What type?" → "rss"
- "What's the RSS feed URL?" → "https://www.theverge.com/rss/index.xml"
- "Enable now?" → "yes"
```

### Skill #3: View Error Logs

**Use case**: Quickly inspect recent source failures

**Usage**:
```bash
claude-code /check-errors
```

**Implementation** (`~/.claude/skills/check-errors.md`):
```markdown
---
name: check-errors
description: Check recent Daily Brief errors
---

# Check Daily Brief Errors

Please analyze recent errors:

1. Check GitHub Actions logs for failed workflow runs
2. Look for source-specific errors in latest run
3. Summarize:
   - Which sources failed
   - Error messages
   - Suggested fixes

4. Offer to:
   - Disable problematic sources
   - Update source configs
   - Investigate API quota issues
```

### Skill #4: Optimize Prompt

**Use case**: Iteratively improve the LLM synthesis prompt

**Usage**:
```bash
claude-code /optimize-prompt
```

**Implementation** (`~/.claude/skills/optimize-prompt.md`):
```markdown
---
name: optimize-prompt
description: Improve the Daily Brief synthesis prompt
---

# Optimize Synthesis Prompt

Help me improve the briefing quality:

1. Read current prompt from `src/synthesis/prompt.ts`
2. Ask what aspect to optimize:
   - Conciseness (shorter summaries)
   - Technical depth (more detail)
   - Signal-to-noise ratio (better filtering)
   - Structure (different format)

3. Generate alternative prompt
4. Show side-by-side comparison
5. Offer to test with recent content before committing
```

## 2. Hooks for Daily Brief

Hooks automate actions triggered by events. Here are recommended hooks:

### Hook #1: Validate Sources Config

**Use case**: Prevent invalid source configs from being committed

**Installation**: Add to `~/.claude/hooks/pre-commit/validate-sources.sh`

```bash
#!/bin/bash

# Pre-commit hook: Validate sources.json schema

SOURCES_FILE="src/config/sources.json"

if git diff --cached --name-only | grep -q "$SOURCES_FILE"; then
  echo "🔍 Validating sources.json..."

  # Check if file is valid JSON
  if ! jq empty "$SOURCES_FILE" 2>/dev/null; then
    echo "❌ Error: sources.json is not valid JSON"
    exit 1
  fi

  # Validate required fields
  VALIDATION=$(jq '.sources[] | select(.name == null or .category == null or .type == null or .enabled == null)' "$SOURCES_FILE")

  if [ -n "$VALIDATION" ]; then
    echo "❌ Error: Some sources missing required fields (name, category, type, enabled)"
    echo "$VALIDATION"
    exit 1
  fi

  # Validate source types
  INVALID_TYPES=$(jq -r '.sources[] | select(.type != "rss" and .type != "youtube" and .type != "gmail_extraction" and .type != "x_scraper") | .name' "$SOURCES_FILE")

  if [ -n "$INVALID_TYPES" ]; then
    echo "❌ Error: Invalid source type(s):"
    echo "$INVALID_TYPES"
    exit 1
  fi

  echo "✅ sources.json is valid"
fi

exit 0
```

**Enable hook**:
```bash
chmod +x ~/.claude/hooks/pre-commit/validate-sources.sh
```

### Hook #2: Run Tests Before Push

**Use case**: Ensure tests pass before pushing to GitHub

**Installation**: Add to `~/.claude/hooks/pre-push/run-tests.sh`

```bash
#!/bin/bash

# Pre-push hook: Run integration tests

echo "🧪 Running Daily Brief tests..."

cd "/Users/joy/Daily Brief"
npm run test:local

if [ $? -ne 0 ]; then
  echo "❌ Tests failed. Push aborted."
  exit 1
fi

echo "✅ All tests passed"
exit 0
```

**Enable hook**:
```bash
chmod +x ~/.claude/hooks/pre-push/run-tests.sh
```

### Hook #3: Notify on State Changes

**Use case**: Get notified when state database is modified (useful for monitoring)

**Installation**: Add to `~/.claude/hooks/post-commit/notify-state.sh`

```bash
#!/bin/bash

# Post-commit hook: Notify on state database changes

STATE_FILE="data/state.db"

if git diff HEAD~1 --name-only | grep -q "$STATE_FILE"; then
  echo "📊 State database updated in this commit"

  # Optional: Send notification (macOS example)
  osascript -e 'display notification "Daily Brief state database updated" with title "Daily Brief"'
fi

exit 0
```

### Hook #4: Auto-format on Commit

**Use case**: Automatically format code before committing

**Installation**: Add to `~/.claude/hooks/pre-commit/format.sh`

```bash
#!/bin/bash

# Pre-commit hook: Auto-format TypeScript files

TS_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep '\.ts$')

if [ -n "$TS_FILES" ]; then
  echo "✨ Formatting TypeScript files..."

  for file in $TS_FILES; do
    npx prettier --write "$file"
    git add "$file"
  done

  echo "✅ Files formatted"
fi

exit 0
```

## 3. Loop CLI for Daily Brief

Loop CLI enables interactive development with fast iteration cycles.

### Use Case #1: Debug LLM Prompts

**Scenario**: Your briefings are too verbose. You want to iterate on the prompt.

**Loop session**:
```bash
claude-code loop
```

**Commands in Loop**:
```
> read src/synthesis/prompt.ts

> # Let me see a sample briefing first
> npm run dev

> # Now let's try a more concise prompt
> edit prompt.ts
[Make changes to emphasize brevity]

> # Test again
> npm run dev

> # Compare results - is it better?
> # Iterate until satisfied

> # Commit when happy
> git add src/synthesis/prompt.ts
> git commit -m "feat: make briefings more concise"
```

**Benefits**:
- See immediate results
- Compare before/after
- No need to exit/re-run

### Use Case #2: Test New Source Integration

**Scenario**: Adding a new YouTube channel - want to verify transcript quality

**Loop session**:
```
> # Add new source to config
> edit src/config/sources.json

> # Test just this source (delete state to reprocess)
> rm data/state.db

> # Run and inspect output
> npm run dev

> # Check transcript quality in output
> # If good, commit. If not, adjust source config or handler

> git add src/config/sources.json
> git commit -m "feat: add new YouTube source"
```

### Use Case #3: Debug API Errors

**Scenario**: Gmail integration suddenly failing

**Loop session**:
```
> # Check error logs
> cat data/logs/latest.log

> # Inspect Gmail handler
> read src/ingestion/sources/gmail.ts

> # Test OAuth token refresh
> node -e "import('./src/ingestion/sources/gmail.js').then(m => new m.GmailHandler())"

> # Add debug logging
> edit src/ingestion/sources/gmail.ts
[Add console.log statements]

> # Run again and observe
> npm run dev

> # Fix issue and remove debug logging
> edit src/ingestion/sources/gmail.ts

> git add .
> git commit -m "fix: resolve Gmail OAuth refresh issue"
```

### Use Case #4: Experiment with Summary Formats

**Scenario**: Want to try different Markdown formats for Notion

**Loop session**:
```
> # Generate sample briefing
> npm run dev > sample-output.md

> # Edit delivery format
> edit src/delivery/notion.ts

> # Test with force delivery
> FORCE_DELIVERY=true npm run dev

> # Check Notion page formatting

> # Iterate until satisfied
> edit src/delivery/notion.ts
> FORCE_DELIVERY=true npm run dev

> # Commit final version
> git add src/delivery/notion.ts
> git commit -m "feat: improve Notion formatting with better headers"
```

## Advanced Workflows

### Workflow #1: Weekly Source Quality Review

**Combined Skills + Loop**:

1. Generate weekly report:
   ```bash
   claude-code /generate-report --period=week
   ```

2. Enter Loop to analyze:
   ```bash
   claude-code loop
   ```

3. In Loop:
   ```
   > # Query state database for stats
   > sqlite3 data/state.db "SELECT source_name, COUNT(*) as items FROM processed_items WHERE processed_at > strftime('%s', 'now', '-7 days') * 1000 GROUP BY source_name ORDER BY items DESC"

   > # Identify low-value sources (few items or consistent errors)

   > # Disable noisy sources
   > edit src/config/sources.json

   > # Commit changes
   > git add src/config/sources.json
   > git commit -m "chore: disable low-signal sources after weekly review"
   ```

### Workflow #2: A/B Test LLM Providers

**Using Loop**:

```
> # Run with Claude Haiku (current)
> npm run dev > briefing-haiku.md

> # Switch to GPT-4o-mini
> edit src/index.ts
[Change provider to OpenAIProvider]

> # Run with GPT
> npm run dev > briefing-gpt.md

> # Compare outputs
> diff briefing-haiku.md briefing-gpt.md

> # Choose winner and revert if needed
> git checkout src/index.ts
```

### Workflow #3: Rapid Source Config Iteration

**Combined approach**:

1. Use skill to add sources in bulk:
   ```bash
   claude-code /bulk-add-sources sources.csv
   ```

2. Test in Loop:
   ```
   > rm data/state.db  # Fresh start
   > npm run dev
   > # Inspect results
   > # Disable problematic sources
   > edit src/config/sources.json
   > npm run dev
   > # Repeat until satisfied
   ```

## Best Practices

### For Skills
1. **Keep skills focused** - One task per skill
2. **Use descriptive names** - Clear what the skill does
3. **Add error handling** - Skills should gracefully handle edge cases
4. **Document inputs** - Specify what the skill needs from user

### For Hooks
1. **Fail fast** - Exit 1 on errors to block bad commits
2. **Be informative** - Print clear error messages
3. **Optimize speed** - Hooks should run in <5 seconds
4. **Make idempotent** - Safe to run multiple times

### For Loop CLI
1. **Save checkpoints** - Commit working versions frequently
2. **Use sample data** - Test with small datasets for speed
3. **Track experiments** - Keep notes of what worked/didn't
4. **Exit cleanly** - Don't leave uncommitted changes

## Troubleshooting

### Skills not working
- Check skill file location: `~/.claude/skills/`
- Verify frontmatter format (YAML between `---`)
- Ensure skill name matches filename

### Hooks not triggering
- Check hook executable: `chmod +x ~/.claude/hooks/*/hook-name.sh`
- Verify hook location matches event (pre-commit vs pre-push)
- Test hook manually: `./.claude/hooks/pre-commit/hook-name.sh`

### Loop CLI issues
- Ensure you're in project directory
- Check `package.json` scripts are defined
- Verify dependencies installed: `npm install`

## Resources

- **Claude Code Docs**: https://docs.anthropic.com/claude-code
- **Skills Gallery**: https://claude-code.anthropic.com/skills
- **Hooks Reference**: https://docs.anthropic.com/claude-code/hooks
- **Loop CLI Guide**: https://docs.anthropic.com/claude-code/loop

## Creating Your Own Skills

**Template**:
```markdown
---
name: your-skill-name
description: Brief description of what it does
---

# Your Skill Title

Instructions for Claude to follow:

1. First step
2. Second step
3. Final step

Optional context:
- Relevant files to read
- Commands to run
- Expected output
```

**Installation**:
```bash
# Save to ~/.claude/skills/your-skill-name.md
claude-code skill install ./your-skill-name.md

# Or use from anywhere
claude-code /your-skill-name
```

## Summary

**Skills**: Automate common tasks (generate briefing, add source, check errors)
**Hooks**: Enforce quality gates (validate config, run tests, format code)
**Loop**: Interactive development (debug prompts, test sources, iterate quickly)

**Combined power**: Build a robust, maintainable Daily Brief workflow with minimal manual intervention.

Happy automating! 🚀
