# /add-background-mode

Enables background task execution for better responsiveness during long-running operations.

## What This Skill Does

Configures NanoClaw to run long-running tasks in the background, allowing the assistant to remain responsive and continue conversations while tasks execute. Without this, the assistant blocks (can't respond) until tasks complete.

## The Problem It Solves

**Current behavior (without background mode):**
```
User: "Run the news digest"
Nina: "Running now..." [BLOCKS for 60 seconds - can't respond to other messages]
User: "Hey, can you also..." [has to wait]
Nina: [Digest appears after 60s]
Nina: [Finally responds to second message]
```

**With background mode:**
```
User: "Run the news digest"
Nina: "Started digest in background (~60s). What else can I help with?"
User: "Can you also check my calendar?"
Nina: [Responds immediately about calendar]
[Digest appears when ready, ~60s later]
```

## When to Use This Skill

Run this skill if you want:
- Faster, more responsive conversations
- Ability to multitask (ask questions while tasks run)
- Professional UX (no "frozen" waiting periods)
- Better experience with digests, web scraping, analysis tasks

## How It Works

When the user runs `/add-background-mode`, you should:

1. **Explain what will change** - Set expectations about background execution
2. **Ask for preferences** using AskUserQuestion:
   - Always run tasks in background? (recommended)
   - Only for tasks estimated >10 seconds?
   - Per-task-type control?
3. **Update the codebase** to use `run_in_background: true` by default
4. **Add task management utilities** - Commands to check running tasks
5. **Test it** - Run a sample background task to demonstrate

## Implementation Approach

### Option 1: Simple (Recommended for most users)

Just add a configuration flag and update task launching logic.

**Files to modify:**
- Create `src/config.ts` (if doesn't exist) with:
```typescript
export const config = {
  backgroundMode: {
    enabled: true,
    threshold: 0, // Run ALL tasks in background (0 = all, or set seconds threshold)
  }
}
```

- Update wherever `Task` tool is used to check this config
- Update `mcp__nanoclaw__schedule_task` to use background mode for scheduled tasks

### Option 2: Advanced (Power users)

Add per-task-type configuration and smart estimation.

**Enhanced config:**
```typescript
export const config = {
  backgroundMode: {
    enabled: true,
    threshold: 10, // Only background tasks estimated >10s
    taskTypes: {
      digest: 'background',
      webScraping: 'background',
      codeGeneration: 'blocking',
      fileEdit: 'blocking',
    },
    estimateTaskDuration: true, // Try to predict task duration
  }
}
```

### Option 3: User-controlled (Most flexible)

Let users specify on a per-invocation basis.

**Example:**
```
User: "Run the digest in the background"
User: "Analyze this file (wait for results)"
```

Parse intent and set `run_in_background` accordingly.

## Files to Modify

### Core Changes

**1. Create `src/config.ts`:**
```typescript
export interface BackgroundModeConfig {
  enabled: boolean;
  threshold?: number; // Seconds - tasks longer than this go to background
  defaultMode?: 'background' | 'blocking';
}

export const config = {
  backgroundMode: {
    enabled: true,
    threshold: 10,
    defaultMode: 'background' as const,
  }
};
```

**2. Update `groups/main/CLAUDE.md` or global instructions:**

Add a section:
```markdown
## Task Execution Mode

Background mode is ENABLED. Long-running tasks (>10s) automatically run in background.

When launching tasks:
- Use `run_in_background: true` for tasks estimated >10 seconds
- This allows you to continue responding to the user
- Notify user when background tasks complete
- Examples: digests, web scraping, analysis, research

Quick tasks (file edits, simple reads) can remain blocking.
```

**3. Update scheduled task creation:**

Anywhere scheduled tasks are created (like in `/add-recurring-digest`), ensure they use background mode since they're typically long-running:

```typescript
mcp__nanoclaw__schedule_task({
  prompt: "...",
  schedule_type: "cron",
  schedule_value: "0 8 * * *",
  context_mode: "isolated",
  // Note: Scheduled tasks run independently, so background mode
  // doesn't apply to them directly - they run on schedule.
  // Background mode applies when YOU invoke tasks during conversation.
})
```

**4. Add task status checking:**

Create a helper for checking background task status:

```markdown
When a background task completes, proactively notify the user:
"✅ Your [task name] finished! Here are the results..."
```

## User Experience Flow

### Installation

**User runs:** `/add-background-mode`

**You respond:**
```
I'll enable background task execution! This will make me more responsive.

**What changes:**
- Long tasks (digests, web scraping, analysis) run in background
- I can continue chatting with you while they run
- You'll be notified when tasks complete

**Example:**
Before: "Running digest..." [60s wait, can't respond]
After: "Started digest in background (~60s). What else?" [can respond immediately]
```

**Then ask:**
```
[Use AskUserQuestion:]
Which mode do you prefer?
1. Always background (recommended) - All tasks run in background
2. Smart threshold - Only tasks estimated >10s run in background
3. Ask each time - I'll ask if each task should be background or blocking
```

**After selection, update config and confirm:**
```
✅ Background mode enabled!

**Settings:**
- Mode: Always background
- You'll get instant responses even during long tasks
- Task completion notifications enabled

Want to test it? I can run a sample task in background to show how it works.
```

### During Use

**When launching background tasks:**
```
User: "Run the news digest"
Nina: "🔄 Started news digest in background (~60 seconds). What else can I help with?"

[30 seconds later]
User: "What's the weather?"
Nina: "Currently 72°F and sunny in..." [responds immediately]

[Digest completes]
Nina: "✅ News digest ready! [Shows digest]"
```

**Checking background tasks:**

User can ask:
- "What tasks are running?" → Show background tasks in progress
- "Is the digest done?" → Check specific task status

## Advanced Features (Optional)

### Task Progress Indicators

Show progress for long-running tasks:
```
🔄 News digest: Fetching sources... (30s elapsed)
🔄 News digest: Analyzing content... (45s elapsed)
✅ News digest complete! (62s total)
```

### Task Cancellation

Allow canceling background tasks:
```
User: "Cancel the digest"
Nina: "❌ Cancelled news digest task"
```

### Task Queue

Show what's running in background:
```
User: "What's running?"
Nina:
📋 Background Tasks:
• News digest - Running (45s) 🔄
• Web scraping - Queued ⏸️
```

### Smart Duration Estimation

Learn typical task durations:
- Track how long different task types take
- Provide accurate estimates: "~30-60 seconds"
- Adjust threshold based on actual performance

## Testing

After enabling background mode:

1. **Run a test task:**
```
User: "Test background mode"
Nina: "🔄 Starting test task in background (~30s)..."
[Immediately] "I'm still responsive! Ask me anything."
User: "What's 2+2?"
Nina: "4! See, I can respond while the task runs."
[Test completes] "✅ Test complete! Background mode working perfectly."
```

2. **Run an actual digest:**
```
User: "Run the tech digest now"
Nina: "🔄 Started tech digest in background (~60s). Want me to do anything else?"
[User continues chatting]
[Digest appears when ready]
```

## Edge Cases & Error Handling

### Task Failures

If background task fails:
```
❌ News digest failed: Could not fetch Reddit (network error)
Would you like me to retry?
```

### Multiple Background Tasks

Handle multiple tasks gracefully:
```
🔄 Running in background:
• Tech digest (30s remaining)
• r/gundeals check (15s remaining)
```

### Resource Limits

If too many background tasks:
```
⚠️ 5 background tasks already running.
Would you like me to queue this one or wait for others to complete?
```

## Rollback

If user wants to disable:
```
User: "Disable background mode"
Nina: "Background mode disabled. Tasks will now block until complete."
[Update config.backgroundMode.enabled = false]
```

## Implementation Notes

### For Skill Creator (You, Nina)

When running this skill:

1. **Don't modify core NanoClaw code unnecessarily** - Keep changes minimal
2. **Add configuration** rather than hardcoding behavior
3. **Update instructions** in CLAUDE.md so you remember to use background mode
4. **Test thoroughly** before confirming to user
5. **Provide clear examples** of before/after behavior

### Key Principle

The goal is to make YOU (Nina) more responsive during conversations. This is a UX improvement, not a performance optimization.

**Priority:**
- User experience > Technical perfection
- Simple implementation > Feature-rich complexity
- Clear communication > Silent behavior changes

## Success Criteria

After implementing this skill:

✅ Long-running tasks don't block conversations
✅ User can ask multiple questions in rapid succession
✅ Clear feedback when tasks start/complete
✅ Easy to check status of running tasks
✅ Option to disable if user prefers old behavior

## Documentation to Update

After adding this skill:

1. **README.md** - Mention background mode support
2. **groups/main/CLAUDE.md** - Add instructions for yourself about when to use background mode
3. **skills/add-recurring-digest/SKILL.md** - Update to mention background execution

## Future Enhancements

Ideas for later versions:

- **Task priorities** - Critical tasks run immediately, others queue
- **Parallel execution** - Multiple background tasks simultaneously
- **Scheduled background maintenance** - Cleanup, cache clearing, etc.
- **Mobile notifications** - Push notifications when tasks complete (if user is away)
- **Task history** - Log of all background tasks with durations

## Notes

- Scheduled tasks (via `mcp__nanoclaw__schedule_task`) already run independently and don't block
- Background mode primarily helps with on-demand tasks during conversations
- The `run_in_background` parameter is built into the Task tool - we're just making it the default
- This doesn't require Docker/container changes - it's a workflow improvement
