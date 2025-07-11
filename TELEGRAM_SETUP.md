# 🤖 Telegram Bot Setup Guide

## Your VidhyaDham Bot Details
- **Bot Token**: `7987816282:AAFlkQP8hASFjATNp2s4MhgspPP2yovaLUI`
- **Bot Username**: @VidhyaDhamBot (or similar)

## Step-by-Step Setup

### 1. Get Your Chat ID
1. Start a conversation with your bot by searching for it on Telegram
2. Send any message to the bot (e.g., "Hello")
3. Visit this URL in your browser:
   ```
   https://api.telegram.org/bot7987816282:AAFlkQP8hASFjATNp2s4MhgspPP2yovaLUI/getUpdates
   ```
4. Look for the `"chat":{"id":NUMBERS}` in the response
5. Copy the ID number (e.g., `123456789`)

### 2. Configure in VidhyaDham
1. Go to **Settings** → **Telegram Configuration**
2. Add your Chat ID in the "Chat IDs" field
3. Click **"Test Telegram Bot"** - you should receive a test message
4. Save your settings

### 3. Features You'll Get
- 🎉 **New user registration** notifications
- ⚠️ **Fee due reminders** (2 days before)
- ✅ **Payment confirmation** messages  
- 🚨 **Overdue payment** alerts

## Multiple Chat IDs
You can add multiple chat IDs (one per line) to send notifications to:
- Your personal chat
- Group chats
- Admin channels

## Example Chat IDs Format
```
123456789
-987654321
456789123
```

## Testing
After configuration, use the **"Test Telegram Bot"** button to verify:
- ✅ Bot token is valid
- ✅ Chat ID is correct
- ✅ You can receive messages

## Troubleshooting
- **No message received**: Check your Chat ID is correct
- **"Failed to send"**: Verify you've started a chat with the bot first
- **Bot not found**: Make sure the bot token is active

---
*Your bot is pre-configured with token: `7987816282:AAFlkQP8hASFjATNp2s4MhgspPP2yovaLUI`*
