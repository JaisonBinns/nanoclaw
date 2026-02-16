# /heartbeat

Set up periodic "heartbeat" messages to show the assistant is alive, active, and monitoring.

## What This Does

Creates a scheduled task that sends regular heartbeat messages to confirm the assistant is:
- Running and responsive
- Monitoring channels/groups
- Ready to handle requests
- Tracking system health

Useful for peace of mind, system monitoring, or just staying connected.

## When to Use

Use this skill when the user wants:
- Confirmation the assistant is still running
- Periodic "ping" messages
- System health monitoring
- Regular check-ins without doing actual work
- To test scheduling/notification systems

## Usage

```
/heartbeat [interval] [message]
```

**Parameters:**
- `interval` (optional): How often to send heartbeat. Default: daily
  - Examples: "hourly", "daily", "every 6 hours", "twice a day"
- `message` (optional): Custom heartbeat message. Default: "💚 Heartbeat: System running normally"

## Examples

### Example 1: Basic Daily Heartbeat

**Command:** `/heartbeat`

**Result:** Sends "💚 Heartbeat: System running normally" every day at 9 AM

### Example 2: Custom Interval

**Command:** `/heartbeat every 6 hours`

**Result:** Sends heartbeat every 6 hours (4 times per day)

### Example 3: Custom Message

**Command:** `/heartbeat daily "🤖 Nina is alive and well!"`

**Result:** Sends custom message once per day

### Example 4: Frequent Check-in

**Command:** `/heartbeat hourly`

**Result:** Sends heartbeat every hour (useful for monitoring)

## Implementation

When invoked, the skill should:

1. **Parse parameters** to determine interval and message
2. **Create scheduled task** using `mcp__nanoclaw__schedule_task`
3. **Configure appropriate schedule**:
   - Hourly: `0 * * * *` (every hour on the hour)
   - Daily: `0 9 * * *` (9 AM every day)
   - Every 6 hours: `0 */6 * * *` (12 AM, 6 AM, 12 PM, 6 PM)
   - Twice daily: `0 9,21 * * *` (9 AM and 9 PM)
4. **Set heartbeat prompt**: Simple message send with optional system stats
5. **Confirm setup** to user with task ID

### Basic Heartbeat Prompt

```
Send the following heartbeat message: "💚 Heartbeat: System running normally. All monitoring tasks active."
```

### Advanced Heartbeat (with stats)

```
Send a heartbeat message with:
- Status emoji (💚)
- Current time
- Number of scheduled tasks active
- Brief system status
Keep it concise - one line.
```

## Schedule Reference

| Interval | Cron Expression | Description |
|----------|----------------|-------------|
| Hourly | `0 * * * *` | Every hour at :00 |
| Every 2 hours | `0 */2 * * *` | Every 2 hours |
| Every 6 hours | `0 */6 * * *` | 4 times per day |
| Twice daily | `0 9,21 * * *` | 9 AM and 9 PM |
| Daily | `0 9 * * *` | Once per day at 9 AM |
| Weekly | `0 9 * * 1` | Every Monday at 9 AM |

## Task Prompt Examples

### Simple Heartbeat
```
"Send a heartbeat message: '💚 All systems running normally'"
```

### With Timestamp
```
"Send a heartbeat message with the current time. Format: '💚 Heartbeat - [time] - System operational'"
```

### With Task Count
```
"Check the number of active scheduled tasks and send a heartbeat: '💚 Heartbeat - X tasks monitoring - All systems go'"
```

### Health Check
```
"Perform a quick health check and send status:
- Check if scheduled tasks are running
- Verify file system access
- Send: '💚 Heartbeat - [status] - [timestamp]'"
```

## Managing Heartbeats

### Viewing Active Heartbeats
User can check scheduled tasks with:
```
/list-tasks
```

This shows all scheduled tasks including heartbeats.

### Pausing Heartbeat
```
/pause-task [task_id]
```

### Resuming Heartbeat
```
/resume-task [task_id]
```

### Canceling Heartbeat
```
/cancel-task [task_id]
```

## Advanced Options

### Heartbeat with Monitoring

Combine heartbeat with actual monitoring:

```
"Send daily heartbeat AND check for:
- Failed tasks in the last 24 hours
- Disk space status
- Any error logs
Include brief status in heartbeat message"
```

### Smart Heartbeat

Only send message if something is wrong:

```
"Check system health every hour. Only send a message if:
- A scheduled task failed
- Disk space is low
- Errors were logged
Otherwise, stay silent (all is well)"
```

### Multi-Group Heartbeat

Send heartbeat to specific group:

```
target_group_jid: "1234567890@g.us"
```

## Real-World Use Cases

### 1. System Monitoring
**Goal:** Confirm assistant is running 24/7
**Setup:** `/heartbeat daily`
**Result:** Daily confirmation at 9 AM

### 2. Testing Schedules
**Goal:** Verify scheduling system works
**Setup:** `/heartbeat every 2 hours`
**Result:** Get messages every 2 hours, confirm timing is correct

### 3. Peace of Mind
**Goal:** Know the assistant is active
**Setup:** `/heartbeat every 6 hours "🤖 Nina checking in - all good!"`
**Result:** Regular friendly check-ins throughout the day

### 4. Silent Monitoring
**Goal:** Only get notified of problems
**Setup:** Smart heartbeat (advanced) - only sends if issue detected
**Result:** Silence = everything working fine

## Sample Implementation Code

```javascript
// Parse interval
const intervalMap = {
  'hourly': { type: 'cron', value: '0 * * * *' },
  'daily': { type: 'cron', value: '0 9 * * *' },
  'every 2 hours': { type: 'cron', value: '0 */2 * * *' },
  'every 6 hours': { type: 'cron', value: '0 */6 * * *' },
  'twice daily': { type: 'cron', value: '0 9,21 * * *' },
  'weekly': { type: 'cron', value: '0 9 * * 1' }
};

// Default message
const message = customMessage || "💚 Heartbeat: System running normally";

// Create task
schedule_task(
  prompt: `Send this heartbeat message: "${message}"`,
  schedule_type: "cron",
  schedule_value: "0 9 * * *" // or parsed from interval
);
```

## Tips

1. **Don't spam**: Default to daily or twice-daily for regular monitoring
2. **Keep messages short**: One line, clear status
3. **Use emojis**: Visual indicators help (💚 = good, ⚠️ = warning, ❌ = error)
4. **Combine with actual checks**: Make heartbeats useful by including quick system status
5. **Easy to disable**: Make sure user can pause/cancel easily

## Heartbeat Message Templates

**Basic:**
- `💚 Heartbeat - All systems operational`
- `🤖 Nina online - Standing by`
- `✓ System check passed`

**With Time:**
- `💚 Heartbeat - 09:00 AM - All good`
- `🤖 Check-in: Friday 9 AM - Running normally`

**With Stats:**
- `💚 Heartbeat - 5 tasks active - All systems go`
- `🤖 Status: Online | Tasks: 8 | Last run: Successful`

**Friendly:**
- `🤖 Nina here! Everything running smoothly 👍`
- `💚 Still alive and monitoring! All quiet on the western front`
- `✨ Your AI assistant is awake and ready!`

---

**Note:** Heartbeats are simple but valuable for monitoring long-running systems. Keep them lightweight, informative, and easy to manage.
