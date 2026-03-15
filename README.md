# Daily Brief - Automated Content Aggregation Engine

A fully automated content aggregation system that runs daily at 10:00 AM IST, ingests content from ~40 sources (RSS, YouTube, Gmail, Twitter/X), and uses AI to synthesize high-signal insights into a scannable Daily Briefing delivered to Notion and Gmail.

## Features

- 🔄 **Multi-Source Ingestion**: RSS feeds, YouTube transcripts, Gmail newsletters, Twitter/X
- 🤖 **AI-Powered Synthesis**: Claude Haiku 4.5 for intelligent content summarization
- 📊 **Stateful Deduplication**: SQLite database tracks processed items
- 📬 **Dual Delivery**: Automated delivery to Notion pages and Gmail
- 💰 **Near-Zero Cost**: ~$1.50-4.50/month operating costs
- 🔧 **Resilient**: Graceful error handling, retries, fallback LLM provider
- ⚡ **Adaptive Sampling**: Smart transcript extraction based on video length

## Architecture

```
┌─────────────┐
│ GitHub      │ (Scheduler: 10:00 AM IST daily)
│ Actions     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Daily Brief Engine                     │
│  ┌─────────────────────────────────┐   │
│  │ 1. Source Ingestion             │   │
│  │    - RSS (rss-parser)           │   │
│  │    - YouTube (googleapis)       │   │
│  │    - Gmail (googleapis)         │   │
│  │    - Twitter (agent-twitter)    │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ 2. State Management             │   │
│  │    - SQLite deduplication       │   │
│  │    - Last-processed tracking    │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ 3. AI Synthesis                 │   │
│  │    - Claude Haiku 4.5 (primary) │   │
│  │    - GPT-4o-mini (fallback)     │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ 4. Delivery                     │   │
│  │    - Notion API                 │   │
│  │    - Gmail API                  │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## Setup

### Prerequisites

- Node.js 20+
- npm
- API keys for:
  - Anthropic (Claude)
  - OpenAI (optional fallback)
  - Google Cloud (YouTube Data API v3 + Gmail API)
  - Notion
  - Twitter/X credentials (optional)

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure sources:**

   Edit `src/config/sources.json` to add your content sources:
   ```json
   {
     "sources": [
       {
         "name": "Hacker News",
         "category": "Tech News",
         "type": "rss",
         "url": "https://hnrss.org/frontpage",
         "enabled": true
       },
       {
         "name": "Lenny's Podcast",
         "category": "Product Strategy",
         "type": "youtube",
         "channelId": "UCCRr-Pzho7gFfFTE0lbl8kw",
         "enabled": true
       }
     ]
   }
   ```

3. **Set up environment variables:**

   Create `.env` from `.env.example`:
   ```bash
   cp .env.example .env
   ```

   Fill in your API credentials:
   ```bash
   # Anthropic API
   ANTHROPIC_API_KEY=sk-ant-api03-...

   # Google APIs
   GOOGLE_CLIENT_ID=...apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REFRESH_TOKEN=...

   # Notion
   NOTION_API_KEY=secret_...
   NOTION_DATABASE_ID=...

   # Gmail
   GMAIL_SEND_ADDRESS=your-email@gmail.com
   ```

4. **Google OAuth Setup:**

   To get `GOOGLE_REFRESH_TOKEN`:

   a. Create a project in Google Cloud Console
   b. Enable YouTube Data API v3 and Gmail API
   c. Create OAuth 2.0 credentials
   d. Use OAuth Playground to generate refresh token:
      - https://developers.google.com/oauthplayground/
      - Scopes needed:
        - `https://www.googleapis.com/auth/youtube.readonly`
        - `https://www.googleapis.com/auth/gmail.readonly`
        - `https://www.googleapis.com/auth/gmail.send`

5. **Notion Setup:**

   a. Create a new integration at https://www.notion.so/my-integrations
   b. Create a database in Notion with these properties:
      - Name (Title)
      - Date (Date)
      - Source Count (Number) - optional
      - Item Count (Number) - optional
   c. Share the database with your integration
   d. Copy the database ID from the URL

### Local Testing

Run the briefing generation locally:

```bash
npm run dev
```

This will:
- Fetch content from all enabled sources
- Generate a briefing with AI
- Display the briefing in console
- Skip delivery unless `FORCE_DELIVERY=true` is set

To force delivery during testing:
```bash
FORCE_DELIVERY=true npm run dev
```

### GitHub Actions Setup

1. **Push code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Daily Brief engine"
   git remote add origin https://github.com/your-username/daily-brief.git
   git push -u origin main
   ```

2. **Configure GitHub Secrets:**

   Go to repository Settings → Secrets and variables → Actions, and add:
   - `ANTHROPIC_API_KEY`
   - `OPENAI_API_KEY` (optional)
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REFRESH_TOKEN`
   - `YOUTUBE_API_KEY` (or use `GOOGLE_API_KEY`)
   - `NOTION_API_KEY`
   - `NOTION_DATABASE_ID`
   - `GMAIL_SEND_ADDRESS`
   - `TWITTER_USERNAME` (optional)
   - `TWITTER_PASSWORD` (optional)

3. **Test the workflow:**

   Go to Actions tab → Daily Brief → Run workflow

4. **Monitor daily runs:**

   The workflow runs automatically at 10:00 AM IST (4:30 AM UTC) every day.

## Project Structure

```
daily-brief/
├── src/
│   ├── config/
│   │   └── sources.json          # Source definitions
│   ├── ingestion/
│   │   ├── types.ts               # Shared interfaces
│   │   ├── source-manager.ts      # Orchestrates all sources
│   │   └── sources/
│   │       ├── rss.ts             # RSS feed handler
│   │       ├── youtube.ts         # YouTube transcript handler
│   │       ├── gmail.ts           # Gmail extraction handler
│   │       └── twitter.ts         # Twitter/X scraper
│   ├── state/
│   │   ├── types.ts               # State interfaces
│   │   └── database.ts            # SQLite state manager
│   ├── synthesis/
│   │   ├── types.ts               # LLM interfaces
│   │   ├── llm-client.ts          # LLM abstraction layer
│   │   ├── prompt.ts              # Prompt templates
│   │   └── providers/
│   │       ├── anthropic.ts       # Claude Haiku implementation
│   │       └── openai.ts          # GPT-4o-mini fallback
│   ├── delivery/
│   │   ├── notion.ts              # Notion page creation
│   │   └── gmail.ts               # Gmail delivery
│   └── index.ts                   # Main orchestrator
├── data/
│   └── state.db                   # SQLite database (auto-created)
├── .github/
│   └── workflows/
│       └── daily-brief.yml        # GitHub Actions workflow
├── package.json
├── tsconfig.json
└── README.md
```

## Usage

### Adding a New Source

Edit `src/config/sources.json`:

**RSS Feed:**
```json
{
  "name": "My Blog",
  "category": "Personal",
  "type": "rss",
  "url": "https://myblog.com/feed",
  "enabled": true
}
```

**YouTube Channel:**
```json
{
  "name": "My Channel",
  "category": "Education",
  "type": "youtube",
  "channelId": "UCxxxxxx",
  "enabled": true
}
```

**Gmail Newsletter:**
```json
{
  "name": "Morning Brew",
  "category": "Business News",
  "type": "gmail_extraction",
  "query": "from:morningbrew.com subject:daily",
  "enabled": true
}
```

**Twitter/X Account:**
```json
{
  "name": "Paul Graham",
  "category": "Startup Wisdom",
  "type": "x_scraper",
  "username": "paulg",
  "enabled": true
}
```

### Disabling a Source

Set `"enabled": false` in `sources.json`.

### Viewing State

The SQLite database tracks all processed items:

```bash
sqlite3 data/state.db "SELECT * FROM processed_items LIMIT 10;"
```

## Cost Breakdown

**Monthly operating costs (30 days):**
- GitHub Actions: $0 (2000 minutes free tier, uses ~150 min/month)
- Anthropic Claude Haiku: $1.50-4.50 (~200k-600k tokens/day @ $0.25/1M input)
- Google APIs: $0 (YouTube + Gmail within free quotas)
- Notion: $0 (free tier supports API)
- OpenAI (fallback): $0 (only used if Anthropic fails)

**Total: ~$1.50-4.50/month** ✅

## Troubleshooting

### "No new content" in briefing

- Check that sources are enabled in `sources.json`
- Verify API credentials are correct
- Check GitHub Actions logs for source errors
- Run locally with `npm run dev` to see detailed error messages

### Gmail delivery fails

- Verify OAuth scopes include `gmail.send`
- Check that `GMAIL_SEND_ADDRESS` matches authenticated account
- Ensure refresh token is valid

### Notion delivery fails

- Verify database is shared with integration
- Check database ID is correct (from URL after `/` and before `?`)
- Ensure database has required properties (Name, Date)

### YouTube transcripts unavailable

- Some videos disable transcripts - the system will fall back to description
- Verify YouTube Data API v3 is enabled in Google Cloud Console
- Check API quota hasn't been exceeded (10k requests/day free)

### Twitter/X scraper breaks

- Unofficial scraper may break if X changes their API
- Set `"enabled": false` for X sources if they fail consistently
- Check logs for specific error messages

## Development

### Running tests

```bash
npm test
```

### Building

```bash
npm run build
```

Output goes to `dist/`.

### Type checking

TypeScript strict mode is enabled. Run:

```bash
npx tsc --noEmit
```

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For issues or questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review GitHub Actions logs for error details
