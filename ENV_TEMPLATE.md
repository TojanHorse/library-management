# Environment Variables Template for VidhyaDham Library Management

## Required Variables

### Database
```
MONGODB_URI=mongodb://localhost:27017/vidhya-dham
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/vidhya-dham
```

### Email Configuration
```
GMAIL_USER=your-email@gmail.com
GMAIL_PASSWORD=your-app-password
```

### Telegram Configuration (Default Bot - Always Active)
```
TELEGRAM_BOT_TOKEN=7987816282:AAFlkQP8hASFjATNp2s4MhgspPP2yovaLUI
TELEGRAM_CHAT_IDS=939382380
# Add additional chat IDs separated by commas if needed:
# TELEGRAM_CHAT_IDS=939382380,123456789,987654321
```

### Session Security
```
SESSION_SECRET=vidhya-dham-secret-key-2024
```

### Optional - Cloudinary (for file uploads)
```
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## Example .env file:
```
MONGODB_URI=mongodb://localhost:27017/vidhya-dham
GMAIL_USER=admin@vidhyadham.com
GMAIL_PASSWORD=your-gmail-app-password
TELEGRAM_BOT_TOKEN=7987816282:AAFlkQP8hASFjATNp2s4MhgspPP2yovaLUI
TELEGRAM_CHAT_IDS=939382380
SESSION_SECRET=vidhya-dham-secret-key-2024
NODE_ENV=development
```

## Getting Your Telegram Chat ID:
1. Start a chat with your bot: @VidhyaDhamBot
2. Send "Hello" to the bot
3. Visit: https://api.telegram.org/bot7987816282:AAFlkQP8hASFjATNp2s4MhgspPP2yovaLUI/getUpdates
4. Look for "chat":{"id":NUMBERS} and copy the ID
