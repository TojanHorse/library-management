# VidhyaDham Notification Scheduling Setup

## 🚨 Important: Free vs Paid Hosting

### Free Hosting Limitations
- **Services Sleep**: Apps go dormant after 15 minutes of inactivity
- **No Background Jobs**: JavaScript intervals stop when app sleeps
- **Manual Wake-up Required**: Someone must visit your app to restart it

### Paid Hosting Benefits
- **24/7 Uptime**: Services never sleep
- **Persistent Background Tasks**: Continuous scheduling works
- **Reliable Notifications**: Always delivered on time

---

## 🔧 Solution Options

### Option 1: Upgrade to Paid Plan (Recommended)
**Render Pro**: $7/month
- ✅ Always-on service
- ✅ Built-in scheduler works perfectly
- ✅ Zero setup required
- ✅ Most reliable

### Option 2: External Cron Services (Free)
Use free external services to ping your webhook endpoint daily.

#### A. EasyCron (Free tier)
1. Sign up at [EasyCron.com](https://www.easycron.com)
2. Create new cron job:
   - **URL**: `https://your-app.onrender.com/api/webhook/scheduler`
   - **Method**: POST
   - **Schedule**: `0 9 * * *` (Daily at 9 AM)
   - **Timezone**: Asia/Kolkata

#### B. cron-job.org (Free)
1. Sign up at [cron-job.org](https://cron-job.org)
2. Create new job:
   - **URL**: `https://your-app.onrender.com/api/webhook/scheduler`
   - **Schedule**: Daily at 09:00
   - **Method**: POST

#### C. UptimeRobot (Free)
1. Sign up at [UptimeRobot.com](https://uptimerobot.com)
2. Add HTTP(s) monitor:
   - **URL**: `https://your-app.onrender.com/api/webhook/scheduler`
   - **Monitoring Interval**: Every 24 hours
   - **Monitor Type**: HTTP(s)

### Option 3: GitHub Actions (Free)
Create a GitHub workflow that runs daily:

```yaml
# .github/workflows/daily-notifications.yml
name: Daily Notifications
on:
  schedule:
    - cron: '30 3 * * *'  # 9:00 AM IST (3:30 UTC)
  workflow_dispatch:

jobs:
  trigger-notifications:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Webhook
        run: |
          curl -X POST https://your-app.onrender.com/api/webhook/scheduler
```

---

## 📊 Monitoring Your Setup

### Check Webhook Status
Visit: `https://your-app.onrender.com/api/webhook/status`

### Check App Health
Visit: `https://your-app.onrender.com/api/health`

### Manual Trigger (Testing)
```bash
curl -X POST https://your-app.onrender.com/api/webhook/scheduler
```

---

## 🎯 Recommended Setup for Your Use Case

### For Testing/Development
- Use GitHub Actions (free, reliable)
- Manual triggers when needed

### For Production Business Use
- **Upgrade to Render Pro ($7/month)**
- Most reliable for business operations
- No external dependencies
- Built-in redundancy

---

## 📱 What Gets Automated

### Daily Notifications:
- ✅ Fee due reminders (3 days before)
- ✅ Overdue payment alerts
- ✅ Email + Telegram notifications
- ✅ Multiple bot support

### Instant Notifications:
- ✅ New user registration
- ✅ Payment confirmations
- ✅ Manual triggers

---

## 🔧 Implementation Status

- ✅ Built-in scheduler (works on paid plans)
- ✅ Webhook scheduler (works with external cron)
- ✅ Health monitoring
- ✅ Multiple notification channels
- ✅ Error handling and logging

Choose the option that best fits your budget and reliability requirements!
