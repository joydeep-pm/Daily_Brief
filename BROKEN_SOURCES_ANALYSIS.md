# Broken Sources - Detailed Analysis & Solutions

## Overview: 15 Sources Currently Not Working

### Category Breakdown:
- **6 Twitter/X sources** - Unofficial API broken
- **3 RSS feeds** - URL/server issues
- **5 YouTube channels** - Playlist detection failed
- **1 Removed** - Feed no longer exists

---

## 🐦 Twitter/X Sources (6) - BLOCKED BY PLATFORM

### Problem:
The unofficial `agent-twitter-client` library stopped working. Twitter/X changed their authentication system and now blocks most unofficial scrapers.

### Affected Sources:

#### 1. **Shreyas Doshi** (@shreyas)
- **Category**: Product Strategy
- **Status**: Disabled
- **Alternatives**:
  - Newsletter: Check https://www.shrey.as/ for newsletter signup
  - LinkedIn: https://www.linkedin.com/in/shreyasdoshi/
  - Substack: May have one - need to search
- **Action**: Research if he has an RSS-enabled blog/newsletter

#### 2. **Elena Verna** (@elenaverna)
- **Category**: Product Strategy
- **Status**: Disabled
- **Alternatives**:
  - Newsletter: She has a growth newsletter
  - LinkedIn: Active on LinkedIn
  - Podcast appearances: Track podcasts she appears on
- **Action**: Subscribe to her newsletter via Gmail extraction

#### 3. **Claire Vo** (@clairevo)
- **Category**: Product Strategy
- **Status**: Disabled
- **Alternatives**:
  - LinkedIn: https://www.linkedin.com/in/clairevo/
  - Medium: Check if she writes on Medium
  - Guest posts: May write for other publications
- **Action**: Research her blog/newsletter

#### 4. **Harrison Chase** (@hwchase17)
- **Category**: AI Architecture
- **Status**: Disabled
- **✅ ALREADY REPLACED**: LangChain Blog RSS feed added!
- **Action**: None needed - replacement working

#### 5. **Logan Kilpatrick** (@OfficialLoganK)
- **Category**: AI Architecture
- **Status**: Disabled
- **Alternatives**:
  - Google AI Blog: He works at Google - track Google AI updates
  - Personal blog: Check if he has one
  - LinkedIn: https://www.linkedin.com/in/logankilpatrick/
- **Action**: Research Google AI blog RSS or his personal site

#### 6. **Andrej Karpathy** (@karpathy)
- **Category**: AI Architecture
- **Status**: Disabled
- **✅ ALREADY REPLACED**: Andrej Karpathy YouTube channel added!
- **Additional**: Check https://karpathy.github.io/ for blog RSS
- **Action**: May also add his blog if RSS available

### Solutions for Twitter Sources:

**Option A: Official Twitter API** (Not Recommended)
- Cost: $100-200/month for Basic tier
- Too expensive for personal use

**Option B: Find RSS/Newsletter Alternatives** (Recommended)
- Most thought leaders have blogs or newsletters
- Use Gmail extraction for email newsletters
- Add RSS feeds where available

**Option C: Use Nitter Instances** (Unreliable)
- Some Nitter instances still work
- Frequently go down
- Not recommended for production

**Option D: Manual Curation** (Backup)
- Periodically check their profiles manually
- Add interesting content to a "manual additions" source

---

## 📰 RSS Feeds (3) - NEED FIXES

### 7. **Reforge Blog**
- **Original URL**: `https://www.reforge.com/brief/feed`
- **Tried**: `https://www.reforge.com/blog/feed`
- **Current Error**: 500 Internal Server Error
- **Root Cause**: Server-side issue at Reforge
- **Solutions**:
  1. **Try alternative**: `https://www.reforge.com/feed` (root level)
  2. **Email newsletter**: Subscribe to Reforge Brief via email
     - Add Gmail extraction: `from:reforge.com subject:brief`
  3. **Wait and retry**: May be temporary server issue
  4. **Contact Reforge**: Ask them for correct RSS feed URL
- **Recommended Action**: Switch to Gmail extraction for Reforge Brief

### 8. **Julie Zhuo (The Looking Glass)**
- **Original URL**: `https://lg.juliezhuo.com/feed`
- **Tried**: `https://www.juliezhuo.com/feed`
- **Current Error**: 404 Not Found
- **Root Cause**: She may have stopped publishing or moved platforms
- **Solutions**:
  1. **Check Medium**: `https://medium.com/@juliezhuo`
     - Medium RSS: `https://medium.com/feed/@juliezhuo`
  2. **Check Substack**: Search "Julie Zhuo Substack"
  3. **LinkedIn**: https://www.linkedin.com/in/julie-zhuo/
  4. **Her website**: https://www.juliezhuo.com/ (check for blog section)
- **Recommended Action**: Try Medium RSS feed

### 9. **First Round Review**
- **Original URL**: `https://review.firstround.com/feed`
- **Tried**: `https://review.firstround.com/rss`
- **Current Error**: 404 Not Found
- **Root Cause**: They may have changed their RSS structure
- **Solutions**:
  1. **Try**: `https://review.firstround.com/latest/feed`
  2. **Try**: `https://firstround.com/review/feed`
  3. **Check homepage**: Visit https://review.firstround.com/ and look for RSS icon
  4. **Email newsletter**: Subscribe and use Gmail extraction
  5. **View source**: Check homepage HTML for `<link rel="alternate" type="application/rss+xml">`
- **Recommended Action**: Let me test these URLs for you

---

## 🎥 YouTube Channels (5) - TECHNICAL ISSUE

### Problem:
These channels can't be accessed because the YouTube handler can't find their "uploads" playlist. Some channels have different playlist structures or privacy settings.

### Affected Channels:

#### 10. **Matthew Berman**
- **Channel ID**: `UCqkPnqW0bqYYkwezQMiYQkQ`
- **Error**: "Could not find uploads playlist for channel"
- **Solution**:
  1. Verify channel ID is correct
  2. Try fetching via channel username instead
  3. May need to use different YouTube API approach

#### 11. **AI Explained**
- **Channel ID**: `UCNJ1Ymd5yWu50z-q_c_A4nA`
- **Error**: "Could not find uploads playlist for channel"
- **Solution**: Same as above

#### 12. **AI Jason**
- **Channel ID**: `UCkGMJp79rC8yD4h7X1h1zLg`
- **Error**: "Could not find uploads playlist for channel"
- **Solution**: Same as above

#### 13. **Matt Wolfe**
- **Channel ID**: `UCpYLbrzJm161Xm2q9D32XAQ`
- **Error**: "Could not find uploads playlist for channel"
- **Solution**: Same as above

#### 14. **Theo - t3.gg**
- **Channel ID**: `UC-TcgHDEvW_0_1XkH1cE5cw`
- **Error**: "Could not find uploads playlist for channel"
- **Solution**: Same as above

### Technical Fix for YouTube:

The issue is in `src/ingestion/sources/youtube.ts` - it tries to get the uploads playlist ID like this:

```typescript
const uploadsPlaylistId = response.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
```

But some channels don't expose this. We can fix it by:

**Option A**: Use different API endpoint
**Option B**: Search for videos directly by channel
**Option C**: Use RSS feeds instead (YouTube provides RSS!)

**YouTube RSS Format**:
```
https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID
```

This is simpler and doesn't require API quota!

---

## 🗑️ Removed Sources (1)

### 15. **The Cognitive Revolution** (Podcast)
- **Original URL**: `https://rss.art19.com/the-cognitive-revolution`
- **Status**: Removed (404)
- **Root Cause**: Podcast may have moved or shut down
- **Solution**:
  1. Search for the podcast on Apple Podcasts or Spotify
  2. Get RSS feed from podcast platform
  3. Try: Google "Cognitive Revolution podcast RSS"

---

## 📊 Recovery Plan - Prioritized Actions

### 🟢 Quick Wins (Can Fix Today - 30 minutes)

#### 1. **Switch YouTube to RSS** (5 failing channels)
- Test YouTube RSS feeds (don't need API!)
- Format: `https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID`
- **Action**: Should I implement this fix?

#### 2. **Test Alternative RSS URLs** (3 feeds)
- First Round Review: Try alternative URLs
- Julie Zhuo: Try Medium feed
- Reforge: Switch to Gmail extraction
- **Action**: Should I test these now?

#### 3. **Add Newsletter Alternatives** (Twitter replacements)
- Elena Verna: Research her newsletter
- Shreyas Doshi: Research his newsletter
- Claire Vo: Research her content
- **Action**: Want me to research these?

### 🟡 Medium Effort (This Week - 1-2 hours)

#### 4. **Research & Add New Sources**
- Find RSS alternatives for each Twitter account
- Subscribe to newsletters and add Gmail extraction
- Verify all new sources work

#### 5. **Code Fix for YouTube**
- Update YouTube handler to use RSS fallback
- Add better error handling
- Test with all 5 failing channels

### 🔴 Low Priority (Maybe Later)

#### 6. **Official Twitter API**
- Only if you really need Twitter content
- $100-200/month cost
- Not recommended for personal use

---

## 🎯 Recommended Next Steps

**Right Now** (I can do this for you):
1. ✅ Implement YouTube RSS fallback (fixes 5 channels instantly)
2. ✅ Test alternative RSS URLs (fixes 1-2 feeds)
3. ✅ Research newsletter alternatives (finds replacements for Twitter)

**This Week** (You do):
1. Subscribe to any new newsletters we find
2. Review and approve new sources
3. Monitor first automated runs

**Want me to:**
1. ✅ Fix YouTube RSS now? (adds 5 working channels)
2. ✅ Test alternative RSS URLs? (may fix 1-3 feeds)
3. ✅ Research Twitter alternatives? (find newsletters/blogs)

Let me know which you want to tackle first!
