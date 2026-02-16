# /add-task-queue

Add task queue and message queuing capabilities to track and manage multiple tasks during a conversation.

## What This Does

Creates a structured task tracking system using the TodoWrite tool to:
- Queue multiple tasks when the user provides several requests
- Track task status (pending → in_progress → completed)
- Provide real-time progress updates
- Ensure nothing gets missed or forgotten

## When to Use

Use this skill when the user:
- Provides multiple tasks in one message (e.g., "Can you: 1) check GitHub, 2) summarize notes, 3) find deals")
- Asks if you can queue/track tasks
- Has complex multi-step requests that need organization
- Wants visibility into what you're working on

## How It Works

1. **Parse user's request** for multiple tasks or complex workflows
2. **Create todo list** using TodoWrite with all identified tasks
3. **Work through tasks sequentially**, updating status as you go:
   - Mark current task as `in_progress`
   - Complete the task
   - Mark as `completed`
   - Move to next task
4. **Send updates** using mcp__nanoclaw__send_message for each completion
5. **Final summary** when all tasks are done

## Implementation Guide

### Step 1: Identify Tasks

When the user sends a request, parse it for:
- Numbered lists (1. Task A, 2. Task B)
- Comma-separated requests
- Multiple questions/requests in one message
- Complex workflows that need breaking down

### Step 2: Create Todo List

```
TodoWrite with todos:
[
  {"content": "Check GitHub notifications", "activeForm": "Checking GitHub notifications", "status": "pending"},
  {"content": "Summarize weekly notes", "activeForm": "Summarizing weekly notes", "status": "pending"},
  {"content": "Find best SSD deals", "activeForm": "Finding best SSD deals", "status": "pending"}
]
```

### Step 3: Execute Tasks

For each task:
1. Update status to `in_progress`
2. Do the work
3. Send progress update: "✅ GitHub notifications checked - 3 new PRs"
4. Update status to `completed`
5. Move to next task

### Step 4: Best Practices

**Task Descriptions:**
- **content**: Imperative form ("Check notifications", "Build feature")
- **activeForm**: Present continuous ("Checking notifications", "Building feature")
- Keep descriptions clear and specific

**Status Management:**
- Only ONE task should be `in_progress` at a time
- Mark tasks `completed` immediately after finishing
- Don't batch completions - update in real-time

**Progress Updates:**
- Use mcp__nanoclaw__send_message to notify after each task
- Include relevant details (what was found, what was done)
- Use emojis for visual clarity (✅ ❌ 🔄)

**Task Completion:**
- Only mark as `completed` when FULLY done
- If blocked or errored, keep as `in_progress` and create new task for blocker
- Never mark incomplete work as completed

## Examples

### Example 1: Multiple Requests

**User:** "Can you check my GitHub notifications, summarize my notes from this week, and find the best deals on SSDs under $100?"

**Response:**
```
I'll handle all three tasks for you! 📋

*Creates todo list with 3 tasks*
*Marks task 1 as in_progress*
*Checks GitHub*
*Sends: "✅ GitHub notifications checked - 3 new PRs to review"*
*Marks task 1 completed, task 2 in_progress*
*Summarizes notes*
*Sends: "✅ Weekly notes summarized - 47 notes covering AI, crypto, and productivity"*
*Marks task 2 completed, task 3 in_progress*
*Searches for SSD deals*
*Sends: "✅ Found 5 great SSD deals under $100 - Samsung 870 EVO on sale for $79"*
*Marks task 3 completed*

All done! Let me know if you need details on any of these.
```

### Example 2: Complex Workflow

**User:** "Set up a monitoring system for Hacker News, Reddit programming, and TechCrunch. I want daily digests in the morning."

**Response:**
```
I'll set up your daily tech digest with all three sources! 📰

*Creates todo list:*
1. Configure Hacker News monitoring
2. Configure Reddit r/programming monitoring
3. Configure TechCrunch RSS monitoring
4. Create combined daily digest schedule

*Works through each, sending updates*

✅ All monitoring set up! You'll get a combined digest every morning at 9 AM with top stories from:
- Hacker News (top 10 posts)
- r/programming (hot posts)
- TechCrunch (latest articles)
```

### Example 3: User Asks About Capability

**User:** "Can you queue messages and tasks that need to be completed?"

**Response:**
```
Yes! I have a few different ways to queue and manage tasks:

1. **TodoWrite Tool** - Track multiple tasks in real-time
2. **Scheduled Tasks** - Queue tasks to run at specific times
3. **Message Queue** - Send updates as I complete each item

Want me to demonstrate? Give me a few tasks and I'll show you how I track them!
```

## When NOT to Use

Don't use TodoWrite for:
- Single, straightforward tasks
- Trivial operations (< 3 simple steps)
- Purely conversational exchanges
- Quick file reads or edits

Only create task lists when organization genuinely helps.

## Tips

1. **Be proactive**: If you see multiple tasks, create the todo list without being asked
2. **Communicate clearly**: Tell the user you're creating a task queue
3. **Update frequently**: Don't make users wait - send progress updates
4. **Remove stale tasks**: If a task becomes irrelevant, remove it from the list
5. **Break down complex tasks**: Turn big requests into manageable subtasks

## Common Patterns

**Research + Implementation:**
```
1. Research available options
2. Recommend approach
3. Implement chosen solution
4. Test and verify
5. Deploy/commit
```

**Multi-source Monitoring:**
```
1. Configure source A
2. Configure source B
3. Configure source C
4. Set up unified schedule
5. Test first run
```

**Debugging Workflow:**
```
1. Reproduce the issue
2. Identify root cause
3. Implement fix
4. Run tests
5. Commit changes
```

---

**Remember:** Task queuing is about organization and communication. Use it to show users what you're doing and ensure their requests are fully handled.
