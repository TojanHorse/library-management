# VidhyaDham - Library Management System

A modern library seat booking and management system built with React, TypeScript, Node.js, and MongoDB. This system allows users to register for library seats, manage payments, and provides administrators with comprehensive tools for user and seat management.

## Features

### User Management
- **User Registration**: Register users with personal details and ID verification
- **Seat Assignment**: Smart seat allocation based on slot availability
- **Payment Tracking**: Monitor fee status (paid, due, expired)
- **File Upload**: ID document upload with Cloudinary integration

### Admin Dashboard
- **User Management**: View, edit, and delete user records
- **Seat Management**: Real-time seat availability tracking
- **Payment Management**: Mark payments, send reminders
- **Settings Configuration**: Email, Telegram, and slot configurations

### Notifications
- **Email Notifications**: Welcome emails, payment reminders, due date alerts
- **Telegram Notifications**: Multi-bot support for different notification types
- **Automated Scheduling**: Cron-based reminder system

### Advanced Features
- **Real-time Updates**: Automatic UI refresh for data changes
- **Error Recovery**: Comprehensive error handling and retry mechanisms
- **Health Monitoring**: Built-in health checks and monitoring
- **File Management**: Secure file upload with validation
- **Export Functionality**: CSV export for user data

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: MongoDB with Mongoose ODM
- **File Storage**: Cloudinary
- **Scheduling**: Node-cron for automated tasks
- **Session Management**: Express-session with MongoDB store
- **Validation**: Zod for runtime type checking

## Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB database
- Cloudinary account (for file uploads)

### Environment Variables
Create a `.env` file in the root directory:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/vidhya-dham

# Session Security
SESSION_SECRET=your-secure-session-secret

# Email Configuration (Gmail example)
GMAIL_USER=your-email@gmail.com
GMAIL_PASSWORD=your-app-password

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Production Settings
NODE_ENV=production
PORT=5000
```

### Installation & Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd vidhya-dham
   npm install
   ```

2. **Build the Application**
   ```bash
   npm run build
   ```

3. **Start the Production Server**
   ```bash
   npm start
   ```

The application will be available at `http://localhost:5000`

## Development

### Start Development Server
```bash
# Start both frontend and backend in development mode
npm run dev
```

### Available Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run typecheck` - Run TypeScript type checking

## Deployment

### Render.com Deployment

1. **Connect Repository**: Link your GitHub repository to Render

2. **Environment Variables**: Add all required environment variables in Render dashboard

3. **Build Settings**:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Node Version**: 18+

4. **Health Check**: The application includes health monitoring at `/api/health`

### Database Setup
- Use MongoDB Atlas for cloud database
- Ensure connection string includes authentication
- Set up database user with read/write permissions

### Email Configuration
- Use Gmail App Passwords for authentication
- Ensure "Less secure app access" is enabled if needed
- Configure SMTP settings for custom email providers

### File Upload Setup
- Create Cloudinary account
- Configure upload presets and folder structure
- Set appropriate file size and type restrictions

## Configuration

### Email Templates
The system supports customizable email templates for:
- Welcome emails for new registrations
- Payment due reminders
- Payment confirmation notifications

### Telegram Integration
- Support for multiple bot configurations
- Granular notification type selection
- Custom message templates and formatting

### Slot Management
- Configurable time slots (Morning, Afternoon, Evening, 12Hour, 24Hour)
- Dynamic pricing per slot type
- Real-time availability tracking

## Monitoring & Maintenance

### Health Checks
- Database connectivity monitoring
- Service availability checks
- Automated error recovery

### Logging
- Comprehensive request/response logging
- Error tracking and alerting
- Performance monitoring

### Backup & Recovery
- Regular database backups recommended
- Environment variable backup
- File storage backup policies

## Security Features

- Session-based authentication
- Input validation and sanitization
- File upload security restrictions
- SQL injection protection
- CSRF protection
- Secure environment variable handling

## Support

For technical support or feature requests, please refer to the documentation or contact the development team.

## License

This project is proprietary software developed for VidhyaDham library management.
