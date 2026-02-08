# NanoClaw Setup Guide for Complete Beginners

This guide will help you set up your own AI assistant (like Nina or Andy) that you can message from WhatsApp or Telegram. **No coding experience required!** Just follow each step carefully.

---

## What You're Building

You're creating your own personal AI assistant that:
- Lives on your computer and runs 24/7
- You can message from WhatsApp or Telegram
- Can schedule reminders, search the web, manage notes, and much more
- Keeps all your data private on your computer

Think of it like having your own personal ChatGPT that you control completely and can message like a friend.

---

## Before You Start

### What You Need

1. **A Mac or Linux computer** (sorry, Windows needs extra setup not covered here)
2. **About 30-45 minutes** of uninterrupted time
3. **A phone** with WhatsApp or Telegram installed
4. **Internet connection**

### What We'll Install

Don't worry if these terms sound scary - I'll walk you through everything:

1. **Git & GitHub** - Tools for downloading code from the internet
2. **Homebrew** - A tool that helps install other tools (Mac only)
3. **Node.js** - Software that lets your computer run the assistant
4. **Claude Code** - The AI brain that powers your assistant
5. **Apple Container or Docker** - A secure sandbox where your assistant runs
6. **NanoClaw** - The actual assistant software

---

## Step-by-Step Setup

### Phase 0: Set Up GitHub (First Time Only)

#### What is GitHub?

GitHub is like Google Drive for code. Developers store their software there so others can download and use it. NanoClaw lives on GitHub, so we need to get it from there.

#### Step 0A: Create a GitHub Account (Skip if you already have one)

1. **Go to https://github.com** in your web browser
2. **Click "Sign up"** in the top right
3. **Enter your email** and create a password
4. **Choose a username** (can be anything you like)
5. **Complete the verification** (they might ask you to solve a puzzle)
6. **Verify your email** - check your inbox and click the verification link

**You're done!** You don't need to do anything else on GitHub's website. Close the browser.

---

#### Step 0B: Install Git on Your Computer

**What is Git?** It's a tool that downloads code from GitHub to your computer.

**On Mac:**

Good news! Git is usually pre-installed on Mac. Let's check:

1. Open Terminal (press `Command + Space`, type "Terminal", press Enter)
2. Type this and press Enter:
```bash
git --version
```

If you see something like `git version 2.39.0`, you're good! Skip to Phase 1.

If you get "command not found," install it:
```bash
xcode-select --install
```

A window will pop up asking to install developer tools. Click "Install" and wait 5-10 minutes.

**On Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install git
```

**On Linux (Fedora/RHEL):**
```bash
sudo dnf install git
```

**Verify it worked:**
```bash
git --version
```

You should see a version number.

---

#### Step 0C: Configure Git (One-time setup)

Tell Git who you are (it wants to know for tracking purposes):

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

**Replace:**
- `Your Name` with your actual name (can be anything)
- `your.email@example.com` with your email

**Example:**
```bash
git config --global user.name "John Smith"
git config --global user.email "john.smith@gmail.com"
```

**That's it for GitHub setup!** Now let's install the other tools.

---

### Phase 1: Install the Basic Tools

#### Step 1: Open Terminal

**On Mac:**
1. Press `Command + Space` to open Spotlight
2. Type "Terminal" and press Enter
3. A window with black or white background will open - this is where we'll type commands

**On Linux:**
- Press `Ctrl + Alt + T` or find Terminal in your applications

**Important:** Terminal is where we type text commands. It looks old-school but it's powerful! When I say "run this command," I mean copy the text, paste it into Terminal, and press Enter.

---

#### Step 2: Install Homebrew (Mac Only - Linux users skip to Step 3)

**What this does:** Homebrew is like an app store for programmer tools. We need it to install other things.

**Copy and paste this into Terminal:**

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**What will happen:**
- It will ask for your Mac password (the one you use to log in)
- When you type your password, **you won't see any characters** - that's normal for security
- Just type it and press Enter
- Installation takes 3-5 minutes

**After it finishes**, it might show you some commands to run. If you see text like:
```
==> Next steps:
Run these commands in your terminal...
```

Copy those commands one at a time and run them. They usually look like:
```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

---

#### Step 3: Install Node.js

**What this does:** Node.js lets your computer run JavaScript programs (which NanoClaw is written in).

**On Mac with Homebrew:**
```bash
brew install node@20
```

**On Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**On Linux (Fedora/RHEL):**
```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs
```

**To verify it worked:**
```bash
node --version
```

You should see something like `v20.11.0` or similar.

---

#### Step 4: Install Claude Code

**What this does:** Claude Code is the AI assistant that helps set everything up and powers your assistant.

1. Go to https://claude.ai/download in your web browser
2. Download Claude Code for your operating system
3. Open the downloaded file and install it like any other app
4. Open Claude Code once installed

**For command-line access** (we need this), run in Terminal:

**On Mac:**
```bash
/Applications/Claude.app/Contents/Resources/app/bin/claude --install-cli
```

**On Linux:**
```bash
# The install usually adds this automatically, but verify with:
claude --version
```

If you get "command not found," restart Terminal and try again.

---

#### Step 5: Install Container Runtime

**What this does:** This creates a secure sandbox where your AI assistant runs, so it can't accidentally mess with your computer.

**Choose ONE option:**

##### Option A: Apple Container (Mac Only - Recommended)

1. Go to https://github.com/apple/container/releases
2. Look for the latest release (top of the page)
3. Download the `.pkg` file (probably called something like `container-1.0.0.pkg`)
4. Double-click the downloaded file and follow the installation wizard
5. After installation, run in Terminal:

```bash
container system start
```

You should see: `Container runtime started`

##### Option B: Docker (Mac or Linux)

**On Mac:**
1. Go to https://www.docker.com/products/docker-desktop
2. Download Docker Desktop for Mac
3. Install it like a normal app
4. Open Docker Desktop - you'll see a whale icon in your menu bar
5. Wait until it says "Docker is running"

**On Linux:**
```bash
sudo apt-get update
sudo apt-get install docker.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

Then **log out and log back in** for permissions to take effect.

**Verify Docker works:**
```bash
docker --version
```

---

### Phase 2: Set Up Claude Authentication

Your assistant needs permission to use Claude AI. You have two options:

#### Option A: Claude Subscription (If you have Claude Pro/Max)

This is free to use with your existing subscription.

1. **In Terminal, run:**
```bash
claude setup-token
```

2. **Follow the prompts** - it will open a browser and ask you to log in to Claude
3. **Copy the token** it gives you (a long string of letters and numbers)
4. **Keep this terminal window open** - we'll use that token in the next step

#### Option B: Anthropic API Key (Pay-as-you-go)

If you don't have Claude Pro/Max, you can use Anthropic's API (costs about $0.01-0.05 per conversation depending on length).

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Go to "API Keys" in the menu
4. Click "Create Key"
5. Copy the key (starts with `sk-ant-`)
6. **Keep this somewhere safe** - you can't see it again

---

### Phase 3: Download and Set Up NanoClaw

#### Step 6: Download NanoClaw from GitHub

Now we'll use Git to download the NanoClaw code from GitHub to your computer!

**What is "cloning a repo"?**
- A "repository" (or "repo") is like a folder of code stored on GitHub
- "Cloning" means making a copy of that folder on your computer
- Think of it like downloading a folder from Google Drive

**Let's do it!** In Terminal, run these commands one at a time:

**First, go to your home folder:**
```bash
cd ~
```
This takes you to your home directory (like /Users/YourName on Mac).

**Now, clone (download) NanoClaw:**
```bash
git clone https://github.com/gavrielc/nanoclaw.git
```

**What you'll see:**
```
Cloning into 'nanoclaw'...
remote: Counting objects: 100% (234/234), done.
remote: Compressing objects: 100% (156/156), done.
Receiving objects: 100% (234/234), 1.2 MiB | 3.5 MiB/s, done.
```

This means Git is downloading all the NanoClaw files from GitHub!

**Finally, enter the nanoclaw folder:**
```bash
cd nanoclaw
```

**Check that it worked:**
```bash
pwd
```

You should see something like `/Users/YourName/nanoclaw` (Mac) or `/home/yourname/nanoclaw` (Linux).

**Success!** You now have a copy of NanoClaw on your computer. All the files are in this folder.

---

#### Step 7: Install Dependencies

**Run this:**
```bash
npm install
```

**What this does:** Downloads all the extra code libraries that NanoClaw needs to work.

This will take 1-3 minutes. You'll see lots of text scrolling by - that's normal!

---

#### Step 8: Create Your Environment File

This file stores your secret keys securely.

**Run this command:**
```bash
touch .env
```

Now **open the file** in a text editor:

```bash
open .env
```

This opens the file in your default text editor (TextEdit on Mac, gedit on Linux, etc.)

**Add your authentication** (choose ONE based on what you got in Phase 2):

**If you used Claude subscription (Option A):**
```
CLAUDE_CODE_OAUTH_TOKEN=your-token-here
ASSISTANT_NAME=YourAssistantName
```

**If you used API key (Option B):**
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
ASSISTANT_NAME=YourAssistantName
```

**Replace:**
- `your-token-here` or `sk-ant-your-key-here` with your actual token/key
- `YourAssistantName` with what you want to call your assistant (Nina, Andy, whatever you like!)

**Save the file and close it.**

---

#### Step 9: Build the Container Image

This creates the secure sandbox environment where your assistant will live.

**Run:**
```bash
./container/build.sh
```

**What this does:** Builds a mini-computer inside your computer where the assistant runs safely.

**This takes 5-10 minutes** on first run. Great time for a coffee break! ☕

You'll see lots of text. At the end, you should see:
```
Successfully built nanoclaw-agent:latest
```

---

### Phase 4: Choose Your Messaging Platform

Now choose how you want to talk to your assistant:

- **Option A: Telegram** (Easier, no phone scanning)
- **Option B: WhatsApp** (Default, more common)

---

## OPTION A: Telegram Setup

### Step 10-T: Create a Telegram Bot

1. **On your phone or computer, open Telegram**
2. **Search for "@BotFather"** (it's an official Telegram bot)
3. **Send the message:** `/newbot`
4. **BotFather will ask for a name.** Type something like: `My Personal Assistant`
5. **BotFather will ask for a username.** Must end in `bot`, like: `my_nina_assistant_bot`
   - Try different names if your first choice is taken
6. **BotFather will give you a token** - it looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
7. **Copy this token!** We need it next.

**Important:** Tell BotFather to let your bot see group messages:
1. Send `/mybots` to BotFather
2. Click your bot name
3. Click **Bot Settings**
4. Click **Group Privacy**
5. Click **Turn Off**

---

### Step 11-T: Install Telegram Dependencies

**In Terminal (inside the nanoclaw folder):**
```bash
npm install telegraf dotenv
```

---

### Step 12-T: Add Your Bot Token

**Open the `.env` file again:**
```bash
open .env
```

**Add this line:**
```
TELEGRAM_BOT_TOKEN=your-bot-token-here
```

Replace `your-bot-token-here` with the token BotFather gave you.

Your `.env` file should now look like:
```
CLAUDE_CODE_OAUTH_TOKEN=your-token-here
ASSISTANT_NAME=Nina
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
```

**Save and close.**

---

### Step 13-T: Set Up Telegram Integration

We'll use Claude Code to help set this up automatically!

**In Terminal, run:**
```bash
claude
```

This opens an interactive session with Claude Code.

**Type:**
```
/add-telegram
```

Follow Claude's instructions. It will:
- Ask if you want to replace WhatsApp or add Telegram alongside it
- Set up all the code needed
- Configure everything automatically

When it's done, type `exit` or press `Ctrl+D` to leave Claude Code.

---

### Step 14-T: Build and Start

**Run:**
```bash
npm run build
npm run dev
```

You should see:
```
Telegram bot authenticated { botUsername: 'your_bot_name' }
Telegram bot started (long-polling)
NanoClaw running (trigger: @YourAssistantName)
```

**Success!** 🎉

---

### Step 15-T: Register Your Chat

1. **Open Telegram on your phone**
2. **Find your bot** (search for the username you created)
3. **Send any message** like "hello" to your bot
4. **Back in Terminal, press `Ctrl+C`** to stop the app

Now we need to register your chat as the "main" channel (your admin control center).

**Find your chat ID:**
```bash
sqlite3 store/messages.db "SELECT jid, name FROM chats ORDER BY last_message_time DESC LIMIT 5"
```

You'll see a number (your chat ID, probably like `123456789`).

**Register it:**
```bash
sqlite3 store/messages.db "INSERT OR REPLACE INTO registered_groups (jid, name, folder, trigger_pattern, added_at, requires_trigger) VALUES ('YOUR_CHAT_ID', 'main', 'main', '@YourAssistantName', datetime('now'), 0)"
```

**Replace:**
- `YOUR_CHAT_ID` with the number you saw
- `@YourAssistantName` with your assistant's name (like `@Nina`)

**Create the folder:**
```bash
mkdir -p groups/main/logs
```

---

### Step 16-T: Start It Up!

**Run:**
```bash
npm run dev
```

**Go to Telegram and send a message to your bot:**
```
Hey! Can you hear me?
```

Your assistant should respond! 🎉

**To stop the app:** Press `Ctrl+C` in Terminal

**Skip to Phase 5** (Making it run automatically)

---

## OPTION B: WhatsApp Setup

### Step 10-W: Authenticate WhatsApp

**Run:**
```bash
npm run auth
```

**What will happen:**
1. A QR code will appear in your Terminal (made of black and white squares)
2. **On your phone:**
   - Open WhatsApp
   - Tap **Settings** (gear icon)
   - Tap **Linked Devices**
   - Tap **Link a Device**
   - Scan the QR code in your Terminal

You should see: `Successfully authenticated`

---

### Step 11-W: Build and Start Briefly

**Run:**
```bash
npm run build
npm run dev
```

**Let it run for about 30 seconds** (it's syncing your WhatsApp chats).

Then **press `Ctrl+C`** to stop it.

---

### Step 12-W: Set Up Your Main Channel

Your "main channel" is your private line to the assistant where you don't need to use the trigger word.

**Option 1: Use "Message Yourself" feature in WhatsApp**

This is like a private chat with yourself.

**Find your phone number** in international format:
- USA example: `14155551234` (1 + area code + number, no spaces or + sign)
- UK example: `447700900123` (44 + number)

**Register it:**
```bash
sqlite3 store/messages.db "INSERT OR REPLACE INTO registered_groups (jid, name, folder, trigger_pattern, added_at, requires_trigger) VALUES ('YOUR_NUMBER@s.whatsapp.net', 'main', 'main', '@YourAssistantName', datetime('now'), 0)"
```

**Replace:**
- `YOUR_NUMBER` with your phone number (e.g., `14155551234`)
- `@YourAssistantName` with your assistant's name

**Option 2: Use a WhatsApp Group**

**Find your groups:**
```bash
sqlite3 store/messages.db "SELECT jid, name FROM chats WHERE jid LIKE '%@g.us' ORDER BY last_message_time DESC LIMIT 10"
```

You'll see a list of your groups with their JIDs (long IDs like `120363336345536173@g.us`).

**Register the one you want as main:**
```bash
sqlite3 store/messages.db "INSERT OR REPLACE INTO registered_groups (jid, name, folder, trigger_pattern, added_at, requires_trigger) VALUES ('THE_JID_HERE', 'main', 'main', '@YourAssistantName', datetime('now'), 0)"
```

**Replace:**
- `THE_JID_HERE` with the JID from the list
- `@YourAssistantName` with your assistant's name

**Create the folder:**
```bash
mkdir -p groups/main/logs
```

---

### Step 13-W: Test It!

**Start the app:**
```bash
npm run dev
```

**On WhatsApp:**
- If you used "Message Yourself": Just send "hello"
- If you used a group: Send "@YourAssistantName hello" (use your actual assistant name)

Your assistant should respond! 🎉

**To stop:** Press `Ctrl+C` in Terminal

---

## Phase 5: Make It Run Automatically (Optional but Recommended)

Right now, your assistant only works when you have Terminal open. Let's make it run automatically in the background!

### For Mac Users:

**Step 1: Build the production version:**
```bash
npm run build
```

**Step 2: Create the auto-start file:**

Copy and paste **this entire block** into Terminal (all at once):

```bash
NODE_PATH=$(which node)
PROJECT_PATH=$(pwd)
HOME_PATH=$HOME
mkdir -p logs

cat > ~/Library/LaunchAgents/com.nanoclaw.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.nanoclaw</string>
    <key>ProgramArguments</key>
    <array>
        <string>${NODE_PATH}</string>
        <string>${PROJECT_PATH}/dist/index.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${PROJECT_PATH}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:${HOME_PATH}/.local/bin</string>
        <key>HOME</key>
        <string>${HOME_PATH}</string>
    </dict>
    <key>StandardOutPath</key>
    <string>${PROJECT_PATH}/logs/nanoclaw.log</string>
    <key>StandardErrorPath</key>
    <string>${PROJECT_PATH}/logs/nanoclaw.error.log</string>
</dict>
</plist>
EOF
```

**Step 3: Start the service:**
```bash
launchctl load ~/Library/LaunchAgents/com.nanoclaw.plist
```

**Step 4: Verify it's running:**
```bash
launchctl list | grep nanoclaw
```

You should see a line with `com.nanoclaw` in it.

**That's it!** Your assistant now starts automatically when you log in and runs in the background 24/7.

**Useful commands:**

**Restart the service:**
```bash
launchctl kickstart -k gui/$(id -u)/com.nanoclaw
```

**Stop the service:**
```bash
launchctl unload ~/Library/LaunchAgents/com.nanoclaw.plist
```

**View logs (see what your assistant is doing):**
```bash
tail -f ~/nanoclaw/logs/nanoclaw.log
```

(Press `Ctrl+C` to stop viewing logs)

---

### For Linux Users:

**Step 1: Build the production version:**
```bash
npm run build
```

**Step 2: Create a systemd service:**

```bash
sudo nano /etc/systemd/system/nanoclaw.service
```

**Paste this** (replace `YOUR_USERNAME` and `/path/to/nanoclaw` with your actual username and nanoclaw folder path):

```ini
[Unit]
Description=NanoClaw AI Assistant
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/path/to/nanoclaw
ExecStart=/usr/bin/node /path/to/nanoclaw/dist/index.js
Restart=always
RestartSec=10
StandardOutput=append:/path/to/nanoclaw/logs/nanoclaw.log
StandardError=append:/path/to/nanoclaw/logs/nanoclaw.error.log

[Install]
WantedBy=multi-user.target
```

**Save:** Press `Ctrl+X`, then `Y`, then `Enter`

**Step 3: Enable and start:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable nanoclaw
sudo systemctl start nanoclaw
```

**Check status:**
```bash
sudo systemctl status nanoclaw
```

**Useful commands:**

**Restart:**
```bash
sudo systemctl restart nanoclaw
```

**Stop:**
```bash
sudo systemctl stop nanoclaw
```

**View logs:**
```bash
journalctl -u nanoclaw -f
```

---

## You're Done! 🎉

You now have your own personal AI assistant running 24/7!

### What You Can Do Now

**Message your assistant and try:**

- `Hey! What can you do?`
- `Remind me to call mom tomorrow at 5pm`
- `Search the web for the latest news on AI`
- `What's the weather like today?`

**From your main channel, you can also:**
- `List all my scheduled tasks`
- `Set up a daily reminder at 9am to check my calendar`
- Add your assistant to other WhatsApp/Telegram groups

---

## Troubleshooting

### "Command not found"

If you get "command not found" for any command:
1. Make sure you're in the nanoclaw folder: `cd ~/nanoclaw`
2. For `node` or `npm`: Restart Terminal and try again
3. For `claude`: Reinstall CLI with the command from Step 4

### "Permission denied"

On Linux, you might need `sudo` before some commands. Try adding `sudo` at the beginning.

### Assistant not responding

1. Check if it's running: `launchctl list | grep nanoclaw` (Mac) or `sudo systemctl status nanoclaw` (Linux)
2. Check logs: `tail -f logs/nanoclaw.log`
3. Make sure you used the trigger word (like `@Nina`) in groups
4. In your main channel, you don't need the trigger word

### WhatsApp disconnected

If WhatsApp disconnects, just run the auth again:
```bash
cd ~/nanoclaw
npm run auth
```

Then restart the service.

### Need more help?

1. Check the logs: `tail -f logs/nanoclaw.log`
2. Open Terminal in the nanoclaw folder and run: `claude`
3. Ask Claude: "Why isn't my assistant responding?" or "Help me debug"

---

## What's Next?

**Customize your assistant:**
- Open `groups/main/CLAUDE.md` in a text editor
- Add instructions like "Always be funny" or "Keep responses brief"
- Your assistant will remember these preferences

**Add more capabilities:**
- Run `claude` in the nanoclaw folder
- Type `/customize` or `/add-gmail` or other skills
- Claude will help you extend your assistant's abilities

**Join other groups:**
- Add your assistant to family or work group chats
- Manage everything from your main channel

---

## Summary of What You Built

You created:
- ✅ A personal AI assistant running on YOUR computer
- ✅ Complete privacy - your data never leaves your machine
- ✅ Accessible via WhatsApp or Telegram
- ✅ Can schedule tasks, search the web, manage notes, and more
- ✅ Runs 24/7 in the background
- ✅ Fully customizable to your needs

**Congratulations! You're now running your own AI assistant!** 🚀

---

*Have questions? The NanoClaw community is on GitHub: https://github.com/gavrielc/nanoclaw*
