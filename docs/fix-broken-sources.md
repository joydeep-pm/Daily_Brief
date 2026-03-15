# Fixing Broken Sources

## Summary of Issues

- **6 Twitter/X sources**: Unofficial scraper broken (Twitter API changed)
- **6 RSS feeds**: 404/403 errors or SSL issues
- **7 YouTube channels**: Need YouTube API key (easy fix!)
- **1 Gmail source**: Should work now with updated OAuth

---

## 1. Twitter/X Sources (BROKEN - Unofficial API Changed)

**Affected Sources**:
- Shreyas Doshi (@shreyas)
- Elena Verna (@elenaverna)
- Claire Vo (@clairevo)
- Harrison Chase (@hwchase17)
- Logan Kilpatrick (@OfficialLoganK)
- Andrej Karpathy (@karpathy)

**Solutions**:

### Option A: Disable Twitter Sources (Recommended for now)
Set `"enabled": false` for all X sources until a solution is found.

### Option B: Find RSS/Newsletter Alternatives
- **Harrison Chase**: Use LangChain Blog RSS: `https://blog.langchain.dev/feed/`
- **Andrej Karpathy**: Add his YouTube channel (he has one!)
- **Others**: Most have newsletters or blogs - need to research

### Option C: Official Twitter API (Expensive)
- Cost: $100-200/month
- Not recommended for personal use

---

## 2. Broken RSS Feeds

### ❌ Reforge Brief (404)
**Current URL**: `https://www.reforge.com/brief/feed`
**Issue**: 302 redirect, feed may have moved
**Fix**: Try `https://www.reforge.com/blog/feed` instead
**Alternative**: Subscribe to Reforge newsletter via email (use Gmail extraction)

### ❌ The Looking Glass - Julie Zhuo (SSL Error)
**Current URL**: `https://lg.juliezhuo.com/feed`
**Issue**: SSL certificate mismatch
**Fix**: Try `https://www.juliezhuo.com/feed` or `https://medium.com/feed/@juliezhuo`
**Status**: Needs testing

### ❌ First Round Review (404)
**Current URL**: `https://review.firstround.com/feed`
**Issue**: 301 redirect, feed moved
**Fix**: Try `https://review.firstround.com/rss` or check their site for new RSS URL
**Status**: Needs testing

### ❌ Sachin Rekhi (404)
**Current URL**: `https://www.sachinrekhi.com/rss`
**Issue**: Feed doesn't exist
**Fix**: Try `https://www.sachinrekhi.com/feed` or check if he moved to Substack
**Alternative**: He may have stopped blogging - consider removing

### ❌ The Cognitive Revolution (404)
**Current URL**: `https://rss.art19.com/the-cognitive-revolution`
**Issue**: Feed not found
**Fix**: This is a podcast - try Apple Podcasts RSS or Spotify RSS
**Alternative**: Search for "Cognitive Revolution podcast RSS feed"

### ❌ The Rundown AI (403 Forbidden)
**Current URL**: `https://www.therundown.ai/feed`
**Issue**: Feed blocked or doesn't exist
**Fix**: No public RSS feed available
**Alternative**:
  - Use Gmail extraction: `from:newsletter@therundown.ai`
  - Subscribe to their newsletter and extract via Gmail

---

## 3. YouTube Sources (EASY FIX!)

**All 7 YouTube channels need YouTube API Key**:
- Matthew Berman
- Fireship
- AI Explained
- AI Jason
- Matt Wolfe
- Theo - t3.gg
- Y Combinator

**Solution**: Get YouTube API Key (FREE, 5 minutes)

### Steps:
1. Go to: https://console.cloud.google.com/apis/credentials
2. Select your existing project
3. Click "+ CREATE CREDENTIALS" → "API key"
4. Copy the API key
5. Add to `.env`:
   ```
   YOUTUBE_API_KEY=your_api_key_here
   ```

**Quota**: 10,000 requests/day (free tier) = ~500 channels monitored daily

---

## 4. Gmail Source (SHOULD WORK NOW)

**The Code newsletter**: Should work with updated OAuth token

Test by running: `npm run dev`

---

## Recommended Actions (Priority Order)

### 🚀 Quick Wins (Do This First)

1. **Get YouTube API Key** (5 min)
   - Enables 7 YouTube sources immediately
   - Free tier is generous

2. **Test alternative RSS URLs** (10 min)
   - Julie Zhuo: `https://www.juliezhuo.com/feed`
   - First Round: Check their website for RSS link
   - Reforge: Try `/blog/feed` instead of `/brief/feed`

3. **Disable confirmed broken sources** (2 min)
   - All 6 Twitter sources (until fixed)
   - Sachin Rekhi (404, may not blog anymore)
   - The Rundown AI (use Gmail instead)

### 📧 Email Extraction Alternative (Do This Second)

For sources without RSS, use Gmail extraction:
1. Subscribe to newsletters
2. Add Gmail extraction sources:
   ```json
   {
     "name": "The Rundown AI",
     "category": "AI Architecture",
     "type": "gmail_extraction",
     "query": "from:newsletter@therundown.ai",
     "enabled": true
   }
   ```

### 🔍 Research Alternatives (Do This Later)

Find RSS feeds or newsletters for:
- Shreyas Doshi
- Elena Verna
- Claire Vo
- The Cognitive Revolution podcast

---

## Expected Results After Fixes

**Before**: 21 working sources (51% success rate)
**After**: 28-32 working sources (70-80% success rate)

- ✅ 21 working RSS feeds (current)
- ✅ +7 YouTube channels (with API key)
- ✅ +1-2 Gmail extractions (The Rundown, etc.)
- ✅ +2-3 fixed RSS feeds (alternative URLs)
- ❌ -6 Twitter sources (disabled until fixed)

**Net gain**: +7-11 sources working!

---

## Next Steps

1. I can update `sources.json` with these fixes
2. Get YouTube API key (you already have Google OAuth)
3. Test and verify working sources

Want me to implement these fixes now?
