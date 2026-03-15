# GitHub Actions Setup Guide

## ✅ Step 1: Code Pushed to GitHub (DONE!)

Your code is now at: https://github.com/joydeep-pm/Daily_Brief

## 📝 Step 2: Add GitHub Secrets

Go to: **https://github.com/joydeep-pm/Daily_Brief/settings/secrets/actions**

Click **"New repository secret"** for each of these:

### Required Secrets:

| Secret Name | Value (from your `.env` file) |
|------------|-------------------------------|
| `ANTHROPIC_API_KEY` | sk-ant-api03-t5U3sqHmzsPf6o... |
| `GOOGLE_CLIENT_ID` | 161670334542-9uh8ndqc7npf... |
| `GOOGLE_CLIENT_SECRET` | GOCSPX-JldnEb2sEI511RDV... |
| `GOOGLE_REFRESH_TOKEN` | 1//04c2VEw7vwpdqCgYIARAAGAQSNwF... |
| `NOTION_API_KEY` | ntn_r25086668308amZeQyh5KmSG3X0... |
| `NOTION_DATABASE_ID` | 30d0958737ce80ec96b3c6776a53d11e |
| `GMAIL_SEND_ADDRESS` | joytdh@gmail.com |

### Optional Secrets:

| Secret Name | Value |
|------------|-------|
| `OPENAI_API_KEY` | sk-proj-WVC92k5VyZ... (fallback) |
| `TWITTER_USERNAME` | dailybrief_joy |
| `TWITTER_PASSWORD` | Welcome@1987 |
| `YOUTUBE_API_KEY` | (Get this - see Step 3 below!) |

## 🎬 Step 3: Get YouTube API Key

### Quick Steps:
1. Go to: https://console.cloud.google.com/apis/credentials
2. Select your existing Google Cloud project
3. Click **"+ CREATE CREDENTIALS"** → **"API key"**
4. Copy the API key
5. Add as GitHub Secret: `YOUTUBE_API_KEY`

**This enables all 7 YouTube channels!** (Free tier: 10,000 requests/day)

## 🚀 Step 4: Test the Workflow

### Manual Trigger (Test Now):
1. Go to: https://github.com/joydeep-pm/Daily_Brief/actions
2. Click **"Daily Brief"** workflow
3. Click **"Run workflow"** button
4. Select branch: **main**
5. Click green **"Run workflow"** button

### Monitor Progress:
- Watch the workflow run in real-time
- Should complete in ~2 minutes
- Check for green ✅ or red ❌

### Verify Delivery:
- **Notion**: Check your database for new "Daily Brief" page
- **Gmail**: Check joytdh@gmail.com inbox

## ⏰ Step 5: Scheduled Runs

The workflow is already configured to run daily at **10:00 AM IST** (4:30 AM UTC).

See `.github/workflows/daily-brief.yml`:
```yaml
on:
  schedule:
    - cron: '30 4 * * *'  # 10:00 AM IST
```

No additional setup needed - it will run automatically every day!

## 🔍 Troubleshooting

### Workflow Failed?
1. Click on the failed run
2. Expand the "Run Daily Brief" step
3. Read error messages
4. Common issues:
   - Missing secret (add it in Settings → Secrets)
   - Invalid API key (regenerate)
   - OAuth token expired (get new refresh token)

### No Email Received?
- Check spam folder
- Verify `GMAIL_SEND_ADDRESS` secret
- Check Gmail quota (max 500/day)

### Notion Page Not Created?
- Verify Notion database is shared with integration
- Check `NOTION_DATABASE_ID` is correct
- Ensure database has at least a "Name" property

## 📊 Monitoring

### Daily Checks:
- ✅ Workflow runs successfully (green ✅)
- ✅ Briefing delivered to Notion
- ✅ Email received in Gmail

### Weekly Review:
- Review source errors in briefing
- Disable consistently failing sources
- Monitor API costs (Anthropic dashboard)

## 💰 Cost Tracking

- **Anthropic**: ~$0.05-0.15/day → ~$1.50-4.50/month
- **GitHub Actions**: $0 (free tier: 2000 min/month)
- **Google APIs**: $0 (within free quotas)

Total: **~$2-5/month** for daily high-quality briefings!

---

## ✨ You're All Set!

Once you add the secrets and trigger a test run, your Daily Brief will:
- ✅ Run automatically every morning at 10AM IST
- ✅ Aggregate content from 28+ working sources
- ✅ Generate AI-powered summaries
- ✅ Deliver to Notion + Gmail
- ✅ Cost less than a coffee per month

**Next**: Add the secrets and click "Run workflow" to test!
