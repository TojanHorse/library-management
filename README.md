# VidhyaDham Seat Management System

A modern seat management system built with React, Express, MongoDB, and Cloudinary for file storage.

## Features

- **Real-time seat management** with MongoDB
- **File upload and storage** using Cloudinary
- **Email notifications** via Gmail/SMTP
- **User registration and management**
- **Admin dashboard with real-time updates**
- **Due date reminders automation**
- **Export functionality** (CSV/PDF)
- **Secure authentication** with bcrypt

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Express.js, Node.js
- **Database**: MongoDB with Mongoose
- **File Storage**: Cloudinary
- **Email Service**: Nodemailer with Gmail
- **Authentication**: bcrypt for password hashing

## Prerequisites

Before you begin, ensure you have:

- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas)
- Gmail account with App Password enabled
- Cloudinary account

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/TojanHorse/vidhyaDham.git
cd vidhyaDham
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` file with your configuration:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/vidhyadham
# For MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/vidhyadham?retryWrites=true&w=majority

# Gmail Configuration (Use App Password)
GMAIL_USER=your-email@gmail.com
GMAIL_PASSWORD=your-app-password

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Application
NODE_ENV=development
PORT=5000
```

### 4. Gmail Setup

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
   - Use this password in `GMAIL_PASSWORD`

### 5. MongoDB Setup

#### Option A: Local MongoDB
```bash
# Install MongoDB locally and start the service
mongod --dbpath /path/to/your/data/directory
```

#### Option B: MongoDB Atlas (Cloud)
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get your connection string
4. Replace `MONGODB_URI` in `.env`

### 6. Cloudinary Setup

1. Create a free account at [Cloudinary](https://cloudinary.com/)
2. Get your credentials from the dashboard
3. Add them to your `.env` file

### 7. Run the Application

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm run build
npm start
```

The application will be available at `http://localhost:5000`

## Default Admin Account

After first startup, a default admin account is created:

- **Username**: `Vidhyadham`
- **Password**: `admin123`
- **Email**: `admin@vidhyadham.com`

**⚠️ Important**: Change the default admin password immediately after first login!

## API Endpoints

### Authentication
- `POST /api/admin/login` - Admin login
- `POST /api/admin` - Create new admin

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Seats
- `GET /api/seats` - Get all seats
- `PUT /api/seats/:number` - Update seat status

### File Upload
- `POST /api/upload/file` - Upload single file
- `POST /api/upload/files` - Upload multiple files
- `DELETE /api/upload/file/:publicId` - Delete file

### Settings
- `GET /api/settings` - Get settings
- `PUT /api/settings` - Update settings

### Email & Notifications
- `POST /api/test/email` - Test email configuration
- `POST /api/send-due-reminder/:userId` - Send due date reminder

## File Structure

```
vidhyaDham/
├── client/                 # React frontend
├── server/                 # Express backend
│   ├── database.ts        # MongoDB connection
│   ├── mongo-storage.ts   # Database operations
│   ├── email-service.ts   # Email service
│   ├── cloudinary.ts      # File upload service
│   ├── routes.ts          # API routes
│   └── scheduler.ts       # Background tasks
├── shared/                 # Shared types and schemas
└── dist/                  # Built files
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - TypeScript type checking

### Database Schema

The application uses MongoDB with the following collections:

- **users** - User registrations
- **seats** - Seat availability and status
- **admins** - Admin accounts
- **settings** - Application configuration
- **userlogs** - Audit trail for user actions

### File Uploads

Files are stored in Cloudinary with the following structure:
- **Folder**: `vidhyadham/documents`
- **Allowed formats**: Images (JPEG, PNG, GIF, WebP), PDFs, Word documents
- **Size limit**: 5MB per file

## Production Deployment

1. Set `NODE_ENV=production` in your environment
2. Configure production MongoDB URI
3. Set up proper SSL certificates
4. Configure reverse proxy (nginx/apache)
5. Set up process manager (PM2)

### Example PM2 Configuration

```json
{
  "name": "vidhyadham",
  "script": "dist/index.js",
  "env": {
    "NODE_ENV": "production",
    "PORT": "5000"
  }
}
```

## Troubleshooting

### Common Issues

1. **Email not sending**
   - Verify Gmail App Password is correct
   - Check if 2FA is enabled
   - Ensure SMTP settings are correct

2. **File upload fails**
   - Verify Cloudinary credentials
   - Check file size limits
   - Ensure allowed file types

3. **Database connection issues**
   - Verify MongoDB is running
   - Check connection string format
   - Ensure network access for MongoDB Atlas

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

## License

MIT License - see LICENSE file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the API documentation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

**Note**: This application replaces dummy data with real MongoDB integration, Cloudinary file storage, and Gmail email service for production use.
