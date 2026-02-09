# /add-recurring-digest

Creates recurring digest tasks that monitor sources and send summaries.

## What This Skill Does

Helps users set up automated monitoring and digest generation for various sources:
- **Reddit** - Monitor subreddits for hot posts (like r/gundeals, r/programming, etc.)
- **Hacker News** - Daily tech news summaries
- **RSS Feeds** - Any RSS/Atom feed
- **Websites** - Monitor specific websites for changes or new content
- **Custom sources** - Any web-based content

## How It Works

When the user runs `/add-recurring-digest`, you should:

1. **Ask what they want to monitor** using AskUserQuestion:
   - Reddit subreddit
   - Hacker News
   - RSS feed
   - Website monitoring
   - Custom (they'll describe)

2. **Gather configuration details**:
   - Source specifics (subreddit name, RSS URL, website URL, etc.)
   - Schedule (how often: hourly, daily, twice daily, weekly, etc.)
   - Filtering criteria (keywords, upvote threshold, etc.)
   - Output format preferences

3. **Create the digest task**:
   - Write a clear, detailed prompt for the scheduled task
   - Use appropriate schedule type (cron for daily/weekly, interval for hourly)
   - Include smart filtering logic in the prompt
   - Set up to send messages only when relevant content is found

4. **Confirm setup**:
   - Show the user what was configured
   - Provide the task ID
   - Explain how to modify or cancel it later

## Example Implementations

### Reddit Digest

**User says:** "Monitor r/machinelearning for interesting papers"

**You create a task with:**
- **Prompt:** "Check r/machinelearning for posts from the last 24 hours. Look for posts tagged [Research], [Discussion], or [Project] with 50+ upvotes. Summarize the top 3-5 most interesting posts with titles, links, and why they're noteworthy. Only send if there's genuinely interesting content."
- **Schedule:** `cron: 0 9 * * *` (9 AM daily)
- **Context mode:** `isolated`

### Hacker News Digest

**User says:** "Daily tech news from Hacker News"

**You create a task with:**
- **Prompt:** "Fetch the top 10 stories from Hacker News. Filter for tech/engineering topics (skip meta HN discussions, job posts). Summarize in 3-5 bullet points with titles and links. Focus on: new product launches, technical deep-dives, interesting projects, major tech news."
- **Schedule:** `cron: 0 8 * * *` (8 AM daily)
- **Context mode:** `isolated`

### RSS Feed Digest

**User says:** "Monitor TechCrunch RSS for AI news"

**You create a task with:**
- **Prompt:** "Fetch the TechCrunch RSS feed (https://techcrunch.com/feed/). Filter articles containing keywords: AI, artificial intelligence, machine learning, LLM, ChatGPT, Claude. Summarize new articles from the last 24 hours in bullet points with links. Skip if no relevant articles."
- **Schedule:** `cron: 0 18 * * *` (6 PM daily)
- **Context mode:** `isolated`

### Website Monitoring

**User says:** "Alert me when Apple releases new products"

**You create a task with:**
- **Prompt:** "Check https://www.apple.com/newsroom/ for new product announcements. Look for posts from the last week containing: iPhone, iPad, Mac, Apple Watch, AirPods, or Vision Pro. If new products were announced, send a summary with product name, key features, and link."
- **Schedule:** `cron: 0 10 * * 1` (10 AM every Monday)
- **Context mode:** `isolated`

### Custom Digest

**User says:** "Compile weekly AI developments from multiple sources"

**You create a task with:**
- **Prompt:** "Create a weekly AI developments digest by checking: 1) Hacker News for AI-related posts with 100+ upvotes, 2) r/MachineLearning top posts, 3) TechCrunch AI articles. Organize into sections: Research Papers, New Products, Industry News, Interesting Projects. Send a well-formatted summary with links."
- **Schedule:** `cron: 0 17 * * 5` (5 PM every Friday)
- **Context mode:** `isolated`

## Best Practices

### Smart Filtering
- Include upvote/engagement thresholds to avoid noise
- Use keywords to stay relevant
- Set "only send if interesting" to avoid spam

### Scheduling Wisdom
- **Hourly:** `interval: 3600000` - For time-sensitive monitoring (deals, breaking news)
- **Twice daily:** `cron: 0 9,21 * * *` - Morning and evening checks
- **Daily:** `cron: 0 9 * * *` - Most common (9 AM)
- **Weekly:** `cron: 0 9 * * 1` - Monday morning recaps
- **Custom:** Let user specify exact times

### Prompt Quality
- Be specific about timeframe (last hour, last 24 hours, last week)
- Include quality filters (upvotes, comments, source reputation)
- Specify output format (bullet points, summaries, links)
- Add "skip if nothing interesting" to avoid empty notifications

### Context Mode
- Use `isolated` for digests (they don't need conversation history)
- Only use `group` if the digest should reference past conversations

## Tools Available in Digest Tasks

Tasks can use:
- **WebFetch** - Fetch and analyze web pages
- **WebSearch** - Search the web for current info
- **Bash** - Run commands, scripts
- **Read/Write** - File operations
- **mcp__nanoclaw__send_message** - Send digest to user

### Reddit Monitoring Tips
- Use WebFetch on `https://www.reddit.com/r/SUBREDDIT/top.json?t=day&limit=25`
- Parse JSON for titles, scores, URLs, num_comments
- Filter by score threshold and time
- Check for specific flairs if relevant

### Hacker News Tips
- Use WebFetch on `https://news.ycombinator.com/` or the API
- Look at the "topstories" endpoint
- Filter by score and topic relevance

### RSS Feed Tips
- Use WebFetch on the RSS URL
- Parse XML/Atom format
- Track last-seen items to avoid duplicates (store in a file)

## User Experience

After creating the digest, tell the user:
1. ✅ What was set up (source, schedule, filters)
2. 📅 When they'll receive the first digest
3. 🔧 How to modify it: "You can adjust the schedule or cancel anytime by saying 'list my tasks' and 'cancel task-xxx'"
4. 💡 Suggestions for refinement: "Let me know if you want me to adjust the filtering or add more sources!"

## Example Conversation Flow

**User:** "Set up a digest for r/gundeals"

**You:**
```
I'll set up a r/gundeals digest for you! Let me ask a few questions to customize it:

[Use AskUserQuestion with:]
1. How often? (Hourly / Twice daily / Daily / Custom)
2. What deals interest you? (Firearms / Ammo / Accessories / All)
3. Minimum upvotes threshold? (10 / 25 / 50 / 100)
```

**After answers:**
```
[Create the scheduled task with appropriate prompt and schedule]

✅ Set up r/gundeals digest!

**What I'm monitoring:**
- Subreddit: r/gundeals
- Schedule: Twice daily (9 AM & 9 PM)
- Focus: Firearms and Ammo deals
- Threshold: 25+ upvotes

**First digest:** Tomorrow at 9 AM

I'll only ping you when genuinely good deals show up. You can adjust anytime by asking me to "modify my gundeals digest" or cancel with "cancel my digests".
```

## Implementation Notes

- Use the `mcp__nanoclaw__schedule_task` tool
- Store task IDs if you want to track them (optional)
- Consider creating a `digests/` folder to store tracking data (last-seen items, etc.)
- For Reddit: respect rate limits, parse JSON responses
- For RSS: consider storing last-checked timestamp to avoid duplicates

## Advanced Features (Optional Enhancements)

- **Duplicate detection:** Track seen items to avoid repeat notifications
- **Trend analysis:** "This topic is trending up" insights
- **Summarization:** Use Claude to intelligently summarize long articles
- **Smart grouping:** Group related items together
- **Sentiment analysis:** Flag unusually positive/negative discussions
- **Comparison:** "Price dropped" or "better than yesterday" for deals

## Error Handling

Prompts should include:
- Graceful failures: "If the source is unavailable, try again in 1 hour"
- Clear error messages: "Couldn't fetch r/gundeals - Reddit might be down"
- Fallback behavior: "If no results, don't send a message"

## Testing

After creating a digest, offer to:
1. Run it once immediately to test: "Want me to run it now to test?"
2. Show what the output looks like
3. Let user refine before activating

## Notes

- This skill doesn't modify core NanoClaw code - it just creates scheduled tasks
- Each digest is independent and can be modified/cancelled separately
- Users can have unlimited digests running simultaneously
- Consider creating a simple management command later: `/list-digests`, `/pause-digest`, etc.
