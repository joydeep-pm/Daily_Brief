#!/bin/bash

# Daily Brief - Interactive Setup Script
# This script helps you configure the Daily Brief system step by step

set -e  # Exit on error

echo "🚀 Daily Brief - Interactive Setup"
echo "=================================="
echo ""

# Check if .env already exists
if [ -f ".env" ]; then
  echo "⚠️  .env file already exists!"
  read -p "Do you want to overwrite it? (y/N): " overwrite
  if [[ ! $overwrite =~ ^[Yy]$ ]]; then
    echo "Setup cancelled. Keeping existing .env file."
    exit 0
  fi
fi

echo "📝 Creating .env file from template..."
cp .env.example .env

echo ""
echo "🔑 API Credentials Setup"
echo "========================"
echo ""

# Anthropic API Key
echo "1️⃣  Anthropic API Key"
echo "   Get it from: https://console.anthropic.com/"
read -p "   Enter your Anthropic API key: " anthropic_key
if [ -n "$anthropic_key" ]; then
  sed -i.bak "s/ANTHROPIC_API_KEY=.*/ANTHROPIC_API_KEY=$anthropic_key/" .env
  echo "   ✅ Anthropic API key configured"
else
  echo "   ⚠️  Skipped (you'll need to add this manually)"
fi
echo ""

# Google OAuth
echo "2️⃣  Google OAuth Credentials"
echo "   Get them from: https://console.cloud.google.com/"
read -p "   Enter Google Client ID: " google_client_id
if [ -n "$google_client_id" ]; then
  sed -i.bak "s/GOOGLE_CLIENT_ID=.*/GOOGLE_CLIENT_ID=$google_client_id/" .env
  echo "   ✅ Google Client ID configured"
fi

read -p "   Enter Google Client Secret: " google_client_secret
if [ -n "$google_client_secret" ]; then
  sed -i.bak "s/GOOGLE_CLIENT_SECRET=.*/GOOGLE_CLIENT_SECRET=$google_client_secret/" .env
  echo "   ✅ Google Client Secret configured"
fi

read -p "   Enter Google Refresh Token: " google_refresh_token
if [ -n "$google_refresh_token" ]; then
  sed -i.bak "s/GOOGLE_REFRESH_TOKEN=.*/GOOGLE_REFRESH_TOKEN=$google_refresh_token/" .env
  echo "   ✅ Google Refresh Token configured"
fi
echo ""

# Notion
echo "3️⃣  Notion API"
echo "   Get it from: https://www.notion.so/my-integrations"
read -p "   Enter Notion API key: " notion_api_key
if [ -n "$notion_api_key" ]; then
  sed -i.bak "s/NOTION_API_KEY=.*/NOTION_API_KEY=$notion_api_key/" .env
  echo "   ✅ Notion API key configured"
fi

read -p "   Enter Notion Database ID: " notion_db_id
if [ -n "$notion_db_id" ]; then
  sed -i.bak "s/NOTION_DATABASE_ID=.*/NOTION_DATABASE_ID=$notion_db_id/" .env
  echo "   ✅ Notion Database ID configured"
fi
echo ""

# Gmail
echo "4️⃣  Gmail Delivery"
read -p "   Enter your Gmail address: " gmail_address
if [ -n "$gmail_address" ]; then
  sed -i.bak "s/GMAIL_SEND_ADDRESS=.*/GMAIL_SEND_ADDRESS=$gmail_address/" .env
  echo "   ✅ Gmail address configured"
fi
echo ""

# Optional: OpenAI
echo "5️⃣  OpenAI API (Optional - Fallback)"
echo "   Get it from: https://platform.openai.com/"
read -p "   Enter OpenAI API key (or press Enter to skip): " openai_key
if [ -n "$openai_key" ]; then
  sed -i.bak "s/OPENAI_API_KEY=.*/OPENAI_API_KEY=$openai_key/" .env
  echo "   ✅ OpenAI API key configured"
else
  echo "   ⏭️  Skipped (fallback provider disabled)"
fi
echo ""

# Optional: Twitter
echo "6️⃣  Twitter/X (Optional)"
read -p "   Enter Twitter username (or press Enter to skip): " twitter_username
if [ -n "$twitter_username" ]; then
  sed -i.bak "s/TWITTER_USERNAME=.*/TWITTER_USERNAME=$twitter_username/" .env
  echo "   ✅ Twitter username configured"

  read -sp "   Enter Twitter password: " twitter_password
  echo ""
  if [ -n "$twitter_password" ]; then
    sed -i.bak "s/TWITTER_PASSWORD=.*/TWITTER_PASSWORD=$twitter_password/" .env
    echo "   ✅ Twitter password configured"
  fi
else
  echo "   ⏭️  Skipped (Twitter sources disabled)"
fi
echo ""

# Clean up backup files
rm -f .env.bak

echo "✅ Environment configuration complete!"
echo ""
echo "📦 Next Steps:"
echo "=============="
echo ""
echo "1. Customize your sources:"
echo "   Edit src/config/sources.json to add your preferred content sources"
echo ""
echo "2. Test locally:"
echo "   npm run dev"
echo ""
echo "3. Deploy to GitHub:"
echo "   git init"
echo "   git add ."
echo "   git commit -m 'Initial commit: Daily Brief'"
echo "   git remote add origin https://github.com/YOUR_USERNAME/daily-brief.git"
echo "   git push -u origin main"
echo ""
echo "4. Add GitHub Secrets:"
echo "   Go to repository Settings → Secrets and variables → Actions"
echo "   Add all the credentials from your .env file"
echo ""
echo "5. Trigger the workflow:"
echo "   Go to Actions tab → Daily Brief → Run workflow"
echo ""
echo "📚 Documentation:"
echo "   - QUICKSTART.md - Detailed setup guide"
echo "   - README.md - Full documentation"
echo "   - CLAUDE_CODE_GUIDE.md - Advanced features"
echo ""
echo "🎉 Happy briefing!"
