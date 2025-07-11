# VidhyaDham Library Management - Deployment Guide

## 🚀 Deploying to Render

### Prerequisites
1. **Render Account**: Sign up at [render.com](https://render.com)
2. **GitHub Repository**: Push your code to GitHub
3. **Cloudinary Account**: Sign up at [cloudinary.com](https://cloudinary.com) for file uploads

### Step 1: Create Cloudinary Account
1. Go to [cloudinary.com](https://cloudinary.com) and sign up
2. Note down your:
   - Cloud Name
   - API Key
   - API Secret

### Step 2: Deploy to Render
1. Connect your GitHub repository to Render
2. Use the `render.yaml` configuration file (automatic deployment)
3. Or manually create a Web Service with these settings:
   - **Runtime**: Node
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`

### Step 3: Configure Environment Variables
Set these in Render Dashboard > Environment:

```bash
NODE_ENV=production
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Step 4: Database Setup
The `render.yaml` automatically creates a free PostgreSQL database, but the app uses MongoDB.

**Option A: Use MongoDB Atlas (Recommended)**
1. Create account at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create free cluster
3. Get connection string
4. Set `MONGODB_URI` environment variable

**Option B: Use Render PostgreSQL + MongoDB Docker**
- More complex setup, not recommended for free tier

### Step 5: Initial Setup After Deployment
1. Visit your deployed app URL
2. Create first admin account:
   ```bash
   POST /api/admin/register
   {
     "username": "admin",
     "password": "your_secure_password",
     "email": "admin@yourdomain.com"
   }
   ```

### Step 6: Configure Telegram Bot (Optional)
1. Create bot with [@BotFather](https://t.me/botfather)
2. Get bot token
3. Get your chat ID
4. Configure in Settings → Telegram Configuration

### Step 7: Configure Email (Optional)
1. Use Gmail App Password or SMTP service
2. Configure in Settings → Email Configuration

## 🔧 Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | Set to `production` |
| `SESSION_SECRET` | Yes | Random string for session security |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret |

## 📱 Features Available After Deployment

### ✅ Core Features
- User registration and management
- Seat allocation and tracking
- Fee management and payment tracking
- Admin dashboard
- Real-time updates

### ✅ Notification Features
- **Telegram Notifications** (Dynamic configuration):
  - New user registration
  - Payment confirmations
  - Fee due reminders
  - Fee overdue alerts
  - User updates and deletions

- **Email Notifications**:
  - Welcome emails
  - Fee due reminders
  - Payment confirmations

### ✅ Automated Features
- **Scheduler** (runs every 24 hours):
  - Fee due date checking
  - Automatic reminder sending
  - Overdue payment tracking

### ✅ File Management
- ID document uploads
- Cloudinary integration
- Secure file storage

## 🧪 Testing After Deployment

### Test Telegram Integration
```bash
POST /api/test/telegram
Content-Type: application/json
{}
```

### Test Scheduler
```bash
POST /api/test/scheduler
Content-Type: application/json
{}
```

### Test Email
```bash
POST /api/test/email
Content-Type: application/json
{}
```

## 📊 Monitoring

### Console Logs
The application provides detailed logging:
- `📱 [TELEGRAM]` - Telegram notification logs
- `📅 [SCHEDULER]` - Scheduled task logs
- `📧 [EMAIL]` - Email service logs
- `🔧 [TEST]` - Test operation logs

### Health Check
- URL: `/api/health`
- Returns server status and basic configuration

## 🚨 Security Considerations

1. **Change Default Passwords**: Immediately after deployment
2. **Environment Variables**: Never commit secrets to code
3. **HTTPS**: Render provides SSL automatically
4. **Session Security**: Strong session secret generated automatically
5. **Input Validation**: All inputs are validated with Zod schemas

## 📞 Support

If you encounter issues:
1. Check Render deployment logs
2. Check application console logs
3. Verify environment variables
4. Test with provided API endpoints

## 🎯 Post-Deployment Checklist

- [ ] App deploys successfully
- [ ] Database connection works
- [ ] Admin account created
- [ ] Cloudinary uploads work
- [ ] Telegram notifications configured
- [ ] Email notifications configured
- [ ] Scheduler running correctly
- [ ] All features tested

---

**🎉 Your VidhyaDham Library Management System is ready for production!**
