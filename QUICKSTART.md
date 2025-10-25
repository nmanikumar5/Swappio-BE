# Quick Start Guide

Get the Swappio Backend up and running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- MongoDB installed and running locally (or MongoDB Atlas account)
- Cloudinary account (optional for image uploads)

## Step 1: Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd Swappio-BE

# Install dependencies
npm install
```

## Step 2: Configure Environment

```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your configuration
# Minimum required:
# - MONGODB_URI
# - JWT_SECRET
```

Example `.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/swappio
JWT_SECRET=your_random_secret_key_here
CORS_ORIGIN=http://localhost:3000
```

## Step 3: Start the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
# Build
npm run build

# Start
npm start
```

## Step 4: Test the API

### Health Check
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Register a User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Save the `token` from the response!

### Create a Listing
```bash
curl -X POST http://localhost:5000/api/listings \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "iPhone 12",
    "description": "Excellent condition",
    "price": 699,
    "category": "Electronics",
    "location": "New York"
  }'
```

## Step 5: Import Postman Collection

1. Open Postman
2. Import `postman_collection.json`
3. Set environment variables:
   - `base_url`: `http://localhost:5000/api`
   - `token`: (from login response)
4. Start testing all endpoints!

## Common Issues

### MongoDB Connection Error
```
Error: MongoDB connection error
```
**Solution**: Make sure MongoDB is running:
```bash
# macOS (with brew)
brew services start mongodb-community

# Ubuntu
sudo systemctl start mongod

# Windows
net start MongoDB
```

### Port Already in Use
```
Error: Port 5000 is already in use
```
**Solution**: Change the PORT in `.env` or stop the other process:
```bash
# Find process
lsof -i :5000

# Kill process (replace PID)
kill -9 PID
```

### JWT_SECRET Not Set
```
Warning: Using default JWT secret
```
**Solution**: Set a strong secret in `.env`:
```bash
# Generate a random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env
JWT_SECRET=your_generated_secret_here
```

## Next Steps

1. **Read the Documentation**
   - `README.md` - Full documentation
   - `API_EXAMPLES.md` - More API examples
   - `IMPLEMENTATION_SUMMARY.md` - Technical details

2. **Test All Features**
   - Use Postman collection
   - Try all CRUD operations
   - Test real-time chat with Socket.io

3. **Connect Frontend**
   - Update frontend API URL
   - Implement authentication flow
   - Add Socket.io client

4. **Deploy to Production**
   - See `DEPLOYMENT.md` for deployment guides
   - Set up MongoDB Atlas
   - Configure Cloudinary
   - Deploy to your preferred platform

## Useful Commands

```bash
# Development
npm run dev              # Start dev server with auto-reload

# Production
npm run build            # Compile TypeScript
npm start                # Run compiled code

# Code Quality
npm run build            # Check for TypeScript errors

# Database
mongosh swappio          # Connect to MongoDB (if installed locally)
```

## Default Admin Account

To create an admin account, register a user and manually update in MongoDB:

```javascript
// In MongoDB shell or Compass
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

## Testing with Socket.io

Create a simple test client:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Socket.io Test</title>
  <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
</head>
<body>
  <h1>Chat Test</h1>
  <div id="messages"></div>
  <input id="messageInput" type="text" placeholder="Type a message...">
  <button onclick="sendMessage()">Send</button>

  <script>
    const socket = io('http://localhost:5000', {
      auth: { token: 'YOUR_JWT_TOKEN' }
    });

    socket.on('connect', () => {
      console.log('Connected!');
    });

    socket.on('receive_message', (msg) => {
      document.getElementById('messages').innerHTML += 
        `<p>${msg.text}</p>`;
    });

    function sendMessage() {
      const text = document.getElementById('messageInput').value;
      socket.emit('send_message', {
        receiverId: 'RECEIVER_USER_ID',
        text: text
      });
    }
  </script>
</body>
</html>
```

## Support

Need help?
- Check the documentation files
- Review the API examples
- Create an issue on GitHub
- Check existing issues for solutions

## Success! 🎉

You're now running the Swappio Backend!

Server: `http://localhost:5000`
Health: `http://localhost:5000/health`
API: `http://localhost:5000/api`

Happy coding! 🚀
