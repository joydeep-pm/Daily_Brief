# Daily Brief - Quick Start Guide

Get your Daily Brief running in 15 minutes.

## Prerequisites Checklist

- [ ] Node.js 20+ installed
- [ ] npm installed
- [ ] GitHub account (for automated scheduling)
- [ ] Anthropic API key (https://console.anthropic.com/)
- [ ] Google Cloud account (for YouTube + Gmail APIs)
- [ ] Notion account and integration
- [ ] Your favorite content sources identified

## Step-by-Step Setup

### 1. Install Dependencies (2 minutes)

```bash
cd "Daily Brief"
npm install
```

### 2. Configure Sources (3 minutes)

Open `src/config/sources.json` and customize your sources:

**Keep it simple to start** - enable just 2-3 sources for testing:

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
      "name": "TechCrunch",
      "category": "Tech News",
      "type": "rss",
      "url": "https://techcrunch.com/feed/",
      "enabled": true
    }
  ]
}
```

### 3. Get API Keys (5 minutes)

#### Anthropic API Key
1. Go to https://console.anthropic.com/
2. Create API key
3. Copy key (starts with `sk-ant-api03-...`)

#### Google APIs (YouTube + Gmail)
1. Go to https://console.cloud.google.com/
2. Create new project
3. Enable these APIs:
   - YouTube Data API v3
   - Gmail API
4. Create OAuth 2.0 credentials:
   - Application type: Desktop app
   - Download credentials JSON
5. Use OAuth Playground to get refresh token:
   - Go to https://developers.google.com/oauthplayground/
   - Click settings gear → Use your own OAuth credentials
   - Paste Client ID and Client Secret
   - Select scopes:
     - `https://www.googleapis.com/auth/youtube.readonly`
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.send`
   - Click "Authorize APIs"
   - Exchange authorization code for tokens
   - Copy refresh token

#### Notion API
1. Go to https://www.notion.so/my-integrations
2. Click "+ New integration"
3. Name it "Daily Brief"
4. Copy Internal Integration Token
5. Create a database in Notion:
   - Open Notion
   - Create new database (table view)
   - Add properties: Name (Title), Date (Date)
   - Click "..." → Add connections → Select "Daily Brief" integration
   - Copy database ID from URL (the long string between last `/` and `?`)

### 4. Set Environment Variables (2 minutes)

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and paste your credentials:

```bash
ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY

GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN=YOUR_REFRESH_TOKEN

NOTION_API_KEY=secret_YOUR_NOTION_KEY
NOTION_DATABASE_ID=YOUR_DATABASE_ID

GMAIL_SEND_ADDRESS=your-email@gmail.com
```

### 5. Test Locally (1 minute)

Run a test to verify everything works:

```bash
npm run dev
```

You should see:
```
🚀 Daily Brief - Starting content aggregation...
📊 Initializing state database...
📡 Fetching from 2 enabled sources...
   ✓ Hacker News: 25 new items
   ✓ TechCrunch: 10 new items
🤖 Generating briefing with AI...
✅ Briefing generated
📄 Generated briefing:
---
[Your briefing will appear here]
---
```

### 6. Deploy to GitHub Actions (2 minutes)

```bash
# Initialize git repo (if not already)
git init
git add .
git commit -m "Initial commit: Daily Brief"

# Create GitHub repo and push
gh repo create daily-brief --private --source=. --push

# Or push to existing repo
git remote add origin https://github.com/YOUR_USERNAME/daily-brief.git
git push -u origin main
```

### 7. Configure GitHub Secrets (2 minutes)

Go to your GitHub repo → Settings → Secrets and variables → Actions

Click "New repository secret" and add:
- `ANTHROPIC_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `NOTION_API_KEY`
- `NOTION_DATABASE_ID`
- `GMAIL_SEND_ADDRESS`

### 8. Test GitHub Action (1 minute)

1. Go to Actions tab
2. Click "Daily Brief" workflow
3. Click "Run workflow"
4. Wait ~30 seconds
5. Check Notion and Gmail for your briefing!

## Next Steps

### Add More Sources

Edit `src/config/sources.json` to add:

**YouTube Channels:**
1. Find channel ID:
   - Go to channel page
   - View page source (Ctrl+U)
   - Search for "channelId"
2. Add to sources:
```json
{
  "name": "Lenny's Podcast",
  "category": "Product Strategy",
  "type": "youtube",
  "channelId": "UCCRr-Pzho7gFfFTE0lbl8kw",
  "enabled": true
}
```

**Gmail Newsletters:**
```json
{
  "name": "Morning Brew",
  "category": "Business News",
  "type": "gmail_extraction",
  "query": "from:morningbrew.com subject:daily",
  "enabled": true
}
```

### Customize the Briefing

Edit `src/synthesis/prompt.ts` to change:
- Output format
- Section structure
- Tone and style
- Word count limit

### Monitor Costs

Check your Anthropic dashboard:
- Should be ~$0.05-0.15 per day
- ~$1.50-4.50 per month

If costs are higher:
- Reduce number of sources
- Shorten YouTube video processing time
- Increase content truncation limits

## Troubleshooting

**"No new content" in briefing:**
- Wait 24 hours for new content to be published
- Or delete `data/state.db` to reprocess everything

**Gmail delivery fails:**
- Ensure OAuth scopes include `gmail.send`
- Check refresh token is valid
- Verify `GMAIL_SEND_ADDRESS` matches authenticated account

**Notion delivery fails:**
- Verify database is shared with integration
- Check database has "Name" and "Date" properties
- Ensure database ID is correct

**YouTube API quota exceeded:**
- Free tier: 10,000 requests/day
- Each channel costs ~2 requests per day
- Reduce number of YouTube sources if needed

## Success Checklist

- [ ] Local test runs successfully
- [ ] Briefing appears in Notion
- [ ] Briefing delivered to Gmail
- [ ] GitHub Action runs without errors
- [ ] Daily run scheduled for 10:00 AM IST

🎉 **You're all set!** Your Daily Brief will now run automatically every morning.

## Tips for Power Users

1. **Organize by themes** - Group related sources in same category
2. **Quality over quantity** - 10 high-signal sources > 40 mediocre ones
3. **Weekly review** - Disable sources that consistently produce noise
4. **Archive in Notion** - Create views to filter by category/date
5. **Mobile access** - Enable Notion mobile app for on-the-go reading

## Getting Help

- **GitHub Issues**: Report bugs or request features
- **README.md**: Full documentation
- **Logs**: Check GitHub Actions logs for detailed errors
- **Community**: Share your source configs and customizations!
